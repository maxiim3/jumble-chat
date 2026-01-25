import { Injectable, signal } from '@angular/core';
import { PORT, ROUTES } from '../../../shared/constants';
import { SocketMessageModel } from '../../../shared/socket-message.model';

@Injectable({
  providedIn: 'root',
})
export class SocketClientService {
  ws: WebSocket | undefined;
  userId = signal<string | undefined>(undefined);
  countUsers = signal(0);
  messages = signal<SocketMessageModel[]>([]);

  open() {
    if (!this.ws) {
      this.ws = new WebSocket(`ws://localhost:${PORT}${ROUTES.ws}`);
      this.ws.onopen = (event) => console.log('Connecté', event);
      this.ws.onmessage = (e: MessageEvent<string>) => {
        const data: SocketMessageModel = JSON.parse(e.data);
        console.log(data.message);

        switch (data.type) {
          case 'new_message':
            this.messages.set([...this.messages(), data]);
            break;
          case 'new_connection':
            this.userId.set(data.userId);
            this.countUsers.set(data.count);
            this.messages.set([...this.messages(), data]);
            break;
          case 'user_count':
            this.countUsers.set(data.count);
            this.messages.set([...this.messages(), data]);
        }
      };
      this.ws.onclose = () => console.log('Déconnecté');
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
      this.userId.set(undefined);
    }
  }

  send(message: string) {
    if (this.ws) {
      this.ws.send(message);
    }
  }
}
