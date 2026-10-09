import type { Crossing, CrossingStatus, TrainReport } from '../types/crossing';
import { CountdownTimer } from './CountdownTimer';
import { crossingState } from '../lib/countdown';
import { markerColor } from '../lib/markerColor';

interface Props {
  crossings: Crossing[];
  statuses: Record<number, CrossingStatus>;
  onReport: (report: TrainReport) => void;
}

export function CrossingList({ crossings, statuses, onReport }: Props) {
  if (crossings.length === 0) {
    return <p className="crossing-list__empty">No crossings found in view.</p>;
  }

  return (
    <ul className="crossing-list">
      {crossings.map((crossing) => {
        const status = statuses[crossing.id];
        const state = status ? crossingState(status) : 'open';
        return (
          <li key={crossing.id} className="crossing-row">
            <div className="row-main">
              <span className="dot" style={{ backgroundColor: markerColor(state) }} />
              <span className="name">{crossing.name}</span>
              {status && <CountdownTimer etaSeconds={status.eta_seconds} />}
            </div>
            {status && (
              <button
                type="button"
                className="btn-report"
                onClick={() => onReport({ crossing: crossing.id, train: status.train })}
              >
                Report train
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}