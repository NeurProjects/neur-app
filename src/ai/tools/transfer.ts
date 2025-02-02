import { PublicKey } from '@solana/web3.js';
import { Output, streamText, tool } from 'ai';
import { z } from 'zod';

import { diffObjects, streamUpdate } from '@/lib/utils';
import { retrieveAgentKit } from '@/server/actions/ai';

import { ToolConfig, WrappedToolProps } from '.';
import { openai } from '../providers';
import { searchTokenByMint, searchTokenByName } from './search-token';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const performTransfer = async ({
  receiverAddress,
  tokenAddress,
  amount,
}: {
  receiverAddress: string;
  tokenAddress: string;
  amount: number;
}) => {
  try {
    const agent = (await retrieveAgentKit(undefined))?.data?.data?.agent;

    if (!agent) {
      throw new Error('Failed to retrieve agent');
    }

    const signature = await agent.transfer(
      new PublicKey(receiverAddress),
      amount,
      tokenAddress !== SOL_MINT ? new PublicKey(tokenAddress) : undefined,
    );

    return {
      success: true,
      result: {
        signature,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to transfer tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

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

export const transferTokens = (): ToolConfig => {
  const metadata = {
    description:
      'Use this tool when the user wants to swap tokens. You do not need the user to provide the price or token mints',
    parameters: z.object({
      token: tokenSchema.describe('The token to transfer'),
      amount: z.number().describe('The amount of tokens to transfer'),
      receiverAddress: z.string().describe('The address to receive the tokens'),
    }),
    updateParameters: z.object({
      token: z.object({
        symbol: z.string(),
        mint: z.string(),
      }),
      amount: z.number(),
      receiverAddress: z.string(),
    }),
  };
  const buildTool = ({
    dataStream = undefined,
    abortData,
    extraData: { askForConfirmation },
  }: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ token, amount, receiverAddress }, { toolCallId }) => {
        let updatedToolCall = {
          token,
          amount,
          receiverAddress,
        };
        streamUpdate({
          stream: dataStream,
          update: {
            type: 'stream-result-data',
            status: 'streaming',
            toolCallId,
            content: {
              step: 'token-search',
              amount,
            },
          },
        });

        try {
          const { experimental_partialOutputStream: partialOutputStream } =
            streamText({
              model: openai('gpt-4o-mini', { structuredOutputs: true }),
              system: `Use the tools required to complete the fetching of the transfer parameters. SOL mint is always ${SOL_MINT}`,
              prompt: `Get the token data for token: ${JSON.stringify(token)}
                  Token format should include the symbol and mint
                  `,
              maxSteps: 6,
              tools: {
                searchTokenByMint: searchTokenByMint(),
                searchTokenByName: searchTokenByName().buildTool({}),
              },
              experimental_output: Output.object({
                schema: z.object({
                  token: z.object({
                    symbol: z.string(),
                    mint: z.string(),
                  }),
                }),
              }),
            });

          for await (const delta of partialOutputStream) {
            const updatedParameters = {
              token: delta?.token ?? token,
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

        if (askForConfirmation || !updatedToolCall.token.mint) {
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

          const result = await performTransfer({
            receiverAddress,
            tokenAddress: updatedToolCall.token.mint,
            amount,
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
              ...updatedToolCall,
              signature: result.result?.signature,
            },
          };
        }

        return {
          success: true,
          result: {
            step: 'awaiting-confirmation',
            ...updatedToolCall,
          },
        };
      },
    });

  return {
    metadata,
    buildTool,
    confirm: performTransfer,
  };
};
