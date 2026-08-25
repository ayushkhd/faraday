import type { RunRequest, Verdict } from './events';

export type RunRecord = {
  runId: string;
  request: RunRequest;
  branch: string | null;
  marker: string | null;
  createdAt: number;
  running: boolean;
  verdict?: Verdict;
  prNumbers: number[];
};

type Store = {
  active: RunRecord | null;
  completed: Map<string, RunRecord>;
  resetRunIds: Set<string>;
};
const globalStore = globalThis as typeof globalThis & { __faradayRunStore?: Store };
export const runStore: Store = globalStore.__faradayRunStore ?? (globalStore.__faradayRunStore = {
  active: null,
  completed: new Map(),
  resetRunIds: new Set(),
});

// Preserve compatibility with a development-reload store created by an earlier module version.
runStore.completed ??= new Map();
runStore.resetRunIds ??= new Set();

export function acquireRun(record: RunRecord): void {
  if (runStore.active) throw new Error('Another Faraday run is already active.');
  runStore.active = record;
}

export function getRunConflict(): 'RUN_ALREADY_ACTIVE' | null {
  return runStore.active ? 'RUN_ALREADY_ACTIVE' : null;
}

export function markRunReset(runId: string): void {
  if (runStore.active?.runId === runId) runStore.active = null;
  runStore.completed.delete(runId);
  runStore.resetRunIds.add(runId);
  while (runStore.resetRunIds.size > 25) {
    runStore.resetRunIds.delete(runStore.resetRunIds.values().next().value as string);
  }
}

export function releaseRun(runId: string, verdict: Verdict): void {
  if (runStore.active?.runId !== runId) return;
  runStore.active.running = false;
  runStore.active.verdict = verdict;
  const record = runStore.active;
  runStore.active = null;
  if (record.request.source === 'live') runStore.completed.set(runId, record);
  else markRunReset(runId);
}

export function getRunForReset(runId: string): RunRecord | null {
  if (runStore.active?.runId === runId) return runStore.active;
  return runStore.completed.get(runId) ?? null;
}
