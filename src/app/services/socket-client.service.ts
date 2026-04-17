import { Injectable, signal } from '@angular/core';
import { ROUTES } from '../../../shared/constants';
import {
  ChatMessage,
  SessionAuthor,
  SessionInitMessage,
  SessionInitProfile,
  SocketEvent,
  SocketMessageModel,
} from '../../../shared/socket-message.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
/**
 * Handles the app WebSocket protocol only.
 *
 * This service does not know how a Nostr identity was produced and does not ask
 * the browser extension for anything. Its job is only to speak our app protocol:
 *
 * 1. open the socket
 * 2. send `session_init`
 * 3. wait for `session_ready`
 * 4. start exchanging chat events
 */
export class SocketClientService {
  private ws: WebSocket | undefined;
  private readonly sessionAuthorSignal = signal<SessionAuthor | undefined>(undefined);
  private readonly countUsersSignal = signal(0);
  private readonly messagesSignal = signal<SocketMessageModel[]>([]);

  readonly currentAuthor = this.sessionAuthorSignal.asReadonly();
  readonly countUsers = this.countUsersSignal.asReadonly();
  readonly messages = this.messagesSignal.asReadonly();

  /**
   * Ouvre une nouvelle socket et termine le handshake de session.
   *
   * `profile` is the app-level identity payload already prepared by the caller.
   * It may represent either:
   * - a guest session request
   * - a Nostr-flavoured session containing pubkey / proof / metadata
   *
   * The promise resolves only when the server answers with `session_ready`.
   * Until then, the UI must still consider the user outside the chat.
   */
  async open(profile: SessionInitProfile): Promise<SessionAuthor> {
    this.close();

    const socket = new WebSocket(environment.wsUrl + ROUTES.ws);
    this.ws = socket;

    return new Promise<SessionAuthor>((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        fail('La connexion au chat a expiré.');
      }, 10000);

      const complete = (author: SessionAuthor) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);
        resolve(author);
      };

      const fail = (message: string) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);

        if (this.ws === socket) {
          this.ws = undefined;
        }

        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
          socket.close();
        }

        this.resetState();
        reject(new Error(message));
      };

      socket.onopen = () => {
        // `session_init` is our custom handshake message. It tells the server:
        // "here is the identity context I want to use for this chat session".
        const payload: SessionInitMessage = {
          type: 'session_init',
          profile,
        };

        socket.send(JSON.stringify(payload));
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let data: SocketEvent;

        try {
          data = JSON.parse(event.data) as SocketEvent;
        } catch {
          return;
        }

        this.handleEvent(data, complete);
      };

      socket.onerror = () => {
        fail('Impossible d’ouvrir la connexion au chat.');
      };

      socket.onclose = () => {
        const hadSession = this.sessionAuthorSignal() !== undefined;

        if (this.ws === socket) {
          this.ws = undefined;
        }

        this.resetState();

        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);
          reject(new Error('Connexion interrompue avant la fin du handshake.'));
          return;
        }

        if (hadSession) {
          console.log('Déconnecté');
        }
      };
    });
  }

  close(): void {
    const socket = this.ws;

    if (socket) {
      this.ws = undefined;
      socket.close();
    }

    this.resetState();
  }

  send(message: string): void {
    const socket = this.ws;
    const content = message.trim();

    if (!socket || socket.readyState !== WebSocket.OPEN || !content) {
      return;
    }

    const payload: ChatMessage = {
      type: 'chat_message',
      message: content,
    };

    socket.send(JSON.stringify(payload));
  }

  private handleEvent(
    data: SocketEvent,
    completeHandshake: (author: SessionAuthor) => void
  ): void {
    switch (data.type) {
      case 'history_sync': {
        // On remplace seulement l'historique des vrais messages. Les messages
        // système déjà affichés localement (ex: `session_ready`) restent visibles.
        const systemMessages = this.messagesSignal().filter((message) => message.type !== 'new_message');
        this.messagesSignal.set([...systemMessages, ...data.messages]);
        return;
      }
      case 'message_expired':
        // Le client ne décide jamais lui-même qu'un message a expiré.
        // Il applique simplement l'ordre envoyé par le serveur.
        this.messagesSignal.update((messages) =>
          messages.filter((message) => message.messageId !== data.messageId)
        );
        return;
      case 'session_ready':
        // `session_ready` is the exact server acknowledgment that completes the
        // handshake and defines the final author snapshot for this session.
        this.sessionAuthorSignal.set(data.author);
        this.countUsersSignal.set(data.count);
        this.messagesSignal.set([data]);
        completeHandshake(data.author);
        return;
      case 'user_joined':
      case 'user_left':
      case 'new_message':
        this.countUsersSignal.set(data.count);
        this.messagesSignal.update((messages) => [...messages, data]);
        return;
    }
  }

  /** Remet l'état client à zéro après fermeture ou échec de connexion. */
  private resetState(): void {
    this.sessionAuthorSignal.set(undefined);
    this.countUsersSignal.set(0);
    this.messagesSignal.set([]);
  }
}
