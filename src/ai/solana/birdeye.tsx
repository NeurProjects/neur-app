import { z } from 'zod';

import TopTrader from '@/components/top-trader';
import {
  BirdeyeTimeframe,
  BirdeyeTrader,
  getTopTraders,
} from '@/server/actions/birdeye';

export const birdeyeTools = {
  getTopTraders: {
    displayName: '📈 Top Traders',
    isCollapsible: true,
    isExpandedByDefault: true,
    description: 'Get top traders on Solana DEXes given a timeframe',
    parameters: z.object({
      timeframe: z
        .nativeEnum(BirdeyeTimeframe)
        .describe('The timeframe to search for'),
    }),
    requiredEnvVars: ['BIRDEYE_API_KEY'],
    execute: async ({ timeframe }: { timeframe: BirdeyeTimeframe }) => {
      try {
        const traders = await getTopTraders({ timeframe });

        return {
          success: true,
          data: traders,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to search traders',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: BirdeyeTrader[];
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

      if (!typedResult.data?.length) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">No traders found</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {typedResult.data.map((trader, index) => (
            <TopTrader key={trader.address} trader={trader} rank={index + 1} />
          ))}
        </div>
      );
    },
  },
};
