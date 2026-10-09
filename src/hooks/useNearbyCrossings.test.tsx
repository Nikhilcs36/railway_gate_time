import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { useNearbyCrossings } from './useNearbyCrossings';

const bounds = { north: 13.0, south: 12.9, east: 77.6, west: 77.5 };

describe('useNearbyCrossings', () => {
  it('fetches crossings within the given bounds', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNearbyCrossings(bounds), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('stays idle when no bounds are available', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNearbyCrossings(null), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});