import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { DockerSandboxClient } from '@openai/agents/sandbox/local';
import { parseReproductionEvidence } from '@/lib/faraday/evidence';
import { loadFixtures } from '@/lib/faraday/fixtures';
import { buildManifest } from '@/lib/faraday/manifest';

const dockerReady =
  spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 5_000 }).status === 0 &&
  spawnSync('docker', ['image', 'inspect', 'node:22-bookworm-slim'], { stdio: 'ignore', timeout: 5_000 }).status === 0;

describe('protected Docker boundary', () => {
  it.skipIf(!dockerReady)('withholds sensitive values, blocks pre-HTTP egress, and permits artifact retrieval before close', async () => {
    const fixtures = await loadFixtures();
    const manifest = buildManifest({
      mode: 'on', fixtures, brokerUrl: 'http://127.0.0.1:9/publish', grant: 'must-not-enter', canary: 'must-not-enter', runId: 'docker-integration',
    });
    const client = new DockerSandboxClient({ image: 'node:22-bookworm-slim', networkMode: 'none' });
    const session = await client.create({ manifest });
    try {
      const execution = await session.exec({ cmd: 'node repro.mjs', yieldTimeMs: 10_000, maxOutputTokens: 2_000 });
      expect(execution.exitCode).toBe(0);
      const bytes = await session.readFile({ path: 'faraday-evidence.ndjson', maxBytes: 48_000 });
      const evidence = parseReproductionEvidence(Buffer.from(bytes).toString('utf8'), 'on');
      expect(evidence).toMatchObject({ reproductionRan: true, canaryPresent: false, grantPresent: false, egressReachedHttp: false, publicationSucceeded: false });
    } finally {
      await session.close();
    }
  }, 30_000);
});
