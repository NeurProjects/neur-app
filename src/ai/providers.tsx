import { ReactNode } from 'react';

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

import { jinaTools } from './generic/jina';
import { utilTools } from './generic/util';
import { definedTools } from './solana/defined-fi';
import { dexscreenerTools } from './solana/dexscreener';
import { jupiterTools } from './solana/jupiter';
import { magicEdenTools } from './solana/magic-eden';
import { pumpfunTools } from './solana/pumpfun';
import { solanaTools } from './solana/solana';

const usingAntropic = !!process.env.ANTHROPIC_API_KEY;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const claude35Sonnet = anthropic('claude-3-5-sonnet-20241022');

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

const openAiModel = openai(process.env.OPENAI_MODEL_NAME || 'gpt-4o');

export const defaultSystemPrompt = `
Your name is Neur (Agent).
You are a specialized AI assistant for Solana blockchain and DeFi operations, designed to provide secure, accurate, and user-friendly assistance.

Critical Rules:
- If previous tool result contains 'suppressFollowUp: true':
  Response only with something like:
     - "Take a look at the results above"
     - "I've displayed the information above"
     - "The results are shown above"
     - "You can see the details above"
- Always use the \`searchToken\` tool to get the correct token mint first and ask for user confirmation.
- Always use the \`askForConfirmation\` tool to get user confirmation before executing tools that contain the parameter "requiresConfirmation" set to "true", or are potentially risky. After calling \`askForConfirmation\`:
     - STOP your response immediately
     - Wait for the user to explicitly reply with a confirmation or rejection
     - Only proceed with the tool execution in a NEW response after receiving an explicit confirmation
     - If rejected, acknowledge the rejection and stop
     - Never chain the confirmation request and the tool execution in the same response

Response Formatting:
- Use proper line breaks between different sections of your response for better readability
- Utilize markdown features effectively:
  - Use \`code blocks\` for addresses, transactions, and technical terms
  - Use **bold** for emphasis on important points
  - Use bullet points and numbered lists for structured information
  - Use > blockquotes for highlighting key information or warnings
  - Use ### headings to organize long responses into sections
  - Use tables for structured data comparison
- Keep responses concise and well-organized
- Use emojis sparingly and only when appropriate for the context

Common knowledge:
- { user: toly, description: Co-Founder of Solana Labs, twitter: @aeyakovenko, wallet: toly.sol }\
`;

export const defaultModel = usingAntropic ? claude35Sonnet : openAiModel;

export interface ToolConfig {
  displayName?: string;
  icon?: ReactNode;
  isCollapsible?: boolean;
  description: string;
  parameters: z.ZodType<any>;
  execute: <T>(
    params: z.infer<T extends z.ZodType ? T : never>,
  ) => Promise<any>;
  render?: (result: unknown) => React.ReactNode | null;
  requiresConfirmation?: boolean;
}

export function DefaultToolResultRenderer({ result }: { result: unknown }) {
  if (result && typeof result === 'object' && 'error' in result) {
    return (
      <div className="mt-2 pl-3.5 text-sm text-destructive">
        {String((result as { error: unknown }).error)}
      </div>
    );
  }

  return (
    <div className="mt-2 border-l border-border/40 pl-3.5 font-mono text-xs text-muted-foreground/90">
      <pre className="max-h-[200px] max-w-[400px] truncate whitespace-pre-wrap break-all">
        {JSON.stringify(result, null, 2).trim()}
      </pre>
    </div>
  );
}

export const defaultTools: Record<string, ToolConfig> = {
  ...solanaTools,
  ...definedTools,
  ...pumpfunTools,
  ...jupiterTools,
  ...dexscreenerTools,
  ...magicEdenTools,
  ...jinaTools,
  ...utilTools,
};

export function getToolConfig(toolName: string): ToolConfig | undefined {
  return defaultTools[toolName];
}
