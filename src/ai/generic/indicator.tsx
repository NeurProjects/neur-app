import { checkIndicatorsAction } from "@/server/actions/indicator";
import { z } from 'zod';

// Define the schema for the tool's parameters
const indicatorToolParameters = z.object({
  indicator: z.enum(['rsi', 'sma', 'bb', 'macd']).describe('The indicator to check'),
  parameters: z.object({
    period: z.number().optional().describe('The period for the indicator'),
    fast: z.number().optional(),
    slow: z.number().optional(),
    signal: z.number().optional(),
  }),
  contractAddress: z.string().describe('The contract address of the token to check'),
  fromTimestamp: z.number().optional().describe('The timestamp to start checking from'),
});

// Define the tool
export const indicatorTools = {
  checkIndicators: {
    displayName: '📈 Indicator Tool',
    description: 'Check financial indicators like RSI, SMA, BB, and MACD for a given contract address.',
    parameters: indicatorToolParameters,
    execute: async (input: z.infer<typeof indicatorToolParameters>) => {
        try {
            // Call the existing checkIndicatorsAction function
            const result = await checkIndicatorsAction(input);

            if(!result?.data) {
                return {
                    success: false,
                    error: 'Unable to fetch indicator data.',
                };
            }

            if (result?.data?.success) {

                return {
                    success: true,
                    data: result.data,
                    suppressFollowUp: true,
                };

            } else {
                return {
                    success: false,
                    error: result.data.error,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Unexpected error during indicator check',
            };
        }
    },
    render: (result: unknown) => {
        const typedResult = result as {
            success: boolean;
            data?: number;
            error?: string;
        };

        if (!typedResult.success) {
            return (
                <div className="relative overflow-hidden rounded-2xl bg-muted p-4">
                <div className="flex items-center gap-3">
                    <p className="text-md text-center">
                    {typedResult.error || 'Unable to fetch indicator data.'}
                    </p>
                </div>
                </div>
            );
        }

        return (
        <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Indicator Result</p>

            <p className="font-medium">{typedResult.data}</p>
            </div>
        </div>
        );
    },
  },
};