import type { Crossing, CrossingStatus, TrainReport } from '../types/crossing';
import { CountdownTimer } from './CountdownTimer';
import { markerColor } from '../lib/markerColor';
import { gateStateLabel, isPassingState, orderCrossingsForDisplay } from '../lib/passing';

interface Props {
  crossings: Crossing[];
  statuses: Record<number, CrossingStatus>;
  onReport: (report: TrainReport) => void;
}

/**
 * The single unified gate list: every gate gets one row combining its gate
 * status (dot + label) with the train passing at it (number, ETA, closure /
 * opening times). Gates with a train currently passing are sorted to the top.
 */
export function CrossingList({ crossings, statuses, onReport }: Props) {
  if (crossings.length === 0) {
    return <p className="crossing-list__empty">No crossings found in view.</p>;
  }

  const rows = orderCrossingsForDisplay(crossings, statuses);
  const passingCount = rows.filter((row) => isPassingState(row.state)).length;

  return (
    <section className="crossing-list" data-testid="crossing-list">
      <p className="crossing-summary" data-testid="crossing-summary">
        {passingCount} of {rows.length} gate{rows.length === 1 ? '' : 's'} with a train passing
      </p>
      <ul className="crossing-list__items">
        {rows.map(({ crossing, status, state }) => (
          <li
            key={crossing.id}
            className={`crossing-row${isPassingState(state) ? ' crossing-row--passing' : ''}`}
          >
            <div className="row-main">
              <span className="dot" style={{ backgroundColor: markerColor(state) }} />
              <span className="name">{crossing.name}</span>
              <span className="badge" style={{ color: markerColor(state) }}>
                {gateStateLabel(state)}
              </span>
              {status && <CountdownTimer etaSeconds={status.eta_seconds} />}
            </div>
            <div className="row-detail">
              {status ? (
                <>
                  <span className="train">Train {status.train}</span>
                  <span className="times">
                    Closes {status.predicted_closure} · Opens {status.predicted_opening}
                  </span>
                </>
              ) : (
                <span className="train train--none">No active train — gate open</span>
              )}
              {status && (
                <button
                  type="button"
                  className="btn-report"
                  onClick={() => onReport({ crossing: crossing.id, train: status.train })}
                >
                  Report train
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
