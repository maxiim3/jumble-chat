import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SocketMessageModel } from '../../../../shared/socket-message.model';
import { DEFAULT_AVATAR_URL } from '../../services/avatar.constants';
import { MessageFormatterService } from '../../services/message-formatter.service';

@Component({
  selector: 'app-post',
  imports: [],
  templateUrl: './post.html',
  styleUrl: './post.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Post {
  private readonly formatter = inject(MessageFormatterService);
  protected readonly fallbackAvatarUrl = DEFAULT_AVATAR_URL;

  /** The message to display */
  message = input.required<SocketMessageModel>();

  /** Current session ID to identify own messages */
  currentSessionId = input<string | undefined>();

  /** Whether this message was sent by the current user */
  isOwnMessage = computed(() =>
    this.formatter.isCurrentUser(this.message().author.sessionId, this.currentSessionId())
  );

  /** Container class based on message type and ownership */
  containerClass = computed(() =>
    this.formatter.getContainerClass(this.message().type, this.isOwnMessage())
  );

  /** Formatted sender name (shows "You" for own messages) */
  formattedSender = computed(() =>
    this.formatter.formatSender(this.message().author, this.currentSessionId())
  );

  senderClass = computed(() =>
    this.isOwnMessage() ? 'text-xs font-medium text-emerald-100' : 'text-xs font-medium text-slate-500'
  );

  onAvatarError(event: Event): void {
    const image = event.target;

    if (image instanceof HTMLImageElement) {
      image.onerror = null;
      image.src = this.fallbackAvatarUrl;
    }
  }
}
