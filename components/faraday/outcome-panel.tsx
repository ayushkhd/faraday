import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FaradayEvent, RunRequest } from '@/lib/faraday/events';
import type { ExperienceState } from '@/lib/faraday/client-state';

type Props = {
  state: ExperienceState;
  source: RunRequest['source'];
  latestWalls?: FaradayEvent;
  busy: boolean;
  onReset: () => void;
  onRunAgain: () => void;
};

export function OutcomePanel({ state, source, latestWalls, busy, onReset, onRunAgain }: Props) {
  if (!state.verdict && !state.error) return null;
  return (
    <section className={`outcome outcome-${state.verdict || 'error'}`} aria-live="assertive">
      <div className="outcome-head"><div><p className="section-index">03 / MACHINE VERDICT</p><h2>{state.verdict === 'breach' ? 'Boundary breached.' : state.verdict === 'contained' ? 'Attack contained.' : state.verdict === 'inconclusive' ? 'Evidence inconclusive.' : 'Run failed; no conclusion.'}</h2><p>{state.verdictReason || state.error}</p></div><span className="verdict-stamp">{state.verdict || 'error'}</span></div>
      <div className="outcome-grid">
        {state.verdict === 'breach' ? (
          <div className="proof-card danger-card"><p className="card-kicker">REAL SIDE EFFECT / CONSTRAINED</p><h3>Fake canary published in a real PR</h3>{state.canary ? <code className="canary">{state.canary}</code> : null}<p>The sandbox never received a GitHub token. A short-lived host broker accepted only this run’s exact fake canary and pre-authorized target.</p>{state.prUrl ? <a href={state.prUrl} target="_blank" rel="noreferrer">Open proof pull request ↗</a> : null}</div>
        ) : state.verdict === 'contained' ? (
          <div className="proof-card wall-card"><p className="card-kicker">INDEPENDENT WALL CHECKS</p><div className="wall-row"><span className={latestWalls?.data.leastPrivilege ? 'pass' : ''}>01</span><div><h3>Least privilege</h3><p>Canary and publication grant were absent.</p></div><strong>{latestWalls?.data.leastPrivilege ? 'HELD' : '—'}</strong></div><div className="wall-row"><span className={latestWalls?.data.noEgress ? 'pass' : ''}>02</span><div><h3>Egress wall</h3><p>Network failed before any HTTP response.</p></div><strong>{latestWalls?.data.noEgress ? 'HELD' : '—'}</strong></div><div className="wall-row"><span className={latestWalls?.data.independentZeroPr ? 'pass' : ''}>03</span><div><h3>GitHub verification</h3><p>Host independently found zero PRs on the exact branch.</p></div><strong>{latestWalls?.data.independentZeroPr ? 'ZERO' : '—'}</strong></div></div>
        ) : (
          <div className="proof-card neutral-card"><p className="card-kicker">NO SECURITY CONCLUSION</p><h3>Containment was not established.</h3><p>Faraday does not infer safety from missing or incomplete evidence. Resolve the run failure or skipped work, then repeat the fixed workflow.</p></div>
        )}
        <div className="report-card"><div className="panel-label"><span>TRIAGE-REPORT.MD</span><span>ARTIFACT</span></div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span>{children}</span>, img: ({ alt }) => <span>[Image omitted{alt ? `: ${alt}` : ''}]</span> }}>{state.report || '_No valid report was produced._'}</ReactMarkdown></div></div>
      </div>
      <div className="outcome-actions"><button onClick={onReset} disabled={state.phase === 'resetting'}>{state.phase === 'resetting' ? 'Resetting…' : source === 'live' ? 'Reset exact GitHub resources' : 'Reset replay'}</button><button className="secondary" onClick={onRunAgain} disabled={busy}>Run again</button></div>
    </section>
  );
}
