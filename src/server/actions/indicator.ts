import { actionClient, ActionResponse } from "@/lib/safe-action";
import { z } from 'zod';
import { getDexOhlcv, getTokenPools } from '@/server/actions/chart';
import { rsi, sma, bb , macd } from 'indicatorts';
import { TIMEFRAME } from "@/types/chart";

const DEFAULT_PERIOD = 14;
const DEFAULT_MACD_FAST = 12;
const DEFAULT_MACD_SLOW = 26;
const DEFAULT_MACD_SIGNAL = 9;

interface IndicatorParameters {
  period?: number;
  fast?: number;
  slow?: number;
  signal?: number;
}

interface IndicatorInput {
  indicator: 'rsi' | 'sma' | 'bb' | 'macd';
  parameters: IndicatorParameters;
  contractAddress: string;
  fromTimestamp?: number;
}

const indicatorSchema = z.object({
  indicator: z.enum(['rsi', 'sma', 'bb', 'macd']),
  parameters: z.object({
    period: z.number().optional(),
    fast: z.number().optional(),
    slow: z.number().optional(),
    signal: z.number().optional(),
  }),
  contractAddress: z.string(),
  fromTimestamp: z.number().optional(),
});

function getClosingValues(olhcvList: number[][], fromTimestamp?: number): number[] {
  // [timestamp, open, high, low, close , volume] // this is the format of the olhcvList
  return fromTimestamp
    ? olhcvList.filter(([timestamp]) => timestamp >= fromTimestamp).map(([, , , , close]) => close)
    : olhcvList.map(([, , , , close]) => close);
}

function calculateIndicator(indicator: string, closingValues: number[], parameters: IndicatorParameters): number {
  switch (indicator) {
    case 'rsi':
      return rsi(closingValues, { period: parameters.period || DEFAULT_PERIOD }).pop()!;
    case 'sma':
      return sma(closingValues, { period: parameters.period || DEFAULT_PERIOD }).pop()!;
    case 'bb':
      return bb(closingValues, { period: parameters.period || DEFAULT_PERIOD }).upper.pop()!;
    case 'macd':
      return macd(closingValues, {
        fast: parameters.fast || DEFAULT_MACD_FAST,
        slow: parameters.slow || DEFAULT_MACD_SLOW,
        signal: parameters.signal || DEFAULT_MACD_SIGNAL,
      }).macdLine.pop()!;
    default:
      throw new Error('Unsupported indicator');
  }
}

export const checkIndicatorsAction = actionClient
  .schema(indicatorSchema)
  .action(async (input): Promise<ActionResponse<number>> => {
    try {
      const { indicator, parameters, contractAddress, fromTimestamp } = input.parsedInput;

      const topPoolId = await getTokenPools(contractAddress, 'solana');
      const olhcvList = await getDexOhlcv(topPoolId, 'solana', TIMEFRAME.MINUTES, '1');
      const closingValues = getClosingValues(olhcvList, fromTimestamp);

      if (closingValues.length === 0) {
        return { success: false, error: 'No closing values found' };
      }

      const result = calculateIndicator(indicator, closingValues, parameters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
    }
  });

