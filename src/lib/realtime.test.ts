import { describe, expect, it, vi } from 'vitest';
import { parseTrainEvent, subscribeToTrainEvents } from './realtime';
import { crossingKeys } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';

class FakeSocket {
  onmessage: ((event: { data: string }) => void) | null = null;
  close = vi.fn();
}

describe('parseTrainEvent', () => {
  it('parses a valid train approaching event', () => {
    expect(parseTrainEvent('{"type":"train_approaching","crossing":123}')).toEqual({
      type: 'train_approaching',
      crossing: 123,
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseTrainEvent('not json')).toBeNull();
  });

  it('returns null for an unknown shape', () => {
    expect(parseTrainEvent('{"foo":1}')).toBeNull();
  });
});

describe('subscribeToTrainEvents', () => {
  it('invalidates crossing queries when a train approaches', () => {
    const invalidateQueries = vi.fn();
    const client = { invalidateQueries } as unknown as QueryClient;
    const socket = new FakeSocket();

    const unsubscribe = subscribeToTrainEvents(client, 'ws://fake', () => socket as unknown as WebSocket);

    socket.onmessage?.({ data: '{"type":"train_approaching","crossing":123}' });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: crossingKeys.detail(123) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: crossingKeys.all });

    unsubscribe();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed messages without invalidating', () => {
    const invalidateQueries = vi.fn();
    const client = { invalidateQueries } as unknown as QueryClient;
    const socket = new FakeSocket();

    subscribeToTrainEvents(client, 'ws://fake', () => socket as unknown as WebSocket);

    socket.onmessage?.({ data: 'nope' });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});