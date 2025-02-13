import { z } from 'zod';

import CookieAgent from '@/components/cookie-fun/cookie-agent';
import CookieTweet from '@/components/cookie-fun/cookie-tweet';
import {
  AgentData,
  TweetData,
  getAgentByContractAddress,
  getAllAgents,
  searchTweets,
} from '@/server/actions/cookie';

export const cookietools = {
  getAgentDetailsFromAddress: {
    displayName: '🤖 Agent Info',
    isCollapsible: true,
    isExpandedByDefault: true,
    description: 'Get details on a Solana AI agent by contract address',
    parameters: z.object({
      contractAddress: z
        .string()
        .describe('The agent contract address to search for'),
    }),
    requiredEnvVars: ['COOKIE_FUN_API_KEY'],
    execute: async ({ contractAddress }: { contractAddress: string }) => {
      try {
        const agent = await getAgentByContractAddress({ contractAddress });

        if (!agent) {
          return {
            success: false,
            error: 'Agent not found',
          };
        }

        return {
          success: true,
          data: agent,
          suppressFollowUp: true,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to search agent',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: AgentData;
        error?: string;
      };

      if (!typedResult.success || !typedResult.data) {
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

      return <CookieAgent agentData={typedResult.data} />;
    },
  },
  getAgentFromSearch: {
    displayName: '🤖 Agent Info',
    isCollapsible: true,
    isExpandedByDefault: true,
    description: 'Get details on a Solana AI agent by filtering by name',
    parameters: z.object({
      agentName: z
        .string()
        .describe('The agent contract address to search for'),
    }),
    requiredEnvVars: ['COOKIE_FUN_API_KEY'],
    execute: async ({ agentName }: { agentName: string }) => {
      try {
        const agents = await getAllAgents();

        if (!agents.length) {
          return {
            success: false,
            error: 'Agent not found',
          };
        }

        // Standardize the agent name
        const normalizeString = (str: string): string => {
          return str
            .toLowerCase() // Convert to lowercase
            .normalize('NFKD') // Normalize Unicode (handles accents)
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters (keep alphanumeric & spaces)
            .trim(); // Trim extra spaces
        };
        const normalizedAgentName = normalizeString(agentName);

        console.log(`Searching for agent: ${normalizedAgentName}`);

        const agent = agents.find(
          (agent) => normalizeString(agent.agentName) === normalizedAgentName,
        );

        if (!agent) {
          return {
            success: false,
            error: 'Agent not found',
          };
        }

        return {
          success: true,
          data: agent,
          suppressFollowUp: true,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to search agent',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: AgentData;
        error?: string;
      };

      if (!typedResult.success || !typedResult.data) {
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

      return <CookieAgent agentData={typedResult.data} />;
    },
  },
  getTrendingAgents: {
    displayName: '🤖 Trending Agents',
    isCollapsible: true,
    isExpandedByDefault: true,
    description: 'Get details on a the top trending Solana AI agents',
    parameters: z.object({
      placeholder: z.string().optional(),
    }),
    requiredEnvVars: ['COOKIE_FUN_API_KEY'],
    execute: async () => {
      try {
        const agents = await getAllAgents(5, true); // Get the top 5 agents

        if (!agents.length) {
          return {
            success: false,
            error: 'Agent not found',
          };
        }

        console.log(`Found ${agents.length} trending agents`);

        return {
          success: true,
          data: agents,
          suppressFollowUp: true,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get trending agents',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: AgentData[];
        error?: string;
      };

      if (!typedResult.success || !typedResult.data) {
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

      return (
        <div className="space-y-2">
          {typedResult.data.map((agent) => (
            <CookieAgent key={agent.agentName} agentData={agent} />
          ))}
        </div>
      );
    },
  },
  // searchTweets: {
  //   displayName: '🤖 X Search',
  //   isCollapsible: true,
  //   isExpandedByDefault: true,
  //   description: 'Searches for recent tweets about a given topic',
  //   parameters: z.object({
  //     searchQuery: z
  //       .string()
  //       .describe('The search query to use, for input into Elasticsearch'),
  //     fromDate: z
  //       .string()
  //       .optional()
  //       .describe('The start date for the search query, in format YYYY-MM-DD'),
  //     toDate: z
  //       .string()
  //       .optional()
  //       .describe('The start date for the search query, in format YYYY-MM-DD'),
  //     quantity: z
  //       .number()
  //       .optional()
  //       .default(3)
  //       .describe('The number of tweets to return'),
  //   }),
  //   requiredEnvVars: ['COOKIE_FUN_API_KEY'],
  //   execute: async ({
  //     searchQuery,
  //     fromDate,
  //     toDate,
  //     quantity,
  //   }: {
  //     searchQuery: string;
  //     fromDate?: string;
  //     toDate?: string;
  //     quantity?: number;
  //   }) => {
  //     try {
  //       const tweets = await searchTweets({ searchQuery, fromDate, toDate });

  //       if (!tweets.length) {
  //         return {
  //           success: false,
  //           error: 'Tweets not found',
  //         };
  //       }

  //       return {
  //         success: true,
  //         data: tweets.slice(0, quantity || 3),
  //         suppressFollowUp: true,
  //       };
  //     } catch (error) {
  //       return {
  //         success: false,
  //         error:
  //           error instanceof Error
  //             ? error.message
  //             : 'Failed to get trending Tweets',
  //       };
  //     }
  //   },
  //   render: (result: unknown) => {
  //     const typedResult = result as {
  //       success: boolean;
  //       data?: TweetData[];
  //       error?: string;
  //     };

  //     if (!typedResult.success || !typedResult.data) {
  //       return (
  //         <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
  //           <div className="flex items-center gap-3">
  //             <p className="text-sm text-destructive">
  //               Error: {typedResult.error}
  //             </p>
  //           </div>
  //         </div>
  //       );
  //     }

  //     return (
  //       <div className="space-y-2">
  //         {typedResult.data.map((tweet, index) => (
  //           <CookieTweet key={index} tweetData={tweet} />
  //         ))}
  //       </div>
  //     );
  //   },
  // },
};
