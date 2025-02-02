import { tool } from 'ai';
import { z } from 'zod';

import { WrappedToolProps } from '.';
import { chartTools } from '../solana/chart';

const priceChartTool = () => {
  const metadata = {
    description: chartTools.priceChartTool.description,
    parameters: chartTools.priceChartTool.parameters,
    requiredEnvVars: ['CG_API_KEY'],
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        contractAddress,
        timeFrame,
        timeDelta,
        tokenSymbol,
        aggregator,
        beforeTimestamp,
      }: z.infer<typeof chartTools.priceChartTool.parameters>) => {
        return chartTools.priceChartTool.execute({
          contractAddress,
          timeFrame,
          timeDelta,
          tokenSymbol,
          aggregator,
          beforeTimestamp,
        });
      },
    });
  return {
    metadata,
    buildTool,
  };
};

const dexChartTool = () => {
  const metadata = {
    description: chartTools.dexChartTool.description,
    parameters: chartTools.dexChartTool.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        contractAddress,
        timeFrame,
        timeDelta,
        tokenSymbol,
        aggregator,
        beforeTimestamp,
      }: z.infer<typeof chartTools.dexChartTool.parameters>) => {
        return chartTools.dexChartTool.execute({
          contractAddress,
          timeFrame,
          timeDelta,
          tokenSymbol,
          aggregator,
          beforeTimestamp,
        });
      },
    });
  return {
    metadata,
    buildTool,
  };
};

export const allChartTools = {
  priceChartTool: priceChartTool(),
  dexChartTool: dexChartTool(),
};
