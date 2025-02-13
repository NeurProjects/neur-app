import { z } from 'zod';

export interface BundleAnalysisResponse {
  bonded: boolean;
  bundles: Record<string, BundleDetails>;
  creator_analysis: CreatorAnalysis;
  distributed_amount: number;
  distributed_percentage: number;
  distributed_wallets: number;
  ticker: string;
  total_bundles: number;
  total_holding_amount: number;
  total_holding_percentage: number;
  total_percentage_bundled: number;
  total_sol_spent: number;
  total_tokens_bundled: number;
}

export interface BundleDetails {
  bundle_analysis: BundleAnalysis;
  holding_amount: number;
  holding_percentage: number;
  token_percentage: number;
  total_sol: number;
  total_tokens: number;
  unique_wallets: number;
  wallet_categories: Record<string, string>;
  wallet_info: Record<string, WalletInfo>;
}

export interface BundleAnalysis {
  category_breakdown: Record<string, number>;
  copytrading_groups: Record<string, string>;
  is_likely_bundle: boolean;
  primary_category: string;
}

export interface WalletInfo {
  sol: number;
  sol_percentage: number;
  token_percentage: number;
  tokens: number;
}

export interface CreatorAnalysis {
  address: string;
  current_holdings: number;
  history: CreatorHistory;
  holding_percentage: number;
  risk_level: string;
  warning_flags: (string | null)[];
}

export interface CreatorHistory {
  average_market_cap: number;
  high_risk: boolean;
  previous_coins: PreviousCoin[];
  recent_rugs: number;
  rug_count: number;
  rug_percentage: number;
  total_coins_created: number;
}

export interface PreviousCoin {
  created_at: number;
  is_rug: boolean;
  market_cap: number;
  mint: string;
  symbol: string;
}

export const BundleDetectionSchema = z.object({
  mintAddress: z.string(),
});
