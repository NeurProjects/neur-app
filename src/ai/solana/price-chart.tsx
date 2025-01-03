import { z } from 'zod';

import PriceChart from '@/components/message/price-chart';
import { Card } from '@/components/ui/card';
import { fetchPriceHistory } from '@/server/actions/price';

export const tokenPriceChartTool = {
  priceFetch: {
    displayName: '📈 Token Price Chart',
    isCollapsible: false,
    description:
      'Displays the price history chart of a Solana token in USD for a given duration.',
    parameters: z.object({
      tokenSymbol: z.string().describe('The Solana token symbol'),
    }),
    execute: async ({ tokenSymbol }: { tokenSymbol: string }) => {
      try {
        const tokenPriceHistory = await fetchPriceHistory(tokenSymbol);
        return {
          success: true,
          data: tokenPriceHistory,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to fetch token price history',
        };
      }
    },
    render: (response: unknown) => {
      const parsedResponse = response as {
        success: boolean;
        data?: { time: string; value: number }[];
        error?: string;
      };

      if (!parsedResponse.success) {
        return <div>Error: {parsedResponse.error}</div>;
      }

      if (!parsedResponse.data || parsedResponse.data.length === 0) {
        return <div>No price history data available</div>;
      }

      return (
        <Card className="bg-muted/50 p-4">
          <h3>Token Price Chart</h3>
          <PriceChart data={parsedResponse.data} />
        </Card>
      );
    },
  },
};
