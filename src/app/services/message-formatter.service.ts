import { Injectable } from '@angular/core';
import { ServerMessageType, SessionAuthor } from '../../../shared/socket-message.model';

@Injectable({
  providedIn: 'root',
})
export class MessageFormatterService {
  getContainerClass(type: ServerMessageType, isOwnMessage: boolean): string {
    switch (type) {
      case 'session_ready':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-700 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'user_joined':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-600 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'user_left':
        return 'bg-amber-50 border border-amber-200 text-amber-600 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'new_message':
        return isOwnMessage
          ? 'bg-emerald-500 text-white ml-auto max-w-xl shadow-md rounded-2xl rounded-br-md px-4 py-3'
          : 'bg-white border border-slate-200 mr-auto max-w-xl shadow-sm rounded-2xl rounded-bl-md px-4 py-3';
    }
  }

  isCurrentUser(messageSessionId: string, currentSessionId: string | undefined): boolean {
    return messageSessionId === currentSessionId;
  }

  formatSender(author: SessionAuthor, currentSessionId: string | undefined): string {
    return this.isCurrentUser(author.sessionId, currentSessionId) ? 'You' : author.displayName;
  }
}
