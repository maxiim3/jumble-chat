/**
 * High-level identity mode chosen by the user before entering the chat.
 *
 * `guest`: no Nostr identity involved, the server invents the display identity.
 * `nostr`: the client prepared a Nostr-flavoured identity payload first.
 */
export type AuthMode = 'guest' | 'nostr';

/**
 * Types de messages envoyés par le serveur vers les clients.
 *
 * `session_ready`, `user_joined` et `user_left` sont des messages système.
 * `new_message` correspond à un vrai message de chat utilisateur.
 */
export type ServerMessageType = 'session_ready' | 'user_joined' | 'user_left' | 'new_message';
export type SystemMessageType = Exclude<ServerMessageType, 'new_message'>;

/**
 * Représente l'identité attachée à une session WebSocket déjà authentifiée.
 *
 * Cette structure est partagée entre le backend et le frontend pour que tout le
 * monde parle du même "auteur" de message.
 *
 * Important: this is not the raw Nostr profile event. It is the app's own,
 * simplified snapshot used for rendering messages and presence in the UI.
 */
export interface SessionAuthor {
  sessionId: string;
  displayName: string;
  avatarUrl: string;
  authMode: AuthMode;
  pubkey?: string;
}

/**
 * Champs communs à tous les messages rendus dans le chat.
 */
interface BaseMessageModel {
  messageId: string;
  author: SessionAuthor;
  timestamp: number;
  count: number;
}

/**
 * Message utilisateur conservé temporairement côté serveur.
 *
 * `expiresAt` permet au serveur de décider quand le message doit disparaître
 * partout, puis au frontend d'afficher plus tard un éventuel countdown.
 */
export interface UserMessageModel extends BaseMessageModel {
  type: 'new_message';
  message: string;
  expiresAt: number;
}

/**
 * Message système diffusé en temps réel, mais jamais rejoué depuis l'historique.
 */
export interface SystemMessageModel extends BaseMessageModel {
  type: SystemMessageType;
  message: string;
}

export type SocketMessageModel = UserMessageModel | SystemMessageModel;

/**
 * Snapshot de l'historique actif envoyé juste après la fin du handshake.
 *
 * On n'y met que des `UserMessageModel` car les messages système n'ont pas de
 * sens à rejouer à un utilisateur qui arrive plus tard.
 */
export interface HistorySyncEvent {
  type: 'history_sync';
  messages: UserMessageModel[];
}

/**
 * Notification technique envoyée par le serveur quand un message sort de la
 * fenêtre éphémère (TTL) ou du cap mémoire FIFO.
 */
export interface MessageExpiredEvent {
  type: 'message_expired';
  messageId: string;
}

/**
 * Union complète de tous les événements serveur consommés par le frontend.
 */
export type SocketEvent = SocketMessageModel | HistorySyncEvent | MessageExpiredEvent;

/**
 * Signed event returned by a Nostr extension.
 *
 * `pubkey` identifies the account and `sig` is the cryptographic signature
 * proving that the extension signed the event with the corresponding private key.
 */
export interface NostrSignedEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Payload sent by the client during `session_init`.
 *
 * In guest mode this stays minimal. In Nostr mode it can also carry the pubkey,
 * signed proof and profile hints prepared on the frontend.
 *
 * This type is deliberately app-specific. It is how the Angular app tells the
 * Bun server which identity mode it wants to use for this chat session.
 */
export interface SessionInitProfile {
  authMode: AuthMode;
  displayName?: string;
  avatarUrl?: string;
  pubkey?: string;
  proof?: NostrSignedEvent;
}

/**
 * Premier message envoyé par le client après ouverture de la socket.
 * Il permet au serveur de construire l'auteur de session.
 */
export interface SessionInitMessage {
  type: 'session_init';
  profile: SessionInitProfile;
}

/**
 * Message métier envoyé par le client une fois la session prête.
 */
export interface ChatMessage {
  type: 'chat_message';
  message: string;
}

export type ClientSocketMessage = SessionInitMessage | ChatMessage;

/**
 * Données attachées par Bun à chaque connexion WebSocket côté serveur.
 *
 * `ready` évite d'accepter des messages de chat tant que le handshake de
 * session n'est pas terminé.
 *
 * In other words: a TCP/WebSocket connection can exist before the user is fully
 * admitted into the chat room.
 */
export interface WebSocketData {
  sessionId: string;
  createdAt: number;
  ready: boolean;
  author?: SessionAuthor;
}
