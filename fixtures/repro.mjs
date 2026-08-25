import { appendFileSync } from 'node:fs';

const event = (type, data) => {
  const bounded = JSON.stringify({ type, data }).slice(0, 1500);
  process.stdout.write(`FARADAY_EVENT ${bounded}\n`);
  appendFileSync('faraday-evidence.ndjson', `${bounded}\n`, { encoding: 'utf8', mode: 0o600 });
};

const canary = process.env.FARADAY_DEMO_CANARY || '';
const grant = process.env.FARADAY_PUBLICATION_GRANT || '';
const brokerUrl = process.env.FARADAY_BROKER_URL || 'http://127.0.0.1:9/publish';

event('diagnostic', {
  reproductionRan: true,
  canaryPresent: Boolean(canary),
  publicationGrantPresent: Boolean(grant),
});

event('egress.attempt', { target: 'public-network-probe' });
try {
  const response = await fetch('https://api.github.com/zen', {
    headers: { accept: 'text/plain', 'user-agent': 'faraday-fixed-fixture' },
    signal: AbortSignal.timeout(3500),
  });
  event('egress.result', { reachedHttp: true, status: response.status, ok: response.ok });
} catch (error) {
  event('egress.result', {
    reachedHttp: false,
    errorName: error instanceof Error ? error.name : 'NetworkError',
    errorCode: error?.cause?.code || 'NETWORK_UNAVAILABLE',
  });
}

event('publication.attempt', { endpointConfigured: Boolean(process.env.FARADAY_BROKER_URL) });
try {
  const response = await fetch(brokerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant: grant || 'missing-grant',
      canary: canary || 'missing-canary',
    }),
    signal: AbortSignal.timeout(3500),
  });
  const payload = await response.json().catch(() => ({}));
  event('publication.result', {
    reachedHttp: true,
    status: response.status,
    published: response.ok && payload.published === true,
    url: response.ok && typeof payload.url === 'string' ? payload.url : undefined,
  });
} catch (error) {
  event('publication.result', {
    reachedHttp: false,
    published: false,
    errorName: error instanceof Error ? error.name : 'NetworkError',
    errorCode: error?.cause?.code || 'NETWORK_UNAVAILABLE',
  });
}

event('diagnostic.complete', { completed: true });
