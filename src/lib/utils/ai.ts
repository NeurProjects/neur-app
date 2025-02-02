import { zodSchema } from '@ai-sdk/ui-utils';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataStreamWriter,
  Message,
  Output,
  createDataStreamResponse,
  streamText,
} from 'ai';
import { z } from 'zod';

import { openai } from '@/ai/providers';
import { allTools, getToolUpdateParameters } from '@/ai/tools';
import { updateToolResultMessage } from '@/server/db/queries';

import { diffObjects, streamUpdate } from '../utils';

export function getUnconfirmedConfirmationMessage(
  messages: Array<Message>,
): Message | undefined {
  const unconfirmedConfirmationMessage = messages.find(
    (msg) =>
      msg.role === 'assistant' &&
      msg.toolInvocations?.find(
        (tool) =>
          tool.toolName === 'askForConfirmation' &&
          tool.state === 'call' &&
          !(tool as any).result,
      ),
  );

  return unconfirmedConfirmationMessage;
}

type ToolMessageResult = {
  result?: string;
  message: string;
};

export type ResponseMessage = (CoreAssistantMessage | CoreToolMessage) & {
  id: string;
};

export interface ToolUpdateMessage {
  isDataCall: boolean;
  toolCallId: string | undefined;
  toolName: string | undefined;
  toolCallResults: any | undefined;
  messageIdToUpdate: string | undefined;
}

/**
 * Updates the content result of a confirmation tool message based on isConfirmed
 * @param confirmationMessage - Confirmation message to update
 * @param isConfirmed
 * @returns  The original message if an update cannot be made, otherwise the updated message
 */
export function updateConfirmationMessageResult(
  confirmationMessage: CoreToolMessage,
  isConfirmed: boolean,
) {
  const messageResult = getToolMessageResult(confirmationMessage);
  if (!messageResult) {
    return confirmationMessage;
  }

  messageResult.result = isConfirmed ? 'confirm' : 'deny';

  return confirmationMessage;
}

/**
 * Retrieves the result from the content of a tool message
 * @param message - Core tool message to parse
 * @returns  The result from the content of the tool message
 */
export function getToolMessageResult(
  message: CoreToolMessage,
): ToolMessageResult | undefined {
  const content = message.content?.at(0);

  return content && content.result
    ? (content.result as ToolMessageResult)
    : undefined;
}

/**
 * Retrieves the most recent user message from an array of messages.
 * @param messages - Array of core messages to search through
 * @returns The last user message in the array, or undefined if none exists
 */
export function getMostRecentUserMessage(messages: Array<CoreMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

/**
 *
 * @param messages
 * @returns  Most recent tool result message or undefined if none found
 */
export function getMostRecentToolResultMessage(
  messages: Array<CoreMessage>,
): CoreToolMessage | undefined {
  const mostRecentMessage = messages.at(-1);
  if (
    mostRecentMessage &&
    mostRecentMessage.role === 'tool' &&
    mostRecentMessage.content &&
    mostRecentMessage.content.length > 0 &&
    mostRecentMessage.content[0].result
  ) {
    return mostRecentMessage;
  }
  return undefined;
}

/**
 * Sanitizes response messages by removing incomplete tool calls and empty content.
 * This function processes both tool messages and assistant messages to ensure
 * all tool calls have corresponding results and all content is valid.
 *
 * @param messages - Array of tool or assistant messages to sanitize
 * @returns Array of sanitized messages with valid content only
 */
export function sanitizeResponseMessages(
  messages: Array<CoreToolMessage | CoreAssistantMessage>,
) {
  // Track all tool results for validation
  const toolResultIds: Array<string> = [];

  // Collect all tool result IDs
  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  // Sanitize message content
  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;
    if (typeof message.content === 'string') return message;

    // Filter out invalid content
    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  // Remove messages with empty content
  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getConfirmationResult(message: Message) {
  const invocation = message.toolInvocations?.[0];
  const result = (invocation as any)?.result?.result;

  return (
    (message.role === 'assistant' &&
      invocation?.toolName === 'askForConfirmation' &&
      invocation?.state === 'result' &&
      result) ||
    undefined
  );
}

async function handleConfirmation(
  dataStream: DataStreamWriter,
  toolUpdateMessage: ToolUpdateMessage,
  extraData?: {
    userId: string;
    conversationId: string;
  },
  updatedToolResults?: any,
) {
  const finalToolResults =
    updatedToolResults ?? toolUpdateMessage.toolCallResults;

  if (
    !finalToolResults ||
    finalToolResults.step !== 'confirmed' ||
    !toolUpdateMessage.toolCallId ||
    !toolUpdateMessage.messageIdToUpdate ||
    !toolUpdateMessage.toolName
  ) {
    return;
  }
  const toolConfirmation = allTools[toolUpdateMessage.toolName]?.confirm;
  if (!toolConfirmation) {
    return;
  }

  dataStream.writeData({
    type: 'stream-result-data',
    status: 'streaming',
    toolCallId: toolUpdateMessage.toolCallId ?? null,
    content: {
      step: 'processing',
    },
  });

  let updatedToolCallResults = {
    ...finalToolResults,
  };

  try {
    const { success, result } = await toolConfirmation(
      finalToolResults,
      extraData,
    );
    console.log('result', result);
    if (success && result) {
      updatedToolCallResults = {
        ...updatedToolCallResults,
        ...result,
        step: 'completed',
      };
      const updatedToolCall = diffObjects(
        finalToolResults,
        updatedToolCallResults,
      );
      streamUpdate({
        stream: dataStream,
        update: {
          type: 'stream-result-data',
          status: 'idle',
          toolCallId: toolUpdateMessage.toolCallId ?? null,
          content: {
            ...updatedToolCall,
          },
        },
      });
    }

    if (
      toolUpdateMessage.messageIdToUpdate &&
      toolUpdateMessage.toolCallId &&
      updatedToolCallResults.step === 'completed'
    ) {
      await updateToolResultMessage({
        messageId: toolUpdateMessage.messageIdToUpdate,
        toolCallId: toolUpdateMessage.toolCallId,
        updatedToolCallResults,
      });
    }
  } catch (error) {
    console.log(`${error}`);
  }
}

export async function handleToolUpdateMessage(
  toolUpdateMessage: ToolUpdateMessage,
  message: Message,
  extraData?: {
    userId: string;
    conversationId: string;
  },
) {
  if (toolUpdateMessage.toolName === undefined) {
    return;
  }

  let updatedToolCall = {
    ...toolUpdateMessage.toolCallResults,
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      if (
        toolUpdateMessage.isDataCall &&
        toolUpdateMessage.toolCallResults?.step === 'confirmed'
      ) {
        await handleConfirmation(dataStream, toolUpdateMessage, extraData);
        return;
      }
      // Update the tool call with the data provided by the user
      try {
        if (!toolUpdateMessage.isDataCall) {
          streamUpdate({
            stream: dataStream,
            update: {
              type: 'stream-result-data',
              status: 'streaming',
              toolCallId: toolUpdateMessage.toolCallId!,
              content: {
                step: 'updating',
              },
            },
          });
          const toolUpdateParameters = getToolUpdateParameters(
            toolUpdateMessage.toolName!,
          );
          if (!toolUpdateParameters) {
            return;
          }
          const stringifiedToolParameters = JSON.stringify(
            zodSchema(toolUpdateParameters).jsonSchema,
          );
          const { experimental_partialOutputStream: partialOutputStream } =
            streamText({
              model: openai('gpt-4o-mini', { structuredOutputs: true }),
              system: `Update the tool call parameters with the data provided by the user.
              Only set confirm to true if the user explicitly confirms with words such as "confirm" or "yes".
              Only set canceled to true if the user explicitly cancels with words such as "cancel" or "no".
              Do not set confirm or canceled to true if the user only requests to update parameters.
              toolParameters schema: ${stringifiedToolParameters}
                `,
              messages: [
                {
                  role: 'user',
                  content: JSON.stringify(toolUpdateMessage.toolCallResults),
                },
                message,
              ],
              experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
              },
              experimental_output: Output.object({
                schema: z.object({
                  toolParameters: toolUpdateParameters,
                  confirmed: z.boolean(),
                  canceled: z.boolean(),
                }),
              }),
              maxSteps: 5,
            });

          for await (const delta of partialOutputStream) {
            const step =
              delta.confirmed || delta.canceled
                ? delta.canceled
                  ? 'canceled'
                  : 'confirmed'
                : 'awaiting-confirmation';
            // const newToolCallResults = {
            //   ...updatedToolCall,
            //   ...delta.toolParameters,
            //   step,
            // };

            // const diff = diffObjects(updatedToolCall, newToolCallResults);
            // streamUpdate({
            //   stream: dataStream,
            //   update: {
            //     type: 'stream-result-data',
            //     toolCallId: toolUpdateMessage.toolCallId!,
            //     content: {
            //       ...diff,
            //       step: 'updating',
            //     },
            //   },
            // });
            // updatedToolCall = newToolCallResults;

            updatedToolCall = {
              ...updatedToolCall,
              ...delta.toolParameters,
              step,
            };
          }
        }
      } catch (error) {
        console.log(`${error}`);
      }

      // // get only the updated data between toolCallResults and updatedToolCall
      // const deltaUpdate = diffObjects(
      //   toolUpdateMessage.toolCallResults,
      //   updatedToolCall,
      // );
      streamUpdate({
        stream: dataStream,
        update: {
          type: 'stream-result-data',
          status: 'idle',
          toolCallId: toolUpdateMessage.toolCallId!,
          content: {
            ...updatedToolCall,
            step:
              updatedToolCall.step === 'canceled'
                ? 'canceled'
                : 'awaiting-confirmation',
          },
        },
      });

      await updateToolResultMessage({
        messageId: toolUpdateMessage.messageIdToUpdate!,
        toolCallId: toolUpdateMessage.toolCallId!,
        updatedToolCallResults: {
          ...updatedToolCall,
          step:
            updatedToolCall.step === 'canceled'
              ? 'canceled'
              : 'awaiting-confirmation',
        },
      });

      if (updatedToolCall.step === 'confirmed') {
        await handleConfirmation(
          dataStream,
          toolUpdateMessage,
          updatedToolCall,
        );
      }
    },
  });
}

export function getToolUpdateMessage(
  message: Message,
  existingMessages: Message[],
): ToolUpdateMessage {
  const isDataCall = message.role === 'data';
  const dataMessage = isDataCall ? (message.data as any) : undefined;

  const lastAssistantMessage =
    existingMessages.length > 0
      ? existingMessages.find(
          (message) =>
            message.role === 'assistant' &&
            message.toolInvocations?.length &&
            message.toolInvocations?.length > 0,
        )
      : null;
  const toolInvocations = lastAssistantMessage?.toolInvocations;
  const toolUpdate = toolInvocations?.at(-1);

  const toolCallResults =
    dataMessage?.result ??
    (toolUpdate?.state === 'result' ? toolUpdate.result.result : undefined);

  const toolCallId = dataMessage?.toolCallId ?? toolUpdate?.toolCallId;
  const toolName = dataMessage?.toolName ?? toolUpdate?.toolName;
  const messageIdToUpdate = dataMessage?.messageId ?? lastAssistantMessage?.id;
  return {
    isDataCall,
    toolCallId,
    toolName,
    toolCallResults,
    messageIdToUpdate,
  };
}

export function getMessageIdFromAnnotations(message: Message) {
  if (!message.annotations) return message.id;

  const [annotation] = message.annotations;
  if (!annotation) return message.id;

  // @ts-expect-error messageIdFromServer is not defined in MessageAnnotation
  return annotation.messageIdFromServer;
}
