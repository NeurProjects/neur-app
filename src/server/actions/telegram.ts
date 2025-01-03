import { z } from 'zod';
import { ActionResponse, actionClient } from '@/lib/safe-action';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

export const sendTelegramNotification = actionClient
  .schema(
    z.object({
      chatId: z.string(),
      text: z.string()
    })
  )
  .action<ActionResponse<void>>(
    async ({ parsedInput: { chatId, text } }) => {
      if (!TELEGRAM_BOT_TOKEN) {
        return {
          success: false,
          error: "Telegram bot token not set"
        };
      }

      try {
        const response = await fetch(TELEGRAM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to send telegram notification: ${response.statusText}`);
        }
        return {
          success: true
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send telegram notification'
        };
      }
    }
  );
