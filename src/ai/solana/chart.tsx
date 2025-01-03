import { z } from 'zod';
import { getTokenId, getPriceHistory } from '@/server/actions/charts';
import { Card } from '@/components/ui/card';
import PriceChart from '@/components/PriceChart';

export const chartTool = {
  displayName: '📈 Token Price Chart',
  isCollapsible: false,
  description: 'Displays a price history chart for a given Solana token address in USD.',
  parameters: z.object({
    contractAddress: z.string().describe('The contract address of the token'),
    days: z.number().optional().describe('Number of days for the price history (default is 7)'),
  }),
  execute: async ({ contractAddress, days }: { contractAddress: string; days?: number }) => {
    try {
      const tokenId = await getTokenId(contractAddress);
      const priceHistory = await getPriceHistory(tokenId, days || 7);
      return {
        success: true,
        data: priceHistory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get price history',
      };
    }
  },
  render: (result: unknown) => {
    const typedResult = result as {
      success: boolean;
      data?: { time: string; value: number }[];
      error?: string;
    };

    if (!typedResult.success) {
      return <div>Error: {typedResult.error}</div>;
    }

    if (!typedResult.data || typedResult.data.length === 0) {
      return <div>No price history data found</div>;
    }

    return (
      <Card className="bg-muted/50 p-4">
        <h3>Token Price Chart</h3>
        <PriceChart data={typedResult.data} />
      </Card>
    );
  },
};