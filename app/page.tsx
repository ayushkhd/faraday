'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { IssuePanel } from '@/components/faraday/issue-panel';
import { OutcomePanel } from '@/components/faraday/outcome-panel';
import { ReadinessPanel } from '@/components/faraday/readiness-panel';
import { RunTimeline } from '@/components/faraday/run-timeline';
import type { FaradayEvent, RunRequest } from '@/lib/faraday/events';
import { experienceReducer, initialExperienceState, type Preflight } from '@/lib/faraday/client-state';

export default function Home() {
  const [mode, setMode] = useState<RunRequest['mode']>('on');
  const [source, setSource] = useState<RunRequest['source']>('replay');
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [state, dispatch] = useReducer(experienceReducer, initialExperienceState);
  const busy = ['preparing', 'running', 'verifying', 'resetting'].includes(state.phase);
  const laneReady = Boolean(preflight?.lanes[mode][source]);
  const fingerprint = preflight?.replay.ready ? 'SHA-256 verified at preflight' : 'Awaiting fixture verification';

  useEffect(() => {
    let active = true;
    fetch('/api/preflight', { cache: 'no-store' }).then((response) => response.json()).then((data: Preflight) => { if (active) setPreflight(data); }).catch(() => { if (active) setPreflight(null); });
    return () => { active = false; };
  }, []);

  const latestWalls = useMemo(() => [...state.events].reverse().find((event) => event.type === 'verification.walls'), [state.events]);

  async function endpointError(response: Response, label: string): Promise<Error> {
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    const code = typeof payload?.error === 'string' ? ` (${payload.error})` : '';
    return new Error(`${label} returned ${response.status}${code}.`);
  }

  async function run() {
    dispatch({ type: 'start' });
    try {
      if (!preflight?.csrfToken) throw new Error('Local approval token is unavailable. Refresh preflight and try again.');
      const response = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json', 'x-faraday-csrf': preflight.csrfToken }, body: JSON.stringify({ mode, source }) });
      if (!response.ok) throw await endpointError(response, 'Run endpoint');
      if (!response.body) throw new Error('Run endpoint returned an empty stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const blocks = pending.split(/\r?\n\r?\n/);
        pending = blocks.pop() || '';
        for (const block of blocks) {
          const dataLine = block.split(/\r?\n/).find((line) => line.startsWith('data: '));
          if (dataLine) dispatch({ type: 'event', event: JSON.parse(dataLine.slice(6)) as FaradayEvent });
        }
        if (done) break;
      }
    } catch (error) {
      dispatch({ type: 'failure', message: error instanceof Error ? error.message : 'Unable to run Faraday.' });
    }
  }

  async function reset() {
    if (!state.runId) return dispatch({ type: 'clear' });
    dispatch({ type: 'resetting' });
    try {
      if (!preflight?.csrfToken) throw new Error('Local approval token is unavailable. Refresh preflight and try again.');
      const response = await fetch('/api/reset', { method: 'POST', headers: { 'content-type': 'application/json', 'x-faraday-csrf': preflight.csrfToken }, body: JSON.stringify({ runId: state.runId }) });
      if (!response.ok) throw await endpointError(response, 'Reset');
      dispatch({ type: 'clear' });
    } catch (error) { dispatch({ type: 'failure', message: error instanceof Error ? error.message : 'Reset failed.' }); }
  }

  async function runAgain() {
    if (!state.runId) return void run();
    dispatch({ type: 'resetting' });
    try {
      if (!preflight?.csrfToken) throw new Error('Local approval token is unavailable. Refresh preflight and try again.');
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-faraday-csrf': preflight.csrfToken },
        body: JSON.stringify({ runId: state.runId }),
      });
      if (!response.ok) throw await endpointError(response, 'Reset');
      dispatch({ type: 'clear' });
      await run();
    } catch (error) {
      dispatch({ type: 'failure', message: error instanceof Error ? error.message : 'Unable to reset before rerun.' });
    }
  }

  return (
    <main id="top">
      <nav className="topbar" aria-label="Faraday navigation">
        <a className="wordmark" href="#top"><span className="mark">F</span><span>FARADAY</span></a><p>Agent containment demonstrator</p>
        <div className="top-status"><span className={`source-badge ${source}`}>{source.toUpperCase()}</span><span className="version">SDK 0.17.0 · BETA</span></div>
      </nav>

      <section className="hero-shell">
        <header className="hero-copy"><p className="eyebrow"><span /> TRUST BOUNDARIES, MADE VISIBLE</p><h1>Same agent.<br /><em>Different blast radius.</em></h1><p className="lede">Faraday runs one fixed triage agent across two workspace boundaries. The unsafe lane can publish a fake canary. The protected lane proves least privilege and zero egress.</p></header>
        <ReadinessPanel preflight={preflight} />
      </section>

      <section className="control-deck" aria-labelledby="control-title">
        <div className="control-head"><div><p className="section-index">01 / BOUNDARY</p><h2 id="control-title">Choose the containment policy.</h2></div><div className="source-switch" aria-label="Run source">{(['live', 'replay'] as const).map((item) => <button key={item} disabled={busy} className={source === item ? 'active' : ''} onClick={() => setSource(item)}>{item}</button>)}</div></div>
        <div className="lane-switch" aria-label="Containment mode">
          <button className={mode === 'off' ? 'active unsafe' : ''} disabled={busy} onClick={() => setMode('off')} aria-pressed={mode === 'off'}><span className="lane-number">A</span><span><strong>Containment off</strong><small>Unix-local · canary + constrained grant</small></span><i>UNSAFE</i></button>
          <button className={mode === 'on' ? 'active protected' : ''} disabled={busy} onClick={() => setMode('on')} aria-pressed={mode === 'on'}><span className="lane-number">B</span><span><strong>Containment on</strong><small>Docker · no sensitive values · no egress</small></span><i>PROTECTED</i></button>
        </div>
        <div className="boundary-strip"><div><small>EXECUTOR</small><strong>{mode === 'on' ? 'DOCKER' : 'UNIX-LOCAL'}</strong></div><div><small>NETWORK</small><strong>{mode === 'on' ? 'NONE' : 'HOST'}</strong></div><div><small>CANARY</small><strong>{mode === 'on' ? 'ABSENT' : 'FAKE / UNIQUE'}</strong></div><div><small>PUBLICATION</small><strong>{mode === 'on' ? 'NO GRANT' : 'ONE RUN'}</strong></div><button className="run-button" onClick={run} disabled={busy || !laneReady}>{busy ? <><span className="spinner" /> Running</> : <>Run fixed issue <span>→</span></>}</button></div>
        {preflight && !laneReady ? <p className="readiness-note" role="status">This {source === 'live' ? 'Live' : 'Replay'} lane is not ready. {source === 'live' ? 'Switch to Replay, or complete the missing local prerequisites in README.' : 'Restore the fixed fixtures and refresh preflight.'}</p> : null}
      </section>

      <section className="workspace-grid">
        <IssuePanel fingerprint={fingerprint} />
        <RunTimeline state={state} />
      </section>

      <OutcomePanel state={state} source={source} latestWalls={latestWalls} busy={busy} onReset={() => void reset()} onRunAgain={() => void runAgain()} />

      <footer><div className="wordmark"><span className="mark">F</span><span>FARADAY</span></div><p>A local-first containment demonstrator. Fake canary. Real boundary. No hidden reasoning.</p><a href="https://developers.openai.com/api/docs/guides/agents/sandboxes" target="_blank" rel="noreferrer">Sandbox Agents docs ↗</a></footer>
    </main>
  );
}
