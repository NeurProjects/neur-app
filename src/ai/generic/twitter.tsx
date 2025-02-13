import { z } from 'zod';

import { PaginatedTweetCard } from '@/components/message/tweet/tweet-card';
import { Tweet, getTweetsByTag } from '@/server/actions/twitter';

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
    }),
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['TWITTER_ENDPOINT_URL'],
    execute: async ({ tag }: { tag: string }) => {
      try {
        const response = await getTweetsByTag(tag);

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
