import { Injectable, signal } from '@angular/core';
import { ROUTES } from '../../../shared/constants';
import { SocketMessageModel } from '../../../shared/socket-message.model';
import { environment } from '../../environments/environment';

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
      const wsUrl = environment.wsUrl + ROUTES.ws;
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = (event) => console.log('Connecté', event);
      this.ws.onmessage = (e: MessageEvent<string>) => {
        const data: SocketMessageModel = JSON.parse(e.data);
        console.log(data.message);

        switch (data.type) {
          case 'new_message':
            this.messages.set([...this.messages(), data]);
            break;
          case 'new_connection': {
            if (this.userId() && data.userId !== this.userId()) break;

            this.userId.set(data.userId);
            this.countUsers.set(data.count);
            this.messages.set([...this.messages(), data]);
            break;
          }

          case 'user_joined':
          case 'user_left':
            this.countUsers.set(data.count);
            this.messages.set([...this.messages(), data]);
            break;
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
