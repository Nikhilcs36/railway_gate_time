import type { CrossingStatus } from '../types/crossing';

interface Props {
  crossingName: string;
  status?: CrossingStatus;
}

export function CrossingInfoWindow({ crossingName, status }: Props) {
  return (
    <div className="info-window">
      <h3>{crossingName}</h3>
      {status ? (
        <>
          <p>Train: {status.train}</p>
          <p>Closes: {status.predicted_closure}</p>
          <p>Opens: {status.predicted_opening}</p>
          <p>Confidence: {Math.round(status.confidence * 100)}%</p>
        </>
      ) : (
        <p>No active train — gate open</p>
      )}
    </div>
  );
}