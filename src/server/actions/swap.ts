import { PublicKey } from '@solana/web3.js';

import { retrieveAgentKit } from './ai';

export const performSwap = async ({
  inputAmount,
  inputToken,
  outputToken,
}: {
  inputAmount: number;
  inputToken: {
    mint: string;
  };
  outputToken: {
    mint: string;
  };
}) => {
  const agent = (await retrieveAgentKit(undefined))?.data?.data?.agent;
  if (!agent) {
    console.error('Agent not found');
    return {
      success: false,
      error: 'Agent not found',
    };
  }

  try {
    const signature = await agent.trade(
      new PublicKey(outputToken.mint),
      inputAmount,
      new PublicKey(inputToken.mint),
      300,
    );

    return {
      success: true,
      result: {
        signature,
      },
    };
  } catch (error) {
    console.error('Error performing swap:', error);
    return {
      success: false,
      error: 'Unable to perform swap',
    };
  }
};
