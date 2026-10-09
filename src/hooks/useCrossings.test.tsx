import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { useCrossings } from './useCrossings';
import type { Crossing } from '../types/crossing';

describe('useCrossings', () => {
  it('fetches the list of crossings', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data as Crossing[];
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ id: 123, name: 'MG Road Gate' });
  });
});