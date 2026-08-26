# Building Faraday with Codex

Codex was the product and engineering collaborator used to research, design, build, test, debug, review, and present Faraday. It accelerated the path from an early attack explainer to a working Sandbox Agents demo with real GitHub artifacts and a repeatable side-by-side experience.

Codex also wrote this document based on chats with Ayush.

## At a Glance

| Phase | How Codex Helped | Result in Faraday |
|---|---|---|
| Developer feedback | Synthesized feedback and reactions from X/Twitter into product requirements | A visual comparison instead of another chat interface |
| Product definition | Turned the concept into a decision-complete PRD and implementation plan | Same agent, same attack, two execution boundaries |
| Platform research | Studied official Sandbox Agents documentation and installed TypeScript declarations | Correct session, manifest, capability, artifact, and tracing patterns |
| Implementation | Built the agent orchestration, trusted broker, event stream, evidence model, and interface | A working local Next.js prototype |
| Threat modeling | Mapped assets, trust boundaries, attack paths, and unsafe side effects | Host-owned credentials, bounded inputs, no-egress Docker, and targeted cleanup |
| Independent review | Used separate security and commit-review passes | Containment gaps were fixed before the demo was prepared for GitHub |
| Debugging | Investigated broken streams, Docker behavior, stale GitHub inputs, and Live readiness | Replay and Live paths became deterministic and explainable |
| Demo craft | Iterated the side-by-side view, launch copy, recording flow, and subtitle-safe framing | The outcome is visible without exposing raw reasoning or credentials |

## 1. Turning Developer Feedback into a Product

Codex helped analyze developer feedback from X/Twitter and translate it into concrete design priorities. The recurring product challenge was not simply whether sandboxing existed; it was whether a developer could see what the boundary changed and understand how to adapt the pattern.

That feedback shaped several decisions:

- show Sandbox Off and Sandbox On side by side;
- use the same agent, attack, task, and reproduction in both lanes;
- prefer visible artifacts and state changes over a generic chat box;
- link to real GitHub evidence instead of relying on a model’s final answer;
- distinguish deterministic Replay from side-effecting Live runs;
- preserve useful work in the contained lane rather than presenting isolation as a refusal;
- replace internal jargon such as “canary” with the clearer “fake secret leaked.”

## 2. Researching Sandbox Agents

Codex read the official OpenAI documentation and cross-checked the installed `@openai/agents@0.17.0` TypeScript declarations before implementation. This research was converted into a repository-level `AGENTS.md` so future Codex work has a source-linked playbook for both normal Agents and Sandbox Agents.

The research informed the core architecture:

- use a `SandboxAgent` when results depend on files, commands, environment, and retrieved artifacts;
- keep authentication, approvals, tracing policy, recovery, and verification in a trusted host harness;
- use one shared agent definition and vary only the manifest and sandbox client;
- explicitly own the sandbox session, await streamed completion, retrieve artifacts, and then close;
- omit sensitive trace payloads and never send hidden reasoning to the interface;
- treat Unix-local execution as an executor, not a containment boundary;
- use Docker with `networkMode: 'none'` for the protected lane.

## 3. Designing the Product and Architecture

Codex helped evolve the project from the original Toxic Flow Lab explainer into Faraday’s narrower product thesis: make an agent’s blast radius directly observable.

The planning work defined:

- a fixed, auditable bug-triage task;
- a demo-safe public GitHub issue/comment loader;
- one constrained publication path owned by the trusted host;
- a unique fake secret with no real authority;
- machine-verifiable breach, containment, inconclusive, and error outcomes;
- normalized, sequenced events shared by Replay and Live;
- targeted, idempotent reset behavior;
- a side-by-side interface centered on boundaries, traces, artifacts, and outcomes.

The user retained the product decisions and final approvals. Codex provided options, challenged unclear claims, and converted the chosen direction into implementation-ready constraints.

## 4. Building Faraday

Codex implemented and iterated across the stack:

- migrated the earlier prototype to a standard local Next.js and Node.js runtime;
- created the shared `SandboxAgent` with bounded shell and filesystem capabilities;
- built separate Unix-local and Docker manifests without duplicating the agent;
- implemented the one-run host publication broker and fixed GitHub adapter;
- added report retrieval, redaction, validation, and independent GitHub verification;
- created versioned server-sent events and a shared client reducer;
- rebuilt the UI around two visible execution lanes;
- added Replay fixtures that use the same event and rendering contracts as Live;
- added readiness, loading, error, inconclusive, timeout, disconnect, and reset states;
- wrote unit, integration, real Docker, and Playwright coverage.

## 5. Threat Modeling and Security Review

Codex was used to threat-model the system before the demo was considered complete. The review treated the browser, trusted Next.js harness, Unix-local executor, Docker sandbox, publication broker, OpenAI API, and GitHub API as separate trust zones.

The threat model covered:

- a malicious issue comment attempting to override the trusted task;
- environment inspection and credential discovery;
- arbitrary shell commands or filesystem access;
- unrestricted outbound network access;
- caller-selected GitHub repositories, issues, or comment bodies;
- leaking values through logs, traces, SSE, reports, screenshots, or Replay fixtures;
- confusing a host-published containment result with sandbox egress;
- cleanup deleting unrelated GitHub resources;
- treating a missing publication as proof of containment.

Those attack paths led to concrete controls:

- the GitHub PAT stays only in the trusted host process;
- public input is fetched without authentication, bounded, fingerprinted, and cached server-side;
- the browser passes an opaque input ID rather than arbitrary task text;
- shell execution is restricted to the fixed reproduction workflow;
- the unsafe broker accepts one exact grant and fake secret and fixes every publication field;
- the protected manifest omits both values and Docker blocks all network access;
- reports are retrieved, redacted, and validated before sandbox close;
- the host verifies GitHub independently before computing a verdict;
- reset derives exact targets from host-held run state.

Codex also ran separate security-review and commit-review passes. Findings were reconciled into the implementation rather than copied blindly; the final product decisions remained human-approved.

## 6. Debugging the Real Demo

Codex helped diagnose failures using browser behavior, server logs, SDK types, isolated reproductions, and targeted tests. Examples include:

- tracing `ERR_EMPTY_RESPONSE` to server-side run failures rather than treating it as a UI bug;
- fixing protected Replay recovery and stale run locks;
- making the agent’s fixed tool sequence deterministic enough for a short Live demo;
- verifying explicit session ownership so evidence and `triage-report.md` can be read before close;
- confirming Docker with `networkMode: 'none'` fails before an HTTP response;
- diagnosing a public-comment 422 as a deleted comment ID hidden behind a still-loading issue-page fragment;
- replacing stale permanent Replay links and improving the loader’s 404 and rate-limit diagnostics;
- separating OpenAI configuration, API credits, GitHub setup, and Docker readiness in preflight;
- validating the full browser flow with Playwright after local fixes.

This debugging trail is visible in the commit history rather than presented as a single generated code dump.

## 7. Designing the Demo and Recording Flow

Codex helped turn the implementation into a legible launch-style demonstration:

- designed the two-lane comparison so viewers can scan the manifest, trace, artifact path, and outcome without opening a console;
- moved the real GitHub artifact links into the result panels;
- made Replay persistent and unmistakable whenever the demo is simulated;
- clarified that the protected GitHub comment is published by the trusted host after validation;
- changed “containment” controls and outcomes into plain Sandbox On/Off language;
- replaced “canary observed” with “fake secret leaked” for five-second comprehension;
- structured the walkthrough to lead with the concrete outcome before explaining the architecture;
- planned jump cuts around model latency so the 90-second video remains focused;
- shaped the demo view so critical evidence stays visible when subtitles are added;
- kept raw reasoning, credentials, and environment values out of the recording path.

Codex also helped iterate the README, elevator pitch, video script, and shooting plan. The narrative evolved alongside the architecture, so stale claims—such as an earlier pull-request flow—were replaced with the final fixed-issue-comment design.

## 8. Preparing the Repository for Review

Codex helped organize the work into reviewable commits, run pre-push checks, and prepare the repository for a professional handoff. The build trail shows the product becoming progressively more constrained and more understandable:

| Commit | Milestone |
|---|---|
| `f36197a` | Migrated to a local Next.js runtime |
| `01e7621` | Added constrained sandbox orchestration |
| `9a27081` | Built the Faraday containment console |
| `e548c71` | Closed reviewed containment gaps |
| `8d3cbb1` | Added the side-by-side sandbox comparison |
| `b4eee6a` | Grounded Replay in a public prompt-injection case |
| `78829ce` | Made sandbox artifact paths observable |
| `72c5970` | Stabilized deterministic Live sandbox runs |
| `137efb4` | Restored stable public demo artifacts and clearer leak language |

## Human and Codex Responsibilities

The collaboration was intentionally human-directed:

- The human chose the problem, structured solution, product thesis, safety posture, UX, and what external actions were authorized.
- Codex researched, implemented, tested, reviewed, debugged, and documented within those constraints.
- Security conclusions come from Faraday’s machine evidence and independent verification—not from Codex or the runtime model asserting that a run was safe.
