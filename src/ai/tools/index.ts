import { zodSchema } from '@ai-sdk/ui-utils';
import { DataStreamWriter } from 'ai';
import { ZodType, ZodTypeAny, ZodTypeDef } from 'zod';

import { allBirdeyeTools } from './birdeye';
import { allBundleTools } from './bundle';
import { allChartTools } from './chart';
import { createAction } from './create-action';
import { definedFiTools } from './defined-fi';
import { allDexscreenerTools } from './dexscreener';
import { createDriftAccount } from './drift/create-account';
import { getDriftAccountInfo } from './drift/get-account-info';
import {
  SpotTokenSwapDrift,
  getDriftAPY,
  tradeDriftPerpAccount,
} from './drift/trade';
import { depositToDriftAccount } from './drift/deposit-to-account';
import { allJinaTools } from './jina';
import { launchPumpFun } from './launch-pump';
import { allMagicEdenTools } from './magic-eden';
import { meteoraLp } from './manage-meteora-lp';
import { allMetaplexTools } from './metaplex';
import { meteoraPosition } from './meteora';
import { allSearchTokenTools } from './search-token';
import { allSolanaTools } from './solana';
import { swapTokens } from './swap';
import { allTelegramTools } from './telegram';
import { transferTokens } from './transfer';
import { allTwitterTools } from './twitter';
import { depositToDriftAccountWithParams } from './drift/deposit-to-account-with-params';
import { createDriftAccountWithParams } from './drift/create-account-with-params';

interface ToolMetadata {
  description: string;
  parameters: ZodTypeAny;
  requiredEnvVars?: string[];
  updateParameters?: ZodTypeAny;
}
export interface ToolConfig {
  metadata: ToolMetadata;
  buildTool: (props: WrappedToolProps) => any;
  confirm?: (
    props: any,
    extraData?: any,
  ) => Promise<{ success: boolean; result?: any }>;
}

export interface WrappedToolProps {
  dataStream?: DataStreamWriter;
  abortData?: {
    aborted: boolean;
    abortController: AbortController;
    shouldAbort?: boolean;
  };
  extraData?: any;
}

export const allTools: Record<string, ToolConfig> = {
  swapTokens: swapTokens(),
  transferTokens: transferTokens(),
  launchPumpFun: launchPumpFun(),
  createAction: createAction(),
  openMeteoraLiquidityPosition: meteoraPosition(),
  manageMeteoraLiquidityPositions: meteoraLp(),
  tradeDriftPerpAccount: tradeDriftPerpAccount(),
  SpotTokenSwapDrift: SpotTokenSwapDrift(),
  createDriftAccount: createDriftAccount(),
  getDriftAccountInfo: getDriftAccountInfo(),
  depositToDriftAccount: depositToDriftAccount(),
  depositToDriftAccountWithParams: depositToDriftAccountWithParams(),
  createDriftAccountWithParams: createDriftAccountWithParams(),
  getDriftAPY: getDriftAPY(),
  ...allMagicEdenTools,
  ...allChartTools,
  ...allDexscreenerTools,
  ...allBirdeyeTools,
  ...definedFiTools,
  ...allJinaTools,
  ...allTelegramTools,
  ...allSolanaTools,
  ...allSearchTokenTools,
  ...allMetaplexTools,
  ...allBundleTools,
  ...allTwitterTools,
};

export const wrapTools = (
  props: WrappedToolProps,
  toolsRequired?: string[],
) => {
  const minTools =
    !toolsRequired || toolsRequired.length > 0
      ? toolsRequired
      : ['searchTokenByName'];
  const toolNames = minTools ? minTools : Object.keys(allTools);

  return toolNames.reduce(
    (acc, toolName) => {
      if (allTools[toolName]) {
        acc[toolName] = allTools[toolName].buildTool(props);
      }
      return acc;
    },
    {} as Record<string, any>,
  );
};

export function getAllToolMetadata() {
  const filteredTools = filterTools(allTools);
  return Object.entries(filteredTools)
    .map(([name, { metadata }]) => {
      const { description, parameters } = metadata;
      const stringifiedMetadata = JSON.stringify({
        name,
        description,
        parameters: zodSchema(parameters).jsonSchema,
      });
      return stringifiedMetadata;
    })
    .join('\n');
}

export function getToolParameters(toolName: string) {
  const tool = allTools[toolName];
  if (!tool) {
    return undefined;
  }
  return tool.metadata.parameters;
}

export function getToolUpdateParameters(toolName: string) {
  const tool = allTools[toolName];
  if (!tool) {
    return undefined;
  }
  return tool.metadata.updateParameters ?? tool.metadata.parameters;
}

export function filterTools(
  tools: Record<string, ToolConfig>,
): Record<string, ToolConfig> {
  const disabledTools = process.env.NEXT_PUBLIC_DISABLED_TOOLS
    ? JSON.parse(process.env.NEXT_PUBLIC_DISABLED_TOOLS)
    : [];

  return Object.fromEntries(
    Object.entries(tools).filter(([toolName, toolConfig]) => {
      if (disabledTools.includes(toolName)) {
        return false;
      }
      if (toolConfig.metadata.requiredEnvVars) {
        for (const envVar of toolConfig.metadata.requiredEnvVars) {
          if (!process.env[envVar] || process.env[envVar] == '') {
            return false;
          }
        }
      }
      return true;
    }),
  );
}
