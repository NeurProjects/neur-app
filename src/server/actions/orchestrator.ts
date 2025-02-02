import { CoreMessage, LanguageModelUsage, Message, generateObject } from 'ai';
import _ from 'lodash';
import { z } from 'zod';

import { orchestrationPrompt, orchestratorModel } from '@/ai/providers';

export async function getToolsFromOrchestrator(
  messages: Message[] | undefined,
  excludeConfirmationTool: boolean,
): Promise<{ usage: LanguageModelUsage; toolsRequired: string[] | undefined }> {
  const { object: toolsRequired, usage } = await generateObject({
    model: orchestratorModel,
    system: orchestrationPrompt,
    output: 'array',
    schema: z
      .string()
      .describe(
        'The tool name, describing the tool needed to handle the user request.',
      ),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'generate-object',
    },
    messages,
  });

  if (toolsRequired.length === 0) {
    return { usage, toolsRequired: undefined };
  } else {
    return {
      usage,
      toolsRequired: [...new Set(toolsRequired)],
    };
  }
}
