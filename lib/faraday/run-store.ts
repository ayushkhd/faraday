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

type Store = { active: RunRecord | null; lastResetRunId: string | null };
const globalStore = globalThis as typeof globalThis & { __faradayRunStore?: Store };
export const runStore: Store = globalStore.__faradayRunStore ?? (globalStore.__faradayRunStore = { active: null, lastResetRunId: null });

// Preserve compatibility with a development-reload store created by an earlier module version.
runStore.lastResetRunId ??= null;

export function acquireRun(record: RunRecord): void {
  if (runStore.active) throw new Error('Reset the current Faraday run before starting another.');
  runStore.active = record;
}

export function markRunReset(runId: string): void {
  runStore.lastResetRunId = runId;
  runStore.active = null;
}

export function releaseRun(runId: string, verdict: Verdict): void {
  if (runStore.active?.runId !== runId) return;
  runStore.active.running = false;
  runStore.active.verdict = verdict;
}
