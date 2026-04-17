import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MESSAGE_TTL_MS, pruneActiveMessages } from '../../../shared/message-retention';
import type {
  SessionAuthor,
  SessionInitProfile,
  SocketEvent,
  UserMessageModel,
} from '../../../shared/socket-message.model';
import { SocketClientService } from './socket-client.service';

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = WebSocket.OPEN;
  readonly send = vi.fn<(message: string) => void>();
  readonly close = vi.fn(() => this.onclose?.());

  emit(event: SocketEvent): void {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }
}

function createUserMessage(overrides: Partial<UserMessageModel> = {}): UserMessageModel {
  return {
    type: 'new_message',
    messageId: 'message-1',
    author: {
      sessionId: 'session-1',
      displayName: 'satoshi',
      avatarUrl: '/assets/ostrich-avatar.svg',
      authMode: 'guest',
    },
    timestamp: 1_000,
    expiresAt: 1_000 + MESSAGE_TTL_MS,
    message: 'hello',
    count: 1,
    ...overrides,
  };
}

const GUEST_PROFILE: SessionInitProfile = {
  authMode: 'guest',
};

const SESSION_AUTHOR: SessionAuthor = {
  sessionId: 'session-1',
  displayName: 'satoshi',
  avatarUrl: '/assets/ostrich-avatar.svg',
  authMode: 'guest',
};

const SESSION_READY_EVENT = {
  type: 'session_ready',
  messageId: 'system-1',
  author: SESSION_AUTHOR,
  timestamp: 900,
  message: 'Connected as satoshi',
  count: 1,
} as const;

describe('SocketClientService', () => {
  let service: SocketClientService;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    vi.stubGlobal(
      'WebSocket',
      vi.fn(function MockedWebSocket() {
        return mockWebSocket as unknown as WebSocket;
      }) as unknown as typeof WebSocket
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(SocketClientService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('hydrates history and removes expired messages from socket events', () => {
    const activeMessage = createUserMessage();

    void service.open(GUEST_PROFILE);
    mockWebSocket.onopen?.();
    mockWebSocket.emit(SESSION_READY_EVENT);
    mockWebSocket.emit({
      type: 'history_sync',
      messages: [activeMessage],
    });

    expect(service.messages()).toEqual([SESSION_READY_EVENT, activeMessage]);

    mockWebSocket.emit({
      type: 'message_expired',
      messageId: activeMessage.messageId,
    });

    expect(service.messages()).toEqual([SESSION_READY_EVENT]);
  });

  it('updates connection state from handshake events and resets on close', async () => {
    const openPromise = service.open(GUEST_PROFILE);

    mockWebSocket.onopen?.();
    mockWebSocket.emit({
      ...SESSION_READY_EVENT,
      count: 2,
    });

    await expect(openPromise).resolves.toEqual(SESSION_AUTHOR);

    expect(service.currentAuthor()).toEqual(SESSION_AUTHOR);
    expect(service.countUsers()).toBe(2);
    expect(service.messages()).toHaveLength(1);

    service.close();

    expect(service.currentAuthor()).toBeUndefined();
    expect(service.countUsers()).toBe(0);
    expect(service.messages()).toEqual([]);
  });

  it('prunes expired and overflow messages with FIFO eviction', () => {
    const staleMessage = createUserMessage({
      messageId: 'expired',
      timestamp: 10,
      expiresAt: 20,
    });
    const firstActiveMessage = createUserMessage({
      messageId: 'oldest-active',
      timestamp: 30,
      expiresAt: 200,
    });
    const newestMessage = createUserMessage({
      messageId: 'newest-active',
      timestamp: 40,
      expiresAt: 300,
    });

    const result = pruneActiveMessages(
      [staleMessage, firstActiveMessage, newestMessage],
      100,
      1
    );

    expect(result.activeMessages).toEqual([newestMessage]);
    expect(result.removedMessageIds).toEqual(['expired', 'oldest-active']);
  });
});
