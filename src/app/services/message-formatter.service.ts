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

  isCurrentUser(messageUserId: string, currentUserId: string | undefined): boolean {
    return messageUserId === currentUserId;
  }

  formatSender(messageUserId: string, currentUserId: string | undefined): string {
    return this.isCurrentUser(messageUserId, currentUserId) ? 'You' : messageUserId;
  }
}
