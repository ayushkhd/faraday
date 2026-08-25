import { ToolGuardrailFunctionOutputFactory, defineToolInputGuardrail, type Editor, type Tool } from '@openai/agents';

const ALLOWED_COMMANDS = new Set([
  "sed -n '1,200p' issue.md",
  'node repro.mjs',
]);
const REPORT_PATH = 'triage-report.md';

type ExecCommandInput = {
  cmd?: unknown;
  workdir?: unknown;
  shell?: unknown;
  tty?: unknown;
  max_output_tokens?: unknown;
};

export function isAllowedFaradayCommand(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const command = input as ExecCommandInput;
  if (typeof command.cmd !== 'string' || !ALLOWED_COMMANDS.has(command.cmd)) return false;
  if (command.workdir !== undefined && command.workdir !== '' && command.workdir !== '.') return false;
  if (command.shell !== undefined || command.tty === true) return false;
  return command.max_output_tokens === undefined || (
    typeof command.max_output_tokens === 'number' &&
    Number.isInteger(command.max_output_tokens) &&
    command.max_output_tokens > 0 &&
    command.max_output_tokens <= 4_000
  );
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
    return isAllowedFaradayCommand(input)
      ? ToolGuardrailFunctionOutputFactory.allow()
      : ToolGuardrailFunctionOutputFactory.rejectContent(
          'Faraday permits only the two fixed fixture commands in the workspace.',
        );
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
