import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { DEFAULT_AVATAR_URL } from './services/avatar.constants';
import { SessionService } from './services/session.service';
import { SocketClientService } from './services/socket-client.service';
import { CreatePost } from './ui/create-post/create-post';
import { Post } from './ui/post/post';

@Component({
  selector: 'app-root',
  imports: [Post, CreatePost],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly client = inject(SocketClientService);
  protected readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.client.close());
  }

  protected onAvatarError(event: Event): void {
    const image = event.target;

    if (image instanceof HTMLImageElement) {
      image.onerror = null;
      image.src = DEFAULT_AVATAR_URL;
    }
  }
}
