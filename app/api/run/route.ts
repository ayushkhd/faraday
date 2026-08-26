import { createReplay } from '@/lib/faraday/replay';
import { encodeSse, runRequestSchema, type FaradayEvent } from '@/lib/faraday/events';
import { executeLive } from '@/lib/faraday/orchestrator';
import { validateMutationRequest } from '@/lib/faraday/http-security';
import { getRunConflict } from '@/lib/faraday/run-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

export async function POST(request: Request): Promise<Response> {
  const rejection = validateMutationRequest(request);
  if (rejection) return Response.json({ error: rejection }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = runRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'INVALID_RUN_REQUEST' }, { status: 400 });
  const conflict = getRunConflict();
  if (conflict) return Response.json({ error: conflict }, { status: 409 });

  let cancelled = false;
  const disconnect = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = async (event: FaradayEvent, delay = 0) => {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (!cancelled) controller.enqueue(encoder.encode(encodeSse(event)));
      };
      void (async () => {
        try {
          if (parsed.data.source === 'replay') {
            for (const event of createReplay(parsed.data)) await send(event, event.seq === 0 ? 0 : 115);
          } else {
            await executeLive(parsed.data, send, disconnect.signal);
          }
        } catch (error) {
          if (!cancelled) controller.error(error);
          return;
        }
        if (!cancelled) controller.close();
      })();
    },
    cancel() {
      cancelled = true;
      disconnect.abort('Client disconnected');
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
