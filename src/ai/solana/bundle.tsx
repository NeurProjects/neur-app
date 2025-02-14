import Link from 'next/link';

import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { getMintAccountInfo } from '@/lib/solana/helius';
import { formatNumber } from '@/lib/utils';
import { analyzeMintBundles } from '@/server/actions/bundle';
import { type BundleAnalysisResponse } from '@/types/bundle';

import { BundleList } from '../../components/bundle-list';

function mapTokenDecimals(
  data: BundleAnalysisResponse,
  decimals: number,
): void {
  const tokenKeys = [
    'total_tokens',
    'tokens',
    'total_tokens_bundled',
    'distributed_amount',
    'holding_amount',
    'total_holding_amount',
  ];

  function adjustValue(value: any): any {
    return typeof value === 'number' ? value / Math.pow(10, decimals) : value;
  }

  function traverse(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key of Object.keys(obj)) {
      if (tokenKeys.includes(key) && typeof obj[key] === 'number') {
        obj[key] = adjustValue(obj[key]);
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }

  traverse(data);
}

export const bundleTools = {
  analyzeBundles: {
    displayName: '🔍 Analyze Mint Bundles',
    isCollapsible: true,
    isExpandedByDefault: true,
    description:
      'Analyze potential bundles and snipers for a given mint address.',
    parameters: z.object({
      mintAddress: z.string().describe("The token's mint address"),
    }),
    execute: async ({ mintAddress }: { mintAddress: string }) => {
      try {
        const analysis = await analyzeMintBundles({ mintAddress });

        if (!analysis?.data) {
          return {
            success: false,
            error: 'Unable to fetch data. Please make sure it is a pump.fun launch.',
          };
        }

        // Get mint info for calculating decimals
        const accountInfo = await getMintAccountInfo(mintAddress);

        // Recalculate token fields using decimals from mint info
        if (analysis.data.data) {
          mapTokenDecimals(analysis.data.data, accountInfo.decimals);
        }

        return {
          success: true,
          data: {
            mintAddress,
            analysis: analysis.data.data,
          },
          suppressFollowUp: true,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Unable to fetch data. Please make sure it is a pump.fun launch.',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: {
          analysis: BundleAnalysisResponse;
          mintAddress: string;
        };
        error?: string;
      };

      if (!typedResult.success || !typedResult.data?.analysis) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted p-4">
            <div className="flex items-center gap-3">
              <p className="text-md text-center">
                {'Unable to fetch data. Please make sure it is a pump.fun token.'}
              </p>
            </div>
          </div>
        );
      }

      const { analysis, mintAddress } = typedResult.data;

      const initialSummary = [
        {
          name: 'Ticker',
          value: analysis?.ticker?.toUpperCase() || 'N/A',
        },
        {
          name: 'Total Bundles',
          value: analysis?.total_bundles ?? 'N/A',
        },
        {
          name: 'Total SOL Spent',
          value: analysis?.total_percentage_bundled ? `${analysis.total_percentage_bundled.toFixed(2)}%` : 'N/A',
        },
        {
          name: 'Bundled Total',
          value: analysis?.total_percentage_bundled ? `${analysis.total_percentage_bundled.toFixed(2)}%` : 'N/A',
        },
        {
          name: 'Held Percentage',
          value: analysis?.total_holding_percentage ? `${analysis.total_holding_percentage.toFixed(2)}%` : 'N/A',
        },
        {
          name: 'Held Tokens',
          value: analysis?.total_holding_amount ? formatNumber(analysis.total_holding_amount) : 'N/A',
        },
        {
          name: 'Bonded',
          value: analysis.bonded ? 'Yes' : 'No',
        },
      ];

      return (
        <div className="space-y-4">
          {/* Initial Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="mx-auto grid grid-cols-2 gap-4 text-sm">
              {initialSummary.map(({ name, value }, index) => (
                <div key={index}>
                  <p className="text-muted-foreground">{name}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
              <div key={`${mintAddress}-source`}>
                <p className="text-muted-foreground">Source</p>
                <Link
                  href={`https://trench.bot/bundles/${mintAddress}?all=true`}
                  target="_blank"
                  className="inline-flex items-center"
                >
                  TrenchRadar
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bundle Details */}
          {analysis?.bundles && Object.keys(analysis.bundles).length > 0 ? (
            <BundleList bundles={analysis.bundles} />
          ) : (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">No bundles detected</p>
            </div>
          )}
        </div>
      );
    },
  },
};
