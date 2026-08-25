import { z } from 'zod';

const repositorySchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  seedRef: string;
};

export function getGitHubConfig(): GitHubConfig | null {
  const parsed = repositorySchema.safeParse(process.env.GITHUB_REPOSITORY);
  const token = process.env.GITHUB_PAT;
  const seedRef = process.env.GITHUB_SEED_REF;
  if (!parsed.success || !token || !seedRef) return null;
  const [owner, repo] = parsed.data.split('/');
  return { token, owner, repo, seedRef };
}
export function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-5.6-luna';
}

export function missingLiveVariables(): string[] {
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.GITHUB_PAT) missing.push('GITHUB_PAT');
  if (!process.env.GITHUB_REPOSITORY) missing.push('GITHUB_REPOSITORY');
  if (!process.env.GITHUB_SEED_REF) missing.push('GITHUB_SEED_REF');
  return missing;
}
