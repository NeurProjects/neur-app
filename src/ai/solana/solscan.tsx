import type { ReactNode } from 'react';

import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatShortNumber, truncate } from '@/lib/utils/format';
import {
  type SolscanAccountPortfolio,
  type SolscanAccountTransaction,
  type SolscanDefiActivity,
  getSolscanAccountDefiActivities,
  getSolscanAccountPortfolio,
  getSolscanAccountTransactions,
} from '@/server/actions/solscan';
import { publicKeySchema } from '@/types/util';

const timestampLabel = (value?: number | string) => {
  if (!value) return 'Unknown';
  const date =
    typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const SolscanLink = ({
  children,
  path,
}: {
  children: ReactNode;
  path: string;
}) => (
  <a
    href={`https://solscan.io/${path}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 hover:text-foreground"
  >
    {children}
    <ExternalLink className="h-3 w-3" />
  </a>
);

const ErrorCard = ({ error }: { error?: string }) => (
  <Card className="bg-destructive/5 p-4">
    <p className="text-sm text-destructive">
      {error || 'Unable to load Solscan data.'}
    </p>
  </Card>
);

const toolResultSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string().optional(),
  }),
]);

const TransactionsTable = ({
  transactions,
}: {
  transactions: SolscanAccountTransaction[];
}) => {
  if (!transactions.length) {
    return (
      <Card className="bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          No recent Solscan transactions found.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-muted/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Signature</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.trans_id}>
              <TableCell className="font-mono">
                <SolscanLink path={`tx/${transaction.trans_id}`}>
                  {truncate(transaction.trans_id, 6)}
                </SolscanLink>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    transaction.status === 'Success' ? 'default' : 'secondary'
                  }
                >
                  {transaction.status || 'Unknown'}
                </Badge>
              </TableCell>
              <TableCell>
                {typeof transaction.fee === 'number'
                  ? `${formatShortNumber(transaction.fee)} lamports`
                  : 'Unknown'}
              </TableCell>
              <TableCell>
                {timestampLabel(transaction.block_time || transaction.time)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

const DefiActivitiesTable = ({
  activities,
}: {
  activities: SolscanDefiActivity[];
}) => {
  if (!activities.length) {
    return (
      <Card className="bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          No recent Solscan DeFi activities found.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-muted/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Signature</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity, index) => (
            <TableRow key={`${activity.trans_id}-${index}`}>
              <TableCell>{activity.activity_type || 'Unknown'}</TableCell>
              <TableCell>{activity.platform || 'Unknown'}</TableCell>
              <TableCell className="font-mono">
                <SolscanLink path={`tx/${activity.trans_id}`}>
                  {truncate(activity.trans_id, 6)}
                </SolscanLink>
              </TableCell>
              <TableCell>
                {timestampLabel(activity.block_time || activity.time)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

const PortfolioCard = ({
  portfolio,
}: {
  portfolio: SolscanAccountPortfolio;
}) => {
  const tokens = Array.isArray(portfolio.tokens) ? portfolio.tokens : [];

  return (
    <Card className="space-y-4 bg-muted/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm text-muted-foreground">Total value</div>
          <div className="mt-1 text-2xl font-semibold">
            {typeof portfolio.total_value === 'number'
              ? `$${portfolio.total_value.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}`
              : 'Unknown'}
          </div>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <div className="text-sm text-muted-foreground">Token accounts</div>
          <div className="mt-1 text-2xl font-semibold">
            {tokens.length.toLocaleString()}
          </div>
        </div>
      </div>
      <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-3 text-xs text-muted-foreground">
        {JSON.stringify(portfolio, null, 2)}
      </pre>
    </Card>
  );
};

const renderResult = <T,>(raw: unknown, render: (data: T) => ReactNode) => {
  const result = toolResultSchema.safeParse(raw);
  if (!result.success) {
    return <ErrorCard />;
  }

  if (!result.data.success) {
    return <ErrorCard error={result.data.error} />;
  }

  return render(result.data.data as T);
};

export const solscanTools = {
  getSolscanAccountTransactions: {
    displayName: 'Solscan Transactions',
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['SOLSCAN_API_KEY'],
    description:
      'Get recent historical Solana transactions for a wallet address from Solscan. Use this when users ask for wallet transaction history, recent activity, signatures, fees, or account activity timelines.',
    parameters: z.object({
      address: publicKeySchema.describe('The Solana wallet address to inspect'),
      before: z
        .string()
        .optional()
        .describe('Optional pagination cursor or signature before this page'),
      limit: z
        .number()
        .min(1)
        .max(40)
        .optional()
        .describe('Number of transactions to return, max 40'),
    }),
    execute: async ({
      address,
      before,
      limit,
    }: {
      address: string;
      before?: string;
      limit?: number;
    }) => {
      try {
        const transactions = await getSolscanAccountTransactions(
          address,
          before,
          limit,
        );
        return { suppressFollowUp: true, success: true, data: transactions };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load Solscan transactions',
        };
      }
    },
    render: (raw: unknown) =>
      renderResult<SolscanAccountTransaction[]>(raw, (transactions) => (
        <TransactionsTable transactions={transactions} />
      )),
  },
  getSolscanDefiActivities: {
    displayName: 'Solscan DeFi Activity',
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['SOLSCAN_API_KEY'],
    description:
      'Get recent DeFi activities for a Solana wallet from Solscan. Use this for wallet analytics, smart money tracking, DEX activity, swaps, staking, liquidity, or protocol activity over a timeframe.',
    parameters: z.object({
      address: publicKeySchema.describe('The Solana wallet address to inspect'),
      fromTime: z
        .number()
        .optional()
        .describe('Optional Unix timestamp lower bound in seconds'),
      page: z.number().min(1).optional().describe('Page number, default 1'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size; Solscan supports fixed sizes like 10/20/30/40'),
      platform: z
        .string()
        .optional()
        .describe('Optional Solscan platform filter'),
      toTime: z
        .number()
        .optional()
        .describe('Optional Unix timestamp upper bound in seconds'),
    }),
    execute: async ({
      address,
      fromTime,
      page,
      pageSize,
      platform,
      toTime,
    }: {
      address: string;
      fromTime?: number;
      page?: number;
      pageSize?: number;
      platform?: string;
      toTime?: number;
    }) => {
      try {
        const activities = await getSolscanAccountDefiActivities(
          address,
          fromTime,
          page,
          pageSize,
          platform,
          toTime,
        );
        return { suppressFollowUp: true, success: true, data: activities };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load Solscan DeFi activities',
        };
      }
    },
    render: (raw: unknown) =>
      renderResult<SolscanDefiActivity[]>(raw, (activities) => (
        <DefiActivitiesTable activities={activities} />
      )),
  },
  getSolscanAccountPortfolio: {
    displayName: 'Solscan Portfolio',
    isCollapsible: true,
    isExpandedByDefault: true,
    requiredEnvVars: ['SOLSCAN_API_KEY'],
    description:
      'Get a Solana wallet portfolio from Solscan. Use this when users ask for token balances, account holdings, wallet analytics, or JSON output for a wallet.',
    parameters: z.object({
      address: publicKeySchema.describe('The Solana wallet address to inspect'),
    }),
    execute: async ({ address }: { address: string }) => {
      try {
        const portfolio = await getSolscanAccountPortfolio(address);
        return { suppressFollowUp: true, success: true, data: portfolio };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load Solscan portfolio',
        };
      }
    },
    render: (raw: unknown) =>
      renderResult<SolscanAccountPortfolio>(raw, (portfolio) => (
        <PortfolioCard portfolio={portfolio} />
      )),
  },
};
