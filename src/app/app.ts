import { Component, DestroyRef, inject, signal } from '@angular/core';
import { SocketClientService } from './services/socket-client.service';
import { Post } from './ui/post/post';
import { CreatePost } from './ui/create-post/create-post';

@Component({
  selector: 'app-root',
  imports: [Post, CreatePost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('jumble-chat');
  protected readonly client = inject(SocketClientService);
  protected destroyRef = inject(DestroyRef);

  constructor() {
    this.client.open();
    this.destroyRef.onDestroy(() => this.client.close());
  }
}
