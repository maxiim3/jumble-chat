export type MessageType = 'new_connection' | 'user_joined' | 'user_left' | 'new_message';

export interface SocketMessageModel {
  type: MessageType;
  messageId: string;
  message: string;
  userId: string;
  timestamp: number;
  count: number;
}

// Types pour les données associées à chaque WebSocket
export interface WebSocketData {
  userId: string;
  createdAt: number;
}
