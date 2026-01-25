import { effect, Injectable, signal } from '@angular/core';
import { PORT, ROUTES } from '../../../shared/constants';
import { SocketMessageModel } from '../models/socket-message.model';

@Injectable({
  providedIn: 'root',
})
export class SocketClientService {
  ws: WebSocket | undefined;
  userId = signal<string | undefined>(undefined);

  constructor() {
    effect((clean) => {
      if (this.ws) {
        this.ws.onopen = (event) => console.log('Connecté', event);
        this.ws.onmessage = (e: MessageEvent<SocketMessageModel>) => {
          console.log('Message', e.data.message, e.data.userId);
          this.userId.set(e.data.userId);
        };
        this.ws.onclose = () => console.log('Déconnecté');
      }
      clean(() => {
        if (this.ws) {
          this.ws.close();
        }
      });
    });
  }

  open() {
    if (!this.ws) {
      this.ws = new WebSocket(`ws://localhost:${PORT}${ROUTES.ws}`);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  send(message: string) {
    if (this.ws) {
      this.ws.send(message);
    }
  }
}
