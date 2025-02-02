import { ReactNode } from 'react';

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

import { Card } from '@/components/ui/card';

import { actionTools } from './generic/action';
import { jinaTools } from './generic/jina';
import { telegramTools } from './generic/telegram';
import { utilTools } from './generic/util';
import { birdeyeTools } from './solana/birdeye';
import { chartTools } from './solana/chart';
import { definedTools } from './solana/defined-fi';
import { dexscreenerTools } from './solana/dexscreener';
import { jupiterTools } from './solana/jupiter';
import { magicEdenTools } from './solana/magic-eden';
import { pumpfunTools } from './solana/pumpfun';
import { solanaTools } from './solana/solana';
import { getAllToolMetadata } from './tools';

const usingAnthropic = !!process.env.ANTHROPIC_API_KEY;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const claude35Sonnet = anthropic('claude-3-5-sonnet-20241022');

export const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
  ...(process.env.OPENAI_BASE_URL?.includes('openrouter.ai') && {
    fetch: async (url, options) => {
      if (!options?.body) return fetch(url, options);

      const body = JSON.parse(options.body as string);

      const modifiedBody = {
        ...body,
        provider: {
          order: ['Anthropic', 'OpenAI'],
          allow_fallbacks: false,
        },
      };

      options.body = JSON.stringify(modifiedBody);

      return fetch(url, options);
    },
  }),
});

export const orchestratorModel = openai('gpt-4o-mini');

const openAiModel = openai(process.env.OPENAI_MODEL_NAME || 'gpt-4o');

export const defaultSystemPrompt = `
Your name is Neur (Agent).
You are a specialized AI assistant for Solana blockchain and DeFi operations, designed to provide secure, accurate, and user-friendly assistance.

Critical Rules:
- Before deciding to follow up after a tool call, review the results and decide if a follow up is needed.
- Most tool results are self explanatory and do not require follow up.
- Do not repeat the output of the tool as the results are already shown to the user.
- Do not attempt to call a tool that you have not been provided, let the user know that the requested action is not supported.

Scheduled Actions:
- Scheduled actions are automated tasks that are executed at specific intervals.
- These actions are designed to perform routine operations without manual intervention.
- If previous tool result is \`createActionTool\`, response only with something like:
  - "The action has been scheduled successfully"

Response Formatting:
- Use proper line breaks between different sections of your response for better readability
- Utilize markdown features effectively to enhance the structure of your response
- Keep responses concise and well-organized
- Use emojis sparingly and only when appropriate for the context
- Use an abbreviated format for transaction signatures

Common knowledge:
- { token: NEUR, description: The native token of Neur, twitter: @neur_sh, website: https://neur.sh/, address: 3N2ETvNpPNAxhcaXgkhKoY1yDnQfs41Wnxsx5qNJpump }
- { user: toly, description: Co-Founder of Solana Labs, twitter: @aeyakovenko, wallet: toly.sol }\

Realtime knowledge:
- { approximateCurrentTime: ${new Date().toISOString()}}
`;

export const defaultModel = usingAnthropic ? claude35Sonnet : openAiModel;

export interface ToolConfig {
  deprecated?: boolean;
  displayName?: string;
  icon?: ReactNode;
  isCollapsible?: boolean;
  isExpandedByDefault?: boolean;
  description: string;
  parameters: z.ZodType<any>;
  execute?: <T>(
    params: z.infer<T extends z.ZodType ? T : never>,
  ) => Promise<any>;
  render?: (result: unknown) => React.ReactNode | null;
  agentKit?: any;
  userId?: any;
  requiresConfirmation?: boolean;
  requiredEnvVars?: string[];
}

export function DefaultToolResultRenderer({ result }: { result: unknown }) {
  if (result && typeof result === 'object' && 'error' in result) {
    return (
      <Card className="bg-card p-4">
        <div className="pl-3.5 text-sm">
          {String((result as { error: unknown }).error)}
        </div>
      </Card>
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
  ...actionTools,
  ...solanaTools,
  ...definedTools,
  ...pumpfunTools,
  ...jupiterTools,
  ...dexscreenerTools,
  ...magicEdenTools,
  ...jinaTools,
  ...utilTools,
  ...chartTools,
  ...telegramTools,
  ...birdeyeTools,
};

export const coreTools: Record<string, ToolConfig> = {
  ...actionTools,
  ...utilTools,
  ...jinaTools,
};

export const toolsets: Record<
  string,
  { tools: string[]; description: string }
> = {
  coreTools: {
    tools: ['actionTools', 'utilTools', 'jupiterTools'],
    description:
      'Core utility tools for general operations, including actions, searching token info, utility functions.',
  },
  webTools: {
    tools: ['jinaTools'],
    description:
      'Web scraping and content extraction tools for reading web pages and extracting content.',
  },
  defiTools: {
    tools: ['solanaTools', 'dexscreenerTools'],
    description:
      'Tools for interacting with DeFi protocols on Solana, including swaps, market data, token information and details.',
  },
  traderTools: {
    tools: ['birdeyeTools'],
    description:
      'Tools for analyzing and tracking traders and trades on Solana DEXes.',
  },
  financeTools: {
    tools: ['definedTools'],
    description:
      'Tools for retrieving and applying logic to static financial data, including analyzing trending tokens.',
  },
  tokenLaunchTools: {
    tools: ['pumpfunTools'],
    description:
      'Tools for launching tokens on PumpFun, including token deployment and management.',
  },
  chartTools: {
    tools: ['chartTools'],
    description: 'Tools for generating and displaying various types of charts.',
  },
  nftTools: {
    tools: ['magicEdenTools'],
    description:
      'Tools for interacting with NFTs, including Magic Eden integrations.',
  },
  socialTools: {
    tools: ['telegramTools'],
    description:
      'Tools for interacting with Telegram for notifications and messaging.',
  },
};

export const orchestrationPrompt = `
You are Neur, an AI assistant specialized in Solana blockchain and DeFi operations.

Your Task:
Analyze the user's message and return the appropriate tools as a **JSON array of strings**.  

Rules:
- Only return the toolsets in the format: ["toolset1", "toolset2", ...].  
- Do not add any text, explanations, or comments outside the array.
- Be complete — include all necessary toolsets to handle the request, if you're unsure, it's better to include the tool than to leave it out.
- If the request cannot be completed with the available toolsets, return an array describing the unknown tools ["INVALID_TOOL:\${INVALID_TOOL_NAME}"].

Available Tools:
${getAllToolMetadata()}
`;

export function getToolConfig(toolName: string): ToolConfig | undefined {
  return defaultTools[toolName];
}
