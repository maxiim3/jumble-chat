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
    // Early return pattern : on sort immédiatement si le formulaire est invalide
    // C'est plus lisible que d'imbriquer toute la logique dans un if
    if (this.messageControl.invalid) {
      return;
    }

    // On récupère la valeur et on trim les espaces
    // Cela évite d'envoyer des messages vides comme "   "
    const message = this.messageControl.value.trim();

    // Double vérification : même si le validateur required passe,
    // un message composé uniquement d'espaces serait vide après trim
    if (!message) {
      return;
    }

    // On envoie le message via le WebSocket
    // Le service gère la connexion et l'envoi
    this.client.send(message);

    // Reset APRÈS l'envoi : si send() échouait, on garde le message
    // pour que l'utilisateur puisse réessayer sans le retaper
    this.messageControl.reset();
  }

  /** Handle Enter key to submit */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
