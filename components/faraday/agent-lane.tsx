import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { eventDescription, eventLabels, type ExperienceState } from '@/lib/faraday/client-state';

type Props = { mode: 'off' | 'on'; state: ExperienceState; active: boolean; referenceOutcomeUrl?: string | null };

const phaseLabel: Record<ExperienceState['phase'], string> = {
  idle: 'WAITING', preparing: 'PREPARING', running: 'RUNNING', verifying: 'VERIFYING', resetting: 'RESETTING',
  breach: 'BREACH', contained: 'CONTAINED', inconclusive: 'INCONCLUSIVE', error: 'ERROR',
};

export function AgentLane({ mode, state, active, referenceOutcomeUrl }: Props) {
  const sandboxed = mode === 'on';
  const replay = state.events.some((event) => event.type === 'run.started' && event.data.source === 'replay');
  const latestWalls = [...state.events].reverse().find((event) => event.type === 'verification.walls');
  const outcome = state.verdict === 'breach'
    ? 'Breach reproduced'
    : state.verdict === 'contained'
      ? 'Contained · work completed'
      : state.verdict === 'inconclusive'
        ? 'Evidence inconclusive'
        : state.error
          ? 'Run failed'
          : active
            ? 'Agent executing'
            : 'Awaiting comparison';

  return (
    <article className={`agent-lane lane-${mode} phase-${state.phase}`} aria-label={`Sandbox ${sandboxed ? 'on' : 'off'} agent`}>
      {sandboxed ? <><span className="boundary-tag tag-fs">FILESYSTEM</span><span className="boundary-tag tag-env">ENV</span><span className="boundary-tag tag-egress">EGRESS</span></> : null}
      <header className="lane-header">
        <div className="lane-icon" aria-hidden="true">{sandboxed ? '◇' : '>_'}</div>
        <div><p>0{sandboxed ? '2' : '1'} · AGENT EXECUTION</p><h2>Sandbox {sandboxed ? 'On' : 'Off'}</h2><span>{sandboxed ? 'Docker sandbox · network none' : 'Unix-local executor · host network'}</span></div>
        <strong>{phaseLabel[state.phase]}</strong>
      </header>

      <section className="boundary-section">
        <h3>Trust boundary <span>(manifest)</span></h3>
        <dl>
          <div><dt>◈ Fake canary</dt><dd className={sandboxed ? '' : 'danger'}>{sandboxed ? 'ABSENT' : 'PRESENT'}</dd></div>
          <div><dt>⚿ Publication grant</dt><dd className={sandboxed ? '' : 'danger'}>{sandboxed ? 'ABSENT' : 'ONE RUN'}</dd></div>
          <div><dt>⌁ GitHub PAT</dt><dd>HOST ONLY</dd></div>
          <div><dt>◎ Network</dt><dd className={sandboxed ? 'safe' : 'danger'}>{sandboxed ? 'NONE' : 'HOST'}</dd></div>
        </dl>
      </section>

      <section className="trace-section">
        <div className="section-row"><h3>Execution trace <span>(normalized)</span></h3><span>{state.events.length} EVENTS</span></div>
        {state.events.length ? (
          <ol aria-live="polite">
            {state.events.filter((event) => !['finish', 'artifact.ready'].includes(event.type)).map((event) => (
              <li key={`${event.runId}-${event.seq}`} className={event.type === 'verdict' ? `trace-${state.verdict}` : ''}>
                <span>{String(event.seq + 1).padStart(2, '0')}</span>
                <div><small>{eventLabels[event.type]}</small><p>{eventDescription(event)}</p></div>
              </li>
            ))}
          </ol>
        ) : <div className="trace-empty"><span>○</span><p>Same agent, task, and script will execute here.</p></div>}
      </section>

      <section className="lane-outcome">
        <p>Outcome</p><h3>{outcome}</h3>
        {state.verdict === 'breach' ? (
          <div className="evidence-grid danger-evidence"><span>{replay ? 'SIMULATED CANARY' : 'CANARY OBSERVED'}</span><span>EGRESS REACHED</span><span>{replay ? 'SIMULATED PROOF PR' : 'PR CREATED'}</span></div>
        ) : state.verdict === 'contained' ? (
          <div className="evidence-grid safe-evidence">
            <span>{latestWalls?.data.leastPrivilege ? 'SECRETS OMITTED' : 'CHECKING SECRETS'}</span>
            <span>{latestWalls?.data.noEgress ? 'EGRESS DENIED' : 'CHECKING EGRESS'}</span>
            <span>{latestWalls?.data.independentZeroPr ? '0 PULL REQUESTS' : 'VERIFYING GITHUB'}</span>
          </div>
        ) : <p className="outcome-detail">{state.verdictReason || state.error || 'Run Comparison to make the boundary visible.'}</p>}
        {state.prUrl ? <a className="proof-link" href={state.prUrl} target="_blank" rel="noreferrer">Open constrained proof PR ↗</a> : null}
        {state.verdict === 'breach' && referenceOutcomeUrl ? <div className="historical-proof"><a href={referenceOutcomeUrl} target="_blank" rel="noreferrer">Open historical outcome PR ↗</a><small>Source artifact only · Replay did not create this PR or reproduce its personal data.</small></div> : null}
        {state.report ? <details className="report-drawer"><summary>triage-report.md <span>VIEW ARTIFACT</span></summary><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span>{children}</span>, img: ({ alt }) => <span>[Image omitted{alt ? `: ${alt}` : ''}]</span> }}>{state.report}</ReactMarkdown></div></details> : null}
      </section>
    </article>
  );
}
