import { z } from 'zod';
import { CommentInputError, fetchPublicGitHubInput } from '@/lib/faraday/comment-input';
import { validateMutationRequest } from '@/lib/faraday/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ url: z.string().min(1).max(512) }).strict();

export async function POST(request: Request): Promise<Response> {
  const rejection = validateMutationRequest(request);
  if (rejection) return Response.json({ error: rejection }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'INVALID_COMMENT_REQUEST' }, { status: 400 });
  try {
    return Response.json(await fetchPublicGitHubInput(parsed.data.url), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code = error instanceof CommentInputError ? error.code : 'PUBLIC_COMMENT_UNAVAILABLE';
    const status = code === 'INVALID_GITHUB_INPUT_URL'
      ? 400
      : code === 'PUBLIC_COMMENT_NOT_FOUND'
        ? 404
        : code === 'PUBLIC_GITHUB_RATE_LIMITED'
          ? 429
          : 422;
    return Response.json({ error: code }, { status });
  }
}
