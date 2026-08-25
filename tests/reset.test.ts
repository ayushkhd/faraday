import { beforeEach, describe, expect, it } from 'vitest';
import { acquireRun, markRunReset, releaseRun, runStore } from '@/lib/faraday/run-store';

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
  });
});
