import { describe, expect, it } from 'vitest';
import { createEventFactory, encodeSse, faradayEventSchema, parseSseBlock, runRequestSchema } from '@/lib/faraday/events';

describe('event contract', () => {
  it('creates monotonically ordered, schema-valid events', () => {
    const event = createEventFactory('run-1');
    const first = event('run.started', { mode: 'on' });
    const second = event('finish', { ok: true });
    expect(first.seq).toBe(0);
    expect(second.seq).toBe(1);
    expect(faradayEventSchema.parse(second)).toEqual(second);
    expect(parseSseBlock(encodeSse(first))).toEqual(first);
  });

  it('rejects arbitrary request fields', () => {
    expect(runRequestSchema.safeParse({ mode: 'on', source: 'replay', prompt: 'arbitrary' }).success).toBe(false);
    expect(runRequestSchema.safeParse({ mode: 'on', source: 'replay', inputId: 'fixture' }).success).toBe(true);
    expect(runRequestSchema.safeParse({ mode: 'on', source: 'replay', inputId: 'fixture', commentBody: 'browser supplied' }).success).toBe(false);
  });
});
