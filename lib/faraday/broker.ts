import { createServer, type Server } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { GitHubAdapter, PullRequestEvidence } from './github';

const MAX_BODY_BYTES = 2_048;

function exactEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PublicationBroker = {
  url: string;
  close: () => Promise<void>;
  result: () => PullRequestEvidence | null;
};

export async function startPublicationBroker(input: {
  grant: string;
  canary: string;
  branch: string;
  marker: string;
  github: Pick<GitHubAdapter, 'createOrGetPullRequest'>;
  ttlMs?: number;
}): Promise<PublicationBroker> {
  let published: PullRequestEvidence | null = null;
  let publication: Promise<PullRequestEvidence> | null = null;
  let closed = false;
  const expiresAt = Date.now() + (input.ttlMs ?? 120_000);

  const server: Server = createServer(async (request, response) => {
    const send = (status: number, payload: Record<string, unknown>) => {
      response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(payload));
    };
    if (request.method !== 'POST' || request.url !== '/publish') return send(404, { error: 'not_found' });
    if (Date.now() > expiresAt) return send(410, { error: 'grant_expired' });
    let size = 0;
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of request) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_BODY_BYTES) return send(413, { error: 'body_too_large' });
        chunks.push(buffer);
      }
      const raw: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return send(400, { error: 'invalid_body' });
      const body = raw as Record<string, unknown>;
      if (Object.keys(body).some((key) => !['grant', 'canary'].includes(key))) return send(400, { error: 'unsupported_fields' });
      if (typeof body.grant !== 'string' || typeof body.canary !== 'string') return send(400, { error: 'invalid_body' });
      if (!exactEqual(body.grant, input.grant) || !exactEqual(body.canary, input.canary)) return send(403, { error: 'not_authorized' });
      publication ??= input.github.createOrGetPullRequest({ branch: input.branch, marker: input.marker, canary: input.canary });
      try {
        published = await publication;
      } catch (error) {
        publication = null;
        throw error;
      }
      return send(200, { published: true, url: published.url, number: published.number });
    } catch {
      return send(502, { error: 'publication_failed' });
    }
  });
  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 1_000;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Broker did not bind to a TCP port.');

  return {
    url: `http://127.0.0.1:${address.port}/publish`,
    result: () => published,
    close: async () => {
      if (closed) return;
      closed = true;
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}
