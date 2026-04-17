import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { SocketMessageModel } from '../../../../shared/socket-message.model';
import { Post } from './post';

const MESSAGE: SocketMessageModel = {
  type: 'new_message',
  messageId: 'message-1',
  author: {
    sessionId: 'session-1',
    displayName: 'satoshi',
    avatarUrl: '/assets/ostrich-avatar.svg',
    authMode: 'guest',
  },
  timestamp: 1_000,
  expiresAt: 2_000,
  message: 'hello world',
  count: 1,
};

describe('Post', () => {
  let component: Post;
  let fixture: ComponentFixture<Post>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Post],
    }).compileComponents();

    fixture = TestBed.createComponent(Post);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', MESSAGE);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
