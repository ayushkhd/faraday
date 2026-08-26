import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { eventDescription, eventLabels, type ExperienceState } from '@/lib/faraday/client-state';

type Props = { mode: 'off' | 'on'; state: ExperienceState; active: boolean };

const phaseLabel: Record<ExperienceState['phase'], string> = {
  idle: 'WAITING', preparing: 'PREPARING', running: 'RUNNING', verifying: 'VERIFYING', resetting: 'RESETTING',
  breach: 'BREACH', contained: 'CONTAINED', inconclusive: 'INCONCLUSIVE', error: 'ERROR',
};

export function AgentLane({ mode, state, active }: Props) {
  const sandboxed = mode === 'on';
  const replay = state.events.some((event) => event.type === 'run.started' && event.data.source === 'replay');
  const latestWalls = [...state.events].reverse().find((event) => event.type === 'verification.walls');
  const outcome = state.verdict === 'breach'
    ? 'Demo secret leaked'
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
          <div><dt>◈ Fake demo secret</dt><dd className={sandboxed ? '' : 'danger'}>{sandboxed ? 'ABSENT' : 'PRESENT'}</dd></div>
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
              <li key={`${event.runId}-${event.seq}`} className={`${event.type === 'verdict' ? `trace-${state.verdict}` : ''} event-${event.type.replace('.', '-')}`}>
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
          <div className="evidence-grid danger-evidence"><span>{replay ? 'SIMULATED SECRET LEAK' : 'DEMO SECRET EXPOSED'}</span><span>EGRESS REACHED</span><span>{replay ? 'SIMULATED COMMENT' : 'ISSUE COMMENT POSTED'}</span></div>
        ) : state.verdict === 'contained' ? (
          <div className="evidence-grid safe-evidence">
            <span>{latestWalls?.data.leastPrivilege ? 'SECRETS OMITTED' : 'CHECKING SECRETS'}</span>
            <span>{latestWalls?.data.noEgress ? 'EGRESS DENIED' : 'CHECKING EGRESS'}</span>
            <span>{latestWalls?.data.hostPublishedReport ? 'HARNESS POSTED RESULT' : '0 SANDBOX COMMENTS'}</span>
          </div>
        ) : <p className="outcome-detail">{state.verdictReason || state.error || 'Run Comparison to make the boundary visible.'}</p>}
        {state.verdict ? <div className={`artifact-route ${sandboxed ? 'safe-route' : 'danger-route'}`}><small>ARTIFACT PATH</small><strong>{sandboxed ? 'Sandbox → local report → trusted harness → cleaned GitHub comment' : 'Sandbox → one-run broker → GitHub comment'}</strong><span>{sandboxed ? 'The sandbox had no network or GitHub authority; the host validated and sanitized its result.' : 'The PAT stayed in the host; the sandbox supplied only the exact fake demo secret and grant.'}</span></div> : null}
        {state.breachArtifactUrl ? <a className="proof-link" href={state.breachArtifactUrl} target="_blank" rel="noreferrer">{replay ? 'Open permanent Replay breach reference ↗' : 'Open real breach comment ↗'}</a> : null}
        {state.hostArtifactUrl ? <a className="proof-link safe-link" href={state.hostArtifactUrl} target="_blank" rel="noreferrer">{replay ? 'Open permanent cleaned Replay reference ↗' : 'Open harness-posted result ↗'}</a> : null}
        {state.issueUrl ? <a className="issue-link" href={state.issueUrl} target="_blank" rel="noreferrer">Open fixed demo issue ↗</a> : null}
        {state.report ? <details className="report-drawer"><summary>triage-report.md <span>VIEW ARTIFACT</span></summary><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span>{children}</span>, img: ({ alt }) => <span>[Image omitted{alt ? `: ${alt}` : ''}]</span> }}>{state.report}</ReactMarkdown></div></details> : null}
      </section>
    </article>
  );
}
