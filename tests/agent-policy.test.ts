import { describe, expect, it, vi } from 'vitest';
import type { Editor, Tool } from '@openai/agents';
import { configureFaradayFilesystem, configureFaradayShell, createFaradayReportEditor, isAllowedFaradayCommand } from '@/lib/faraday/agent-policy';

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

  it('allows report writes while rejecting fixture, evidence, move, and delete operations', async () => {
    const editor: Editor = {
      createFile: vi.fn(async () => ({ status: 'completed' as const })),
      updateFile: vi.fn(async () => ({ status: 'completed' as const })),
      deleteFile: vi.fn(async () => ({ status: 'completed' as const })),
    };
    const restricted = createFaradayReportEditor(editor);

    await expect(restricted.createFile({ type: 'create_file', path: 'triage-report.md', diff: '+safe report' })).resolves.toMatchObject({ status: 'completed' });
    for (const path of ['repro.mjs', 'issue.md', 'faraday-evidence.ndjson', '../repro.mjs', '/tmp/repro.mjs']) {
      await expect(restricted.createFile({ type: 'create_file', path, diff: '+malicious' })).resolves.toMatchObject({ status: 'failed' });
    }
    await expect(restricted.updateFile({ type: 'update_file', path: 'triage-report.md', diff: '', moveTo: 'repro.mjs' })).resolves.toMatchObject({ status: 'failed' });
    await expect(restricted.deleteFile({ type: 'delete_file', path: 'repro.mjs' })).resolves.toMatchObject({ status: 'failed' });
    await expect(restricted.deleteFile({ type: 'delete_file', path: 'triage-report.md' })).resolves.toMatchObject({ status: 'failed' });

    expect(editor.createFile).toHaveBeenCalledTimes(1);
    expect(editor.updateFile).not.toHaveBeenCalled();
    expect(editor.deleteFile).not.toHaveBeenCalled();
  });
});
