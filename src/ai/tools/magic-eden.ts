import { tool } from 'ai';

import { WrappedToolProps } from '.';
import { magicEdenTools } from '../solana/magic-eden';

const getCollectionStats = () => {
  const metadata = {
    description: magicEdenTools.getCollectionStats.description,
    parameters: magicEdenTools.getCollectionStats.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ symbol }: { symbol: string }) => {
        return await magicEdenTools.getCollectionStats.execute({
          symbol,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

const getCollectionActivities = () => {
  const metadata = {
    description: magicEdenTools.getCollectionActivities.description,
    parameters: magicEdenTools.getCollectionActivities.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({ symbol }: { symbol: string }) => {
        return await magicEdenTools.getCollectionActivities.execute({
          symbol,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

const getPopularCollections = () => {
  const metadata = {
    description: magicEdenTools.getPopularCollections.description,
    parameters: magicEdenTools.getPopularCollections.parameters,
  };
  const buildTool = (props: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        timeRange,
        limit,
      }: {
        timeRange: string;
        limit: number;
      }) => {
        return await magicEdenTools.getPopularCollections.execute({
          timeRange,
          limit,
        });
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const allMagicEdenTools = {
  getCollectionStats: getCollectionStats(),
  getCollectionActivities: getCollectionActivities(),
  getPopularCollections: getPopularCollections(),
};
