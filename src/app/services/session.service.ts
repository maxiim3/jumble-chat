import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthMode } from '../../../shared/socket-message.model';
import { NostrAuthService } from './nostr-auth.service';
import { SocketClientService } from './socket-client.service';

type EntryState = 'choosing' | 'connecting-guest' | 'connecting-nostr' | 'ready';

@Injectable({
  providedIn: 'root',
})
/**
 * Orchestrates the app entry flow.
 *
 * This is the state machine that sits between the modal UI and the low-level
 * socket / Nostr services.
 *
 * Why do we need it?
 * - the app starts before the user has joined the chat
 * - the user must choose between guest and Nostr
 * - only one of those flows should run at a time
 * - the chat must not open until the chosen flow finishes successfully
 */
export class SessionService {
  private readonly client = inject(SocketClientService);
  private readonly nostrAuth = inject(NostrAuthService);
  private readonly entryStateSignal = signal<EntryState>('choosing');
  private readonly authModeSignal = signal<AuthMode | undefined>(undefined);
  private readonly errorSignal = signal<string | undefined>(undefined);

  readonly entryState = this.entryStateSignal.asReadonly();
  readonly authMode = this.authModeSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly profile = computed(() => this.client.currentAuthor());
  readonly isBusy = computed(() => this.entryStateSignal().startsWith('connecting'));
  readonly isReady = computed(
    () => this.entryStateSignal() === 'ready' && this.profile() !== undefined
  );
  readonly isConnectingGuest = computed(() => this.entryStateSignal() === 'connecting-guest');
  readonly isConnectingNostr = computed(() => this.entryStateSignal() === 'connecting-nostr');

  constructor() {
    // If the socket disappears after a successful login, fall back to the modal
    // instead of leaving the UI in a half-connected state.
    effect(() => {
      if (this.entryStateSignal() === 'ready' && this.profile() === undefined) {
        this.authModeSignal.set(undefined);
        this.errorSignal.set('La connexion au chat a été perdue.');
        this.entryStateSignal.set('choosing');
      }
    });
  }

  /**
   * Anonymous path: skip Nostr entirely and let the server create the identity.
   *
   * The frontend only says "I want a guest session". The backend then chooses
   * the random display name and default ostrich avatar.
   */
  async joinAnonymously(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.errorSignal.set(undefined);
    this.authModeSignal.set('guest');
    this.entryStateSignal.set('connecting-guest');

    try {
      await this.client.open({ authMode: 'guest' });
      this.entryStateSignal.set('ready');
    } catch (error) {
      this.handleConnectionError(error, 'Impossible de rejoindre anonymement pour le moment.');
    }
  }

  /**
   * Nostr path: prepare the identity first, then enter the chat with it.
   *
   * This ordering matters: the WebSocket handshake expects a ready-made profile.
   * We do not open the chat first and "upgrade" later in this implementation.
   */
  async connectWithNostr(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.errorSignal.set(undefined);
    this.authModeSignal.set('nostr');
    this.entryStateSignal.set('connecting-nostr');

    try {
      const profile = await this.nostrAuth.connect();
      await this.client.open(profile);
      this.entryStateSignal.set('ready');
    } catch (error) {
      this.handleConnectionError(
        error,
        'Impossible de finaliser la connexion Nostr pour le moment.'
      );
    }
  }

  disconnect(): void {
    this.client.close();
    this.authModeSignal.set(undefined);
    this.errorSignal.set(undefined);
    this.entryStateSignal.set('choosing');
  }

  /**
   * Shared rollback path used when guest or Nostr connection fails.
   *
   * We always return to `choosing` so the blocking modal becomes visible again
   * and the user can retry or switch to anonymous mode.
   */
  private handleConnectionError(error: unknown, fallbackMessage: string): void {
    this.client.close();
    this.authModeSignal.set(undefined);
    this.errorSignal.set(error instanceof Error ? error.message : fallbackMessage);
    this.entryStateSignal.set('choosing');
  }
}
