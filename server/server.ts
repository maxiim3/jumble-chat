import type { ServerWebSocket } from '../shared/socket.type';
import type { SocketMessageModel } from '../shared/socket-message.model';
import { PORT, ROUTES } from '../shared/constants';
import { generateUsername } from 'friendly-username-generator';

const clients = new Set<ServerWebSocket<WebSocketData>>();
const ids = new Set<string>();

const server = Bun.serve<WebSocketData>({
  port: PORT,
  routes: {
    [ROUTES.health]: new Response('OK'),
    [ROUTES.ws]: (req) => {
      let userId = generateUsername();

      while (ids.has(userId)) {
        userId = generateUsername();
      }

      ids.add(userId); // Reserve immediately to prevent race condition

      const upgraded = server.upgrade(req, {
        data: {
          userId,
          createdAt: Date.now(),
        },
      });

      if (!upgraded) {
        ids.delete(userId); // Release the reserved ID
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      // Si upgrade réussi, Bun gère automatiquement la réponse
    },
  },
  websocket: {
    open(ws) {
      clients.add(ws);

      const client_id = ws.data.userId;

      console.log(`Client connecté: ${client_id} (${clients.size} clients total)`);

      // Envoyer un message de bienvenue
      const notification_to_user: SocketMessageModel = {
        type: 'new_connection',
        messageId: crypto.randomUUID(),
        userId: client_id,
        timestamp: Date.now(),
        message: `Client connecté: ${ws.data.userId} (${clients.size} clients total)`,
        count: clients.size,
      };

      ws.send(JSON.stringify(notification_to_user));

      clients.forEach((client) => {
        if (client.userId === client_id) return;

        const notify_others: SocketMessageModel = {
          type: 'user_count',
          messageId: crypto.randomUUID(),
          userId: client.userId,
          timestamp: Date.now(),
          message: `${client_id} joined - (${clients.size} clients total)`,
          count: clients.size,
        };

        client.send(JSON.stringify(notify_others));
      });
    },

    message(ws, message: string) {
      clients.forEach((client) => {
        const msg: SocketMessageModel = {
          type: 'new_message',
          messageId: crypto.randomUUID(),
          userId: ws.data.userId,
          timestamp: Date.now(),
          message: message,
          count: clients.size,
        };

        client.send(JSON.stringify(msg));
      });
    },

    close(ws) {
      clients.delete(ws);
      ids.delete(ws.data.userId);

      console.log(`Client déconnecté: ${ws.data.userId} (${clients.size} clients restants)`);

      clients.forEach((client) => {
        const notify_others: SocketMessageModel = {
          type: 'user_count',
          messageId: crypto.randomUUID(),
          userId: client.userId,
          timestamp: Date.now(),
          message: `${ws.data.userId} left the chat - (${clients.size} clients total)`,
          count: clients.size,
        };

        client.send(JSON.stringify(notify_others));
      });
    },
  },
});

console.log(`🚀 Serveur WebSocket démarré sur ws://localhost:${server.port}/ws`);
