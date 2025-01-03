import Image from 'next/image';

import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { capitalize } from '@/lib/utils/format';

// Types
interface DexScreenerOrder {
  type: 'tokenProfile' | 'communityTakeover' | 'tokenAd' | 'trendingBarAd';
  status: 'processing' | 'cancelled' | 'on-hold' | 'approved' | 'rejected';
  paymentTimestamp: number;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels: string[];
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
    websites?: { label: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
  boosts?: {
    active: number;
  };
}

interface DexScreenerPairResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

// Types for Token Profiles
interface DexScreenerTokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  openGraph?: string;
  description?: string;
  links?: {
    type: string;
    url: string;
  }[];
}

const OrdersResult = ({ orders }: { orders: DexScreenerOrder[] }) => {
  if (!orders.length) {
    return (
      <Card className="bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          No, this token hasn&apos;t paid for any DexScreener promotional
          services. This means they haven&apos;t invested in marketing features
          like token profile promotion or community takeover on DexScreener.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <h3 className="text-lg font-medium">Token Orders</h3>
      <div className="space-y-3">
        {orders.map((order, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg bg-background/50 p-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{order.type}</span>
                <Badge
                  variant={
                    order.status === 'approved'
                      ? 'default'
                      : order.status === 'processing'
                        ? 'secondary'
                        : order.status === 'rejected'
                          ? 'destructive'
                          : 'outline'
                  }
                >
                  {order.status}
                </Badge>
              </div>
              {order.paymentTimestamp > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid at:{' '}
                  {new Date(order.paymentTimestamp * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const TokenProfile = ({ pair }: { pair: DexScreenerPair }) => {
  if (!pair) {
    return (
      <Card className="bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Token not found on DexScreener.
        </p>
      </Card>
    );
  }
  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        {pair.info?.imageUrl && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={pair.info.imageUrl}
              alt={pair.baseToken.symbol}
              className="object-cover"
              fill
              sizes="48px"
              onError={(e) => {
                // @ts-expect-error - Type 'string' is not assignable to type 'never'
                e.target.src = '/placeholder.png';
              }}
            />
          </div>
        )}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium">
            {pair.baseToken.name}
            <span className="text-sm text-muted-foreground">
              ({pair.baseToken.symbol})
            </span>
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">
              {pair.baseToken.address.slice(0, 4)}...
              {pair.baseToken.address.slice(-4)}
            </span>
            <a
              href={pair.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:text-foreground"
            >
              View on DexScreener
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium">Price USD</div>
          <div className="mt-1 text-2xl font-semibold">
            $
            {Number(pair.priceUsd).toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
          </div>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium">Liquidity</div>
          <div className="mt-1 text-2xl font-semibold">
            ${pair.liquidity?.usd.toLocaleString() ?? 'Unknown'}
          </div>
        </div>
      </div>

      {(pair.info?.websites?.length || pair.info?.socials?.length) && (
        <div className="border-t pt-4">
          <h4 className="mb-3 text-sm font-medium">Links</h4>
          <div className="flex flex-wrap gap-2">
            {pair.info?.websites?.map((website, index) => (
              <a
                key={index}
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-background px-2.5 py-1.5 text-sm hover:bg-accent"
              >
                {website.label}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            ))}
            {pair.info?.socials?.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-background px-2.5 py-1.5 text-sm capitalize hover:bg-accent"
              >
                {capitalize(social.type)}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

const TokenProfiles = ({
  profiles,
}: {
  profiles: DexScreenerTokenProfile[];
}) => {
  const solanaProfiles = profiles.filter(
    (profile) => profile.chainId === 'solana',
  );

  if (!solanaProfiles.length) {
    return (
      <Card className="bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          No Solana token profiles found.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {solanaProfiles.map((profile, index) => (
        <Card key={index} className="bg-muted/50 p-4">
          <div className="flex gap-4">
            {profile.icon && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <Image
                  src={profile.icon}
                  alt="Token Icon"
                  className="object-cover"
                  fill
                  sizes="64px"
                  onError={(e) => {
                    // @ts-expect-error - Type 'string' is not assignable to type 'never'
                    e.target.src = '/placeholder.png';
                  }}
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  <span className="font-mono text-sm text-muted-foreground">
                    {profile.tokenAddress.slice(0, 4)}...
                    {profile.tokenAddress.slice(-4)}
                  </span>
                </h3>
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  View on DexScreener
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
              {profile.description && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {profile.description}
                </p>
              )}
              {profile.links && profile.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md bg-background px-2.5 py-1.5 text-sm capitalize hover:bg-accent"
                    >
                      {link.type}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const dexscreenerTools = {
  getTokenOrders: {
    displayName: '🔍 Check Token Orders',
    description:
      "Check if a token has paid for DexScreener promotional services. Use this to verify if a token has invested in marketing or visibility on DexScreener, which can indicate the team's commitment to marketing and visibility. Returns order types (tokenProfile, communityTakeover, etc.) and their statuses.",
    parameters: z.object({
      chainId: z
        .string()
        .describe("The blockchain identifier (e.g., 'solana', 'ethereum')"),
      tokenAddress: z.string().describe('The token address to check'),
    }),
    execute: async ({
      chainId,
      tokenAddress,
    }: {
      chainId: string;
      tokenAddress: string;
    }) => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/orders/v1/${chainId}/${tokenAddress}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch token orders: ${response.statusText}`,
          );
        }

        const orders = (await response.json()) as DexScreenerOrder[];
        return {
          suppressFollowUp: true,
          data: orders,
        };
      } catch (error) {
        throw new Error(
          `Failed to get token orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: DexScreenerOrder[] }).data;
      return <OrdersResult orders={result} />;
    },
  },
  getTokenProfile: {
    displayName: '📊 Token Profile',
    description:
      'Get comprehensive information about a token from DexScreener. Use this when users want to know more about a token, including its price, liquidity, market cap, and social links (Telegram, Twitter, Website). This is particularly useful for due diligence or when users ask about token details, social presence, or market metrics.',
    parameters: z.object({
      mint: z.string().describe("The token's mint/contract address to check"),
    }),
    execute: async ({ mint }: { mint: string }) => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
          {
            headers: { Accept: 'application/json' },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch token profile: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as DexScreenerPairResponse;

        if (data.pairs === null || !data.pairs.length) {
          throw new Error('No pair data found');
        }

        // Use the first pair with the highest liquidity
        const sortedPairs = data.pairs.sort(
          (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
        );
        return {
          suppressFollowUp: true,
          data: sortedPairs[0],
        };
      } catch (error) {
        return {
          suppressFollowUp: false,
          data: null,
        };
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: DexScreenerPair }).data;
      return <TokenProfile pair={result} />;
    },
  },
  getLatestTokenProfiles: {
    displayName: '🌟 Latest Token Profiles',
    description:
      'Get the latest token profiles from DexScreener, focusing on Solana tokens. This shows tokens with verified profiles including their descriptions, social links, and branding assets.',
    parameters: z.object({}),
    execute: async () => {
      console.log('[DexScreener] Starting getLatestTokenProfiles execution');
      try {
        console.log('[DexScreener] Fetching from token-profiles API');
        const response = await fetch(
          'https://api.dexscreener.com/token-profiles/latest/v1',
          {
            headers: { Accept: 'application/json' },
          },
        );

        console.log('[DexScreener] API Response status:', response.status);
        if (!response.ok) {
          console.error(
            '[DexScreener] API Response error:',
            response.statusText,
          );
          throw new Error(
            `Failed to fetch token profiles: ${response.statusText}`,
          );
        }

        console.log('[DexScreener] Parsing response as JSON');
        const profiles = (await response.json()) as DexScreenerTokenProfile[];
        console.log('[DexScreener] Received profiles count:', profiles.length);
        console.log(
          '[DexScreener] Solana profiles count:',
          profiles.filter((p) => p.chainId === 'solana').length,
        );

        return {
          suppressFollowUp: true,
          data: profiles,
        };
      } catch (error) {
        console.error('[DexScreener] Error in getLatestTokenProfiles:', error);
        throw new Error(
          `Failed to get token profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      console.log('[DexScreener] Starting render of token profiles');
      const result = (raw as { data: DexScreenerTokenProfile[] }).data;
      console.log('[DexScreener] Profiles to render:', result.length);
      return <TokenProfiles profiles={result} />;
    },
  },
};
