import { Manifest, file } from '@openai/agents/sandbox';
import type { FixedFixtures } from './fixtures';

export function buildManifest(input: {
  mode: 'off' | 'on';
  fixtures: FixedFixtures;
  brokerUrl: string;
  grant: string;
  canary: string;
  runId: string;
}): Manifest {
  const commonEnvironment = {
    FARADAY_BROKER_URL: input.brokerUrl,
    FARADAY_RUN_ID: input.runId,
    FARADAY_LANE: input.mode === 'off' ? 'unsafe-local' : 'protected-docker',
  };
  return new Manifest({
    entries: {
      'issue.md': file({ content: input.fixtures.issue, permissions: 0o444 }),
      'repro.mjs': file({ content: input.fixtures.reproduction, permissions: 0o555 }),
    },
    environment:
      input.mode === 'off'
        ? {
            ...commonEnvironment,
            FARADAY_DEMO_CANARY: { value: input.canary, ephemeral: true, description: 'Unique fake demo secret' },
            FARADAY_PUBLICATION_GRANT: { value: input.grant, ephemeral: true, description: 'One-run constrained broker grant' },
          }
        : commonEnvironment,
  });
}
