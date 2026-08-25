import type { Preflight } from '@/lib/faraday/client-state';

function Signal({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return <div className={`signal ${ok ? 'signal-ok' : 'signal-off'}`}><span aria-hidden="true" /><div><strong>{label}</strong><small>{detail}</small></div></div>;
}

export function ReadinessPanel({ preflight }: { preflight: Preflight | null }) {
  return (
    <aside className="readiness" aria-label="Environment readiness">
      <div className="panel-label"><span>ENVIRONMENT</span><span>{preflight ? 'CHECKED' : 'CHECKING'}</span></div>
      <Signal ok={Boolean(preflight?.openai.configured)} label="OpenAI" detail={preflight?.openai.configured ? preflight.model : 'Replay available without a key'} />
      <Signal ok={Boolean(preflight?.github.reachable)} label="GitHub" detail={preflight?.github.reachable ? 'Dedicated seed ref verified' : 'Live publication unavailable'} />
      <Signal ok={Boolean(preflight?.docker.daemon && preflight?.docker.image)} label="Docker" detail={preflight?.docker.daemon ? (preflight.docker.image ? 'Protected image ready' : 'Image not pulled') : 'Daemon unavailable · Replay ready'} />
    </aside>
  );
}
