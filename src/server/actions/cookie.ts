import { cache } from 'react';

import { z } from 'zod';

export interface AgentData {
  agentName: string;
  contracts: {
    chain: number;
    contractAddress: string;
  }[];
  twitterUsernames: string[];
  mindshare: number;
  mindshareDeltaPercent: number;
  marketCap: number;
  marketCapDeltaPercent: number;
  price: number;
  priceDeltaPercent: number;
  liquidity: number;
  volume24Hours: number;
  volume24HoursDeltaPercent: number;
  holdersCount: number;
  holdersCountDeltaPercent: number;
  averageImpressionsCount: number;
  averageImpressionsCountDeltaPercent: number;
  averageEngagementsCount: number;
  averageEngagementsCountDeltaPercent: number;
  followersCount: number;
  smartFollowersCount: number;
  topTweets: {
    tweetUrl: string;
    tweetAuthorProfileImageUrl: string;
    tweetAuthorDisplayName: string;
    smartEngagementPoints: number;
    impressionsCount: number;
  }[];
}

export const agentDataSchema = z.object({
  agentName: z.string(),
  contracts: z.array(
    z.object({
      chain: z.number(),
      contractAddress: z.string(),
    }),
  ),
  twitterUsernames: z.array(z.string()),
  mindshare: z.number(),
  mindshareDeltaPercent: z.number(),
  marketCap: z.number(),
  marketCapDeltaPercent: z.number(),
  price: z.number(),
  priceDeltaPercent: z.number(),
  liquidity: z.number(),
  volume24Hours: z.number(),
  volume24HoursDeltaPercent: z.number(),
  holdersCount: z.number(),
  holdersCountDeltaPercent: z.number(),
  averageImpressionsCount: z.number(),
  averageImpressionsCountDeltaPercent: z.number(),
  averageEngagementsCount: z.number(),
  averageEngagementsCountDeltaPercent: z.number(),
  followersCount: z.number(),
  smartFollowersCount: z.number(),
  topTweets: z.array(
    z.object({
      tweetUrl: z.string(),
      tweetAuthorProfileImageUrl: z.string(),
      tweetAuthorDisplayName: z.string(),
      smartEngagementPoints: z.number(),
      impressionsCount: z.number(),
    }),
  ),
});

export enum CookieInterval {
  D3 = '_3Days',
  D7 = '_7Days',
}

const cookieAgentResponseSchema = z.object({
  ok: agentDataSchema,
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

const cookieAgentsResponseSchema = z.object({
  ok: z.object({
    data: z.array(agentDataSchema),
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
  }),
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

export interface TweetData {
  authorUsername: string;
  createdAt: string; // YYYY-MM-DDTHH:mm:ss format
  engagementsCount: number;
  impressionsCount: number;
  isQuote: boolean;
  isReply: boolean;
  likesCount: number;
  quotesCount: number;
  repliesCount: number;
  retweetsCount: number;
  smartEngagementPoints: number;
  text: string;
  matchingScore: number;
}

export const tweetDataSchema = z.object({
  authorUsername: z.string(),
  createdAt: z.string(),
  engagementsCount: z.number(),
  impressionsCount: z.number(),
  isQuote: z.boolean(),
  isReply: z.boolean(),
  likesCount: z.number(),
  quotesCount: z.number(),
  repliesCount: z.number(),
  retweetsCount: z.number(),
  smartEngagementPoints: z.number(),
  text: z.string(),
  matchingScore: z.number(),
});

const cookieTweetsResponseSchema = z.object({
  ok: z.array(tweetDataSchema),
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

const BASE_URL = 'https://api.cookie.fun';

// Cache the fetch for 5 minutes
export const getAgentByContractAddress = cache(
  async ({
    contractAddress,
  }: {
    contractAddress: string;
  }): Promise<AgentData | undefined> => {
    try {
      const queryParams = new URLSearchParams({
        interval: CookieInterval.D7,
      }).toString();

      const response = await fetch(
        `${BASE_URL}/v2/agents/contractAddress/${contractAddress}?` +
          queryParams,
        {
          next: {
            revalidate: 300, // Cache for 5 minutes
          },
          headers: {
            'X-API-KEY': process.env.COOKIE_FUN_API_KEY || '',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Cookie agent');
      }

      const data = await response.json();

      const parsed = cookieAgentResponseSchema.parse(data);

      // Only return the fields we need
      return parsed.ok;
    } catch (error) {
      console.error('Error fetching Cookie agent:', error);
      return undefined;
    }
  },
);

export const getAllAgents = cache(
  async (
    pageSize: number = 25,
    onePage: boolean = false,
  ): Promise<AgentData[]> => {
    console.log(
      `Fetching all Cookie agents with pageSize=${pageSize}, onePage=${onePage}`,
    );
    try {
      const maxPages = 5; // Limit to 5 pages of data, tune as needed
      let allAgents: AgentData[] = [];
      let page = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        const queryParams = new URLSearchParams({
          interval: CookieInterval.D7,
          page: page.toString(),
          pageSize: pageSize.toString(),
        }).toString();

        const response = await fetch(
          `${BASE_URL}/v2/agents/agentsPaged?${queryParams}`,
          {
            next: {
              revalidate: 300, // Cache for 5 minutes
            },
            headers: {
              'X-API-KEY': process.env.COOKIE_FUN_API_KEY || '',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch page ${page} of Cookie agents`);
        }

        const data = await response.json();
        const parsed = cookieAgentsResponseSchema.parse(data);

        allAgents = allAgents.concat(parsed.ok.data);

        // If onePage is true or we are passed maxPages, stop fetching
        if (onePage || page >= maxPages) {
          break;
        }

        // Stop when there's no more data
        if (parsed.ok.data.length === 0) {
          hasMoreData = false;
        } else {
          page += 1;
        }
      }

      return allAgents;
    } catch (error) {
      console.error('Error fetching paginated Cookie agents:', error);
      return [];
    }
  },
);

export const searchTweets = cache(
  async ({
    searchQuery,
    fromDate,
    toDate,
  }: {
    searchQuery: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<TweetData[]> => {
    try {
      // Default to 7 days ago if no fromDate is provided
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const fromDateDefault = sevenDaysAgo.toISOString().split('T')[0];

      // Default to today if no toDate is provided
      const toDateDefault = new Date().toISOString().split('T')[0];

      const queryParams = new URLSearchParams({
        from: fromDate || fromDateDefault,
        to: toDate || toDateDefault,
      }).toString();

      const encodedSearchQuery = encodeURIComponent(searchQuery);

      const response = await fetch(
        `${BASE_URL}/v1/hackathon/search/${encodedSearchQuery}?` + queryParams,
        {
          next: {
            revalidate: 300, // Cache for 5 minutes
          },
          headers: {
            'X-API-KEY': process.env.COOKIE_FUN_API_KEY || '',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Cookie tweets');
      }

      const data = await response.json();

      const parsed = cookieTweetsResponseSchema.parse(data);

      // Only return the fields we need
      return parsed.ok;
    } catch (error) {
      console.error('Error fetching Cookie tweets:', error);
      return [];
    }
  },
);
