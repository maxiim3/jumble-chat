import { MAX_ACTIVE_MESSAGES, MESSAGE_TTL_MS, pruneActiveMessages } from '../shared/message-retention';
import { ROUTES } from '../shared/constants';
import type {
  ClientSocketMessage,
  HistorySyncEvent,
  MessageExpiredEvent,
  SessionAuthor,
  SessionInitProfile,
  SocketEvent,
  SystemMessageModel,
  SystemMessageType,
  UserMessageModel,
  WebSocketData,
} from '../shared/socket-message.model';
import { generateUsername } from 'friendly-username-generator';
import type { ServerWebSocket } from 'bun';
import { join } from 'path';

// Railway injecte PORT automatiquement
const PORT = Number(process.env['PORT']) || 3200;
const GUEST_AVATAR_URL = '/assets/ostrich-avatar.svg';
const MAX_DISPLAY_NAME_LENGTH = 32;

// A socket can exist before it is allowed into the chat. We only count a client
// as present once it has completed `session_init` and become `ready`.
//
// This mirrors the frontend modal flow: first choose an identity, then enter.
const clients = new Set<ServerWebSocket<WebSocketData>>();

/**
 * Historique éphémère rejouable aux nouveaux arrivants.
 *
 * On ne stocke ici que les vrais messages de chat. Les événements système
 * (`session_ready`, `user_joined`, `user_left`) restent du temps réel pur.
 */
let activeMessages: UserMessageModel[] = [];

// Chemin vers le build Angular
const STATIC_DIR = join(import.meta.dir, '../dist/jumble-chat/browser');

function sendEvent(ws: ServerWebSocket<WebSocketData>, event: SocketEvent): void {
  ws.send(JSON.stringify(event));
}

/**
 * Diffuse un événement à toutes les sessions prêtes.
 *
 * Les sockets encore en plein handshake n'ont pas encore d'auteur final ni
 * d'état client cohérent, donc on les ignore volontairement.
 */
function broadcastEvent(event: SocketEvent, excludedSessionId?: string): void {
  clients.forEach((client) => {
    if (!client.data.ready || !client.data.author) {
      return;
    }

    if (excludedSessionId && client.data.sessionId === excludedSessionId) {
      return;
    }

    sendEvent(client, event);
  });
}

function sanitizeDisplayName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  return trimmed || fallback;
}

function sanitizeAvatarUrl(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return GUEST_AVATAR_URL;
  }

  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('assets/')
  ) {
    return trimmed;
  }

  return GUEST_AVATAR_URL;
}

// Shape validation only. This checks "does it look like a 64-char hex pubkey?"
// It does NOT prove that the client really controls that key. For that we would
// need to verify the signed proof server-side.
function sanitizePubkey(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && /^[0-9a-f]{64}$/.test(trimmed) ? trimmed : undefined;
}

function countReadyClients(): number {
  let count = 0;

  clients.forEach((client) => {
    if (client.data.ready && client.data.author) {
      count += 1;
    }
  });

  return count;
}

function createGuestDisplayName(): string {
  let displayName = generateUsername();

  while (
    Array.from(clients).some((client) => client.data.author?.displayName === displayName)
  ) {
    displayName = generateUsername();
  }

  return displayName;
}

// Builds the public author snapshot embedded in chat events.
//
// Why a snapshot?
// Because every chat event should already contain everything the UI needs to
// render the author without doing a second lookup.
//
// Important limitation: in Nostr mode we sanitize client-provided identity
// fields, but we still do not verify the signed proof yet, so this is not a
// strong server-side auth guarantee.
function createAuthor(sessionId: string, profile: SessionInitProfile): SessionAuthor {
  if (profile.authMode === 'nostr') {
    const pubkey = sanitizePubkey(profile.pubkey);
    const fallbackName = pubkey ? `nostr-${pubkey.slice(0, 8)}` : 'nostr-user';

    return {
      sessionId,
      displayName: sanitizeDisplayName(profile.displayName, fallbackName),
      avatarUrl: sanitizeAvatarUrl(profile.avatarUrl),
      authMode: 'nostr',
      pubkey,
    };
  }

  return {
    sessionId,
    displayName: createGuestDisplayName(),
    avatarUrl: GUEST_AVATAR_URL,
    authMode: 'guest',
  };
}

function createSystemMessage(
  type: SystemMessageType,
  author: SessionAuthor,
  message: string
): SystemMessageModel {
  return {
    type,
    messageId: crypto.randomUUID(),
    author,
    timestamp: Date.now(),
    message,
    count: countReadyClients(),
  };
}

function createUserMessage(author: SessionAuthor, message: string, now: number): UserMessageModel {
  return {
    type: 'new_message',
    messageId: crypto.randomUUID(),
    author,
    timestamp: now,
    expiresAt: now + MESSAGE_TTL_MS,
    message,
    count: countReadyClients(),
  };
}

function createHistorySyncEvent(): HistorySyncEvent {
  return {
    type: 'history_sync',
    messages: [...activeMessages],
  };
}

/**
 * Point d'entrée unique pour garder le serveur et tous les clients synchronisés.
 *
 * Dès qu'un message sort de la fenêtre active, on le retire du store mémoire et
 * on broadcast `message_expired` pour que chaque client le supprime localement.
 */
function pruneAndBroadcastRemovedMessages(now = Date.now()): void {
  const result = pruneActiveMessages(activeMessages, now, MAX_ACTIVE_MESSAGES);

  activeMessages = result.activeMessages;

  result.removedMessageIds.forEach((messageId) => {
    const expiredEvent: MessageExpiredEvent = {
      type: 'message_expired',
      messageId,
    };

    broadcastEvent(expiredEvent);
  });
}

// Vérification périodique pour faire disparaître les messages même si plus
// personne n'envoie rien entre-temps.
setInterval(() => {
  pruneAndBroadcastRemovedMessages();
}, 1000);

const server = Bun.serve<WebSocketData>({
  port: PORT,

  // Servir les fichiers statiques Angular + API
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === ROUTES.health) {
      return new Response('OK');
    }

    // WebSocket upgrade
    if (url.pathname === ROUTES.ws) {
      const upgraded = server.upgrade(req, {
        data: {
          sessionId: crypto.randomUUID(),
          createdAt: Date.now(),
          ready: false,
        },
      });

      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      return undefined;
    }

    // Servir les fichiers statiques
    const filePath = join(STATIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback - renvoyer index.html pour le routing Angular
    const indexFile = Bun.file(join(STATIC_DIR, 'index.html'));
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      clients.add(ws);
    },

    message(ws, rawMessage: string) {
      let message: ClientSocketMessage;

      try {
        message = JSON.parse(rawMessage) as ClientSocketMessage;
      } catch {
        return;
      }

      if (message.type === 'session_init') {
        if (ws.data.ready) {
          return;
        }

        // `session_init` is the real entry gate into the chat. Before this point
        // the socket exists, but the user is not yet considered an active member.
        //
        // The profile comes from the frontend and tells us whether this is a
        // guest session or a Nostr session candidate.
        const author = createAuthor(ws.data.sessionId, message.profile);

        ws.data.author = author;
        ws.data.ready = true;

        console.log(`Client prêt: ${author.displayName} (${countReadyClients()} clients actifs)`);

        // On purge avant de rejouer l'historique pour éviter d'envoyer des
        // messages déjà expirés au nouveau client.
        pruneAndBroadcastRemovedMessages();
        sendEvent(ws, createSystemMessage('session_ready', author, `Connected as ${author.displayName}`));
        sendEvent(ws, createHistorySyncEvent());
        broadcastEvent(
          createSystemMessage('user_joined', author, `${author.displayName} joined the chat`),
          ws.data.sessionId
        );
        return;
      }

      if (!ws.data.ready || !ws.data.author || message.type !== 'chat_message') {
        return;
      }

      const trimmedMessage = message.message.trim();

      if (!trimmedMessage) {
        return;
      }

      const now = Date.now();

      // Première purge: on nettoie l'ancien état avant d'ajouter le nouveau message.
      pruneAndBroadcastRemovedMessages(now);

      const chatMessage = createUserMessage(ws.data.author, trimmedMessage, now);

      activeMessages = [...activeMessages, chatMessage];

      broadcastEvent(chatMessage);

      // Deuxième purge: permet d'appliquer immédiatement le cap FIFO si ce
      // nouveau message fait dépasser la limite mémoire.
      pruneAndBroadcastRemovedMessages(now);
    },

    close(ws) {
      clients.delete(ws);

      if (!ws.data.ready || !ws.data.author) {
        return;
      }

      console.log(
        `Client déconnecté: ${ws.data.author.displayName} (${countReadyClients()} clients restants)`
      );

      broadcastEvent(
        createSystemMessage('user_left', ws.data.author, `${ws.data.author.displayName} left the chat`)
      );
    },
  },
});

console.log(`🚀 Serveur démarré sur http://localhost:${server.port}`);
console.log(`   WebSocket: ws://localhost:${server.port}${ROUTES.ws}`);
