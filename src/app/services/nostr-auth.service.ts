import { Injectable } from '@angular/core';
import {
  NostrSignedEvent,
  SessionInitProfile,
} from '../../../shared/socket-message.model';
import { DEFAULT_AVATAR_URL } from './avatar.constants';

/**
 * Shape of a Nostr profile event (`kind: 0`) once its JSON content is parsed.
 *
 * In Nostr, profile metadata is not stored in a central user table. Instead,
 * users publish events to relays, and clients read those events back.
 */
interface NostrMetadata {
  display_name?: string;
  name?: string;
  picture?: string;
}

/**
 * Minimal event shape accepted by `window.nostr.signEvent(...)`.
 *
 * The extension receives this unsigned object, signs it with the user's private
 * key, then returns a full signed event containing fields such as `id`, `pubkey`
 * and `sig`.
 */
interface UnsignedNostrEvent {
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/**
 * Tiny subset of NIP-07 used by this project.
 *
 * Browser extensions like Alby or nos2x expose `window.nostr` and let web apps:
 * - ask for the current public key
 * - ask the extension to sign an event without ever exposing the private key
 */
interface NostrCapability {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrSignedEvent>;
}

interface NostrWindow extends Window {
  nostr?: NostrCapability;
}

const NOSTR_RELAYS = ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nos.lol'];

@Injectable({
  providedIn: 'root',
})
/**
 * Encapsulates everything that is specific to Nostr.
 *
 * Nostr basics for this app:
 * - a user is identified by a public key (`pubkey`)
 * - a browser extension exposes that key through `window.nostr`
 * - the extension can also sign events to prove control of the private key
 * - relays are public servers where profile events can be read
 *
 * The rest of the app does not need to understand those details. It only needs
 * a `SessionInitProfile`, which is our app-level payload for entering the chat.
 */
export class NostrAuthService {
  /**
   * Builds the identity payload later sent in `session_init`.
   *
   * Step by step:
   * 1. read the user's public key from the Nostr extension
   * 2. ask the extension to sign a proof event
   * 3. query relays for `kind: 0` profile metadata
   * 4. derive app-friendly fields such as `displayName` and `avatarUrl`
   *
   * If the profile metadata is missing, login still succeeds. We fall back to a
   * short pubkey-based name and the local ostrich avatar.
   */
  async connect(): Promise<SessionInitProfile> {
    const extension = (window as NostrWindow).nostr;

    if (!extension) {
      throw new Error('Aucune extension Nostr détectée dans ce navigateur.');
    }

    const pubkey = await extension.getPublicKey();
    const proof = await extension.signEvent(this.createProofEvent());
    const metadata = await this.fetchProfile(pubkey);

    return {
      authMode: 'nostr',
      pubkey,
      proof,
      displayName: this.resolveDisplayName(pubkey, metadata),
      avatarUrl: this.resolveAvatarUrl(metadata?.picture),
    };
  }

  /**
   * Creates a client-side proof event inspired by NIP-42 patterns.
   *
   * Why sign an event at all?
   * - reading a pubkey only tells us which key the extension wants to expose
   * - signing proves that the extension can use the corresponding private key
   *
   * The event kind `22242` is commonly used for relay authentication flows.
   * Here we reuse the idea as a proof of identity for our own app.
   *
   * Important limitation: the server receives this proof today, but does not
   * verify it yet. So this is not full server-side cryptographic auth yet.
   */
  private createProofEvent(): UnsignedNostrEvent {
    return {
      created_at: Math.floor(Date.now() / 1000),
      kind: 22242,
      tags: [
        ['relay', window.location.origin],
        ['challenge', crypto.randomUUID()],
      ],
      content: 'jumble-chat login',
    };
  }

  /**
   * Returns the first relay response that contains a usable kind:0 profile.
   *
   * Nostr clients usually query several relays because any single relay may be
   * offline, slow, or simply not have the user's metadata.
   */
  private async fetchProfile(pubkey: string): Promise<NostrMetadata | undefined> {
    try {
      return await Promise.any(
        NOSTR_RELAYS.map(async (relayUrl) => {
          const profile = await this.fetchProfileFromRelay(relayUrl, pubkey);

          if (!profile) {
            throw new Error(`No profile on ${relayUrl}`);
          }

          return profile;
        })
      );
    } catch {
      return undefined;
    }
  }

  /**
   * Opens a temporary relay socket only to query the user's profile metadata.
   *
   * Relay protocol is event-based. We create a short-lived subscription asking:
   * "give me the latest `kind: 0` event authored by this pubkey".
   */
  private fetchProfileFromRelay(
    relayUrl: string,
    pubkey: string
  ): Promise<NostrMetadata | undefined> {
    return new Promise((resolve) => {
      const relay = new WebSocket(relayUrl);
      const subId = `profile-${crypto.randomUUID()}`;
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        settle(undefined);
      }, 4000);

      const settle = (profile: NostrMetadata | undefined) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);

        if (relay.readyState === WebSocket.OPEN) {
          relay.send(JSON.stringify(['CLOSE', subId]));
        }

        relay.close();
        resolve(profile);
      };

      relay.onopen = () => {
        // `REQ` is the standard relay message for opening a subscription.
        // kinds:[0] means profile metadata, authors:[pubkey] filters by user.
        relay.send(
          JSON.stringify(['REQ', subId, { kinds: [0], authors: [pubkey], limit: 1 }])
        );
      };

      relay.onmessage = (event: MessageEvent<string>) => {
        let payload: unknown;

        try {
          payload = JSON.parse(event.data) as unknown;
        } catch {
          return;
        }

        if (!Array.isArray(payload)) {
          return;
        }

        const [type, subscriptionId, eventPayload] = payload;

        if (type === 'EVENT' && subscriptionId === subId && this.hasContent(eventPayload)) {
          try {
            settle(JSON.parse(eventPayload.content) as NostrMetadata);
          } catch {
            settle(undefined);
          }
          return;
        }

        if (type === 'EOSE' && subscriptionId === subId) {
          settle(undefined);
        }
      };

      relay.onerror = () => {
        settle(undefined);
      };

      relay.onclose = () => {
        settle(undefined);
      };
    });
  }

  private hasContent(value: unknown): value is { content: string } {
    return typeof value === 'object' && value !== null && 'content' in value;
  }

  /**
   * Falls back to a short pubkey label when the profile has no displayable name.
   *
   * This avoids blocking login just because the user never set `display_name`
   * or `name` on Nostr.
   */
  private resolveDisplayName(pubkey: string, metadata: NostrMetadata | undefined): string {
    const displayName = metadata?.display_name?.trim() || metadata?.name?.trim();
    return displayName || `nostr-${pubkey.slice(0, 8)}`;
  }

  /**
   * Keeps only safe HTTP(S) avatars, otherwise we use the local ostrich asset.
   *
   * We do not trust arbitrary strings from relay metadata to be valid image URLs.
   */
  private resolveAvatarUrl(picture: string | undefined): string {
    const candidate = picture?.trim();

    if (!candidate) {
      return DEFAULT_AVATAR_URL;
    }

    try {
      const url = new URL(candidate);
      return url.protocol === 'https:' || url.protocol === 'http:'
        ? candidate
        : DEFAULT_AVATAR_URL;
    } catch {
      return DEFAULT_AVATAR_URL;
    }
  }
}
