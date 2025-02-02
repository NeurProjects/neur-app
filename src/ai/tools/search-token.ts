import { tool } from 'ai';
import { result } from 'lodash';
import { z } from 'zod';

import {
  getJupiterTokenPrice,
  searchJupiterTokens,
} from '@/server/actions/jupiter';

import { WrappedToolProps } from '.';

interface TokenBalanceProps extends WrappedToolProps {
  walletAddress: string;
}

export interface JupiterToken {
  mint: string;
  name: string;
  symbol: string;
  logoURI: string | null;
}

export const searchTokenByName = () => {
  const metadata = {
    description: 'Search for a token address by its name or symbol.',
    parameters: z.object({
      token: z.string().describe('The token symbol or name'),
    }),
  };
  const buildTool = ({ abortData }: WrappedToolProps) =>
    tool({
      ...metadata,
      execute: async ({
        token,
      }): Promise<{
        success: boolean;
        result: JupiterToken;
      }> => {
        const tokens = await searchJupiterTokens(token);
        const searchQuery = token.toLowerCase();

        // Search and rank tokens
        const results = tokens
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

        // if (abortData?.abortController) {
        //   abortData.aborted = true;
        //   abortData?.abortController.abort();
        // }

        return {
          success: true,
          result: {
            symbol: results[0].symbol,
            mint: results[0].address,
            name: results[0].name,
            logoURI: results[0].logoURI,
          },
        };
      },
    });

  return {
    metadata,
    buildTool,
  };
};

export const searchTokenByMint = () =>
  tool({
    description: 'Search for a token address by its name or symbol.',
    parameters: z.object({
      tokenMint: z
        .string()
        .describe(
          'Mint address for the token. Example So11111111111111111111111111111111111111112',
        ),
    }),
    execute: async ({
      tokenMint,
    }): Promise<{
      success: boolean;
      result: JupiterToken;
      noFollowUp: boolean;
    }> => {
      const tokens = await searchJupiterTokens(tokenMint);
      const searchQuery = tokenMint.toLowerCase();

      // Search and rank tokens
      const results = tokens
        .sort((a, b) => {
          // Exact matches first
          const aExact = a.address.toLowerCase() === searchQuery;
          const bExact = b.address.toLowerCase() === searchQuery;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return 0;
        })
        .slice(0, 1);

      return {
        success: true,
        result: {
          symbol: results[0].symbol,
          mint: results[0].address,
          name: results[0].name,
          logoURI: results[0].logoURI,
        },
        noFollowUp: true,
      };
    },
  });

export const getSwapRatio = () =>
  tool({
    description: 'Search for a token address by its name or symbol.',
    parameters: z.object({
      inputMint: z
        .string()
        .describe(
          'Mint address for the input token. Example So11111111111111111111111111111111111111112',
        ),
      outputMint: z
        .string()
        .describe(
          'Mint address for the output token. Example So11111111111111111111111111111111111111112',
        ),
    }),
    execute: async ({ inputMint, outputMint }) => {
      const inputPrice = await getJupiterTokenPrice(inputMint);
      const outputPrice = await getJupiterTokenPrice(outputMint);
      const price =
        inputPrice && outputPrice
          ? parseFloat(inputPrice.price) / parseFloat(outputPrice.price)
          : null;
      return {
        success: price !== null,
        result: price,
      };
    },
  });

export const getTokenBalance = ({
  extraData: { walletAddress },
}: WrappedToolProps) =>
  tool({
    description: 'Search for a token address by its name or symbol.',
    parameters: z.object({
      tokenMint: z.string().describe('The mint address of the token'),
    }),
    execute: async ({ tokenMint }) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (tokenMint === 'So11111111111111111111111111111111111111112') {
        return {
          mint: 'So11111111111111111111111111111111111111112',
          balance: 4.127,
        };
      }

      return {
        mint: 'EPjFWdd5HWceBUeFiNf6ifEeMfmP9WpKU65y9Cdqj4rb',
        balance: 981,
      };
    },
  });
