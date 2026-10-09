import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postTrainReport } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';
import type { CrossingStatus, TrainReport } from '../types/crossing';

const REPORT_CONFIDENCE_CAP = 0.5;

/**
 * Crowdsourced "I just saw a train" report.
 * Optimistically updates the crossing status, rolls back on error,
 * and always re-syncs with the server afterwards.
 */
export function useReportTrain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (report: TrainReport) => postTrainReport(report),

    onMutate: async (report) => {
      await queryClient.cancelQueries({ queryKey: crossingKeys.detail(report.crossing) });

      const previous = queryClient.getQueryData<CrossingStatus>(crossingKeys.detail(report.crossing));

      queryClient.setQueryData<CrossingStatus>(crossingKeys.detail(report.crossing), (old) => {
        if (!old) return old;
        return {
          ...old,
          train: report.train,
          confidence: Math.min(old.confidence, REPORT_CONFIDENCE_CAP),
          updated_at: new Date().toISOString(),
        };
      });

      return { previous };
    },

    onError: (_error, report, context) => {
      if (context?.previous) {
        queryClient.setQueryData(crossingKeys.detail(report.crossing), context.previous);
      }
    },

    onSettled: (_data, _error, report) => {
      queryClient.invalidateQueries({ queryKey: crossingKeys.detail(report.crossing) });
    },
  });
}