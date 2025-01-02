import { Prisma, Message as PrismaMessage } from '@prisma/client';

import prisma from '@/lib/prisma';

/**
 * Retrieves a conversation by its ID
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The unique identifier of the conversation
 * @returns {Promise<Conversation | null>} The conversation object or null if not found/error occurs
 */
export async function dbGetConversation({
  conversationId,
}: {
  conversationId: string;
}) {
  try {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get conversation:', {
      conversationId,
      error,
    });
    return null;
  }
}

/**
 * Creates a new conversation
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The unique identifier for the new conversation
 * @param {string} params.userId - The user who owns the conversation
 * @param {string} params.title - The title of the conversation
 * @returns {Promise<Conversation | null>} The created conversation or null if creation fails
 */
export async function dbCreateConversation({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  try {
    return await prisma.conversation.create({
      data: { id: conversationId, userId, title },
    });
  } catch (error) {
    console.error('[DB Error] Failed to create conversation:', {
      conversationId,
      userId,
      error,
    });
    return null;
  }
}

/**
 * Creates multiple messages in bulk
 * @param {Object} params - The parameters object
 * @param {Array<Omit<PrismaMessage, 'id' | 'createdAt'>>} params.messages - Array of message objects to create
 * @returns {Promise<Prisma.BatchPayload | null>} The result of the bulk creation or null if it fails
 */
export async function dbCreateMessages({
  messages,
}: {
  messages: Omit<PrismaMessage, 'id' | 'createdAt'>[];
}) {
  try {
    return await prisma.message.createMany({
      data: messages as Prisma.MessageCreateManyInput[],
    });
  } catch (error) {
    console.error('[DB Error] Failed to create messages:', {
      messageCount: messages.length,
      error,
    });
    return null;
  }
}

/**
 * Updates the tool-call results for any toolCallIds
 * in the provided `messageData.content` array.
 *
 * @param conversationId - The ID of the conversation
 * @param messageData    - An object with role: "tool" and an array of tool-result items
 * @returns An array of updated Messages or an empty array if no matches
 */
export async function updateToolCallResults(
  conversationId: string,
  messageData: {
    role: 'tool';
    content: Array<{
      type: 'tool-result';
      toolCallId: string;
      toolName: string;
      result: {
        result: string; // e.g. "deny", "confirm"
        message: string;
      };
    }>;
  },
): Promise<PrismaMessage[]> {
  const updatedMessages: PrismaMessage[] = [];

  for (const item of messageData.content) {
    const toolCallId = item.toolCallId;
    const newResultObj = item.result;
    const toolMessages = await prisma.message.findMany({
      where: {
        conversationId,
        role: 'tool',
      },
    });

    let messageToUpdate: PrismaMessage | null = null;
    for (const msg of toolMessages) {
      const contentArray = msg.content as any[];
      const hasMatchingToolCallId = contentArray.some(
        (c) => c.toolCallId === toolCallId,
      );
      if (hasMatchingToolCallId) {
        messageToUpdate = msg;
        break;
      }
    }

    if (!messageToUpdate) {
      continue;
    }

    const oldContentArray = messageToUpdate.content as any[];
    const newContentArray = oldContentArray.map((c) => {
      if (c.toolCallId === toolCallId) {
        return {
          ...c,
          result: newResultObj,
        };
      }
      return c;
    });

    const updatedMessage = await prisma.message.update({
      where: { id: messageToUpdate.id },
      data: { content: newContentArray },
    });

    updatedMessages.push(updatedMessage);
  }

  return updatedMessages;
}

/**
 * Retrieves all messages for a specific conversation
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The conversation ID to fetch messages for
 * @returns {Promise<Message[] | null>} Array of messages or null if query fails
 */
export async function dbGetConversationMessages({
  conversationId,
}: {
  conversationId: string;
}) {
  try {
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get conversation messages:', {
      conversationId,
      error,
    });
    return null;
  }
}

/**
 * Deletes a conversation and all its associated messages
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The ID of the conversation to delete
 * @param {string} params.userId - The user ID who owns the conversation
 * @returns {Promise<void>}
 */
export async function dbDeleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  try {
    await prisma.$transaction([
      prisma.message.deleteMany({
        where: { conversationId },
      }),
      prisma.conversation.delete({
        where: {
          id: conversationId,
          userId,
        },
      }),
    ]);
  } catch (error) {
    console.error('[DB Error] Failed to delete conversation:', {
      conversationId,
      userId,
      error,
    });
    throw error;
  }
}

/**
 * Retrieves all conversations for a specific user
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user
 * @returns {Promise<Conversation[]>} Array of conversations
 */
export async function dbGetConversations({ userId }: { userId: string }) {
  try {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get user conversations:', {
      userId,
      error,
    });
    return [];
  }
}
