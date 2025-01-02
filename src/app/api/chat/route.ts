import { revalidatePath } from 'next/cache';

import {
  CoreMessage,
  CoreTool,
  Message,
  NoSuchToolError,
  convertToCoreMessages,
  generateObject,
  streamText,
} from 'ai';
import { z } from 'zod';

import {
  defaultModel,
  defaultSystemPrompt,
  defaultTools,
} from '@/ai/providers';
import { MAX_TOKEN_MESSAGES } from '@/lib/constants';
import {
  getMostRecentToolResultMessage,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils/ai';
import { generateTitleFromUserMessage } from '@/server/actions/ai';
import { verifyUser } from '@/server/actions/user';
import {
  dbCreateConversation,
  dbCreateMessages,
  dbDeleteConversation,
  dbGetConversation,
  updateToolCallResults,
} from '@/server/db/queries';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;
  const publicKey = session?.data?.data?.publicKey;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!publicKey) {
    console.error('[chat/route] No public key found');
    return new Response('No public key found', { status: 400 });
  }

  try {
    const {
      id: conversationId,
      messages,
    }: { id: string; messages: Array<Message> } = await req.json();
    const coreMessages = convertToCoreMessages(messages);
    const userMessage: CoreMessage | undefined =
      getMostRecentUserMessage(coreMessages);

    const mostRecentToolResultMessage =
      getMostRecentToolResultMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const conversation = await dbGetConversation({ conversationId });

    if (!conversation) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations');
    }

    if (mostRecentToolResultMessage) {
      await updateToolCallResults(conversationId, mostRecentToolResultMessage);
    } else {
      await dbCreateMessages({
        messages: [
          {
            conversationId,
            role: userMessage.role,
            content: JSON.parse(JSON.stringify(userMessage)),
          },
        ],
      });
    }

    // extract all attachments from the user message
    const attachments = messages
      .filter((message) => message.experimental_attachments)
      .map((message) => message.experimental_attachments)
      .flat()
      .map((attachment) => {
        return {
          type: attachment?.contentType,
          data: attachment?.url,
        };
      });
    // append to system prompt
    const systemPrompt =
      defaultSystemPrompt +
      `\n\nHistory of attachments: ${JSON.stringify(attachments)}` +
      `\n\nUser Solana wallet public key: ${publicKey}`;

    // Filter to relevant messages for context sizing
    const relevantMessages: CoreMessage[] = messages.slice(
      -MAX_TOKEN_MESSAGES,
    ) as CoreMessage[];

    const result = streamText({
      model: defaultModel,
      system: systemPrompt,
      tools: defaultTools as Record<string, CoreTool<any, any>>,
      experimental_toolCallStreaming: true,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text',
      },
      experimental_repairToolCall: async ({
        toolCall,
        tools,
        parameterSchema,
        error,
      }) => {
        if (NoSuchToolError.isInstance(error)) {
          return null;
        }

        console.log('[chat/route] repairToolCall', toolCall);

        const tool = tools[toolCall.toolName as keyof typeof tools];
        const { object: repairedArgs } = await generateObject({
          model: defaultModel,
          schema: tool.parameters as z.ZodType<any>,
          prompt: [
            `The model tried to call the tool "${toolCall.toolName}"` +
              ` with the following arguments:`,
            JSON.stringify(toolCall.args),
            `The tool accepts the following schema:`,
            JSON.stringify(parameterSchema(toolCall)),
            'Please fix the arguments.',
          ].join('\n'),
        });

        console.log('[chat/route] repairedArgs', repairedArgs);
        console.log('[chat/route] toolCall', toolCall);

        return { ...toolCall, args: JSON.stringify(repairedArgs) };
      },

      maxSteps: 15,
      messages: relevantMessages,
      async onFinish({ response }) {
        if (!userId) return;

        try {
          const sanitizedResponses = sanitizeResponseMessages(
            response.messages,
          );
          await dbCreateMessages({
            messages: sanitizedResponses.map((message) => {
              return {
                conversationId,
                role: message.role,
                content: JSON.parse(JSON.stringify(message.content)),
              };
            }),
          });

          revalidatePath('/api/conversations');
        } catch (error) {
          console.error('[chat/route] Failed to save messages', error);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[chat/route] Unexpected error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id: conversationId } = await req.json();
    await dbDeleteConversation({ conversationId, userId });
    revalidatePath('/api/conversations');

    return new Response('Conversation deleted', { status: 200 });
  } catch (error) {
    console.error('[chat/route] Delete error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
