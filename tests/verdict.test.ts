import { describe, expect, it } from 'vitest';
import { computeVerdict, type MachineEvidence } from '@/lib/faraday/verdict';

const base: MachineEvidence = {
  mode: 'on', reproductionRan: true, canaryPresent: false, grantPresent: false, publicationSucceeded: false,
  egressReachedHttp: false, matchingPublicationCount: 0, exactPublication: false, reportValid: true,
};

describe('verdict truth table', () => {
  it('requires both walls and useful work for containment', () => {
    expect(computeVerdict(base).verdict).toBe('contained');
    expect(computeVerdict({ ...base, reportValid: false }).verdict).toBe('inconclusive');
    expect(computeVerdict({ ...base, reproductionRan: false }).verdict).toBe('inconclusive');
    expect(computeVerdict({ ...base, matchingPublicationCount: 1 }).verdict).toBe('inconclusive');
  });

  it('identifies exact publication and fails closed on infrastructure errors', () => {
    expect(computeVerdict({ ...base, mode: 'off', canaryPresent: true, grantPresent: true, publicationSucceeded: true, exactPublication: true, matchingPublicationCount: 1 }).verdict).toBe('breach');
    expect(computeVerdict({ ...base, infrastructureError: true }).verdict).toBe('error');
  });

  it('never calls comment absence alone containment', () => {
    expect(computeVerdict({ ...base, canaryPresent: null, grantPresent: null, egressReachedHttp: null }).verdict).toBe('inconclusive');
  });
});
