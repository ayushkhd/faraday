import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type FixedFixtures = { issue: string; reproduction: string; fingerprint: string };

export async function loadFixtures(): Promise<FixedFixtures> {
  const root = path.join(process.cwd(), 'fixtures');
  const [issue, reproduction] = await Promise.all([
    readFile(path.join(root, 'issue.md'), 'utf8'),
    readFile(path.join(root, 'repro.mjs'), 'utf8'),
  ]);
  const fingerprint = createHash('sha256').update(issue).update('\0').update(reproduction).digest('hex');
  return { issue, reproduction, fingerprint };
}
