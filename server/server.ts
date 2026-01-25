import type { ServerWebSocket } from '../shared/socket.type';
import { PORT, ROUTES } from '../shared/constants';

// Set pour garder trace de tous les clients connectés
const clients = new Set<ServerWebSocket<WebSocketData>>();

const server = Bun.serve<WebSocketData>({
  port: PORT,

  // Routes HTTP
  routes: {
    // Health check endpoint
    [ROUTES.health]: new Response('OK'),

    // Upgrade vers WebSocket sur /ws
    [ROUTES.ws]: (req) => {
      const userId = crypto.randomUUID();

      const upgraded = server.upgrade(req, {
        data: {
          userId,
          createdAt: Date.now(),
        },
      });
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      // Si upgrade réussi, Bun gère automatiquement la réponse
    },
  },

  // Configuration WebSocket
  websocket: {
    open(ws) {
      clients.add(ws);
      console.log(`Client connecté: ${ws.data.userId} (${clients.size} clients total)`);

      // Envoyer un message de bienvenue
      ws.send(
        JSON.stringify({
          type: 'connected',
          userId: ws.data.userId,
          timestamp: Date.now(),
        }),
      );
    },

    message(ws, message) {
      // TODO(human): Implémenter la logique de traitement des messages
      // Le message peut être du texte ou un Buffer
      // Voir les instructions ci-dessous pour les différents types à gérer
      console.log(message);
    },

    close(ws) {
      clients.delete(ws);
      console.log(`Client déconnecté: ${ws.data.userId} (${clients.size} clients restants)`);
    },
  },
});

console.log(`🚀 Serveur WebSocket démarré sur ws://localhost:${server.port}/ws`);
