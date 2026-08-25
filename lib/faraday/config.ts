import { z } from 'zod';

const repositorySchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  demoIssueNumber: number;
};

export function getGitHubConfig(): GitHubConfig | null {
  const parsed = repositorySchema.safeParse(process.env.GITHUB_REPOSITORY);
  const token = process.env.GITHUB_PAT;
  const demoIssueNumber = Number(process.env.GITHUB_DEMO_ISSUE_NUMBER);
  if (!parsed.success || !token || !Number.isSafeInteger(demoIssueNumber) || demoIssueNumber <= 0) return null;
  const [owner, repo] = parsed.data.split('/');
  return { token, owner, repo, demoIssueNumber };
}
export function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-5.6-luna';
}

export function missingLiveVariables(): string[] {
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.GITHUB_PAT) missing.push('GITHUB_PAT');
  if (!process.env.GITHUB_REPOSITORY) missing.push('GITHUB_REPOSITORY');
  if (!process.env.GITHUB_DEMO_ISSUE_NUMBER) missing.push('GITHUB_DEMO_ISSUE_NUMBER');
  return missing;
}
