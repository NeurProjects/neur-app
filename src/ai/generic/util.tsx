import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type ToolActionResult } from '@/types/util';

interface ConfirmDenyProps {
  message: string;
}

export const utilTools = {
  askForConfirmation: {
    displayName: '⚠️ Confirmation',
    description: 'Confirm the execution of a function on behalf of the user.',
    parameters: z.object({
      message: z.string().describe('The message to ask for confirmation'),
    }),
    execute: async ({ message }: ConfirmDenyProps) => {
      return {
        message,
      };
    },
    render: (raw: unknown) => {
      const { message, addResultUtility, result } = raw as ToolActionResult;

      return (
        <Card className="flex flex-col gap-3 bg-card p-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          <div className="flex justify-end space-x-2">
            {result === 'confirm' && (
              <Button variant="secondary" size="sm" disabled>
                Confirmed
              </Button>
            )}
            {result === 'deny' && (
              <Button variant="destructive" size="sm" disabled>
                Denied
              </Button>
            )}
            {!result && addResultUtility && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addResultUtility({ result: 'confirm', message })}
              >
                Confirm
              </Button>
            )}
            {!result && addResultUtility && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => addResultUtility({ result: 'deny', message })}
              >
                Deny
              </Button>
            )}
          </div>
        </Card>
      );
    },
  },
};
