'use server';

import { cache } from 'react';



import { actionClient } from '@/lib/safe-action';
import { getMintAccountInfo, getTransactionHistory } from '@/lib/solana/helius';
import { Bundle, BundleDetectionSchema, BundleMetrics, BundleTransaction, MintBundleAnalysis } from '@/types/bundle';


// Group transactions by slot to identify bundles
async function identifyBundlesBySlot(
  mintAddress: string,
  minSlotTransactions: number = 2,
): Promise<MintBundleAnalysis | null> {
  try {
    // Get mint information
    const mintInfo = await getMintAccountInfo(mintAddress);
    const totalSupply = Number(mintInfo.supply) / 10 ** mintInfo.decimals;
    const tokenDecimals = mintInfo.decimals;

    // Limit transaction history to last 1000 transactions
    const transactions = await getTransactionHistory(mintAddress, 1000);

    // Track buys and sells by slot
    const slotGroups = new Map<number, BundleTransaction[]>();
    const buyerMetrics = new Map<string, BundleMetrics>();
    const buyersBySlot = new Map<number, Set<string>>();

    for (const tx of transactions) {
      const slot = tx.slot;
      const buyer = tx.buyer;

      if (!slotGroups.has(slot)) {
        slotGroups.set(slot, []);
        buyersBySlot.set(slot, new Set());
      }

      if (buyer) {
        // Same buyer making multiple transactions in the same slot
        if (!buyerMetrics.has(buyer)) {
          buyerMetrics.set(buyer, {
            buyQuantity: 0,
            sellQuantity: 0,
            buyAmount: 0,
            sellAmount: 0,
            currentHoldings: 0,
            profitLoss: 0,
          });
        }

        const metrics = buyerMetrics.get(buyer)!;
        // Accumulate metrics for this buyer
        if (tx.price > 0) {
          // Buy transaction
          metrics.buyQuantity += Math.abs(tx.quantity);
          metrics.buyAmount += Math.abs(tx.price);
          metrics.currentHoldings += Math.abs(tx.quantity);
        } else {
          metrics.sellQuantity += Math.abs(tx.quantity);
          metrics.sellAmount += Math.abs(tx.price);
          metrics.currentHoldings -= Math.abs(tx.quantity);
        }

        metrics.profitLoss = metrics.sellAmount - metrics.buyAmount;
        buyersBySlot.get(slot)?.add(buyer);
      }

      slotGroups.get(slot)?.push(tx);
    }

    // Convert slot groups to bundles with buy/sell metrics
    const bundles: Bundle[] = [];
    const MAX_BUNDLES = 10; // Limit number of bundles

    for (const [slot, txs] of slotGroups.entries()) {
      if (txs.length < minSlotTransactions) continue;

      const buyers = Array.from(buyersBySlot.get(slot) || []);
      const bundleMetrics = buyers.reduce(
        (acc, buyer) => {
          const metrics = buyerMetrics.get(buyer)!;
          return {
            buyQuantity: acc.buyQuantity + metrics.buyQuantity,
            sellQuantity: acc.sellQuantity + metrics.sellQuantity,
            buyAmount: acc.buyAmount + metrics.buyAmount,
            sellAmount: acc.sellAmount + metrics.sellAmount,
            currentHoldings: acc.currentHoldings + metrics.currentHoldings,
            profitLoss: acc.profitLoss + metrics.profitLoss,
          };
        },
        {
          buyQuantity: 0,
          sellQuantity: 0,
          buyAmount: 0,
          sellAmount: 0,
          currentHoldings: 0,
          profitLoss: 0,
        },
      );

      const bundle: Bundle = {
        slot,
        bundleAddress: txs[0].signature,
        transactions: txs,
        supplyPercentage:
          (bundleMetrics.currentHoldings / 10 ** tokenDecimals / totalSupply) *
          100,
        solSpent: bundleMetrics.buyAmount,
        currentHoldings: bundleMetrics.currentHoldings / 10 ** tokenDecimals,
        isPumpfunBundle: false,
        avgPricePerToken:
          bundleMetrics.buyQuantity > 0
            ? (bundleMetrics.buyAmount * 1e9) / bundleMetrics.buyQuantity
            : 0,
        firstPurchaseTime: Math.min(...txs.map((tx) => tx.timestamp)),
        lastPurchaseTime: Math.max(...txs.map((tx) => tx.timestamp)),
        purchaseVelocity:
          bundleMetrics.buyQuantity /
          ((Math.max(...txs.map((tx) => tx.timestamp)) -
            Math.min(...txs.map((tx) => tx.timestamp))) /
            3600000),
        uniqueBuyers: buyers.length,
        // New metrics
        totalBought: bundleMetrics.buyQuantity,
        totalSold: bundleMetrics.sellQuantity,
        profitLoss: bundleMetrics.profitLoss,
        sellAmount: bundleMetrics.sellAmount,
      };

      bundles.push(bundle);
    }

    // Sort bundles by significance (current holdings) and take top MAX_BUNDLES
    bundles.sort((a, b) => b.currentHoldings - a.currentHoldings);
    const significantBundles = bundles.slice(0, MAX_BUNDLES);

    const analysis = {
      mintAddress,
      totalBundles: bundles.length, // Total found
      totalSolSpent: significantBundles.reduce((sum, b) => sum + b.solSpent, 0),
      totalUniqueWallets: new Set(Array.from(buyerMetrics.keys())).size,
      totalSupply,
      largestBundle: significantBundles[0] || null,
      bundles: significantBundles, // Only return significant bundles
      suspiciousPatterns: analyzeSuspiciousPatterns(significantBundles),
      totalBought: significantBundles.reduce(
        (sum, b) => sum + b.totalBought,
        0,
      ),
      totalSold: significantBundles.reduce((sum, b) => sum + b.totalSold, 0),
      totalProfitLoss: significantBundles.reduce(
        (sum, b) => sum + b.profitLoss,
        0,
      ),
    };

    return analysis;
  } catch (error) {
    console.error('Error identifying bundles:', error);
    return null;
  }
}

function analyzeSuspiciousPatterns(bundles: Bundle[]) {
  return {
    // Rapid accumulation (potential snipers)
    rapidAccumulation: bundles.filter((b) => {
      const timeWindow = b.lastPurchaseTime - b.firstPurchaseTime;
      const isQuickPurchase = timeWindow < 10000; // Within 10 seconds
      const isLargeAmount = b.supplyPercentage > 1; // Over 1% of supply
      return isQuickPurchase && isLargeAmount;
    }),

    // Price manipulation
    priceManipulation: bundles.filter((b) => {
      const prices = b.transactions.map((t) => t.price);
      const priceVariance = Math.max(...prices) / Math.min(...prices);
      return priceVariance > 2; // Price doubled within the bundle
    }),

    // Coordinated buying (potential snipers working together)
    coordinatedBuying: bundles.filter(
      (b) =>
        b.transactions.length >= 3 && // Multiple transactions
        b.supplyPercentage > 2 && // Significant supply
        b.lastPurchaseTime - b.firstPurchaseTime < 30000, // Within 30 seconds
    ),

    // Sniper characteristics
    snipers: bundles.filter((b) => {
      const isEarlyBuyer =
        b.firstPurchaseTime < Date.now() - 24 * 60 * 60 * 1000; // Within first 24h
      const hasHighVelocity = b.purchaseVelocity > 500; // High tokens/hour
      const isLargeHolder = b.supplyPercentage > 1; // Over 1% of supply
      const quickExecution = b.lastPurchaseTime - b.firstPurchaseTime < 15000; // Within 15 seconds

      return (
        isEarlyBuyer && (hasHighVelocity || (isLargeHolder && quickExecution))
      );
    }),
  };
}

// Cache the fetch for 5 minutes
export const analyzeMintBundles = cache(
  actionClient
    .schema(BundleDetectionSchema)
    .action(async ({ parsedInput: { mintAddress, minSlotTransactions } }) => {
      try {
        const analysis = await identifyBundlesBySlot(
          mintAddress,
          minSlotTransactions,
        );
        return { success: true, data: analysis };
      } catch (error) {
        return { success: false, error: 'Failed to analyze bundles' };
      }
    }),
);