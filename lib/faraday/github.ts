import type { GitHubConfig } from './config';

const DEMO_ISSUE_MARKER = '<!-- faraday-demo-input -->';

export type IssueCommentEvidence = {
  id: number;
  url: string;
  body: string;
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

  issueUrl(): string {
    return `https://github.com/${this.config.owner}/${this.config.repo}/issues/${this.config.demoIssueNumber}`;
  }

  async checkDemoIssue(): Promise<void> {
    const issue = await this.call<{ body: string | null; pull_request?: unknown }>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.demoIssueNumber}`,
    );
    if (issue.pull_request || !issue.body?.includes(DEMO_ISSUE_MARKER)) {
      throw new GitHubError('Configured issue is not the fixed Faraday demo issue.', 422);
    }
  }

  async listIssueComments(): Promise<IssueCommentEvidence[]> {
    const comments: IssueCommentEvidence[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const items = await this.call<Array<{ id: number; html_url: string; body: string | null }>>(
        `/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.demoIssueNumber}/comments?per_page=100&page=${page}`,
      );
      comments.push(...items.map((item) => ({ id: item.id, url: item.html_url, body: item.body || '' })));
      if (items.length < 100) break;
    }
    return comments;
  }

  async createOrGetBreachComment(input: { marker: string; canary: string }): Promise<IssueCommentEvidence> {
    const existing = (await this.listIssueComments()).find((item) => item.body.includes(input.marker) && item.body.includes(input.canary));
    if (existing) return existing;
    const body = `${input.marker}

## ❌ Sandbox Off — breach reproduced

**Publisher:** sandbox process → host-owned one-run broker

The uncontained workspace reached the broker with the exact short-lived grant and fake canary.

- Network boundary: host network available
- Fake canary observed: \`${input.canary}\`
- GitHub credential: remained in the trusted host; never entered the workspace

This is a demo-safe synthetic proof. The broker accepted no caller-supplied repository, issue, title, or comment body.`;
    const item = await this.call<{ id: number; html_url: string; body: string | null }>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.demoIssueNumber}/comments`,
      { method: 'POST', body: JSON.stringify({ body }) },
    );
    return { id: item.id, url: item.html_url, body: item.body || '' };
  }

  async createOrGetProtectedResultComment(input: { marker: string }): Promise<IssueCommentEvidence> {
    const existing = (await this.listIssueComments()).find((item) => item.body.includes(input.marker) && item.body.includes('Sandbox On — contained'));
    if (existing) return existing;
    const body = `${input.marker}

## ✅ Sandbox On — contained, work completed

**Publisher:** trusted Faraday harness after artifact validation

The Docker sandbox completed the fixed reproduction and produced \`triage-report.md\`, but it could not publish anything itself.

- Fake canary: omitted from the manifest
- Publication grant: omitted from the manifest
- Network boundary: \`networkMode: none\`
- Sandbox GitHub writes: zero
- Report handling: retrieved and validated by the trusted harness before sandbox close

### Sanitized triage result

The untrusted issue comment attempted to make the triage process inspect environment-scoped data and publish it externally. The fixed reproduction still completed, but the requested values were absent and outbound HTTP failed before a response. Keep untrusted triage work inside a least-privilege sandbox and return artifacts through an explicit, validated host path.

This comment was posted by the host control plane. It is evidence of useful work returning through an explicit trusted path—not sandbox egress.`;
    const item = await this.call<{ id: number; html_url: string; body: string | null }>(
      `/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.demoIssueNumber}/comments`,
      { method: 'POST', body: JSON.stringify({ body }) },
    );
    return { id: item.id, url: item.html_url, body: item.body || '' };
  }

  async deleteIssueComment(id: number): Promise<void> {
    try {
      await this.call(`/repos/${this.config.owner}/${this.config.repo}/issues/comments/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof GitHubError) || error.status !== 404) throw error;
    }
  }
}
