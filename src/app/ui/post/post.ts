import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SocketMessageModel } from '../../../../shared/socket-message.model';
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

  /** The message to display */
  message = input.required<SocketMessageModel>();

  /** Current user ID to identify own messages */
  currentUserId = input<string | undefined>();

  /** Whether this message was sent by the current user */
  isOwnMessage = computed(() =>
    this.formatter.isCurrentUser(this.message().userId, this.currentUserId())
  );

  /** CSS class based on message type */
  colorClass = computed(() => this.formatter.getColorClass(this.message().type));

  /** Container class based on message type and ownership */
  containerClass = computed(() =>
    this.formatter.getContainerClass(this.message().type, this.isOwnMessage())
  );

  /** Formatted sender name (shows "You" for own messages) */
  formattedSender = computed(() =>
    this.formatter.formatSender(this.message().userId, this.currentUserId())
  );
}
