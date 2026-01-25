import { Component, DestroyRef, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { SocketClientService } from './services/socket-client.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
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
