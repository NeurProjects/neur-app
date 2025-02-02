import { Output, streamText, tool } from 'ai';
import { z } from 'zod';

import { diffObjects, streamUpdate } from '@/lib/utils';
import { performSwap } from '@/server/actions/swap';

import { ToolConfig, WrappedToolProps } from '.';
import { openai } from '../providers';
import {
  getSwapRatio,
  searchTokenByMint,
  searchTokenByName,
} from './search-token';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

const tokenSchema = z
  .object({
    token: z.string().optional().describe('The token name or symbol'),
    mint: z
      .string()
      .regex(
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
        'Invalid Solana address format. Must be base58 encoded.',
      )
      .optional()
      .describe('Mint address for the token'),
  })
  .refine((data) => data.token !== undefined || data.mint !== undefined, {
    message: 'At least one of `symbol` or `mint` must be provided',
    path: [],
  });

export const swapTokens = (): ToolConfig => {
  const metadata = {
    description:
      'Use this tool when the user wants to swap tokens. You do not need the user to provide the price or token mints',
    parameters: z.object({
      inputAmount: z.number(),
      inputToken: tokenSchema,
      outputToken: tokenSchema,
      price: z.number().optional(),
    }),
    updateParameters: z.object({
      inputAmount: z.number(),
      inputToken: z.object({
        symbol: z.string(),
        mint: z.string(),
      }),
      outputToken: z.object({
        symbol: z.string(),
        mint: z.string(),
      }),
    }),
  };
  const buildTool = ({
    dataStream = undefined,
    abortData,
    extraData: { askForConfirmation },
  }: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async (
        { inputAmount, inputToken, outputToken, price },
        { toolCallId },
      ) => {
        let updatedToolCall = {
          inputToken,
          outputToken,
          price,
        };
        streamUpdate({
          stream: dataStream,
          update: {
            type: 'stream-result-data',
            status: 'streaming',
            toolCallId,
            content: {
              step: 'token-search',
              inputAmount,
            },
          },
        });

        try {
          const { experimental_partialOutputStream: partialOutputStream } =
            streamText({
              model: openai('gpt-4o-mini', { structuredOutputs: true }),
              system: `Use the tools required to complete the fetching of the swap parameters. SOL mint is always ${SOL_MINT}`,
              prompt: `Get the token data for input token: ${JSON.stringify(
                inputToken,
              )} and output token: ${JSON.stringify(outputToken)}
                  Token format should include the symbol and mint.
                  Use the getSwapRatio tool if price: ${price} is not provided
                  `,
              maxSteps: 6,
              tools: {
                searchTokenByMint: searchTokenByMint(),
                searchTokenByName: searchTokenByName().buildTool({}),
                getSwapRatio: getSwapRatio(),
              },
              experimental_output: Output.object({
                schema: z.object({
                  inputToken: z.object({
                    symbol: z.string(),
                    mint: z.string(),
                  }),
                  outputToken: z.object({
                    symbol: z.string(),
                    mint: z.string(),
                  }),
                  price: z.number(),
                }),
              }),
            });

          for await (const delta of partialOutputStream) {
            const updatedParameters = {
              inputToken: delta?.inputToken ?? inputToken,
              outputToken: delta?.outputToken ?? outputToken,
              price: delta?.price ?? price,
            };

            const diff = diffObjects(updatedToolCall, updatedParameters);

            streamUpdate({
              stream: dataStream,
              update: {
                type: 'stream-result-data',
                toolCallId,
                content: {
                  ...diff,
                },
              },
            });
            updatedToolCall = {
              ...updatedToolCall,
              ...updatedParameters,
            };
          }
        } catch (error) {
          console.log(`${error}`);
        }

        if (
          askForConfirmation ||
          !(updatedToolCall.inputToken.mint && updatedToolCall.outputToken.mint)
        ) {
          streamUpdate({
            stream: dataStream,
            update: {
              status: 'idle',
              type: 'stream-result-data',
              toolCallId,
              content: {
                step: 'awaiting-confirmation',
              },
            },
          });
          if (abortData?.abortController) {
            abortData.shouldAbort = true;
          }
        } else {
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

          const result = await performSwap({
            inputAmount,
            inputToken: {
              mint: updatedToolCall.inputToken.mint,
            },
            outputToken: {
              mint: updatedToolCall.outputToken.mint,
            },
          });
          streamUpdate({
            stream: dataStream,
            update: {
              type: 'stream-result-data',
              toolCallId,
              content: {
                step: result.success ? 'completed' : 'failed',
                signature: result.result?.signature,
              },
            },
          });
          return {
            success: true,
            result: {
              step: result.success ? 'completed' : 'failed',
              inputAmount,
              ...updatedToolCall,
              signature: result.result?.signature,
            },
          };
        }

        return {
          success: true,
          result: {
            step: 'awaiting-confirmation',
            inputAmount,
            ...updatedToolCall,
          },
        };
      },
    });

  return {
    metadata,
    buildTool,
    confirm: performSwap,
  };
};
