import { actionClient, ActionResponse } from "@/lib/safe-action";
import { z } from 'zod';
import { getDexOhlcv, getTokenPools } from '@/server/actions/chart';
import { rsi, sma, bb , macd } from 'indicatorts';
import { TIMEFRAME } from "@/types/chart";

const indicatorSchema = z.object({
  indicator: z.enum(['rsi', 'sma', 'bb' , 'macd']),
  parameters: z.object({
    period: z.number().optional(),
    fast: z.number().optional(),
    slow: z.number().optional(),
    signal: z.number().optional(),
  }),
  contractAddress: z.string(),
  fromTimestamp: z.number().optional(),
});

function getClosingValues(olhcvList: number[][] , fromTimestamp?: number): number[] {
  
  let closingValues;

  if (fromTimestamp) {
    closingValues = olhcvList.filter(([timestamp]) => timestamp >= fromTimestamp).map(([timestamp, open, high, low, close , volume]) => close);
  } else {
    closingValues = olhcvList.map(([timestamp, open, high, low, close , volume]) => close);
  }

  return closingValues;
}

export const checkIndicatorsAction = actionClient
  .schema(indicatorSchema)
  .action(async (input): Promise<ActionResponse<number>> => {
    try {
      const { indicator, parameters, contractAddress, fromTimestamp  } = input.parsedInput;

      const topPoolId = await getTokenPools(contractAddress , 'solana');
      const olhcvList = await getDexOhlcv(topPoolId, 'solana', TIMEFRAME.MINUTES, '1');
      let result;

      const closingValues = getClosingValues(olhcvList , fromTimestamp);

      if(closingValues.length === 0) {
        return { success: false, error: 'No closing values found' };
      }
        
      switch (indicator) {
        case 'rsi':
            const rsiResult = rsi(closingValues, { period: parameters.period || 14 });
            result = rsiResult[rsiResult.length - 1];
          break;
        case 'sma':
            const smaResult = sma(closingValues, { period: parameters.period || 14 });
            result = smaResult[smaResult.length - 1];
          break;
        case 'bb':
            const bbResult = bb(closingValues, { period: parameters.period || 14 });
            result = bbResult.upper[bbResult.upper.length - 1];
          break;    
        case 'macd':
            const macdResult = macd(closingValues, { fast: parameters.fast || 12, slow: parameters.slow || 26, signal: parameters.signal || 9 });
            result = macdResult.macdLine[macdResult.macdLine.length - 1];
          break;
        default:
          throw new Error('Unsupported indicator');
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
    }
  });

