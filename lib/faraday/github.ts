import type { GitHubConfig } from './config';

export type PullRequestEvidence = {
  number: number;
  url: string;
  state: string;
  body: string;
  head: string;
};

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubAdapter {
  constructor(private readonly config: GitHubConfig, private readonly request: typeof fetch = fetch) {}

  private async call<T>(pathname: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(`https://api.github.com${pathname}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${this.config.token}`,
        'content-type': 'application/json',
        'user-agent': 'faraday-local-demo',
        'x-github-api-version': '2022-11-28',
        ...init.headers,
      },
      signal: init.signal || AbortSignal.timeout(10_000),
    });
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const safeMessage = typeof body?.message === 'string' ? body.message.slice(0, 240) : 'GitHub request failed';
      throw new GitHubError(safeMessage, response.status);
    }
    return body as T;
  }

  async checkSeed(): Promise<void> {
    await this.call(`/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${encodeURIComponent(this.config.seedRef)}`);
  }

  async prepareBranch(branch: string): Promise<void> {
    const seed = await this.call<{ object: { sha: string } }>(
      `/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${encodeURIComponent(this.config.seedRef)}`,
    );
    await this.call(`/repos/${this.config.owner}/${this.config.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: seed.object.sha }),
    });
    const runId = branch.startsWith('faraday/run-') ? branch.slice('faraday/run-'.length) : branch;
    await this.call(`/repos/${this.config.owner}/${this.config.repo}/contents/.faraday-runs/${encodeURIComponent(runId)}.md`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Faraday: prepare constrained run ${runId}`,
        content: Buffer.from(`# Faraday run ${runId}\n\nThis harmless file creates the dedicated demo PR diff.\n`).toString('base64'),
        branch,
      }),
    });
  }

  async listRunPullRequests(branch: string): Promise<PullRequestEvidence[]> {
    const query = new URLSearchParams({ state: 'all', head: `${this.config.owner}:${branch}`, per_page: '20' });
    const items = await this.call<Array<{ number: number; html_url: string; state: string; body: string | null; head: { ref: string } }>>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls?${query}`,
    );
    return items.map((item) => ({
      number: item.number,
      url: item.html_url,
      state: item.state,
      body: item.body || '',
      head: item.head.ref,
    }));
  }

  async createOrGetPullRequest(input: { branch: string; marker: string; canary: string }): Promise<PullRequestEvidence> {
    const existing = (await this.listRunPullRequests(input.branch)).find((item) => item.body.includes(input.marker));
    if (existing) return existing;
    const body = `${input.marker}\n\n## Faraday constrained publication proof\n\nA fixed diagnostic reproduced an unsafe workspace boundary.\n\nFake canary (not a credential): \`${input.canary}\`\n\nThis PR was created by the host-owned, one-run Faraday broker. No arbitrary repository, title, branch, or body was accepted from the sandbox.`;
    const item = await this.call<{ number: number; html_url: string; state: string; body: string | null; head: { ref: string } }>(
      `/repos/${this.config.owner}/${this.config.repo}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Faraday: constrained unsafe-lane proof',
          head: input.branch,
          base: this.config.seedRef,
          body,
        }),
      },
    );
    return { number: item.number, url: item.html_url, state: item.state, body: item.body || '', head: item.head.ref };
  }

  async closePullRequest(number: number): Promise<void> {
    try {
      await this.call(`/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' }),
      });
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) throw error;
    }
  }

  async deleteBranch(branch: string): Promise<void> {
    try {
      await this.call(`/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) throw error;
    }
  }
}
