import { tool } from 'ai';
import { z } from 'zod';

import { WrappedToolProps } from '.';
import { birdeyeTools } from '../solana/birdeye';

const getTopTradersTool = () => {
  const metadata = {
    description: 'Get top traders on Solana DEXes given a timeframe',
    parameters: birdeyeTools.getTopTraders.parameters,
    requiredEnvVars: ['BIRDEYE_API_KEY'],
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        timeframe,
      }: z.infer<typeof birdeyeTools.getTopTraders.parameters>) => {
        return await birdeyeTools.getTopTraders.execute({ timeframe });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const allBirdeyeTools = {
  getTopTraders: getTopTradersTool(),
};
