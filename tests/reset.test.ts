import { beforeEach, describe, expect, it } from 'vitest';
import { acquireRun, getRunConflict, markRunReset, releaseRun, runStore } from '@/lib/faraday/run-store';

describe('reset state', () => {
  beforeEach(() => { runStore.active = null; runStore.lastResetRunId = null; });

  it('remembers only the exact last reset run for idempotency', () => {
    markRunReset('exact-run');
    expect(runStore.active).toBeNull();
    expect(runStore.lastResetRunId).toBe('exact-run');
    expect(runStore.lastResetRunId).not.toBe('other-run');
  });

  it('preserves completed-run cleanup authority until reset', () => {
    acquireRun({
      runId: 'first', request: { mode: 'off', source: 'live' }, branch: 'faraday/run-first', marker: 'marker', createdAt: 1, running: true, prNumbers: [],
    });
    releaseRun('first', 'breach');
    expect(() => acquireRun({
      runId: 'second', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 2, running: true, prNumbers: [],
    })).toThrow(/Reset the current Faraday run/);
    expect(getRunConflict()).toBe('RESET_REQUIRED');
  });

  it('replaces a completed replay because it owns no external cleanup targets', () => {
    acquireRun({
      runId: 'replay-first', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 1, running: true, prNumbers: [],
    });
    releaseRun('replay-first', 'contained');
    expect(getRunConflict()).toBeNull();
    acquireRun({
      runId: 'replay-second', request: { mode: 'on', source: 'replay' }, branch: null, marker: null, createdAt: 2, running: true, prNumbers: [],
    });
    expect(runStore.active?.runId).toBe('replay-second');
    expect(runStore.lastResetRunId).toBe('replay-first');
  });
});
