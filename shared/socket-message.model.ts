export type MessageType = 'new_connection' | 'user_count' | 'new_message';

export interface SocketMessageModel {
  type: MessageType;
  messageId: string;
  message: string;
  userId: string;
  timestamp: number;
  count: number;
}
