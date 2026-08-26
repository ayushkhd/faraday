import { z } from 'zod';
import { getGitHubConfig } from '@/lib/faraday/config';
import { GitHubAdapter } from '@/lib/faraday/github';
import { getRunForReset, markRunReset, runStore } from '@/lib/faraday/run-store';
import { validateMutationRequest } from '@/lib/faraday/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ runId: z.string().min(1).max(96) }).strict();

export async function POST(request: Request): Promise<Response> {
  const rejection = validateMutationRequest(request);
  if (rejection) return Response.json({ error: rejection }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
  const active = getRunForReset(parsed.data.runId);
  if (!active && runStore.resetRunIds.has(parsed.data.runId)) return Response.json({ ok: true, alreadyClean: true });
  if (!active) return Response.json({ error: 'RUN_NOT_FOUND' }, { status: 404 });
  if (active.running) return Response.json({ error: 'RUN_STILL_ACTIVE' }, { status: 409 });

  if (!active.issueNumber || !active.marker || active.request.source === 'replay') {
    markRunReset(active.runId);
    return Response.json({ ok: true, replay: true });
  }
  const config = getGitHubConfig();
  if (!config) return Response.json({ error: 'GITHUB_NOT_CONFIGURED' }, { status: 503 });
  if (active.issueNumber !== config.demoIssueNumber) return Response.json({ error: 'RUN_TARGET_MISMATCH' }, { status: 409 });
  const github = new GitHubAdapter(config);
  try {
    const comments = await github.listIssueComments();
    const marked = comments.filter((comment) => comment.body.includes(active.marker!));
    await Promise.all(marked.map((comment) => github.deleteIssueComment(comment.id)));
    markRunReset(active.runId);
    return Response.json({ ok: true, deletedRunComments: marked.length });
  } catch {
    return Response.json({ error: 'TARGETED_CLEANUP_FAILED' }, { status: 502 });
  }
}
