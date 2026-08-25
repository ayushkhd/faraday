import { describe, expect, it } from 'vitest';
import { assertCaptureSafe, redactText, redactValue } from '@/lib/faraday/redaction';

describe('redaction', () => {
  it('redacts known values, bearer headers, token-like values, and secret keys', () => {
    const known = 'one-run-sensitive-value';
    const result = redactValue({ authorization: 'Bearer abc.def', output: `${known} sk-proj-exampletokenvalue12345` }, [known]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(known);
    expect(serialized).not.toContain('abc.def');
    expect(serialized).not.toContain('sk-proj-exampletokenvalue12345');
  });

  it('bounds strings and rejects unsafe captures', () => {
    expect(redactText('a'.repeat(4_000))).toContain('[TRUNCATED]');
    expect(redactText('a'.repeat(4_000), [], 5_000)).not.toContain('[TRUNCATED]');
    expect(() => assertCaptureSafe('{"authorization":"value"}')).toThrow();
  });
});
