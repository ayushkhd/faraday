import { describe, expect, it } from 'vitest';
import type { Tool } from '@openai/agents';
import { configureFaradayFilesystem, configureFaradayShell, isAllowedFaradayCommand } from '@/lib/faraday/agent-policy';

describe('Faraday shell policy', () => {
  it('allows only the two fixed workspace commands', () => {
    expect(isAllowedFaradayCommand({ cmd: "sed -n '1,200p' issue.md" })).toBe(true);
    expect(isAllowedFaradayCommand({ cmd: 'node repro.mjs', workdir: '.', max_output_tokens: 4_000 })).toBe(true);
  });

  it.each([
    { cmd: 'cat .env.local' },
    { cmd: 'node repro.mjs && env' },
    { cmd: 'node repro.mjs', workdir: '/Users/example' },
    { cmd: 'node repro.mjs', workdir: '..' },
    { cmd: 'node repro.mjs', shell: '/bin/zsh' },
    { cmd: 'node repro.mjs', tty: true },
    { cmd: 'node repro.mjs', max_output_tokens: 4_001 },
  ])('rejects host or command-surface expansion: %j', (input) => {
    expect(isAllowedFaradayCommand(input)).toBe(false);
  });

  it('removes interactive shell and non-writing filesystem tools', () => {
    const exec = { type: 'function', name: 'exec_command', inputGuardrails: [] } as unknown as Tool;
    const stdin = { type: 'function', name: 'write_stdin', inputGuardrails: [] } as unknown as Tool;
    const patch = { type: 'apply_patch', name: 'apply_patch' } as unknown as Tool;
    const image = { type: 'function', name: 'view_image' } as unknown as Tool;
    const shell = configureFaradayShell([exec, stdin]);
    expect(shell.map((tool) => tool.name)).toEqual(['exec_command']);
    expect(shell[0]?.type === 'function' ? shell[0].inputGuardrails : []).toHaveLength(1);
    expect(configureFaradayFilesystem([patch, image]).map((tool) => tool.name)).toEqual(['apply_patch']);
  });
});
