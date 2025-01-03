import { Message as PrismaMessage } from '@prisma/client';
import {
  Attachment,
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from 'ai';
import { sendTelegramNotification } from '@/server/actions/telegram';

// ...existing code...

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

/**
 * Adds tool message results to existing chat messages by updating their tool invocations.
 *
 * @param params - Object containing toolMessage and messages
 * @param params.toolMessage - The tool message containing results
 * @param params.messages - Array of existing chat messages
 * @returns Updated array of messages with tool results incorporated
 */
function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (!message.toolInvocations) return message;

    return {
      ...message,
      toolInvocations: message.toolInvocations.map((toolInvocation) => {
        const toolResult = toolMessage.content.find(
          (tool) => tool.toolCallId === toolInvocation.toolCallId,
        );

        if (toolResult) {
          return {
            ...toolInvocation,
            state: 'result',
            result: toolResult.result,
          };
        }

        return toolInvocation;
      }),
    };
  });
}

/**
 * Converts Prisma database messages to UI-compatible message format.
 * Handles different types of content including text, tool calls, and attachments.
 *
 * @param messages - Array of Prisma messages to convert
 * @returns Array of UI-formatted messages with proper content structure
 */
export function convertToUIMessages(
  messages: Array<PrismaMessage>,
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, rawMessage) => {
    const message = rawMessage;

    // Handle tool messages separately
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as unknown as CoreToolMessage,
        messages: chatMessages,
      });
    }

    // Initialize message components
    let textContent = '';
    const toolInvocations: Array<ToolInvocation> = [];
    const attachments: Array<Attachment> = [];

    // Handle nested content structure
    if (
      typeof message.content === 'object' &&
      message.content &&
      'content' in message.content
    ) {
      message.content = message.content.content || [];
    }

    // Process different content types
    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      for (const c of message.content) {
        if (!c) continue;
        const content = c as any;

        switch (content.type) {
          case 'text':
            textContent += content.text;
            break;
          case 'tool-call':
            toolInvocations.push({
              state: 'call',
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args,
            });
            break;
          case 'image':
            attachments.push({
              url: content.image,
              name: 'image.png',
              contentType: 'image/png',
            });
            break;
        }
      }
    }

    // Construct and add the formatted message
    chatMessages.push({
      id: message.id,
      role: message.role as Message['role'],
      content: textContent,
      toolInvocations,
      experimental_attachments: attachments,
    });

    return chatMessages;
  }, []);
}
