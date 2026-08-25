import type { Preflight } from '@/lib/faraday/client-state';

export function ReadinessPanel({ preflight }: { preflight: Preflight | null }) {
  const signals = [
    ['OPENAI', Boolean(preflight?.openai.configured), preflight?.openai.configured ? preflight.model : 'Replay only'],
    ['GITHUB', Boolean(preflight?.github.reachable), preflight?.github.reachable ? 'Seed verified' : 'Live unavailable'],
    ['DOCKER', Boolean(preflight?.docker.daemon && preflight?.docker.image), preflight?.docker.daemon ? (preflight.docker.image ? 'Image ready' : 'Image missing') : 'Replay only'],
  ] as const;
  return <div className="readiness-strip" aria-label="Environment readiness">{signals.map(([label, ok, detail]) => <div key={label} className={ok ? 'ready' : ''}><span aria-hidden="true" /><strong>{label}</strong><small>{detail}</small></div>)}</div>;
}
