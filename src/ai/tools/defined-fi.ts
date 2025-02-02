import { tool } from 'ai';
import { z } from 'zod';

import { WrappedToolProps } from '.';
import { definedTools } from '../solana/defined-fi';

const filterTrendingTokens = () => {
  const metadata = {
    description: definedTools.filterTrendingTokens.description,
    parameters: definedTools.filterTrendingTokens.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        maxVolume24h,
        minVolume24h,
        maxLiquidity,
        minLiquidity,
        maxMarketCap,
        minMarketCap,
        createdWithinHours,
        sortBy,
        sortDirection,
        limit,
      }: z.infer<typeof definedTools.filterTrendingTokens.parameters>) => {
        return await definedTools.filterTrendingTokens.execute({
          maxVolume24h,
          minVolume24h,
          maxLiquidity,
          minLiquidity,
          maxMarketCap,
          minMarketCap,
          createdWithinHours,
          sortBy,
          sortDirection,
          limit,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const definedFiTools = {
  filterTrendingTokens: filterTrendingTokens(),
};
