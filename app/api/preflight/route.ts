import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getGitHubConfig, getModel, missingLiveVariables } from '@/lib/faraday/config';
import { loadFixtures } from '@/lib/faraday/fixtures';
import { GitHubAdapter } from '@/lib/faraday/github';
import { getCsrfToken } from '@/lib/faraday/http-security';
import { getFixtureInput } from '@/lib/faraday/comment-input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exec = promisify(execFile);

async function dockerReadiness() {
  try {
    await exec('docker', ['--version'], { timeout: 1_500 });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT'
      ? { installed: false, daemon: false, image: false, reason: 'DOCKER_NOT_INSTALLED' }
      : { installed: true, daemon: false, image: false, reason: 'DOCKER_DAEMON_UNAVAILABLE' };
  }

  try {
    await exec('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 1_500 });
  } catch {
    return { installed: true, daemon: false, image: false, reason: 'DOCKER_DAEMON_UNAVAILABLE' };
  }

  try {
    await exec('docker', ['image', 'inspect', 'node:22-bookworm-slim'], { timeout: 1_500 });
    return { installed: true, daemon: true, image: true, reason: null };
  } catch {
    return { installed: true, daemon: true, image: false, reason: 'DOCKER_IMAGE_MISSING' };
  }
}

export async function GET(): Promise<Response> {
  const [docker, fixtures] = await Promise.all([
    dockerReadiness(),
    loadFixtures().then((value) => ({ ready: true, fingerprint: value.fingerprint })).catch(() => ({ ready: false, fingerprint: null })),
  ]);
  const missing = missingLiveVariables();
  const githubConfig = getGitHubConfig();
  let github = { configured: Boolean(githubConfig), reachable: false, demoIssue: false, issueUrl: null as string | null, reason: githubConfig ? null : 'GITHUB_CONFIG_MISSING' as string | null };
  if (githubConfig) {
    try {
      const adapter = new GitHubAdapter(githubConfig);
      await adapter.checkDemoIssue();
      github = { configured: true, reachable: true, demoIssue: true, issueUrl: adapter.issueUrl(), reason: null };
    } catch {
      github = { configured: true, reachable: false, demoIssue: false, issueUrl: null, reason: 'GITHUB_DEMO_ISSUE_UNREACHABLE' };
    }
  }
  const sharedReady = missing.length === 0 && github.reachable && fixtures.ready;
  return Response.json({
    csrfToken: getCsrfToken(),
    defaultInput: getFixtureInput(),
    model: getModel(),
    openai: { configured: Boolean(process.env.OPENAI_API_KEY), reason: process.env.OPENAI_API_KEY ? null : 'OPENAI_API_KEY_MISSING' },
    github,
    docker,
    replay: { ready: fixtures.ready, reason: fixtures.ready ? null : 'REPLAY_FIXTURES_INVALID' },
    lanes: {
      off: { live: sharedReady, replay: fixtures.ready, reason: sharedReady ? null : 'LIVE_PREREQUISITES_MISSING' },
      on: { live: sharedReady && docker.daemon && docker.image, replay: fixtures.ready, reason: sharedReady && docker.daemon && docker.image ? null : 'PROTECTED_LIVE_PREREQUISITES_MISSING' },
    },
    missingVariables: missing,
  }, { headers: { 'cache-control': 'no-store' } });
}
