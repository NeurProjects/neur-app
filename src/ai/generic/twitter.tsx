import { z } from 'zod';

import { PaginatedTweetCard } from '@/components/message/tweet/tweet-card';
import {
  Tweet,
  getTweetsByTag,
  getTweetsFromAccount,
} from '@/server/actions/twitter';

export const twitterTools = {
  searchTwitterByTag: {
    displayName: '𝕏 Find Tweets',
    description: 'Find tweets based on a specific tag',
    parameters: z.object({
      tag: z
        .string()
        .describe(
          'The cashtag to saerch for. Must start with a $ such as $NEUR',
        ),
      hoursAgo: z
        .number()
        .min(12)
        .max(72)
        .default(24)
        .describe(
          'The number of hours ago to search. Default is 24, max is 72',
        ),
    }),
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['TWITTER_ENDPOINT_URL'],
    execute: async ({ tag, hoursAgo }: { tag: string; hoursAgo: number }) => {
      try {
        const response = await getTweetsByTag(tag, hoursAgo);

        if (!response.success) {
          throw new Error(`Failed to get tweets`);
        }

        return {
          success: true,
          result: {
            tweets: response.result,
          },
          noFollowUp: true,
        };
      } catch (error) {
        throw new Error(
          `Failed to read web page: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = raw as { result: { tweets: Tweet[] } };
      return <PaginatedTweetCard tweets={result.result.tweets} />;
    },
  },
  searchTwitterFromAccount: {
    displayName: '𝕏 Find Tweets',
    description: 'Find tweets based on a specific tag',
    parameters: z.object({
      account: z
        .string()
        .describe('The account to filter tweets by. Example: @neur_sh'),
      hoursAgo: z
        .number()
        .min(12)
        .max(72)
        .default(24)
        .describe(
          'The number of hours ago to search. Default is 24, max is 72',
        ),
      contentFilter: z
        .string()
        .optional()
        .describe('A string to filter tweets by. Example: $NEUR'),
    }),
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['TWITTER_ENDPOINT_URL'],
    execute: async ({
      account,
      hoursAgo,
      contentFilter,
    }: {
      account: string;
      hoursAgo: number;
      contentFilter?: string;
    }) => {
      try {
        const response = await getTweetsFromAccount(
          account,
          hoursAgo,
          contentFilter,
        );

        if (!response.success) {
          throw new Error(`Failed to get tweets`);
        }

        return {
          success: true,
          result: {
            tweets: response.result,
          },
          noFollowUp: true,
        };
      } catch (error) {
        throw new Error(
          `Failed to read web page: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = raw as { result: { tweets: Tweet[] } };
      return <PaginatedTweetCard tweets={result.result.tweets} />;
    },
  },
};
