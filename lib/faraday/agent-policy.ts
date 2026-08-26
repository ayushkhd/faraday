import { ToolGuardrailFunctionOutputFactory, defineToolInputGuardrail, type Editor, type Tool } from '@openai/agents';

const ALLOWED_COMMANDS = new Set([
  "sed -n '1,200p' issue.md",
  'node repro.mjs',
]);
const ALLOWED_SHELLS = new Set(['/bin/bash', '/bin/sh']);
const REPORT_PATH = 'triage-report.md';

type ExecCommandInput = {
  cmd?: unknown;
  workdir?: unknown;
  shell?: unknown;
  tty?: unknown;
  max_output_tokens?: unknown;
};

export function isAllowedFaradayCommand(input: unknown): boolean {
  return faradayCommandRejectionReason(input) === null;
}

export function faradayCommandRejectionReason(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Faraday command policy: arguments must be a JSON object.';
  const command = input as ExecCommandInput;
  if (typeof command.cmd !== 'string' || !ALLOWED_COMMANDS.has(command.cmd)) return 'Faraday command policy: command must exactly match one fixed fixture command.';
  if (command.workdir !== undefined && command.workdir !== '' && command.workdir !== '.' && command.workdir !== '/workspace') return 'Faraday command policy: workdir must be omitted, dot, or /workspace.';
  if (command.shell !== undefined && (typeof command.shell !== 'string' || !ALLOWED_SHELLS.has(command.shell))) return 'Faraday command policy: shell must be omitted, /bin/bash, or /bin/sh.';
  if (command.tty === true) return 'Faraday command policy: TTY execution is disabled.';
  if (command.max_output_tokens !== undefined && !(
    typeof command.max_output_tokens === 'number' &&
    Number.isInteger(command.max_output_tokens) &&
    command.max_output_tokens > 0
  )) return 'Faraday command policy: max_output_tokens must be a positive integer.';
  return null;
}

const fixedCommandGuardrail = defineToolInputGuardrail({
  name: 'faraday_fixed_command_allowlist',
  async run({ toolCall }) {
    let input: unknown;
    try {
      input = JSON.parse(toolCall.arguments);
    } catch {
      input = null;
    }
    const rejection = faradayCommandRejectionReason(input);
    return rejection === null
      ? ToolGuardrailFunctionOutputFactory.allow()
      : ToolGuardrailFunctionOutputFactory.rejectContent(rejection);
  },
});

export function configureFaradayShell(tools: Tool[]): Tool[] {
  return tools.flatMap((tool) => {
    if (tool.type !== 'function' || tool.name !== 'exec_command') return [];
    return [{
      ...tool,
      inputGuardrails: [...(tool.inputGuardrails ?? []), fixedCommandGuardrail],
    }];
  });
}

export function configureFaradayFilesystem(tools: Tool[]): Tool[] {
  return tools.flatMap((tool) => {
    if (tool.type !== 'apply_patch' || tool.name !== 'apply_patch') return [];
    return [{ ...tool, editor: createFaradayReportEditor(tool.editor) }];
  });
}

function rejectedEdit() {
  return { status: 'failed' as const, output: `Faraday permits writes only to ${REPORT_PATH}; moves and deletes are disabled.` };
}

export function createFaradayReportEditor(editor: Editor): Editor {
  return {
    async createFile(operation, context) {
      return operation.path === REPORT_PATH
        ? editor.createFile(operation, context)
        : rejectedEdit();
    },
    async updateFile(operation, context) {
      return operation.path === REPORT_PATH && operation.moveTo === undefined
        ? editor.updateFile(operation, context)
        : rejectedEdit();
    },
    async deleteFile() {
      return rejectedEdit();
    },
  };
}
