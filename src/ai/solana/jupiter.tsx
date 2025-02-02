import Image from 'next/image';

import { z } from 'zod';

import { formatNumber } from '@/lib/format';
import { Placeholder } from '@/lib/placeholder';
import {
  type TokenPrice,
  getJupiterTokenPrice,
  searchJupiterTokens,
} from '@/server/actions/jupiter';

import { JupiterToken } from '../tools/search-token';

//

export function TokenCard({
  data: { success, result },
}: {
  data: { success: boolean; result?: JupiterToken };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          {result?.logoURI && (
            <Image
              src={result.logoURI}
              alt={result?.name ?? 'Token'}
              className="object-cover"
              fill
              sizes="40px"
              onError={(e) => {
                (e.target as HTMLImageElement).src = Placeholder.generate({
                  width: 40,
                  height: 40,
                  text: result?.symbol,
                });
              }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">{result?.name}</h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {result?.symbol}
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">
              {result?.mint.slice(0, 4)}...{result?.mint.slice(-4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCard({
  token,
  price,
}: {
  token: JupiterToken;
  price: TokenPrice;
}) {
  const priceValue = parseFloat(price.price);

  const formattedPrice =
    priceValue < 1 ? priceValue.toFixed(6) : priceValue.toFixed(2);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={token.logoURI || '/placeholder.png'}
            alt={token.name}
            className="object-cover"
            fill
            sizes="40px"
            onError={(e) => {
              // @ts-expect-error - Type 'string' is not assignable to type 'never'
              e.target.src =
                'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">{token.name}</h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.symbol}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold">${formattedPrice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const jupiterTools = {
  searchToken: {
    displayName: '🔍 Search Token',
    isCollapsible: true,
    description:
      'Search for any Solana token by name or symbol to get its contract address (mint), along with detailed information like volume and logo. Useful for getting token addresses for further operations.',
    parameters: z.object({
      query: z.string().describe('Token name or symbol to search for'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const tokens = await searchJupiterTokens(query);
        const searchQuery = query.toLowerCase();

        // Search and rank tokens
        const results = tokens
          .filter(
            (token) =>
              token.name.toLowerCase().includes(searchQuery) ||
              token.symbol.toLowerCase().includes(searchQuery),
          )
          .sort((a, b) => {
            // Exact matches first
            const aExact =
              a.symbol.toLowerCase() === searchQuery ||
              a.name.toLowerCase() === searchQuery;
            const bExact =
              b.symbol.toLowerCase() === searchQuery ||
              b.name.toLowerCase() === searchQuery;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return 0;
          })
          .slice(0, 1);

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to search tokens',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: JupiterToken[];
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
              <p className="text-sm text-muted-foreground">No tokens found</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {typedResult.data.map((token) => (
            <TokenCard
              key={token.mint}
              data={{ success: true, result: token }}
            />
          ))}
        </div>
      );
    },
  },

  getTokenPrice: {
    displayName: '💰 Get Token Price',
    isCollapsible: true,
    description:
      'Get the current price of any Solana token in USDC, including detailed information like buy/sell prices and confidence level.',
    parameters: z.object({
      tokenAddress: z.string().describe("The token's mint address"),
      showExtraInfo: z
        .boolean()
        .default(true)
        .describe(
          'Whether to show additional price information like buy/sell prices and confidence level',
        ),
    }),
    execute: async ({
      tokenAddress,
      showExtraInfo,
    }: {
      tokenAddress: string;
      showExtraInfo: boolean;
    }) => {
      try {
        const token = await searchJupiterTokens(tokenAddress);
        if (!token.length) {
          return {
            success: false,
            error: 'Token not found',
          };
        }

        const price = await getJupiterTokenPrice(tokenAddress, showExtraInfo);
        if (!price) {
          return {
            success: false,
            error: 'Price data not available',
          };
        }

        return {
          success: true,
          data: {
            token: token[0],
            price,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get token price',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: {
          token: JupiterToken;
          price: TokenPrice;
        };
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

      if (!typedResult.data) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                No price data available
              </p>
            </div>
          </div>
        );
      }

      return (
        <PriceCard
          token={typedResult.data.token}
          price={typedResult.data.price}
        />
      );
    },
  },
};
