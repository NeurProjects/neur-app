import axios from 'axios';
import { z } from 'zod';

import { ActionResponse, actionClient } from '@/lib/safe-action';

// Define Telegram API URL and Bot Token
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const botUsername = process.env.TELEGRAM_BOT_USERNAME;

/**
 * Retrieves the chat ID of a user by their Telegram username.
 * @param username - The Telegram username of the user.
 * @returns The chat ID of the user.
 * @throws An error if the username is not found or API request fails.
 */
async function getChatIdByUsername(username: string): Promise<number> {
  const url = `${TELEGRAM_API_URL}${botToken}/getUpdates`; // Endpoint to fetch recent bot updates
  const response = await axios.get(url);

  if (response.status !== 200) {
    throw new Error('Failed to fetch updates from Telegram API');
  }

  const data = response.data;
  const messages = data.result;

  // Find the message with the username and extract the chat ID
  const userMessage = messages.find(
    (message: any) => message.message?.from?.username === username,
  );

  if (!userMessage) {
    throw new Error(
      `Chat ID not found! Please start the bot: t.me/${botUsername}`,
    );
  }

  return userMessage.message.chat.id; // Return the chat ID
}

/**
 * Sends a notification to a user on Telegram.
 * You can provide either a username or a chat ID to identify the recipient.
 * @param params - Object containing either `username` or `chatId` and the `text` of the message.
 * @returns Success or failure status.
 */
const sendTelegramNotification = actionClient
  .schema(
    z.object({
      username: z.string().optional(), // Optional Telegram username
      chatId: z.string().optional(), // Optional Telegram chat ID
      text: z.string(), // The message text to send
    }),
  )
  .action<ActionResponse<void>>(
    async ({ parsedInput: { username, chatId, text } }) => {
      // Ensure that at least one identifier (username or chatId) is provided
      if (!username && !chatId) {
        return {
          success: false,
          error: 'Telegram chat ID or username is required',
        };
      }

      try {
        // If username is provided, resolve the chat ID using `getChatIdByUsername`
        if (!chatId && username) {
          chatId = String(await getChatIdByUsername(username));
        }

        const url = `${TELEGRAM_API_URL}${botToken}/sendMessage`; // Endpoint to send a message
        const response = await axios.post(url, {
          chat_id: chatId, // The recipient's chat ID
          text, // The message content
        });

        // Check if the API response indicates success
        if (response.status !== 200) {
          throw new Error('Failed to send Telegram notification');
        }

        console.log('Telegram notification sent successfully');
        return { success: true };
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  );

export default sendTelegramNotification;
