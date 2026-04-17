# Design Spec: Ephemeral Messaging Lot A

## Summary

This spec defines Lot A for ephemeral messaging in Jumble Chat.

Scope is limited to backend retention and client synchronization:
- user messages are visible for 21 minutes
- only active user messages are replayed to newly connected clients
- expired messages disappear in real time for all connected clients
- the server remains the single source of truth
- a hard cap of 200 active user messages is enforced with FIFO eviction

Out of scope for this lot:
- countdown UI
- animated message border
- message boost or refresh actions
- database persistence

## Decisions

- Retention applies only to `new_message` events.
- System events (`new_connection`, `user_joined`, `user_left`) are broadcast live but never persisted or replayed.
- Message lifetime is 21 minutes from server creation time.
- If more than 200 active user messages exist, the oldest messages are removed first.
- Message expiration is silent. No system event is shown to users.
- The server is authoritative for expiration and eviction.

## Current State

The current server broadcasts live messages but does not store replayable history. The Angular client appends incoming socket events into a single `messages` signal.

This makes the feature straightforward to add because:
- the backend already has one central WebSocket handler
- the frontend already has one central socket service
- state is already in memory, which matches ephemeral retention

## Architecture

### Server Memory Model

Add an in-memory FIFO collection for active user messages only.

Each stored item contains:
- `messageId`
- `userId`
- `message`
- `timestamp`
- `expiresAt`

Retention should be driven by explicit server constants, for example:
- `MESSAGE_TTL_MS = 21 * 60 * 1000`
- `MAX_ACTIVE_MESSAGES = 200`

User-count data remains relevant only for live system events such as `new_connection`, `user_joined`, and `user_left`.

### WebSocket Contract

Keep the existing live event types and add two technical events:
- `history_sync`: sent only to the newly connected client with the list of still-active user messages
- `message_expired`: sent to all connected clients when a stored user message is removed by TTL or FIFO cap

Recommended shared contract shape:
- `ChatMessageEvent` for `new_message`, `new_connection`, `user_joined`, `user_left`
- `HistorySyncEvent` with `messages: UserMessage[]`
- `MessageExpiredEvent` with `messageId`
- union type `SocketEvent`

This is slightly larger than the current single interface, but it keeps the protocol explicit and avoids optional-field drift.

## Server Behavior

### On Connect

When a client connects, the server should:
1. create and register the session user as today
2. run message pruning before any replay
3. send `history_sync` with active user messages only
4. send `new_connection` to the connected client
5. broadcast `user_joined` to other clients

This preserves the current live behavior while adding history hydration.

### On User Message

When a client sends a chat message, the server should:
1. run message pruning
2. create a `new_message` event with `timestamp = now` and `expiresAt = now + 21 minutes`
3. append it to the active FIFO store
4. evict oldest stored user messages until the store size is at most 200
5. broadcast the new message to all connected clients
6. broadcast `message_expired` for each message removed during eviction

### Periodic Expiration

Run a lightweight server interval every 1 second to prune expired messages.

This interval should:
1. remove every stored message where `expiresAt <= now`
2. broadcast `message_expired` for each removed message

One-second granularity is accurate enough for this product requirement and is simpler than managing a timer per message.

### Central Pruning Function

Use one function for all retention logic, for example `pruneMessages(now)`.

Responsibilities:
- remove TTL-expired messages
- enforce the max size of 200
- return removed message IDs and removal reason if needed for logging

Calling this function from connect, send, and interval keeps behavior consistent.

## Client Behavior

### Socket Service

Update the Angular socket client service to handle the expanded protocol:
- on `history_sync`, replace the local chat history with the received active user messages
- on `new_message`, append the message
- on `message_expired`, remove the matching message by `messageId`
- on `new_connection`, `user_joined`, and `user_left`, preserve current behavior

The client must not locally decide whether a message is expired. It only reacts to server events.

### Local State Rules

To avoid stale state across reconnects:
- clear `messages` on `close()`
- clear `userId` on `close()` as today
- let the next `history_sync` rebuild state from the server

This keeps the client aligned with the server after refreshes and reconnects.

## Error Handling

- If pruning runs when no messages are active, it should be a no-op.
- If a client receives `message_expired` for a message already absent locally, the client should ignore it.
- If a client reconnects after missing expiration events, `history_sync` restores the correct active set.
- If the server restarts, all ephemeral history is lost. This is acceptable for Lot A.

## Testing Strategy

### Manual Verification

Validate these flows:
1. open two browser tabs and send a message from one tab; both tabs receive it
2. refresh a tab and confirm it receives only still-active user messages
3. run with a test-friendly TTL override or unit-test clock and confirm the message disappears from both tabs
4. send enough messages to exceed the cap and confirm the oldest active user message is removed first
5. confirm join and leave events are not replayed after refresh

### Automated Coverage

Add focused tests around:
- pruning by TTL
- pruning by FIFO cap
- history payload generation
- client removal on `message_expired`

Tests should prefer deterministic timestamps so expiration logic can be validated without long waits.

## Implementation Plan Outline

Recommended execution order:
1. update the shared socket types
2. add server-side active message storage and pruning
3. add `history_sync` on connect
4. add `message_expired` broadcast handling on server and client
5. add targeted tests and manual validation

## Notes

- This design intentionally leaves all visual countdown and border animation work for Lot B.
- The protocol changes in Lot A are sufficient to support that later UI work because the client will already have `expiresAt` for each active message.
