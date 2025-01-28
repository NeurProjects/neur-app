import { cache } from 'react';

import { z } from 'zod';

import { searchWalletAssets } from '@/lib/solana/helius';

export interface BirdeyeTrader {
  address: string;
  pnl: number;
  volume: number;
  tradeCount: number;
  portfolio?: Awaited<ReturnType<typeof searchWalletAssets>>;
}

const birdeyeTraderSchema = z.object({
  network: z.string(),
  address: z.string(),
  pnl: z.number(),
  volume: z.number(),
  trade_count: z.number(),
});

export enum BirdeyeTimeframe {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  WEEK = '1W',
}

const birdeyeTradersSchema = z.object({
  data: z.object({
    items: z.array(birdeyeTraderSchema),
  }),
});

// Cache the fetch for 5 minutes
export const getTopTraders = cache(
  async ({
    timeframe = BirdeyeTimeframe.TODAY,
  }: {
    timeframe: BirdeyeTimeframe;
  }): Promise<BirdeyeTrader[]> => {
    try {
      const queryParams = new URLSearchParams({
        type: timeframe,
        sort_by: 'PnL',
        sort_type: 'desc',
        offset: '0',
        limit: '5',
      }).toString();

      const response = await fetch(
        'https://public-api.birdeye.so/trader/gainers-losers?' + queryParams,
        {
          next: {
            revalidate: 300, // Cache for 5 minutes
          },
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
            'x-chain': 'solana',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Birdeye traders');
      }

      const data = await response.json();
      const parsed = birdeyeTradersSchema.parse(data);

      // Only return the fields we need
      return await Promise.all(
        parsed.data.items.map(async (trader) => ({
          address: trader.address,
          pnl: trader.pnl,
          volume: trader.volume,
          tradeCount: trader.trade_count,
        })),
      );
    } catch (error) {
      console.error('Error fetching Birdeye traders:', error);
      return [];
    }
  },
);
