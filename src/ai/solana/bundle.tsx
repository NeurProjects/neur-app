import { z } from 'zod';



import { analyzeMintBundles } from '@/server/actions/bundle';
import { type MintBundleAnalysis } from '@/types/bundle';


export const bundleTools = {
  analyzeBundles: {
    displayName: '🔍 Analyze Mint Bundles',
    isCollapsible: true,
    description:
      'Analyze potential bundles and snipers for a given mint address, including statistics about supply percentage, estimated SOL spent, and current holdings.',
    parameters: z.object({
      mintAddress: z.string().describe("The token's mint address"),
    }),
    execute: async ({ mintAddress }: { mintAddress: string }) => {
      try {
        const analysis = await analyzeMintBundles({
          mintAddress,
          minSlotTransactions: 2,
        });

        if (!analysis) {
          return {
            success: false,
            error: 'Failed to analyze bundles',
          };
        }

        return {
          success: true,
          data: analysis,
        };
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
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: MintBundleAnalysis;
        error?: string;
      };

      if (!typedResult.success) {
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

      if (!typedResult.data) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                No bundle data available
              </p>
            </div>
          </div>
        );
      }

      const analysis = typedResult.data;

      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-card p-4">
            <h3 className="mb-2 text-sm font-medium">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Bundles</p>
                <p className="font-medium">{analysis?.totalBundles || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total SOL Volume</p>
                <p className="font-medium">
                  {((analysis?.totalSolSpent || 0) + Math.abs(analysis?.totalProfitLoss || 0)).toFixed(2)} SOL
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Unique Wallets</p>
                <p className="font-medium">{analysis?.totalUniqueWallets || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Supply</p>
                <p className="font-medium">
                  {(analysis?.totalSupply || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Bought</p>
                <p className="font-medium text-green-500">
                  {(analysis.totalBought || 0).toLocaleString()} tokens
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Sold</p>
                <p className="font-medium text-red-500">
                  {(analysis.totalSold || 0).toLocaleString()} tokens
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net P/L</p>
                <p className={`font-medium ${(analysis.totalProfitLoss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(analysis.totalProfitLoss || 0).toFixed(2)} SOL
                </p>
              </div>
            </div>
          </div>

          <br />

          <div className="rounded-lg bg-destructive/10 p-4">
            <h3 className="mb-2 text-sm font-medium">⚠️ Suspicious Activity</h3>
            <div className="space-y-3">
              {analysis?.suspiciousPatterns?.snipers?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-destructive">
                    🎯 Potential Snipers (
                    {analysis?.suspiciousPatterns?.snipers?.length})
                  </p>
                  <div className="grid gap-2">
                    {analysis?.suspiciousPatterns?.snipers?.map((sniper) => (
                      <div
                        key={sniper?.bundleAddress}
                        className="rounded-lg bg-destructive/5 p-3"
                      >
                        <p className="text-xs font-medium">
                          <code>{sniper?.bundleAddress?.slice(0, 8)}...</code>
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          <p>Supply: {sniper?.supplyPercentage?.toFixed(2)}%</p>
                          <p>
                            Velocity: {sniper?.purchaseVelocity?.toFixed(0)}{' '}
                            tokens/hour
                          </p>
                          <p>
                            Time Window:{' '}
                            {(
                              (sniper?.lastPurchaseTime -
                                sniper?.firstPurchaseTime) /
                              1000
                            ).toFixed(1)}
                            s
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis?.suspiciousPatterns?.rapidAccumulation?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-orange-500">
                    ⚡ Rapid Accumulation (
                    {analysis?.suspiciousPatterns?.rapidAccumulation?.length})
                  </p>
                  <div className="grid gap-2">
                    {analysis?.suspiciousPatterns?.rapidAccumulation?.map(
                      (bundle) => (
                        <div
                          key={bundle?.bundleAddress}
                          className="rounded-lg bg-orange-500/5 p-3"
                        >
                          <p className="text-xs font-medium">
                            <code>{bundle?.bundleAddress?.slice(0, 8)}...</code>
                          </p>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <p>Supply: {bundle?.supplyPercentage?.toFixed(2)}%</p>
                            <p>
                              Time:{' '}
                              {(
                                (bundle?.lastPurchaseTime -
                                  bundle?.firstPurchaseTime) /
                                1000
                              ).toFixed(1)}
                              s
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {analysis?.suspiciousPatterns?.coordinatedBuying?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-500">
                    🤝 Coordinated Buying (
                    {analysis?.suspiciousPatterns?.coordinatedBuying?.length})
                  </p>
                  <div className="grid gap-2">
                    {analysis?.suspiciousPatterns?.coordinatedBuying?.map(
                      (bundle) => (
                        <div
                          key={bundle?.bundleAddress}
                          className="rounded-lg bg-blue-500/5 p-3"
                        >
                          <p className="text-xs font-medium">
                            <code>{bundle?.bundleAddress?.slice(0, 8)}...</code>
                          </p>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <p>Transactions: {bundle?.transactions?.length}</p>
                            <p>Supply: {bundle?.supplyPercentage?.toFixed(2)}%</p>
                            <p>
                              Time Window:{' '}
                              {(
                                (bundle?.lastPurchaseTime -
                                  bundle?.firstPurchaseTime) /
                                1000
                              ).toFixed(1)}
                              s
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {analysis?.largestBundle && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Largest Bundle</h3>
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    🏆 Bundle{' '}
                    <code className="text-xs">
                      {analysis?.largestBundle?.bundleAddress?.slice(0, 8)}...
                    </code>
                  </p>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>Supply: {analysis?.largestBundle?.supplyPercentage?.toFixed(2)}%</p>
                    <p>Bought: {analysis?.largestBundle?.totalBought?.toLocaleString()} tokens</p>
                    <p>Sold: {analysis?.largestBundle?.totalSold?.toLocaleString()} tokens</p>
                    <p>Current Holdings: {analysis?.largestBundle?.currentHoldings?.toLocaleString()}</p>
                    <p>SOL Spent: {analysis?.largestBundle?.solSpent?.toFixed(2)} SOL</p>
                    <p>SOL from Sales: {analysis?.largestBundle?.sellAmount?.toFixed(2)} SOL</p>
                    <p className={analysis?.largestBundle?.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                      P/L: {analysis?.largestBundle?.profitLoss?.toFixed(2)} SOL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">All Potential Bundles</h3>
            <div className="grid gap-2">
              {analysis?.bundles?.map((bundle) => (
                <div
                  key={bundle.bundleAddress}
                  className="rounded-lg bg-muted p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Bundle{' '}
                      <code className="text-xs">
                        {bundle.bundleAddress.slice(0, 8)}...
                      </code>
                    </p>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>Supply: {(bundle.supplyPercentage || 0).toFixed(2)}%</p>
                      <div className="flex justify-between">
                        <span>Bought: {(bundle.totalBought || 0).toLocaleString()}</span>
                        <span>Sold: {(bundle.totalSold || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SOL Spent: {(bundle.solSpent || 0).toFixed(2)}</span>
                        <span>SOL from Sales: {(bundle.sellAmount || 0).toFixed(2)}</span>
                      </div>
                      <p>Current Holdings: {(bundle.currentHoldings || 0).toLocaleString()}</p>
                      <p className={`${(bundle.profitLoss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        P/L: {(bundle.profitLoss || 0).toFixed(2)} SOL
                      </p>
                      {bundle.isPumpfunBundle && (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                          Pumpfun Bundle
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
  },
};