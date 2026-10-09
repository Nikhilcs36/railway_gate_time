import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCrossings } from './hooks/useCrossings';
import { useCrossingStatuses } from './hooks/useCrossingStatuses';
import { useNearbyCrossings } from './hooks/useNearbyCrossings';
import { useReportTrain } from './hooks/useReportTrain';
import { CrossingMap } from './components/CrossingMap';
import { CrossingList } from './components/CrossingList';
import { subscribeToTrainEvents } from './lib/realtime';
import type { GeoBounds, TrainReport } from './types/crossing';

const apiKey: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export default function App() {
  const queryClient = useQueryClient();
  const { data: allCrossings = [], isLoading, error } = useCrossings();

  const [bounds, setBounds] = useState<GeoBounds | null>(null);
  const nearby = useNearbyCrossings(bounds);
  const crossings = nearby.data ?? allCrossings;

  const crossingIds = crossings.map((crossing) => crossing.id);
  const { statuses } = useCrossingStatuses(crossingIds);

  const reportTrain = useReportTrain();

  useEffect(() => {
    const wsUrl: string | undefined = import.meta.env.VITE_WS_URL;
    if (!wsUrl) return;
    return subscribeToTrainEvents(queryClient, wsUrl);
  }, [queryClient]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>🚂 Railway Gate Tracker</h1>
        <p className="subtitle">Live crossing times &amp; predicted closures — avoid the wait at the gate.</p>
      </header>

      {error && <p className="banner banner--error">Failed to load crossings: {String(error)}</p>}
      {isLoading && <p className="banner">Loading crossings…</p>}

      <CrossingMap
        apiKey={apiKey}
        crossings={crossings}
        statuses={statuses}
        onBoundsChange={setBounds}
        onSelect={() => {}}
      />

      <CrossingList crossings={crossings} statuses={statuses} onReport={(report: TrainReport) => reportTrain.mutate(report)} />
    </div>
  );
}