import Image from 'next/image';

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { AlertCircle, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { WalletPortfolio } from '@/components/message/wallet-portfolio';
import { Card } from '@/components/ui/card';
import { SolanaUtils } from '@/lib/solana';
import {
  type Holder,
  getHoldersClassification,
  searchWalletAssets,
} from '@/lib/solana/helius';
import { cn } from '@/lib/utils';
import { formatShortNumber } from '@/lib/utils/format';
import { retrieveAgentKit } from '@/server/actions/ai';
import { transformToPortfolio } from '@/types/helius/portfolio';

// Constants
const DEFAULT_OPTIONS = {
  SLIPPAGE_BPS: 300, // 3% default slippage
} as const;

// Types
interface SwapParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

interface SwapResult {
  success: boolean;
  data?: {
    signature: string;
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps: number;
  };
  error?: string;
}

interface TokenParams {
  mint: string;
}

interface TokenHoldersResult {
  success: boolean;
  data?: {
    totalHolders: number;
    topHolders: Holder[];
    totalSupply: number;
  };
  error?: string;
}

const publicKeySchema = z
  .string()
  .regex(
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    'Invalid Solana address format. Must be a base58 encoded string.',
  )
  .describe('A valid Solana wallet address. (base58 encoded)');

const domainSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9-]+\.sol$/,
    'Invalid Solana domain format. Must be a valid Solana domain name.',
  )
  .describe(
    'A Solana domain name. (e.g. toly.sol). Needed for resolving a domain to an address.  ',
  );

const TokenSearchResult = ({
  token,
  className,
}: {
  token: any;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-muted/50 p-4',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={token.content?.links?.image || '/placeholder.png'}
            alt={token.content?.metadata?.symbol || 'Token'}
            className="object-cover"
            fill
            sizes="40px"
            onError={(e) => {
              // @ts-expect-error - Type 'string' is not assignable to type 'never'
              e.target.src =
                'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-medium">
              {token.content?.metadata?.name || 'Unknown Token'}
            </h3>
            <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.content?.metadata?.symbol || '???'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate font-mono">
              {token.id.slice(0, 4)}...{token.id.slice(-4)}
            </span>
            {token.token_info?.price_info?.total_price && (
              <>
                <span>•</span>
                <span>
                  Vol: $
                  {(
                    token.token_info.price_info.total_price / 1_000_000_000
                  ).toFixed(2)}
                  B
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SwapResult = ({ result }: { result: SwapResult }) => {
  if (!result.success) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-destructive/5 p-4',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-destructive/10 p-2.5">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-medium text-destructive">
              Transaction Failed
            </h3>
            <p className="mt-1 text-sm text-destructive/80">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-muted/50 p-4')}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted p-2.5">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium">Transaction Sent</h3>
          <a
            href={`https://solscan.io/tx/${result.data?.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View details on Solscan
            <ExternalLink className="ml-1.5 inline-block h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export function TokenHoldersResult({
  holdersResult,
}: {
  holdersResult: TokenHoldersResult;
}) {
  // Handle error or loading states:
  if (!holdersResult.success) {
    return (
      <Card className="space-y-4 bg-muted/50 p-4">
        <h3 className="text-lg font-medium">Holders Information</h3>
        <p className="text-red-500">
          {holdersResult.error ?? 'Failed to load holder data.'}
        </p>
      </Card>
    );
  }

  // Destructure out data
  const { totalHolders, topHolders, totalSupply } = holdersResult.data ?? {
    totalHolders: 0,
    topHolders: [],
    totalSupply: 1,
  };

  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Holders Information</h3>
        <div className="ml-2 text-sm text-muted-foreground">
          Total Holders: {totalHolders}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2 text-left">Owner</th>
              <th className="p-2 text-left">Balance</th>
            </tr>
          </thead>
          <tbody>
            {topHolders.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-center">
                  No top holders found.
                </td>
              </tr>
            ) : (
              topHolders.map((holder, index) => {
                const ownedPct = ((holder.balance / totalSupply) * 100).toFixed(
                  2,
                );
                const shortBalance = formatShortNumber(holder.balance);

                return (
                  <tr
                    key={holder.owner}
                    className="border-b last:border-0 hover:bg-accent/10"
                  >
                    {/* Owner + Classification */}
                    <td className="max-w-xs break-words p-2 align-middle">
                      <div className="font-mono leading-tight">
                        <a
                          key={index}
                          href={`https://solscan.io/account/${holder.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md hover:bg-accent"
                        >
                          {holder.owner.slice(0, 4)}...
                          {holder.owner.slice(-4)}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                      {holder.classification && (
                        <div className="text-xs text-muted-foreground">
                          {holder.classification}
                        </div>
                      )}
                    </td>

                    {/* Owned% + Short Balance */}
                    <td className="p-2 align-middle">
                      <div className="text-sm font-medium">{ownedPct}%</div>
                      <div className="text-xs text-muted-foreground">
                        {shortBalance}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const wallet = {
  resolveWalletAddressFromDomain: {
    displayName: '🔍 Resolve Solana Domain',
    description:
      'Resolve a Solana domain name to an address. Useful for getting the address of a wallet from a domain name.',
    isCollapsible: true,
    parameters: z.object({ domain: domainSchema }),
    execute: async ({ domain }: { domain: string }) => {
      return await SolanaUtils.resolveDomainToAddress(domain);
    },
  },
  getWalletPortfolio: {
    displayName: '🏦 Wallet Portfolio',
    description:
      'Get the portfolio of a Solana wallet, including detailed token information & total value, SOL value etc.',
    parameters: z.object({ walletAddress: publicKeySchema }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        const { fungibleTokens } = await searchWalletAssets(walletAddress);
        const portfolio = transformToPortfolio(
          walletAddress,
          fungibleTokens,
          [],
        );

        // First, separate SOL from other tokens
        const solToken = portfolio.tokens.find(
          (token) => token.symbol === 'SOL',
        );
        const otherTokens = portfolio.tokens
          .filter((token) => token.symbol !== 'SOL')
          .filter((token) => token.balance * token.pricePerToken > 10)
          .sort(
            (a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken,
          )
          .slice(0, 9); // Take 9 instead of 10 to leave room for SOL

        // Combine SOL with other tokens, ensuring SOL is first
        portfolio.tokens = solToken ? [solToken, ...otherTokens] : otherTokens;

        return {
          suppressFollowUp: true,
          data: portfolio,
        };
      } catch (error) {
        throw new Error(
          `Failed to get wallet portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = (raw as { data: any }).data;
      if (!result || typeof result !== 'object') return null;
      return <WalletPortfolio data={result} />;
    },
  },
};

const swap = {
  swapTokens: {
    displayName: '🪙 Swap Tokens',
    description: 'Swap tokens using Jupiter Exchange with the embedded wallet.',
    parameters: z.object({
      requiresConfirmation: z.boolean().optional().default(true),
      inputMint: publicKeySchema.describe('Source token mint address'),
      outputMint: publicKeySchema.describe('Target token mint address'),
      amount: z.number().positive().describe('Amount to swap'),
      slippageBps: z
        .number()
        .min(0)
        .max(10000)
        .optional()
        .describe('Slippage tolerance in basis points (0-10000)'),
    }),
    execute: async ({
      inputMint,
      outputMint,
      amount,
      slippageBps = DEFAULT_OPTIONS.SLIPPAGE_BPS,
    }: SwapParams): Promise<SwapResult> => {
      try {
        const agentResponse = await retrieveAgentKit();
        const agent = agentResponse?.data?.data?.agent;

        if (!agent) {
          throw new Error('Failed to retrieve agent');
        }

        console.log('[swapTokens] inputMint', inputMint);
        console.log('[swapTokens] outputMint', outputMint);
        console.log('[swapTokens] amount', amount);
        console.log('[swapTokens] slippageBps', slippageBps);

        const signature = await agent.trade(
          new PublicKey(outputMint),
          amount,
          new PublicKey(inputMint),
          slippageBps,
        );

        return {
          success: true,
          data: {
            signature,
            inputMint,
            outputMint,
            amount,
            slippageBps,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to execute swap',
        };
      }
    },
    render: (raw: unknown) => {
      const result = raw as SwapResult;
      return <SwapResult result={result} />;
    },
  },
};

const token = {
  holders: {
    displayName: '💼 Token Holder Stats',
    description: 'Get the token holder stats for a Solana token',
    parameters: z.object({
      mint: publicKeySchema.describe('Token mint address'),
    }),
    execute: async ({ mint }: TokenParams): Promise<TokenHoldersResult> => {
      try {
        const tokenHolderStats = await getHoldersClassification(mint);
        return {
          success: true,
          data: {
            totalHolders: tokenHolderStats.totalHolders,
            topHolders: tokenHolderStats.topHolders,
            totalSupply: tokenHolderStats.totalSupply,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to execute swap',
        };
      }
    },
    render: (raw: unknown) => {
      const result = raw as TokenHoldersResult;
      return <TokenHoldersResult holdersResult={result} />;
    },
  },
};

export const solanaTools = {
  ...wallet,
  ...swap,
  ...token,
};
