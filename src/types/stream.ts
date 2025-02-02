export interface TokenInfo {
  symbol?: string;
  mint?: string;
}

export interface SwapDataResult {
  step?:
    | 'token-search'
    | 'fetching-balance'
    | 'updating'
    | 'awaiting-confirmation'
    | 'confirmed'
    | 'processing'
    | 'completed'
    | 'canceled'
    | 'failed';
  inputToken?: TokenInfo;
  outputToken?: TokenInfo;
  inputAmount?: number;
  price?: number;
  signature?: string;
}

export interface CreateActionDataResult {
  step?:
    | 'tool-search'
    | 'updating'
    | 'awaiting-confirmation'
    | 'confirmed'
    | 'processing'
    | 'completed'
    | 'canceled'
    | 'failed';

  frequency?: number;
  maxExecutions?: number;
  startTimeOffset?: number;
  name?: string;
  message?: string;
  requiredTools?: Array<string>;
  missingTools?: Array<string>;
  actionId?: string;
  nextExecutionTime?: string;
}

export interface LaunchPumpfunResult {
  step?:
    | 'updating'
    | 'awaiting-confirmation'
    | 'confirmed'
    | 'processing'
    | 'completed'
    | 'canceled'
    | 'failed';
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  initalBuySOL?: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  signature?: string;
  mint?: string;
  metadataUri?: string;
}

export interface TransferDataResult {
  step?:
    | 'token-search'
    | 'updating'
    | 'awaiting-confirmation'
    | 'confirmed'
    | 'processing'
    | 'completed'
    | 'canceled'
    | 'failed';
  token?: TokenInfo;
  amount?: number;
  receiverAddress?: string;
  signature?: string;
}

export interface ToolDataStream {
  type: 'stream-result-data';
  status?: 'streaming' | 'idle' | 'completed' | undefined;
  toolCallId: string;
  content?:
    | SwapDataResult
    | CreateActionDataResult
    | LaunchPumpfunResult
    | TransferDataResult;
}

export type DataStreamDelta = ToolDataStream;
