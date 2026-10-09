import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { crossingKeys } from '../lib/queryKeys';
import { createWrapper } from '../test/utils';
import { useReportTrain } from './useReportTrain';
import type { CrossingStatus } from '../types/crossing';

const seededStatus: CrossingStatus = {
  crossing: 123,
  train: '12625',
  distance_km: 2.4,
  eta_seconds: 142,
  predicted_closure: '22:42:00',
  predicted_opening: '22:46:00',
  confidence: 0.82,
  updated_at: '2026-10-07T17:10:00Z',
};

describe('useReportTrain', () => {
  it('optimistically updates the crossing status before the server responds', async () => {
    // Hold the request open forever. The only way the cache can change is the
    // optimistic update inside onMutate (the server never answers).
    server.use(
      http.post('/api/reports', async () => {
        await new Promise(() => {});
        return HttpResponse.json({ ok: true });
      }),
    );

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(crossingKeys.detail(123), seededStatus);

    const { result } = renderHook(() => useReportTrain(), { wrapper: Wrapper });

    result.current.mutate({ crossing: 123, train: '99999' });

    await waitFor(() => {
      expect(queryClient.getQueryData<CrossingStatus>(crossingKeys.detail(123))?.train).toBe('99999');
    });
    // Confidence is capped by the optimistic update.
    expect(queryClient.getQueryData<CrossingStatus>(crossingKeys.detail(123))?.confidence).toBeLessThanOrEqual(0.5);
  });

  it('rolls back the optimistic update when the report fails', async () => {
    server.use(http.post('/api/reports', () => HttpResponse.json({}, { status: 500 })));

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(crossingKeys.detail(123), seededStatus);

    const { result } = renderHook(() => useReportTrain(), { wrapper: Wrapper });

    result.current.mutate({ crossing: 123, train: '99999' });
    await Promise.resolve();

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Rolled back to the pre-report status (after onError + invalidation refetch).
    await waitFor(() => {
      const data = queryClient.getQueryData<CrossingStatus>(crossingKeys.detail(123));
      expect(data?.train).toBe('12625');
    });
  });
});