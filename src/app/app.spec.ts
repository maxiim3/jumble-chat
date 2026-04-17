import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { SessionAuthor, SocketMessageModel } from '../../shared/socket-message.model';
import { App } from './app';
import { SessionService } from './services/session.service';
import { SocketClientService } from './services/socket-client.service';

class SocketClientServiceStub {
  readonly countUsers = signal(1).asReadonly();
  readonly messages = signal<SocketMessageModel[]>([]).asReadonly();
  readonly close = vi.fn();
}

class SessionServiceStub {
  readonly profile = signal<SessionAuthor | undefined>({
    sessionId: 'session-1',
    displayName: 'satoshi',
    avatarUrl: '/assets/ostrich-avatar.svg',
    authMode: 'guest',
  }).asReadonly();
  readonly error = signal<string | undefined>(undefined).asReadonly();
  readonly isReady = signal(true).asReadonly();
  readonly isBusy = signal(false).asReadonly();
  readonly isConnectingGuest = signal(false).asReadonly();
  readonly isConnectingNostr = signal(false).asReadonly();
  readonly joinAnonymously = vi.fn();
  readonly connectWithNostr = vi.fn();
}

describe('App', () => {
  let socketClientService: SocketClientServiceStub;

  beforeEach(async () => {
    socketClientService = new SocketClientServiceStub();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SocketClientService, useValue: socketClientService },
        { provide: SessionService, useClass: SessionServiceStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render current author', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Connected as satoshi');
  });

  it('closes the socket service on destroy', () => {
    const fixture = TestBed.createComponent(App);

    fixture.destroy();

    expect(socketClientService.close).toHaveBeenCalled();
  });
});
