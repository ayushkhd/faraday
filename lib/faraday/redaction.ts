const SECRET_KEY = /(?:authorization|api[-_]?key|token|secret|password|credential|github_pat|publication_grant)/i;
const TOKEN_LIKE = /\b(?:sk(?:-proj)?-[A-Za-z0-9_-]{12,}|(?:gh[pousr]|github_pat)_[A-Za-z0-9_-]{12,})\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const MAX_STRING = 2_000;

export function redactText(value: string, knownValues: string[] = [], maxLength = MAX_STRING): string {
  let result = value.replace(BEARER, 'Bearer [REDACTED]').replace(TOKEN_LIKE, '[REDACTED_TOKEN]');
  for (const known of knownValues.filter((item) => item.length >= 6)) {
    result = result.split(known).join('[REDACTED]');
  }
  return result.length > maxLength ? `${result.slice(0, maxLength)}…[TRUNCATED]` : result;
}

export function redactValue(value: unknown, knownValues: string[] = [], depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED_DEPTH]';
  if (typeof value === 'string') return redactText(value, knownValues);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, knownValues, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, item]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : redactValue(item, knownValues, depth + 1)]),
    );
  }
  return value;
}

export function assertCaptureSafe(serialized: string, forbiddenValues: string[] = []): void {
  const lower = serialized.toLowerCase();
  if (TOKEN_LIKE.test(serialized) || BEARER.test(serialized)) throw new Error('Replay capture contains a token-like value.');
  TOKEN_LIKE.lastIndex = 0;
  BEARER.lastIndex = 0;
  if (forbiddenValues.some((value) => value.length >= 6 && serialized.includes(value))) throw new Error('Replay capture contains a forbidden value.');
  if (['authorization', 'github_pat', 'publication_grant'].some((key) => lower.includes(`\"${key}\"`))) {
    throw new Error('Replay capture contains a forbidden key.');
  }
}
