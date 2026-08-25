import type { ExperienceState } from '@/lib/faraday/client-state';
import { eventDescription, eventLabels } from '@/lib/faraday/client-state';

export function RunTimeline({ state }: { state: ExperienceState }) {
  return (
    <article className="trajectory-panel">
      <div className="panel-label"><span>RUN TRAJECTORY</span><span>{state.events.length ? `${state.events.length} EVENTS` : 'WAITING'}</span></div>
      {state.events.length === 0 ? (
        <div className="empty-trajectory"><div className="radar"><i /><i /><i /></div><h3>Machine evidence will appear here.</h3><p>Faraday shows normalized lifecycle and verification events—never hidden model reasoning.</p></div>
      ) : (
        <ol className="event-list" aria-live="polite" aria-label="Run events">
          {state.events.filter((event) => event.type !== 'finish').map((event) => (
            <li key={`${event.runId}-${event.seq}`} className={event.type === 'error' ? 'event-error' : event.type === 'verdict' ? `event-${state.verdict}` : ''}>
              <span className="event-seq">{String(event.seq).padStart(2, '0')}</span><span className="event-node" />
              <div><small>{eventLabels[event.type]}</small><p>{eventDescription(event)}</p></div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
