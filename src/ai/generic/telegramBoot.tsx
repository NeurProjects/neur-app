import { z } from 'zod';

import sendTelegramNotification from '@/server/actions/telegram';

// Reusable component for rendering success messages
function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="bg-success/10 text-success rounded-lg p-4">
      <p className="text-base">{message}</p>
      <p className="text-sm">
        If you don&apos;t still add the telegram bot, please use this link{' '}
        {process.env.TELEGRAM_BOT_LINK}
      </p>
    </div>
  );
}

// Reusable component for rendering error messages
function ErrorMessage({ error }: { error: string }) {
  return (
    <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
      <p className="text-sm">Error: {error}</p>
    </div>
  );
}

// Telegram notification tool
export const telegramTool = {
  sendNotification: {
    displayName: '📨 Send Telegram Notification', // Tool display name
    description:
      'Send a notification message to a specified Telegram user or chat ID.', // Description of the tool
    parameters: z.object({
      chatId: z
        .string()
        .describe('The Telegram chat ID of the user or group (required)'), // Chat ID parameter (mandatory)
      message: z.string().describe('The message to send (required)'), // Message parameter (mandatory)
      username: z
        .string()
        .optional()
        .describe('The Telegram username of the user (optional)'), // Username parameter (optional)
    }),
    execute: async ({
      chatId,
      message,
      username,
    }: {
      chatId: string;
      message: string;
      username?: string;
    }) => {
      try {
        // Execute the Telegram notification logic
        const response = await sendTelegramNotification({
          chatId,
          text: message,
          username,
        });

        // Check if the response indicates success
        if (!response || !response.data || !('success' in response.data)) {
          throw new Error(
            response?.data?.error || 'Failed to send notification',
          );
        }

        console.log('Notification sent successfully');
        return {
          success: true,
          data: `Notification sent successfully to ${
            username ? username : `chat ID: ${chatId}`
          }`,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message +
                (process.env.TELEGRAM_BOT_USERNAME
                  ? `. Try starting the bot: t.me/${process.env.TELEGRAM_BOT_USERNAME}`
                  : '')
              : 'Failed to send notification',
        };
      }
    },
    render: (result: unknown) => {
      // Render success or error messages in the UI
      const typedResult = result as {
        success: boolean;
        data?: string;
        error?: string;
      };

      if (typedResult.success) {
        return <SuccessMessage message={typedResult.data || 'Success'} />;
      }

      return <ErrorMessage error={typedResult.error || 'Unknown error'} />;
    },
  },
};
