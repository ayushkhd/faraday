import type { FaradayEvent, Verdict } from './events';
import type { CommentInput } from './comment-input';

export type Phase = 'idle' | 'preparing' | 'running' | 'verifying' | Verdict | 'resetting';

export type Preflight = {
  csrfToken: string;
  defaultInput: CommentInput;
  model: string;
  openai: { configured: boolean; reason: string | null };
  github: { configured: boolean; reachable: boolean; demoIssue: boolean; issueUrl: string | null; reason: string | null };
  docker: { installed: boolean; daemon: boolean; image: boolean; reason: string | null };
  replay: { ready: boolean; reason: string | null };
  lanes: Record<'off' | 'on', { live: boolean; replay: boolean; reason: string | null }>;
  missingVariables: string[];
};

export type ExperienceState = {
  phase: Phase;
  runId: string | null;
  events: FaradayEvent[];
  report: string | null;
  verdict: Verdict | null;
  verdictReason: string | null;
  issueUrl: string | null;
  breachArtifactUrl: string | null;
  hostArtifactUrl: string | null;
  canary: string | null;
  error: string | null;
};

export type ExperienceAction =
  | { type: 'start' }
  | { type: 'event'; event: FaradayEvent }
  | { type: 'failure'; message: string }
  | { type: 'resetting' }
  | { type: 'clear' };

export const initialExperienceState: ExperienceState = {
  phase: 'idle', runId: null, events: [], report: null, verdict: null, verdictReason: null, issueUrl: null, breachArtifactUrl: null, hostArtifactUrl: null, canary: null, error: null,
};

function eventText(data: Record<string, unknown>, key: string): string | null {
  return typeof data[key] === 'string' ? data[key] as string : null;
}

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  if (action.type === 'start') return { ...initialExperienceState, phase: 'preparing' };
  if (action.type === 'resetting') return { ...state, phase: 'resetting' };
  if (action.type === 'clear') return initialExperienceState;
  if (action.type === 'failure') return { ...state, phase: 'error', error: action.message };

  const { event } = action;
  let phase = state.phase;
  if (event.type === 'run.started') phase = 'preparing';
  if (['workspace.created', 'agent.step', 'command.started', 'command.finished', 'diagnostic', 'egress.attempt', 'egress.result', 'publication.result', 'publication.host', 'artifact.ready'].includes(event.type)) phase = 'running';
  if (event.type.startsWith('verification.')) phase = 'verifying';
  const verdict = event.type === 'verdict' ? eventText(event.data, 'verdict') as Verdict : state.verdict;
  if (verdict) phase = verdict;
  const report = event.type === 'artifact.ready' ? eventText(event.data, 'report') : state.report;
  const issueUrl = (event.type === 'run.started' || event.type === 'verification.github') ? eventText(event.data, 'issueUrl') || state.issueUrl : state.issueUrl;
  const breachArtifactUrl = (event.type === 'verification.github' || event.type === 'publication.result') ? eventText(event.data, 'url') || state.breachArtifactUrl : state.breachArtifactUrl;
  const hostArtifactUrl = event.type === 'publication.host' ? eventText(event.data, 'url') || state.hostArtifactUrl : state.hostArtifactUrl;
  const canary = event.type === 'verification.github' ? eventText(event.data, 'canary') || state.canary : state.canary;
  const error = event.type === 'error' ? eventText(event.data, 'detail') || 'The run failed.' : state.error;
  return {
    ...state,
    phase,
    runId: event.runId,
    events: [...state.events, event],
    report: report || state.report,
    verdict,
    verdictReason: event.type === 'verdict' ? eventText(event.data, 'reason') : state.verdictReason,
    issueUrl,
    breachArtifactUrl,
    hostArtifactUrl,
    canary,
    error,
  };
}

export const eventLabels: Record<FaradayEvent['type'], string> = {
  'run.started': 'Harness', 'boundary.configured': 'Boundary', 'workspace.created': 'Workspace', 'agent.step': 'Agent',
  'command.started': 'Command', 'command.finished': 'Command', diagnostic: 'Evidence', 'egress.attempt': 'Egress',
  'egress.result': 'Egress', 'publication.result': 'Sandbox publish', 'publication.host': 'Harness publish', 'artifact.ready': 'Artifact', 'verification.github': 'GitHub verify',
  'verification.walls': 'Wall verify', verdict: 'Verdict', error: 'Error', finish: 'Complete',
};

export function eventDescription(event: FaradayEvent): string {
  const data = event.data;
  switch (event.type) {
    case 'run.started': return eventText(data, 'label') || 'Run accepted';
    case 'boundary.configured': return `${eventText(data, 'executor') || 'Executor'} · ${eventText(data, 'containment') || 'boundary configured'} · ${eventText(data, 'publisher') || 'publisher fixed'}`;
    case 'workspace.created': return 'Shared issue input and fixed reproduction materialized';
    case 'agent.step': return eventText(data, 'label') || 'Bounded triage step';
    case 'command.started': return `$ ${eventText(data, 'command') || 'fixed reproduction'}`;
    case 'command.finished': return `Reproduction settled · exit ${String(data.exitCode ?? 'unknown')}`;
    case 'diagnostic': return `Demo secret ${data.canaryPresent ? 'present' : 'absent'} · grant ${data.publicationGrantPresent ? 'present' : 'absent'}`;
    case 'egress.attempt': return 'Testing a harmless public endpoint';
    case 'egress.result': return data.reachedHttp ? `HTTP reached${data.status ? ` · ${data.status}` : ''}` : 'Blocked before an HTTP response';
    case 'publication.result': return `${eventText(data, 'publisher') || 'Sandbox'} · ${eventText(data, 'detail') || (data.published ? 'publication succeeded' : 'no publication')}`;
    case 'publication.host': return `${eventText(data, 'publisher') || 'Trusted harness'} · ${eventText(data, 'detail') || 'validated output published'}`;
    case 'artifact.ready': return data.valid === false ? eventText(data, 'reason') || 'Report invalid' : 'Trusted harness retrieved triage-report.md before sandbox close';
    case 'verification.github': return `${String(data.breachCommentCount ?? 0)} sandbox breach comment${data.breachCommentCount === 1 ? '' : 's'} · independently queried by host`;
    case 'verification.walls': return `Least privilege ${data.leastPrivilege ? 'held' : 'open'} · egress ${data.noEgress ? 'blocked' : 'open'} · sandbox GitHub writes ${data.independentZeroPublication ? 'zero' : 'observed'}`;
    case 'verdict': return eventText(data, 'reason') || 'Verdict computed from machine evidence';
    case 'error': return eventText(data, 'detail') || 'Run error';
    case 'finish': return data.ok ? 'All resources released' : 'Resources released after failure';
  }
}
