import { Injectable } from '@angular/core';
import { MessageType } from '../../../shared/socket-message.model';

@Injectable({
  providedIn: 'root',
})
export class MessageFormatterService {
  getColorClass(type: MessageType): string {
    switch (type) {
      case 'new_connection':
        return 'text-emerald-600';
      case 'user_joined':
        return 'text-emerald-500';
      case 'user_left':
        return 'text-amber-500';
      case 'new_message':
        return 'text-slate-700';
    }
  }

  getContainerClass(type: MessageType, isOwnMessage: boolean): string {
    switch (type) {
      case 'new_connection':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-700 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'user_joined':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-600 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'user_left':
        return 'bg-amber-50 border border-amber-200 text-amber-600 text-center mx-auto max-w-xs px-4 py-2 rounded-full text-sm';
      case 'new_message':
        return isOwnMessage
          ? 'bg-emerald-500 text-white ml-auto max-w-md shadow-md rounded-2xl rounded-br-md px-4 py-3'
          : 'bg-white border border-slate-200 mr-auto max-w-md shadow-sm rounded-2xl rounded-bl-md px-4 py-3';
    }
  }

  isCurrentUser(messageUserId: string, currentUserId: string | undefined): boolean {
    return messageUserId === currentUserId;
  }

  formatSender(messageUserId: string, currentUserId: string | undefined): string {
    return this.isCurrentUser(messageUserId, currentUserId) ? 'You' : messageUserId;
  }
}
