import type { SocketMessageModel, WebSocketData } from '../shared/socket-message.model';
import { ROUTES } from '../shared/constants';
import { generateUsername } from 'friendly-username-generator';
import type { ServerWebSocket } from 'bun';
import { join } from 'path';

// Railway injecte PORT automatiquement
const PORT = Number(process.env['PORT']) || 3200;

const clients = new Set<ServerWebSocket<WebSocketData>>();
const ids = new Set<string>();

// Chemin vers le build Angular
const STATIC_DIR = join(import.meta.dir, '../dist/jumble-chat/browser');

const server = Bun.serve<WebSocketData>({
  port: PORT,

  // Servir les fichiers statiques Angular + API
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === ROUTES.health) {
      return new Response('OK');
    }

    // WebSocket upgrade
    if (url.pathname === ROUTES.ws) {
      let userId = generateUsername();

      while (ids.has(userId)) {
        userId = generateUsername();
      }

      ids.add(userId);

      const upgraded = server.upgrade(req, {
        data: {
          userId,
          createdAt: Date.now(),
        },
      });

      if (!upgraded) {
        ids.delete(userId);
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      return undefined;
    }

    // Servir les fichiers statiques
    const filePath = join(STATIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback - renvoyer index.html pour le routing Angular
    const indexFile = Bun.file(join(STATIC_DIR, 'index.html'));
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      clients.add(ws);

      const client_id = ws.data.userId;

      console.log(`Client connecté: ${client_id} (${clients.size} clients total)`);

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
        if (client.data.userId === client_id) return;

        const notify_others: SocketMessageModel = {
          type: 'user_joined',
          messageId: crypto.randomUUID(),
          userId: client_id,
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
          type: 'user_left',
          messageId: crypto.randomUUID(),
          userId: ws.data.userId,
          timestamp: Date.now(),
          message: `${ws.data.userId} left the chat - (${clients.size} clients total)`,
          count: clients.size,
        };

        client.send(JSON.stringify(notify_others));
      });
    },
  },
});

console.log(`🚀 Serveur démarré sur http://localhost:${server.port}`);
console.log(`   WebSocket: ws://localhost:${server.port}${ROUTES.ws}`);
