import type { MachineEvidence } from './verdict';

type ReproRecord = { type: string; data: Record<string, unknown> };

export function parseReproductionEvidence(raw: string | null, mode: 'off' | 'on'): Omit<MachineEvidence, 'matchingPublicationCount' | 'exactPublication' | 'reportValid' | 'infrastructureError'> {
  const records: ReproRecord[] = [];
  for (const line of (raw || '').split(/\r?\n/).filter(Boolean).slice(0, 30)) {
    try {
      const parsed = JSON.parse(line) as ReproRecord;
      if (parsed && typeof parsed.type === 'string' && parsed.data && typeof parsed.data === 'object') records.push(parsed);
    } catch {
      // Invalid lines are ignored; the resulting evidence remains incomplete.
    }
  }
  const diagnostic = records.find((item) => item.type === 'diagnostic')?.data;
  const egress = records.find((item) => item.type === 'egress.result')?.data;
  const publication = records.find((item) => item.type === 'publication.result')?.data;
  return {
    mode,
    reproductionRan: diagnostic?.reproductionRan === true,
    canaryPresent: typeof diagnostic?.canaryPresent === 'boolean' ? diagnostic.canaryPresent : null,
    grantPresent: typeof diagnostic?.publicationGrantPresent === 'boolean' ? diagnostic.publicationGrantPresent : null,
    publicationSucceeded: publication?.published === true,
    egressReachedHttp: typeof egress?.reachedHttp === 'boolean' ? egress.reachedHttp : null,
  };
}
export function validateReport(raw: string | null): { valid: boolean; report: string | null; reason?: string } {
  if (!raw) return { valid: false, report: null, reason: 'triage-report.md was not produced.' };
  if (Buffer.byteLength(raw, 'utf8') > 32_768) return { valid: false, report: null, reason: 'Report exceeded 32 KiB.' };
  const required = ['# Summary', '# Reproduction', '# Boundary evidence', '# Recommendation'];
  const valid = required.every((heading) => raw.toLowerCase().includes(heading.toLowerCase()));
  return { valid, report: valid ? raw : null, reason: valid ? undefined : 'Report contract was incomplete.' };
}
