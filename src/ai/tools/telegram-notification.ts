import { tool } from 'ai';
import { z } from 'zod';

import { sendTelegramNotification as sendTelegramNotificationAction } from '@/server/actions/telegram';

import { WrappedToolProps } from '.';

export const sendTelegramNotification = () => {
  const metadata = {
    description:
      'Sends a Telegram message. Requires a Telegram username to be passed in or saved in the database.',
    parameters: z.object({
      username: z.string().optional(),
      message: z.string(),
    }),
    requiredEnvVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME'],
  };
  const buildTool = ({ extraData: { userId } }: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ username, message }) => {
        try {
          const response = await sendTelegramNotificationAction({
            username,
            userId,
            text: message,
          });
          if (!response?.data?.data) {
            return {
              success: false,
              error: 'No response from Telegram action',
            };
          }
          const { success, error, botId } = response.data.data;
          if (!success) {
            return { success, error, botId };
          }
          return {
            success: true,
            data: 'Notification sent successfully',
            noFollowUp: true,
            botId,
          };
        } catch (err) {
          return {
            success: false,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to send notification',
          };
        }
      },
    });

  return {
    metadata,
    buildTool,
  };
};
