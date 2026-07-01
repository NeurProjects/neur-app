import { cache } from 'react';

import { z } from 'zod';

const SOLSCAN_BASE_URL =
  process.env.SOLSCAN_BASE_URL || 'https://pro-api.solscan.io/v2.0';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 60, 100] as const;

const solscanResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  errors: z
    .object({
      code: z.number().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export interface SolscanAccountTransaction {
  block_id?: number;
  block_time?: number;
  fee?: number;
  signer?: string[];
  status?: string;
  trans_id: string;
  time?: string;
}

export interface SolscanDefiActivity {
  activity_type?: string;
  block_id?: number;
  block_time?: number;
  from_address?: string;
  platform?: string;
  routers?: Array<Record<string, unknown>>;
  sources?: string[];
  time?: string;
  to_address?: string;
  trans_id: string;
}

export interface SolscanAccountPortfolio {
  tokens?: Array<Record<string, unknown>>;
  total_value?: number;
  native_balance?: Record<string, unknown>;
  [key: string]: unknown;
}

const normalizePageSize = (pageSize?: number) => {
  if (!pageSize) return 10;
  return PAGE_SIZE_OPTIONS.reduce((best, option) =>
    Math.abs(option - pageSize) < Math.abs(best - pageSize) ? option : best,
  );
};

const solscanGet = async <T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<T> => {
  const apiKey = process.env.SOLSCAN_API_KEY;

  if (!apiKey) {
    throw new Error('SOLSCAN_API_KEY is required to use Solscan tools');
  }

  const url = new URL(`${SOLSCAN_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        accept: 'application/json',
        token: apiKey,
      },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => undefined);
    const parsedResponse = solscanResponseSchema.safeParse(body);

    if (!response.ok) {
      throw new Error(
        parsedResponse.success
          ? parsedResponse.data.errors?.message ||
            `Solscan request failed with ${response.status}`
          : `Solscan request failed with ${response.status}`,
      );
    }

    if (!parsedResponse.success) {
      throw new Error('Solscan request failed');
    }

    const parsed = parsedResponse.data;

    if (!parsed.success) {
      throw new Error(parsed.errors?.message || 'Solscan request failed');
    }

    return parsed.data as T;
  } finally {
    clearTimeout(timeout);
  }
};

export const getSolscanAccountTransactions = cache(
  async (
    address: string,
    before?: string,
    limit = 10,
  ): Promise<SolscanAccountTransaction[]> => {
    return solscanGet<SolscanAccountTransaction[]>('/account/transactions', {
      address,
      before,
      limit: Math.min(Math.max(limit, 1), 40),
    });
  },
);

export const getSolscanAccountDefiActivities = cache(
  async (
    address: string,
    fromTime?: number,
    page = 1,
    pageSize = 10,
    platform?: string,
    toTime?: number,
  ): Promise<SolscanDefiActivity[]> => {
    return solscanGet<SolscanDefiActivity[]>('/account/defi/activities', {
      address,
      from_time: fromTime,
      page: Math.max(1, page),
      page_size: normalizePageSize(pageSize),
      platform,
      sort_by: 'block_time',
      sort_order: 'desc',
      to_time: toTime,
    });
  },
);

export const getSolscanAccountPortfolio = cache(
  async (address: string): Promise<SolscanAccountPortfolio> => {
    return solscanGet<SolscanAccountPortfolio>('/account/portfolio', {
      address,
    });
  },
);
