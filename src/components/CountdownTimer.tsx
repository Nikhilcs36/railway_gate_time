import { formatEta } from '../lib/countdown';

interface Props {
  etaSeconds: number;
}

export function CountdownTimer({ etaSeconds }: Props) {
  return (
    <span data-testid="countdown" className="countdown">
      {formatEta(etaSeconds)}
    </span>
  );
}