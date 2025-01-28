import { z } from 'zod';

import PriceChart from '@/components/price-chart';
import { getDexPriceHistory, getPriceHistory } from '@/server/actions/chart';
import { TIMEFRAME } from '@/types/chart';

const chartToolParameters = z.object({
  contractAddress: z.string().describe('The contract address of the token'),
  timeFrame: z
    .enum([TIMEFRAME.DAYS, TIMEFRAME.HOURS, TIMEFRAME.MINUTES])
    .default(TIMEFRAME.DAYS)
    .describe('The timeframe for the price history'),
  timeDelta: z
    .number()
    .min(1)
    .max(30)
    .default(7)
    .describe('Number of timeframe units to fetch (default 7)'),
  tokenSymbol: z.string().optional().describe('Optional token symbol'),
  aggregator: z.string().optional().describe('OHLCV aggregator for DEX'),
  beforeTimestamp: z
    .number()
    .optional()
    .describe('Fetch DEX data before this timestamp (in seconds)'),
});

function renderChart(result: unknown) {
  const typedResult = result as {
    success: boolean;
    data?: { time: number; value: number }[];
    timeFrame: TIMEFRAME;
    tokenInfo: { symbol: string; address: string };
    error?: string;
  };

  if (!typedResult.success) {
    return <div>Error: {typedResult.error}</div>;
  }

  if (!typedResult.data || typedResult.data.length === 0) {
    return <div>No price history data found</div>;
  }

  return (
    <PriceChart
      data={typedResult.data}
      timeFrame={typedResult.timeFrame}
      tokenInfo={typedResult.tokenInfo}
    />
  );
}

export const priceChartTool = {
  displayName: '📈 Price Chart',
  isCollapsible: true,
  isExpandedByDefault: true,
  description:
    'Retrieves and displays price history for a Solana token via CoinGecko market data, falling back to DEX if unavailable.',
  parameters: chartToolParameters,
  requiredEnvVars: ['CG_API_KEY'],
  execute: async ({
    contractAddress,
    timeFrame,
    timeDelta,
    tokenSymbol,
    aggregator,
    beforeTimestamp,
  }: z.infer<typeof chartToolParameters>) => {
    try {
      const history = await getPriceHistory(
        contractAddress,
        'solana',
        timeFrame,
        timeDelta,
        aggregator,
        beforeTimestamp,
      );

      return {
        success: true,
        data: history,
        timeFrame,
        tokenInfo: {
          symbol: tokenSymbol ?? contractAddress,
          address: contractAddress,
        },
        suppressFollowUp: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve token price history',
      };
    }
  },
  render: renderChart,
};

export const dexChartTool = {
  displayName: '📊 DEX Price Chart',
  isCollapsible: true,
  isExpandedByDefault: true,
  description: 'Retrieves and displays price history data from the DEX.',
  parameters: chartToolParameters,
  requiredEnvVars: ['CG_API_KEY'],
  execute: async ({
    contractAddress,
    timeFrame,
    timeDelta,
    tokenSymbol,
    aggregator,
    beforeTimestamp,
  }: z.infer<typeof chartToolParameters>) => {
    try {
      const history = await getDexPriceHistory(
        contractAddress,
        'solana',
        timeFrame,
        aggregator,
        beforeTimestamp,
      );

      return {
        success: true,
        data: history,
        timeFrame,
        tokenInfo: {
          symbol: tokenSymbol ?? contractAddress,
          address: contractAddress,
        },
        suppressFollowUp: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve token price history from DEX',
      };
    }
  },
  render: renderChart,
};

export const chartTools = {
  priceChartTool,
  dexChartTool,
};
