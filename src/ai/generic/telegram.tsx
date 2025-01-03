import { z } from 'zod';

import { sendTelegramNotification } from '@/server/actions/telegram';

export const telegramTools = {
  sendNotification: {
    displayName: '📨 Send Telegram Notification',
    description: 'Send a notification message to a specified Telegram chat ID.',
    parameters: z.object({
      chatId: z
        .string()
        .describe('The Telegram chat ID to send the message to'),
      message: z.string().describe('The message to send'),
    }),
    execute: async ({
      chatId,
      message,
    }: {
      chatId: string;
      message: string;
    }) => {
      try {
        const response = await sendTelegramNotification({
          chatId,
          text: message,
        });
        if (!response || !response.data || !('success' in response.data)) {
          throw new Error(
            response?.data?.error || 'Failed to send notification',
          );
        }
        console.log('\n');
        console.log('Notification sent successfully');
        return {
          success: true,
          data: 'Notification sent successfully',
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send notification',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: string;
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      return <>{/* Render success message */}</>;
    },
  },
};
