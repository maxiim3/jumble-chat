import type { UserMessageModel } from './socket-message.model';

/** Fenêtre de visibilité d'un message utilisateur : 21 minutes. */
export const MESSAGE_TTL_MS = 21 * 60 * 1000;

/** Nombre maximal de messages utilisateur conservés en mémoire. */
export const MAX_ACTIVE_MESSAGES = 200;

export interface PruneActiveMessagesResult {
  activeMessages: UserMessageModel[];
  removedMessageIds: string[];
}

/**
 * Applique les deux règles de rétention du chat éphémère :
 * 1. supprimer les messages expirés (`expiresAt <= now`)
 * 2. garder au plus `maxActiveMessages`, en supprimant les plus anciens
 *
 * La fonction reste pure : elle ne modifie pas le tableau reçu, elle renvoie un
 * nouvel état et la liste des `messageId` supprimés pour que le serveur puisse
 * notifier tous les clients.
 */
export function pruneActiveMessages(
  activeMessages: UserMessageModel[],
  now: number,
  maxActiveMessages = MAX_ACTIVE_MESSAGES
): PruneActiveMessagesResult {
  const unexpiredMessages: UserMessageModel[] = [];
  const removedMessageIds: string[] = [];

  for (const message of activeMessages) {
    if (message.expiresAt <= now) {
      removedMessageIds.push(message.messageId);
      continue;
    }

    unexpiredMessages.push(message);
  }

  if (unexpiredMessages.length <= maxActiveMessages) {
    return {
      activeMessages: unexpiredMessages,
      removedMessageIds,
    };
  }

  // FIFO: quand on dépasse le cap, on retire d'abord les plus anciens messages.
  const overflowCount = unexpiredMessages.length - maxActiveMessages;
  const overflowMessages = unexpiredMessages.slice(0, overflowCount);

  return {
    activeMessages: unexpiredMessages.slice(overflowCount),
    removedMessageIds: [
      ...removedMessageIds,
      ...overflowMessages.map((message) => message.messageId),
    ],
  };
}
