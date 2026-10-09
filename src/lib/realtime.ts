import type { QueryClient } from '@tanstack/react-query';
import { crossingKeys } from './queryKeys';

export type TrainEvent =
  | { type: 'train_approaching'; crossing: number }
  | { type: 'gate_closed'; crossing: number }
  | { type: 'gate_opened'; crossing: number };

/** Parse an inbound WebSocket message into a TrainEvent, or null if invalid. */
export function parseTrainEvent(raw: string): TrainEvent | null {
  try {
    const msg: unknown = JSON.parse(raw);
    if (
      msg &&
      typeof msg === 'object' &&
      typeof (msg as { type?: unknown }).type === 'string' &&
      typeof (msg as { crossing?: unknown }).crossing === 'number'
    ) {
      return msg as TrainEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export type SocketFactory = (url: string) => WebSocket;

/**
 * Subscribe to railway events and invalidate the matching TanStack Query cache.
 * Returns an unsubscribe function that closes the socket.
 */
export function subscribeToTrainEvents(
  client: QueryClient,
  url: string,
  createSocket: SocketFactory = (u) => new WebSocket(u),
): () => void {
  const socket = createSocket(url);

  socket.onmessage = (event: MessageEvent<string>) => {
    const message = parseTrainEvent(event.data);
    if (!message) return;

    client.invalidateQueries({ queryKey: crossingKeys.detail(message.crossing) });
    client.invalidateQueries({ queryKey: crossingKeys.all });
  };

  return () => socket.close();
}