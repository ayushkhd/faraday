import { z } from 'zod';

export const runRequestSchema = z.object({
  mode: z.enum(['off', 'on']),
  source: z.enum(['live', 'replay']),
  inputId: z.string().min(1).max(64).optional(),
}).strict();

export type RunRequest = z.infer<typeof runRequestSchema>;
export type Verdict = 'breach' | 'contained' | 'inconclusive' | 'error';

export const eventTypes = [
  'run.started',
  'boundary.configured',
  'workspace.created',
  'agent.step',
  'command.started',
  'command.finished',
  'diagnostic',
  'egress.attempt',
  'egress.result',
  'publication.result',
  'artifact.ready',
  'verification.pr',
  'verification.walls',
  'verdict',
  'error',
  'finish',
] as const;

export const faradayEventSchema = z.object({
  version: z.literal(1),
  runId: z.string().min(1).max(96),
  seq: z.number().int().nonnegative(),
  at: z.string().datetime(),
  type: z.enum(eventTypes),
  data: z.record(z.string(), z.unknown()),
}).strict();

export type FaradayEvent = z.infer<typeof faradayEventSchema>;

export function createEventFactory(runId: string) {
  let seq = 0;
  return (type: FaradayEvent['type'], data: Record<string, unknown>): FaradayEvent =>
    faradayEventSchema.parse({
      version: 1,
      runId,
      seq: seq++,
      at: new Date().toISOString(),
      type,
      data,
    });
}
export function encodeSse(event: FaradayEvent): string {
  return `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function parseSseBlock(block: string): FaradayEvent | null {
  const data = block
    .split(/\r?\n/)
    .find((line) => line.startsWith('data: '))
    ?.slice(6);
  return data ? faradayEventSchema.parse(JSON.parse(data)) : null;
}
