import { z } from 'zod';
import { sendTelegramNotification } from '@/server/actions/telegram';

interface NotificationResultProps {
  username: string;
}

function NotificationResult({ username }: NotificationResultProps) {
  return <div>Message sent successfully to {username}</div>;
}

export const telegramTool = {
  sendNotification: {
    displayName: '📨 Send Telegram Notification',
    isCollapsible: true,
    description: 'Send a notification to a user via Telegram',
    parameters: z.object({
      chatId: z.string().describe('The Telegram chat ID of the user'),
      message: z.string().describe('The message to send to the user'),
      username: z.string().describe('The Telegram username of the user'),
    }),
    execute: async ({
      chatId,
      message,
      username,
    }: {
      chatId: number;
      message: string;
      username: string;
    }) => {
      try {

        await sendTelegramNotification(message, username, chatId);

        return {
          success: true,
          data: { username },
        };
      } catch (error) {
        return { success: false, error: (error as Error).message + " try starting bot t.me/"+process.env.TELEGRAM_BOT_USERNAME };
      }
    },
    render: (raw: unknown) => {
      const result = raw as NotificationResultProps;
      return <NotificationResult {...result} />;
    },
  },
};