import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getFixtureInput, type CommentInput } from './comment-input';

export type FixedFixtures = { issue: string; reproduction: string; fingerprint: string };

export async function loadFixtures(input?: CommentInput): Promise<FixedFixtures> {
  const root = path.join(process.cwd(), 'fixtures');
  const [issue, reproduction] = await Promise.all([
    readFile(path.join(root, 'issue.md'), 'utf8'),
    readFile(path.join(root, 'repro.mjs'), 'utf8'),
  ]);
  const selected = input ?? getFixtureInput();
  const materializedIssue = issue.replace('{{FARADAY_UNTRUSTED_INPUT}}', selected.body.replace(/\r?\n/g, '\n> '));
  const fingerprint = createHash('sha256').update(materializedIssue).update('\0').update(reproduction).digest('hex');
  return { issue: materializedIssue, reproduction, fingerprint };
}
