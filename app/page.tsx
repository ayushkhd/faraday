'use client';

import { useState } from 'react';

const attackSteps = [
  { id: '01', label: 'Fetch issues', title: 'The agent reads public content', body: 'The user asks for a routine review. GitHub MCP returns issue text from a repository anyone can write to.', log: 'GET issues(acme/pacman) → 12 results' },
  { id: '02', label: 'Inject', title: 'Data is mistaken for instruction', body: 'A malicious issue contains indirect prompt injection. The agent treats attacker-controlled text as a new objective.', log: '⚠ context contains untrusted instructions' },
  { id: '03', label: 'Pivot', title: 'Trusted tools cross the boundary', body: 'Using the user’s legitimate access, the agent queries private repositories and pulls sensitive data into its context.', log: 'GET contents(acme/strategy) → authorized' },
  { id: '04', label: 'Exfiltrate', title: 'The leak looks like normal work', body: 'The agent opens a pull request in the public repository. Private details are now visible to the attacker—and everyone else.', log: 'POST pull_request(acme/pacman) → public' },
];

const defenseControls = [
  { key: 'scope', title: 'Scope each session to one repo', body: 'Blocks the public-to-private pivot even when the agent is manipulated.' },
  { key: 'confirm', title: 'Confirm cross-boundary actions', body: 'Makes “read private → write public” an explicit, high-friction decision.' },
  { key: 'monitor', title: 'Monitor tool-call dataflow', body: 'Detects sensitive information moving between security domains in real time.' },
] as const;

export default function Home() {
  const [stage, setStage] = useState(0);
  const [defenses, setDefenses] = useState<Record<string, boolean>>({ scope: false, confirm: false, monitor: false });
  const [quiz, setQuiz] = useState<string | null>(null);
  const activeDefenseCount = Object.values(defenses).filter(Boolean).length;
  const risk = ['CRITICAL', 'ELEVATED', 'CONTAINED', 'HARDENED'][activeDefenseCount];

  const advance = () => setStage((current) => (current >= attackSteps.length ? 0 : current + 1));

  return (
    <main>
      <nav className="nav-shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Toxic Flow Lab home"><span className="brand-mark">TF</span><span>TOXIC FLOW LAB</span></a>
        <div className="nav-links"><a href="#trace">Attack trace</a><a href="#defend">Defend</a><a href="#check">Knowledge check</a></div>
        <div className="nav-meta"><span className="status-dot" />CASE FILE 25-05</div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>INCIDENT BRIEF</span><span>06 MIN LAB</span></div>
          <h1>A public issue.<br /><em>A private leak.</em></h1>
          <p className="lede">See how an ordinary request to an AI coding agent can cross a trust boundary—and publish private repository data in plain sight.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#simulation">Enter the simulation <span>↓</span></a>
            <a className="text-link" href="https://invariantlabs.ai/blog/mcp-github-vulnerability" target="_blank" rel="noreferrer">Read the source ↗</a>
          </div>
        </div>

        <div className="severity-card" aria-label="Severity assessment">
          <div className="severity-head"><span>SEVERITY</span><span className="live-pill">CRITICAL</span></div>
          <div className="severity-word">SYSTEMIC</div>
          <p className="severity-note">Trusted tools can become an attack path when untrusted data controls the agent.</p>
          <div className="meter"><i /></div>
          <dl>
            <div><dt>ATTACKER ACCESS</dt><dd>Public issue only</dd></div>
            <div><dt>USER INTENT</dt><dd>Completely benign</dd></div>
            <div><dt>BLAST RADIUS</dt><dd>Private repositories</dd></div>
          </dl>
        </div>
      </section>

      <section className="simulation" id="simulation">
        <header className="section-head">
          <div><span className="kicker">01 / THE SETUP</span><h2>Everything looks normal.</h2></div>
          <p>Two repositories. One helpful agent. One instruction the user never wrote.</p>
        </header>

        <div className={`attack-surface stage-${stage}`}>
          <div className="repo-card public-repo">
            <div className="repo-top"><span className="repo-icon">◫</span><span className="visibility">PUBLIC</span></div>
            <h3>acme/pacman</h3><p>Open-source game. Anyone can file an issue.</p>
            <div className="issue-row"><span>#482</span><strong>Update project credits</strong><span className="untrusted">UNTRUSTED</span></div>
          </div>
          <div className="agent-core">
            <div className="orbit"><span>AI</span></div><strong>CODING AGENT</strong><small>GitHub MCP connected</small>
          </div>
          <div className="repo-card private-repo">
            <div className="repo-top"><span className="repo-icon">▣</span><span className="visibility">PRIVATE</span></div>
            <h3>acme/strategy</h3><p>Roadmaps, financials, internal plans.</p>
            <div className="secret-row"><i /><span>salary-data.csv</span></div><div className="secret-row"><i /><span>launch-plan.md</span></div>
          </div>
          <div className="flow-line flow-left"><span>UNTRUSTED INPUT</span></div><div className="flow-line flow-right"><span>TRUSTED ACCESS</span></div>
          {stage === 4 && <div className="breach-stamp">PUBLIC PR CREATED</div>}
        </div>

        <div className="prompt-bar">
          <div><span className="prompt-symbol">›_</span><p><small>{stage === 0 ? 'YOU ASK THE AGENT' : `ATTACK STAGE ${stage} OF 4`}</small>{stage === 0 ? '“Review the open issues in acme/pacman.”' : attackSteps[stage - 1].log}</p></div>
          <button onClick={advance}>{stage === 0 ? 'Run benign task' : stage === 4 ? 'Reset simulation' : 'Continue trace'}<span>→</span></button>
        </div>
      </section>

      <section className="trace" id="trace">
        <header className="section-head compact"><div><span className="kicker">02 / THE TOXIC FLOW</span><h2>The exploit is a sequence,<br />not a single bug.</h2></div><p>No tool needs to be compromised. Each call is authorized; the combined dataflow is dangerous.</p></header>
        <div className="trace-grid">
          <div className="trace-steps">
            {attackSteps.map((step, index) => (
              <button key={step.id} className={stage === index + 1 ? 'active' : ''} onClick={() => setStage(index + 1)}>
                <span>{step.id}</span><div><small>{step.label}</small><strong>{step.title}</strong><p>{step.body}</p></div><i>↗</i>
              </button>
            ))}
          </div>
          <aside className="terminal-card">
            <div className="terminal-head"><span>AGENT_TRACE.LOG</span><div><i /><i /><i /></div></div>
            <div className="terminal-body">
              <p><span>00:00</span> user_request accepted</p>
              {attackSteps.map((step, index) => stage > index && <p key={step.id} className={index === 1 || index === 3 ? 'danger-line' : ''}><span>00:0{index + 1}</span> {step.log}</p>)}
              {stage === 0 && <p className="cursor-line">awaiting simulation_<b /></p>}
              {stage === 4 && <div className="terminal-alert"><strong>CONFIDENTIALITY BREACH</strong><span>Private → Public</span></div>}
            </div>
          </aside>
        </div>
      </section>

      <section className="why">
        <header className="section-head compact"><div><span className="kicker">03 / WHY THIS MATTERS</span><h2>Authorization is not intent.</h2></div><p>The integration is allowed to do each step. That does not mean the user intended the sequence.</p></header>
        <div className="impact-grid">
          <article><span className="impact-index">A</span><h3>No malicious server required</h3><p>The MCP server and its tools can be fully trusted. The poisoned input arrives through ordinary platform content.</p><small>TRUSTED TOOLS ≠ TRUSTED FLOW</small></article>
          <article><span className="impact-index">B</span><h3>Approval fatigue helps the attacker</h3><p>Individual calls appear plausible, and “always allow” removes the last human checkpoint from the chain.</p><small>LOCAL ACTIONS HIDE GLOBAL RISK</small></article>
          <article><span className="impact-index">C</span><h3>The pattern travels</h3><p>Any agent that can read untrusted content and operate privileged tools can recreate the same class of failure.</p><small>ARCHITECTURE, NOT ONE MODEL</small></article>
        </div>
        <div className="model-note"><span>KEY IDEA</span><p>Model alignment alone cannot encode every organization’s data boundaries. Security has to live around the model, at the system and dataflow layer.</p></div>
      </section>

      <section className="defend" id="defend">
        <header className="section-head compact"><div><span className="kicker">04 / DEFENDER MODE</span><h2>Break the chain.</h2></div><p>Activate controls and watch the risk collapse. The strongest defense is contextual: what data moved, from where, to where?</p></header>
        <div className="defense-console">
          <div className="controls-panel">
            {defenseControls.map((control) => (
              <button key={control.key} className={defenses[control.key] ? 'enabled' : ''} aria-pressed={defenses[control.key]} onClick={() => setDefenses((current) => ({ ...current, [control.key]: !current[control.key] }))}>
                <span className="toggle"><i /></span><div><strong>{control.title}</strong><p>{control.body}</p></div>
              </button>
            ))}
          </div>
          <div className={`risk-panel risk-${activeDefenseCount}`}>
            <small>RESIDUAL RISK</small><strong>{risk}</strong><div className="risk-ring"><span>{activeDefenseCount}<small>/3</small></span></div>
            <p>{activeDefenseCount === 0 ? 'The toxic flow remains open end to end.' : activeDefenseCount === 3 ? 'The pivot is constrained, scrutinized, and observable.' : `${activeDefenseCount} control${activeDefenseCount > 1 ? 's' : ''} interrupt the flow—but defense in depth is incomplete.`}</p>
          </div>
        </div>
      </section>

      <section className="check" id="check">
        <div className="check-card">
          <span className="kicker">05 / KNOWLEDGE CHECK</span><h2>What made the attack possible?</h2>
          <div className="answers">
            {[
              ['server', 'The GitHub MCP server was compromised'],
              ['model', 'The model ignored its safety training'],
              ['flow', 'Untrusted content could steer privileged tool use'],
            ].map(([value, label]) => <button key={value} className={quiz === value ? (value === 'flow' ? 'correct' : 'wrong') : ''} onClick={() => setQuiz(value)}><span>{quiz === value ? (value === 'flow' ? '✓' : '×') : '○'}</span>{label}</button>)}
          </div>
          {quiz && <p className={`feedback ${quiz === 'flow' ? 'is-correct' : ''}`}>{quiz === 'flow' ? 'Correct. The danger emerged from the relationship between untrusted input, private read access, and public write access.' : 'Not quite. The tools were trusted and the model was aligned; the unsafe dataflow was the missing security boundary.'}</p>}
        </div>
      </section>

      <footer>
        <div><span className="brand-mark">TF</span><p>Built as an educational companion to Invariant Labs’ May 2025 disclosure.</p></div>
        <div className="footer-links"><a href="https://invariantlabs.ai/blog/mcp-github-vulnerability" target="_blank" rel="noreferrer">Original research ↗</a><a href="https://github.com/invariantlabs-ai/mcp-scan" target="_blank" rel="noreferrer">MCP-scan ↗</a></div>
      </footer>
    </main>
  );
}
