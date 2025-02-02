import { DataStreamWriter, Output, streamText, tool } from 'ai';
import { z } from 'zod';

import { streamUpdate } from '@/lib/utils';
import { retrieveAgentKit } from '@/server/actions/ai';
import { verifyUser } from '@/server/actions/user';
import { dbCreateAction } from '@/server/db/queries';

import { WrappedToolProps, getAllToolMetadata } from '.';
import { openai } from '../providers';

interface CreateActionResultProps {
  name: string;
  message: string;
  frequency: number;
  maxExecutions?: number | undefined;
  startTimeOffset?: number | undefined;
  requiredTools: Array<string>;
  missingTools: Array<string>;
}

export const performCreateAction = async (
  actionProps: CreateActionResultProps,
  extraData: {
    userId: string;
    conversationId: string;
  },
) => {
  try {
    const authResult = await verifyUser();
    const authUserId = authResult?.data?.data?.id;

    if (!authUserId || authUserId !== extraData.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const action = await dbCreateAction({
      userId: extraData.userId,
      conversationId: extraData.conversationId,
      name: actionProps.name,
      description: `${actionProps.message}`,
      actionType: 'default',
      frequency: actionProps.frequency,
      maxExecutions: actionProps.maxExecutions ?? null,
      triggered: true,
      paused: false,
      completed: false,
      priority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      triggeredBy: [],
      stoppedBy: [],
      params: {},
      timesExecuted: 0,
      lastExecutedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      startTime: actionProps.startTimeOffset
        ? new Date(Date.now() + actionProps.startTimeOffset)
        : new Date(Date.now() + 100),
    });
    if (!action) {
      return { success: false, error: 'Failed to create action' };
    }

    return {
      success: true,
      result: {
        ...actionProps,
        actionId: action.id,
        nextExecutionTime: action.startTime,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error creating action',
    };
  }
};

export const createAction = () => {
  const metadata = {
    description: 'Launch a token on PumpFun',
    parameters: z.object({
      name: z
        .string()
        .describe('Shorthand human readable name to classify the action.'),
      message: z
        .string()
        .describe(
          'The message that describe the action. This will be used to determine what the action does. Do not include any frequency or maxExecutions parameters in this.',
        ),
      frequency: z
        .number()
        .describe(
          'Frequency in seconds (3600 for hourly, 86400 for daily, or any custom intervals of 15 minutes (900))',
        ),
      maxExecutions: z
        .number()
        .optional()
        .describe('Max number of times the action can be executed'),
      startTimeOffset: z
        .number()
        .optional()
        .describe(
          'Offset in milliseconds for how long to wait before starting the action. Useful for scheduling actions in the future, e.g. 1 hour from now = 3600000',
        ),
    }),
    updateParameters: z.object({
      name: z.string(),
      message: z.string(),
      frequency: z.number(),
      maxExecutions: z.number(),
      startTimeOffset: z.number(),
    }),
  };
  const buildTool = ({
    dataStream = undefined,
    abortData,
    extraData: { askForConfirmation, userId, conversationId },
  }: WrappedToolProps) =>
    tool({
      description:
        'Use this tool when the user wants to create an action that can be executed later (or recurring).',
      parameters: z.object({
        name: z
          .string()
          .describe('Shorthand human readable name to classify the action.'),
        message: z
          .string()
          .describe(
            'The message that describe the action. This will be used to determine what the action does. Do not include any frequency or maxExecutions parameters in this.',
          ),
        frequency: z
          .number()
          .describe(
            'Frequency in seconds (3600 for hourly, 86400 for daily, or any custom intervals of 15 minutes (900))',
          ),
        maxExecutions: z
          .number()
          .optional()
          .describe('Max number of times the action can be executed'),
        startTimeOffset: z
          .number()
          .optional()
          .describe(
            'Offset in milliseconds for how long to wait before starting the action. Useful for scheduling actions in the future, e.g. 1 hour from now = 3600000',
          ),
      }),
      execute: async (originalToolCall, { toolCallId }) => {
        const updatedToolCall: {
          name: string;
          message: string;
          frequency: number;
          maxExecutions?: number | undefined;
          startTimeOffset?: number | undefined;
          requiredTools: Array<string>;
          missingTools: Array<string>;
        } = {
          ...originalToolCall,
          requiredTools: [],
          missingTools: [],
        };
        streamUpdate({
          stream: dataStream,
          update: {
            type: 'stream-result-data',
            status: 'streaming',
            toolCallId,
            content: {
              step: 'tool-search',
              ...updatedToolCall,
            },
          },
        });
        try {
          const { experimental_partialOutputStream: partialOutputStream } =
            streamText({
              model: openai('gpt-4o-mini', { structuredOutputs: true }),
              system: `You are setting up an automated action. Decide the tools necessary to complete the action.
                If a tool is required and is available, add it to toolRequired. The exact tool name must be in the Available tools section.
                If a tool is required and is not available, add it to missingTools.
                Include all the tools necessary to complete the action.
                
                Available tools:\n${getAllToolMetadata()}
                `,
              prompt: `${updatedToolCall.message}`,
              maxSteps: 6,
              experimental_output: Output.object({
                schema: z.object({
                  requiredTools: z.array(z.string()),
                  missingTools: z.array(z.string()),
                }),
              }),
              experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
              },
            });

          for await (const delta of partialOutputStream) {
            if (delta?.requiredTools) {
              updatedToolCall.requiredTools = delta.requiredTools.filter(
                (tool): tool is string => tool !== undefined,
              );
            }
            if (delta?.missingTools) {
              updatedToolCall.missingTools = delta.missingTools.filter(
                (tool): tool is string => tool !== undefined,
              );
            }
          }
        } catch (error) {
          console.log(`${error}`);
        }

        streamUpdate({
          stream: dataStream,
          update: {
            type: 'stream-result-data',
            status: 'idle',
            toolCallId,
            content: {
              ...updatedToolCall,
              step: 'awaiting-confirmation',
            },
          },
        });

        if (askForConfirmation || updatedToolCall.missingTools.length > 0) {
          if (abortData?.abortController) {
            abortData.shouldAbort = true;
          }

          return {
            success: true,
            result: {
              ...updatedToolCall,
              step: 'awaiting-confirmation',
            },
          };
        } else {
          const result = await performCreateAction(updatedToolCall, {
            userId,
            conversationId,
          });

          return {
            success: true,
            result: {
              ...updatedToolCall,
              step: result.success ? 'completed' : 'failed',
              actionId: result.result?.actionId,
              nextExecutionTime: result.result?.nextExecutionTime,
            },
          };
        }
      },
    });

  return {
    metadata,
    buildTool,
    confirm: performCreateAction,
  };
};
