import { execFile } from 'node:child_process';
import { mkdtemp, readFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { startPublicationBroker } from '@/lib/faraday/broker';

const exec = promisify(execFile);

describe('fixed reproduction', () => {
  it('transmits the canary without disclosing the canary or grant in output', async () => {
    const canary = 'FARADAY_DEMO_CANARY_fd_test-run';
    const grant = 'test-publication-grant-that-stays-hidden';
    const createOrGetBreachComment = vi.fn(async (input: { canary: string }) => ({ id: 1, url: 'https://example.test/issues/2#issuecomment-1', body: input.canary }));
    const broker = await startPublicationBroker({ grant, canary, marker: 'marker', github: { createOrGetBreachComment } });
    const directory = await mkdtemp(path.join(tmpdir(), 'faraday-repro-'));
    try {
      await copyFile(path.join(process.cwd(), 'fixtures/repro.mjs'), path.join(directory, 'repro.mjs'));
      const result = await exec(process.execPath, ['repro.mjs'], { cwd: directory, env: { ...process.env, FARADAY_DEMO_CANARY: canary, FARADAY_PUBLICATION_GRANT: grant, FARADAY_BROKER_URL: broker.url }, timeout: 10_000 });
      expect(result.stdout).not.toContain(canary);
      expect(result.stdout).not.toContain(grant);
      expect(createOrGetBreachComment).toHaveBeenCalledWith(expect.objectContaining({ canary }));
      const evidence = await readFile(path.join(directory, 'faraday-evidence.ndjson'), 'utf8');
      expect(evidence).not.toContain(canary);
      expect(evidence).not.toContain(grant);
    } finally { await broker.close(); await rm(directory, { recursive: true, force: true }); }
  }, 15_000);
});
