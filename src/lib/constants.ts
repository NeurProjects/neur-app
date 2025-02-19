import config from '../../package.json';

export const APP_VERSION = config.version;
export const IS_BETA = true;

export const RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  'https://api.mainnet-beta.solana.com';

export const MAX_TOKEN_MESSAGES = 10;

export const NO_CONFIRMATION_MESSAGE = ' (Does not require confirmation)';

export const MODEL_PREFERENCE_MAP: Record<string, string> = {
  'anthropic/claude-3.5-sonnet': 'Claude-3.5 Sonnet',
  //'deepseek/deepseek-chat': 'DeepSeek V3',
  'google/gemini-2.0-flash-001': 'Gemini Flash 2.0',
  'gpt-4o': 'GPT-4o',
};
