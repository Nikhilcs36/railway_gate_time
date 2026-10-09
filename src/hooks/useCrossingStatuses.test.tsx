import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { useCrossingStatuses } from './useCrossingStatuses';

describe('useCrossingStatuses', () => {
  it('aggregates live statuses for many crossings', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingStatuses([123, 200]), { wrapper: Wrapper });

    await waitFor(() => expect(Object.keys(result.current.statuses)).toHaveLength(2));

    expect(result.current.statuses[123].train).toBe('12625');
    expect(result.current.statuses[200].train).toBe('17644');
  });
});