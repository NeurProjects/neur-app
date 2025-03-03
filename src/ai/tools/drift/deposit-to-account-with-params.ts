import {  tool } from 'ai';
import { z } from 'zod';

import { streamUpdate } from '@/lib/utils';
import {
  depositToDriftUserAccount,
} from '@/server/actions/drift';

import { ToolConfig, WrappedToolProps } from '..';

export const depositToDriftAccountWithParams = (): ToolConfig => {
  const metadata = {
    description:
      'Call this tool when the user wants to deposit to a drift account (amount and symbol are required)',
    parameters: z.object({
      amount: z.number().optional().describe('The amount of tokens to deposit'),
      symbol: z.string().optional().describe('The symbol of the token to deposit'),
    }),
  };

  const buildTool = ({
    dataStream = undefined,
    abortData,
    extraData: { agentKit },
  }: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async (
        { amount, symbol }: z.infer<typeof metadata.parameters>,
        { toolCallId },
      ) => {
        if(!amount || !symbol) {
          throw new Error('Amount and symbol are required');
        }
      
          streamUpdate({
            stream: dataStream,
            update: {
              type: 'stream-result-data',
              toolCallId,
              content: {
                step: 'processing',
              },
            },
          });

          const result = await depositToDriftUserAccount({
            amount: amount,
            symbol: symbol,
          });

          streamUpdate({
            stream: dataStream,
            update: {
              type: 'stream-result-data',
              toolCallId,
              status: 'idle',
              content: {
                ...result.result,
                step: result.success ? 'completed' : 'failed',
              },
            },
          });

          return {
            success: result.success,
            result: {
              ...result.result,
              step: result.success ? 'completed' : 'failed',
            },
          };

      },
    });

  return {
    metadata,
    buildTool,
    confirm: depositToDriftUserAccount,
  };
};
