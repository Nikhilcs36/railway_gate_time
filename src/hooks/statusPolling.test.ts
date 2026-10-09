import { describe, expect, it } from 'vitest';
import { statusRefetchInterval } from './statusPolling';

describe('statusRefetchInterval (adaptive polling)', () => {
  it('polls every 5s when the train is within 2 minutes', () => {
    expect(statusRefetchInterval(45)).toBe(5_000);
    expect(statusRefetchInterval(120)).toBe(5_000);
  });

  it('polls every 10s when the train is within 5 minutes', () => {
    expect(statusRefetchInterval(200)).toBe(10_000);
  });

  it('polls every 30s for distant trains', () => {
    expect(statusRefetchInterval(600)).toBe(30_000);
  });

  it('defaults to 15s when no data has arrived yet', () => {
    expect(statusRefetchInterval(undefined)).toBe(15_000);
  });
});