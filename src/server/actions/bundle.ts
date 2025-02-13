'use server';

import { cache } from 'react';

import { actionClient } from '@/lib/safe-action';
import {
  type BundleAnalysisResponse,
  BundleDetectionSchema,
} from '@/types/bundle';

// Cache the fetch for 5 minutes
export const analyzeMintBundles = cache(
  actionClient.schema(BundleDetectionSchema).action(
    async ({
      parsedInput: { mintAddress },
    }): Promise<{
      success: boolean;
      data?: BundleAnalysisResponse;
      error?: string;
    }> => {
      try {
        const response = await fetch(
          `https://trench.bot/api/bundle/bundle_advanced/${mintAddress}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch bundle analysis');
        }

        const analysis: BundleAnalysisResponse = await response.json();

        return { success: true, data: analysis };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to analyze bundles',
        };
      }
    },
  ),
);
