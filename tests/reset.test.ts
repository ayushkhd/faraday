import { beforeEach, describe, expect, it } from 'vitest';
import { acquireRun, getRunConflict, markRunReset, releaseRun, runStore } from '@/lib/faraday/run-store';

describe('reset state', () => {
  beforeEach(() => { runStore.active = null; runStore.completed.clear(); runStore.resetRunIds.clear(); });

  it('remembers only the exact last reset run for idempotency', () => {
    markRunReset('exact-run');
    expect(runStore.active).toBeNull();
    expect(runStore.resetRunIds.has('exact-run')).toBe(true);
    expect(runStore.resetRunIds.has('other-run')).toBe(false);
  });

  it('preserves completed live-run cleanup authority without blocking the next lane', () => {
    acquireRun({
      runId: 'first', request: { mode: 'off', source: 'live' }, branch: 'faraday/run-first', marker: 'marker', createdAt: 1, running: true, prNumbers: [],
    });
    releaseRun('first', 'breach');
    expect(runStore.completed.get('first')?.verdict).toBe('breach');
    expect(() => acquireRun({
      runId: 'second', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 2, running: true, prNumbers: [],
    })).not.toThrow();
    expect(getRunConflict()).toBe('RUN_ALREADY_ACTIVE');
  });

  it('releases a completed replay because it owns no external cleanup targets', () => {
    acquireRun({
      runId: 'replay-first', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 1, running: true, prNumbers: [],
    });
    releaseRun('replay-first', 'contained');
    expect(runStore.active).toBeNull();
    expect(runStore.resetRunIds.has('replay-first')).toBe(true);
    acquireRun({
      runId: 'replay-second', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 2, running: true, prNumbers: [],
    });
    expect(runStore.active?.runId).toBe('replay-second');
  });
});
