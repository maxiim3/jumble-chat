import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { SocketClientService } from '../../services/socket-client.service';

@Component({
  selector: 'app-create-post',
  imports: [ReactiveFormsModule],
  templateUrl: './create-post.html',
  styleUrl: './create-post.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePost {
  private readonly client = inject(SocketClientService);

  /** Form control for the message input with required validation */
  messageControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  /** Handle form submission */
  onSubmit(): void {
    // TODO(human): Implement the submission logic
    // - Check if the form is valid
    // - Send the message via client.send()
    // - Reset the form after sending
  }

  /** Handle Enter key to submit */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
