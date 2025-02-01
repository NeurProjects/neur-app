import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Placeholder } from '@/lib/placeholder';

// Types
interface MagicEdenStats {
  symbol: string;
  floorPrice: number;
  listedCount: number;
  avgPrice24hr?: number;
  volumeAll?: number;
}

interface MagicEdenActivity {
  signature: string;
  type: string;
  source: string;
  collection: string;
  collectionSymbol: string;
  slot: number;
  blockTime: number;
  buyer?: string;
  seller?: string;
  buyerReferral: string;
  sellerReferral: string;
  price: number;
  priceInfo: {
    solPrice: {
      rawAmount: string;
      address: string;
      decimals: number;
    };
  };
}

interface MagicEdenCollection {
  symbol: string;
  name: string;
  description: string;
  image: string;
  floorPrice: number;
  volumeAll: number;
  hasCNFTs: boolean;
}

const formatSOL = (lamports: number) => {
  return (lamports / 1e9).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatLargeNumber = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString();
};

const processImageUrl = (url: string): string => {
  if (!url) return Placeholder.nft();

  try {
    // Remove query parameters and get clean URL
    const cleanUrl = url.split('?')[0];

    // Handle IPFS URLs
    if (cleanUrl.includes('ipfs://')) {
      const hash = cleanUrl.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }

    // Handle various IPFS gateway URLs
    const ipfsMatch = cleanUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch || cleanUrl.includes('nftstorage.link')) {
      let cid = ipfsMatch ? ipfsMatch[1] : cleanUrl.split('/').pop();
      if (cid) {
        // Remove file extension if present
        cid = cid.split('.')[0];
        return `https://ipfs.io/ipfs/${cid}`;
      }
    }

    // Handle Arweave URLs
    if (cleanUrl.includes('arweave.net')) {
      // Keep the original Arweave URL but ensure it's HTTPS
      return cleanUrl.replace('http://', 'https://');
    }

    return url;
  } catch (error) {
    console.warn('Error processing image URL:', error);
    return Placeholder.nft();
  }
};

// Components
const CollectionStats = ({ stats }: { stats: MagicEdenStats }) => {
  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Collection Stats</h3>
        <a
          href={`https://magiceden.io/marketplace/${stats.symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Floor Price
          </div>
          <div className="mt-1 text-xl font-semibold">
            ◎ {formatSOL(stats.floorPrice)}
          </div>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Listed
          </div>
          <div className="mt-1 text-xl font-semibold">
            {stats.listedCount.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Avg Price (24h)
          </div>
          <div className="mt-1 text-xl font-semibold">
            ◎ {formatSOL(stats.avgPrice24hr ?? 0)}
          </div>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm font-medium text-muted-foreground">
            Total Volume
          </div>
          <div className="mt-1 text-xl font-semibold">
            ◎ {formatLargeNumber(stats.volumeAll ?? 0)}
          </div>
        </div>
      </div>
    </Card>
  );
};

const ActivityList = ({ activities }: { activities: MagicEdenActivity[] }) => {
  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <h3 className="text-lg font-medium">Recent Activities</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg bg-background/50 p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activity.type === 'bid'
                      ? 'secondary'
                      : activity.type === 'list'
                        ? 'outline'
                        : activity.type === 'delist'
                          ? 'destructive'
                          : 'default'
                  }
                >
                  {activity.type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  via {activity.source}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">◎ {activity.price}</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {formatTimestamp(activity.blockTime)}
                </span>
              </div>
            </div>
            <a
              href={`https://solscan.io/tx/${activity.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
};

const PopularCollections = ({
  collections,
}: {
  collections: MagicEdenCollection[];
}) => {
  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <h3 className="text-lg font-medium">Popular Collections</h3>
      <div className="space-y-3">
        {collections.map((collection, index) => (
          <a
            key={index}
            href={`https://magiceden.io/marketplace/${collection.symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-4 rounded-lg bg-background/50 p-3 hover:bg-background/80">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={processImageUrl(collection.image)}
                  alt={collection.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = Placeholder.nft();
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="truncate text-sm font-medium">
                    {collection.name}
                  </h4>
                  <Badge variant="outline" className="ml-2">
                    #{index + 1}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Floor: ◎ {formatSOL(collection.floorPrice)}</span>
                  <span>
                    Volume: ◎ {formatLargeNumber(collection.volumeAll)}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};

// Tools Export
export const magicEdenTools = {
  getCollectionStats: {
    displayName: '📊 Collection Stats',
    description:
      'Get detailed statistics for a Magic Eden collection including floor price, listed count, average price, and total volume.',
    parameters: z.object({
      symbol: z.string().describe('The collection symbol/slug to check'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
      try {
        const response = await fetch(
          `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch collection stats: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as MagicEdenStats;
        return {
          suppressFollowUp: true,
          data,
        };
      } catch (error) {
        throw new Error(
          `Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: MagicEdenStats }).data;
      return <CollectionStats stats={result} />;
    },
  },

  getCollectionActivities: {
    displayName: '📈 Collection Activities',
    description:
      'Get recent trading activities for a Magic Eden collection including bids, listings, and sales.',
    parameters: z.object({
      symbol: z.string().describe('The collection symbol/slug to check'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
      try {
        const response = await fetch(
          `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/activities`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch collection activities: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as MagicEdenActivity[];
        // Only return the most recent 10 activities
        return {
          suppressFollowUp: true,
          data: data.slice(0, 10),
        };
      } catch (error) {
        throw new Error(
          `Failed to get collection activities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: MagicEdenActivity[] }).data;
      return <ActivityList activities={result} />;
    },
  },

  getPopularCollections: {
    displayName: '🔥 Popular Collections',
    description:
      'Get the most popular collections on Magic Eden based on volume and activity.',
    parameters: z.object({
      timeRange: z
        .enum(['1h', '1d', '7d', '30d'])
        .describe('Time range for popularity metrics'),
    }),
    execute: async ({
      timeRange,
      limit,
    }: {
      timeRange: string;
      limit: number;
    }) => {
      try {
        const response = await fetch(
          `https://api-mainnet.magiceden.dev/v2/marketplace/popular_collections?time_range=${timeRange}&limit=50`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch popular collections: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as MagicEdenCollection[];

        // Remove duplicate collections (same symbol)
        const uniqueCollections = data.filter(
          (collection, index, self) =>
            index === self.findIndex((c) => c.symbol === collection.symbol),
        );

        return {
          suppressFollowUp: true,
          data: uniqueCollections.slice(0, limit),
        };
      } catch (error) {
        throw new Error(
          `Failed to get popular collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: MagicEdenCollection[] }).data;
      return <PopularCollections collections={result} />;
    },
  },
};
