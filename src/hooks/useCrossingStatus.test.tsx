import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { useCrossingStatus } from './useCrossingStatus';

describe('useCrossingStatus', () => {
  it('fetches the live status for a crossing', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingStatus(123), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The mock serves a live (time-based) status, so assert stable shape rather
    // than frozen values: train is fixed, eta is a non-negative number, and the
    // predicted times are still HH:mm:ss.
    expect(result.current.data?.train).toBe('12625');
    expect(result.current.data?.eta_seconds).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.predicted_closure).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.current.data?.updated_at).toBeTruthy();
  });

  it('does not fetch when disabled (no id)', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingStatus(null), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});