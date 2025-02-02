import { tool } from 'ai';

import { WrappedToolProps } from '.';
import { dexscreenerTools } from '../solana/dexscreener';

const getTokenOrders = () => {
  const metadata = {
    description: dexscreenerTools.getTokenOrders.description,
    parameters: dexscreenerTools.getTokenOrders.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        chainId,
        tokenAddress,
      }: {
        chainId: string;
        tokenAddress: string;
      }) => {
        return await dexscreenerTools.getTokenOrders.execute({
          chainId,
          tokenAddress,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

const getTokenProfile = () => {
  const metadata = {
    description: dexscreenerTools.getTokenProfile.description,
    parameters: dexscreenerTools.getTokenProfile.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ mint }: { mint: string }) => {
        return await dexscreenerTools.getTokenProfile.execute({
          mint,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const allDexscreenerTools = {
  getTokenOrders: getTokenOrders(),
  getTokenProfile: getTokenProfile(),
};
