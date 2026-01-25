import { Component, signal } from '@angular/core';
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
  client = inject(SocketClientService);

  constructor() {
    this.client.open();
  }
}
