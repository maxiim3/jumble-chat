import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PORT, ROUTES } from '../../shared/constants';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('jumble-chat');

  constructor() {
    this.connect();
  }

  connect() {
    const ws = new WebSocket(`ws://localhost:${PORT}${ROUTES.ws}`);

    ws.onopen = () => console.log('Connecté');
    ws.send('coucou');
    ws.onmessage = (e) => console.log('Message', e);
    ws.onclose = () => console.log('Déconnecté');
  }
}
