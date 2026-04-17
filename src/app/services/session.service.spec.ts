import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type {
  NostrSignedEvent,
  SessionAuthor,
  SessionInitProfile,
} from '../../../shared/socket-message.model';
import { NostrAuthService } from './nostr-auth.service';
import { SessionService } from './session.service';
import { SocketClientService } from './socket-client.service';

class SocketClientServiceStub {
  readonly currentAuthor = signal<SessionAuthor | undefined>(undefined);
  readonly open = vi.fn(async (profile: SessionInitProfile) => {
    const author: SessionAuthor = {
      sessionId: 'session-1',
      displayName: profile.displayName ?? 'anonymous-ostrich',
      avatarUrl: profile.avatarUrl ?? '/assets/ostrich-avatar.svg',
      authMode: profile.authMode,
      pubkey: profile.pubkey,
    };

    this.currentAuthor.set(author);
    return author;
  });
  readonly close = vi.fn(() => {
    this.currentAuthor.set(undefined);
  });
}

class NostrAuthServiceStub {
  readonly connect = vi.fn(async () => ({
    authMode: 'nostr' as const,
    displayName: 'Nostr Alice',
    avatarUrl: '/assets/ostrich-avatar.svg',
    pubkey: 'a'.repeat(64),
    proof: {
      id: 'proof-id',
      pubkey: 'a'.repeat(64),
      created_at: 1,
      kind: 22242,
      tags: [],
      content: 'jumble-chat login',
      sig: 'b'.repeat(128),
    } satisfies NostrSignedEvent,
  }));
}

describe('SessionService', () => {
  let service: SessionService;
  let socketClient: SocketClientServiceStub;
  let nostrAuth: NostrAuthServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: SocketClientService, useClass: SocketClientServiceStub },
        { provide: NostrAuthService, useClass: NostrAuthServiceStub },
      ],
    });

    service = TestBed.inject(SessionService);
    socketClient = TestBed.inject(SocketClientService) as unknown as SocketClientServiceStub;
    nostrAuth = TestBed.inject(NostrAuthService) as unknown as NostrAuthServiceStub;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in choosing mode', () => {
    expect(service.entryState()).toBe('choosing');
    expect(service.isReady()).toBe(false);
  });

  it('opens a guest session', async () => {
    await service.joinAnonymously();

    expect(socketClient.open).toHaveBeenCalledWith({ authMode: 'guest' });
    expect(service.isReady()).toBe(true);
    expect(service.profile()?.authMode).toBe('guest');
  });

  it('keeps the modal open when nostr authentication fails', async () => {
    nostrAuth.connect.mockRejectedValue(new Error('Extension Nostr introuvable.'));

    await service.connectWithNostr();

    expect(service.isReady()).toBe(false);
    expect(service.entryState()).toBe('choosing');
    expect(service.error()).toBe('Extension Nostr introuvable.');
  });
});
