'use client';

import { useEffect, useReducer, useState, type Dispatch } from 'react';
import { AgentLane } from '@/components/faraday/agent-lane';
import { IssuePanel } from '@/components/faraday/issue-panel';
import { ReadinessPanel } from '@/components/faraday/readiness-panel';
import type { CommentInput } from '@/lib/faraday/comment-input';
import { experienceReducer, initialExperienceState, type ExperienceAction, type Preflight } from '@/lib/faraday/client-state';
import type { FaradayEvent, RunRequest } from '@/lib/faraday/events';

async function responseError(response: Response, label: string): Promise<Error> {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  const code = typeof payload?.error === 'string' ? payload.error : null;
  if (code === 'PUBLIC_COMMENT_NOT_FOUND') {
    return new Error('GitHub did not find that exact issue comment. It may have been deleted; paste its current permalink. (PUBLIC_COMMENT_NOT_FOUND)');
  }
  if (code === 'PUBLIC_GITHUB_RATE_LIMITED') {
    return new Error('GitHub temporarily rate-limited the public comment lookup. Retry after the limit resets. (PUBLIC_GITHUB_RATE_LIMITED)');
  }
  return new Error(`${label} returned ${response.status}${code ? ` (${code})` : ''}.`);
}

async function runLane(request: RunRequest, csrfToken: string, dispatch: Dispatch<ExperienceAction>): Promise<string> {
  dispatch({ type: 'start' });
  const response = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json', 'x-faraday-csrf': csrfToken }, body: JSON.stringify(request) });
  if (!response.ok) throw await responseError(response, 'Run endpoint');
  if (!response.body) throw new Error('Run endpoint returned an empty stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let runId = '';
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const blocks = pending.split(/\r?\n\r?\n/);
    pending = blocks.pop() || '';
    for (const block of blocks) {
      const dataLine = block.split(/\r?\n/).find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6)) as FaradayEvent;
      runId = event.runId;
      dispatch({ type: 'event', event });
    }
    if (done) break;
  }
  if (!runId) throw new Error('Run completed without an identifier.');
  return runId;
}

async function cleanupRun(runId: string, csrfToken: string, allowMissing = false): Promise<void> {
  const response = await fetch('/api/reset', { method: 'POST', headers: { 'content-type': 'application/json', 'x-faraday-csrf': csrfToken }, body: JSON.stringify({ runId }) });
  if (!response.ok && !(allowMissing && response.status === 404)) throw await responseError(response, 'Cleanup');
}

export default function Home() {
  const [source, setSource] = useState<RunRequest['source']>('replay');
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [input, setInput] = useState<CommentInput | null>(null);
  const [commentUrl, setCommentUrl] = useState('');
  const [inputLoading, setInputLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [runIds, setRunIds] = useState<string[]>([]);
  const [unsafeState, unsafeDispatch] = useReducer(experienceReducer, initialExperienceState);
  const [safeState, safeDispatch] = useReducer(experienceReducer, initialExperienceState);

  useEffect(() => {
    let active = true;
    fetch('/api/preflight', { cache: 'no-store' }).then((response) => response.json()).then((data: Preflight) => {
      if (active) {
        setPreflight(data);
        setInput((current) => current || data.defaultInput);
        setCommentUrl((current) => current || data.defaultInput.url || '');
      }
    }).catch(() => { if (active) setPreflight(null); });
    return () => { active = false; };
  }, []);

  const comparisonReady = Boolean(input && preflight?.lanes.off[source] && preflight?.lanes.on[source]);
  const hasResults = Boolean(unsafeState.events.length || safeState.events.length || comparisonError);

  async function loadComment() {
    if (!preflight?.csrfToken) return setInputError('Local approval token unavailable. Refresh and retry.');
    setInputLoading(true);
    setInputError(null);
    try {
      const response = await fetch('/api/comment', { method: 'POST', headers: { 'content-type': 'application/json', 'x-faraday-csrf': preflight.csrfToken }, body: JSON.stringify({ url: commentUrl.trim() }) });
      if (!response.ok) throw await responseError(response, 'Comment loader');
      setInput(await response.json() as CommentInput);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Unable to load the public comment.');
    } finally {
      setInputLoading(false);
    }
  }

  async function runComparison() {
    if (!input || !preflight?.csrfToken || !comparisonReady) return;
    setComparisonBusy(true);
    setComparisonError(null);
    unsafeDispatch({ type: 'clear' });
    safeDispatch({ type: 'clear' });
    const base = { source, inputId: input.id } as const;
    const nextRunIds: string[] = [];
    let unsafeDone = false;
    let safeDone = false;
    try {
      if (runIds.length) await Promise.all(runIds.map((runId) => cleanupRun(runId, preflight.csrfToken, true)));
      setRunIds([]);
      const unsafeRunId = await runLane({ ...base, mode: 'off' }, preflight.csrfToken, unsafeDispatch);
      unsafeDone = true;
      nextRunIds.push(unsafeRunId);
      setRunIds([...nextRunIds]);
      const safeRunId = await runLane({ ...base, mode: 'on' }, preflight.csrfToken, safeDispatch);
      safeDone = true;
      nextRunIds.push(safeRunId);
      setRunIds([...nextRunIds]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Comparison failed.';
      setComparisonError(message);
      if (!unsafeDone) unsafeDispatch({ type: 'failure', message });
      if (!safeDone) safeDispatch({ type: 'failure', message });
    } finally {
      setComparisonBusy(false);
    }
  }

  async function resetComparison() {
    if (!preflight?.csrfToken || comparisonBusy) return;
    setComparisonBusy(true);
    setComparisonError(null);
    unsafeDispatch({ type: 'resetting' });
    safeDispatch({ type: 'resetting' });
    try {
      await Promise.all(runIds.map((runId) => cleanupRun(runId, preflight.csrfToken, true)));
      setRunIds([]);
      unsafeDispatch({ type: 'clear' });
      safeDispatch({ type: 'clear' });
    } catch (error) {
      setComparisonError(error instanceof Error ? error.message : 'Targeted cleanup failed.');
    } finally {
      setComparisonBusy(false);
    }
  }

  return (
    <main id="top">
      <nav className="topbar" aria-label="Faraday navigation">
        <a className="wordmark" href="#top">FARADAY</a>
        <p>Same agent. Same attack. Different blast radius.</p>
        <div className="top-actions">
          <div className="source-switch" aria-label="Run source">{(['live', 'replay'] as const).map((item) => <button key={item} disabled={comparisonBusy} className={source === item ? 'active' : ''} aria-pressed={source === item} onClick={() => setSource(item)}>{item}</button>)}</div>
          <span className="model-pill">{preflight?.model || 'MODEL'}</span>
          <button className="compare-button" disabled={comparisonBusy || !comparisonReady} onClick={() => void runComparison()}>{comparisonBusy ? <><span className="spinner" /> Running comparison</> : source === 'live' ? '▷ Run live comparison' : '▷ Run replay'}</button>
        </div>
      </nav>

      <ReadinessPanel preflight={preflight} />
      <IssuePanel input={input} url={commentUrl} loading={inputLoading} error={inputError} disabled={comparisonBusy || !preflight} onUrlChange={setCommentUrl} onLoad={() => void loadComment()} onUseFixture={() => { if (preflight) { setInput(preflight.defaultInput); setInputError(null); } }} />

      {source === 'live' && preflight?.github.issueUrl ? <div className="live-disclosure" role="status"><strong>LIVE WRITES ENABLED</strong><span>Run posts one fixed breach proof and one trusted-harness containment result to the dedicated issue.</span><a href={preflight.github.issueUrl} target="_blank" rel="noreferrer">Open target issue ↗</a></div> : null}

      {!comparisonReady && preflight ? <p className="readiness-note" role="status">{source === 'live' ? 'Live comparison needs OpenAI, GitHub, and Docker ready. Switch to Replay for the deterministic walkthrough.' : 'Restore the included fixture to run Replay.'}</p> : null}
      {comparisonError ? <p className="comparison-error" role="alert">{comparisonError}</p> : null}

      <section className="comparison-shell" aria-label="Agent sandbox comparison">
        <div className="same-rail" aria-hidden="true"><span>SAME AGENT</span><span>SAME TASK</span><span>SAME INPUT</span></div>
        <AgentLane mode="off" state={unsafeState} active={comparisonBusy && !unsafeState.verdict} />
        <AgentLane mode="on" state={safeState} active={comparisonBusy && !safeState.verdict} />
      </section>

      <section className="config-diff">
        <div><span className="diff-icon">≠</span><strong>Configuration diff <small>(only)</small></strong></div>
        <p className="removed">− network: host<br />− demo secret + grant: present</p>
        <p className="added">+ network: none<br />+ demo secret + grant: omitted</p>
        <p>Off: sandbox reaches broker. On: sandbox has no egress; harness publishes only validated output.</p>
        {hasResults ? <button type="button" onClick={() => void resetComparison()} disabled={comparisonBusy}>{comparisonBusy ? 'Resetting…' : 'Reset comparison'}</button> : null}
      </section>

      <footer><span>FARADAY</span><p>Built with Codex · OpenAI Sandbox Agents SDK · demo-safe public inputs only</p><a href="https://developers.openai.com/api/docs/guides/agents/sandboxes" target="_blank" rel="noreferrer">Sandbox Agents docs ↗</a></footer>
    </main>
  );
}
