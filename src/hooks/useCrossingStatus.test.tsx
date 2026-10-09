import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { useCrossingStatus } from './useCrossingStatus';

describe('useCrossingStatus', () => {
  it('fetches the live status for a crossing', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingStatus(123), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.eta_seconds).toBe(142);
    expect(result.current.data?.predicted_closure).toBe('22:42:00');
    expect(result.current.data?.train).toBe('12625');
  });

  it('does not fetch when disabled (no id)', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingStatus(null), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});