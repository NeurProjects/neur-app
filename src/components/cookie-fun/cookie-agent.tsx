'use client';

import { ArrowDownIcon, ArrowUpIcon, TwitterIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatNumber } from '@/lib/utils';
import { AgentData } from '@/server/actions/cookie';

interface CookieAgentProps {
  agentData: AgentData;
}

function DeltaIndicator({ value }: { value: number }) {
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}
    >
      <Icon className="h-4 w-4" />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function CookieAgent({ agentData }: CookieAgentProps) {
  const {
    agentName,
    contracts,
    twitterUsernames,
    mindshare,
    mindshareDeltaPercent,
    marketCap,
    marketCapDeltaPercent,
    price,
    priceDeltaPercent,
    liquidity,
    volume24Hours,
    volume24HoursDeltaPercent,
    holdersCount,
    holdersCountDeltaPercent,
    averageImpressionsCount,
    averageImpressionsCountDeltaPercent,
    averageEngagementsCount,
    averageEngagementsCountDeltaPercent,
    followersCount,
    smartFollowersCount,
    topTweets,
  } = agentData;
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{agentName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {/* Financial Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Price</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">${price.toFixed(4)}</span>
              <DeltaIndicator value={priceDeltaPercent} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ${formatNumber(marketCap)}
              </span>
              <DeltaIndicator value={marketCapDeltaPercent} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">24h Volume</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ${formatNumber(volume24Hours)}
              </span>
              <DeltaIndicator value={volume24HoursDeltaPercent} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Social Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-4 font-semibold">Social Presence</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Twitter Handles
                </span>
                <div className="flex flex-wrap gap-2">
                  {twitterUsernames.map((username) => (
                    <Badge
                      key={username}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <TwitterIcon className="h-3 w-3" />
                      <a
                        href={`https://twitter.com/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        @{username}
                      </a>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Followers</span>
                <span className="font-medium">
                  {formatNumber(followersCount, true)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Smart Followers
                </span>
                <span className="font-medium">
                  {formatNumber(smartFollowersCount, true)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Engagement Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg. Impressions
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatNumber(averageImpressionsCount)}
                  </span>
                  <DeltaIndicator value={averageImpressionsCountDeltaPercent} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg. Engagements
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatNumber(averageEngagementsCount)}
                  </span>
                  <DeltaIndicator value={averageEngagementsCountDeltaPercent} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Contracts */}
        <div>
          <h3 className="mb-4 font-semibold">Contracts</h3>
          <div className="space-y-2">
            {contracts.map((contract) => (
              <div key={contract.chain} className="flex items-center gap-2">
                <Badge variant="outline">
                  {contract.chain === -2
                    ? 'Solana'
                    : `Chain ID ${contract.chain}`}
                </Badge>
                <code className="text-sm">{contract.contractAddress}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tweet */}
        {topTweets.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="mb-4 font-semibold">Top Tweet</h3>
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={topTweets[0].tweetAuthorProfileImageUrl} />
                  <AvatarFallback>AU</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium">
                    {topTweets[0].tweetAuthorDisplayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(topTweets[0].impressionsCount, true)}{' '}
                    impressions
                  </p>
                  <a
                    href={topTweets[0].tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    View Tweet
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
