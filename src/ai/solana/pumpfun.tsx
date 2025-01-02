import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { retrieveAgentKit } from '@/server/actions/ai';

interface LaunchResultProps {
  signature: string;
  mint: string;
  metadataUri: string;
}

function LaunchResult({ signature, mint, metadataUri }: LaunchResultProps) {
  return (
    <Card className="bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold text-card-foreground">
        Token Launch Successful! 🚀
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Transaction Hash
            </div>
            <div className="max-w-[200px] truncate font-mono text-sm">
              {signature}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() =>
              window.open(`https://solscan.io/tx/${signature}`, '_blank')
            }
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Token Contract
            </div>
            <div className="max-w-[200px] truncate font-mono text-sm">
              {mint}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() =>
              window.open(`https://pump.fun/mint/${mint}`, '_blank')
            }
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Metadata URI
            </div>
            <div className="max-w-[200px] truncate font-mono text-sm">
              {metadataUri}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => window.open(metadataUri, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export const pumpfunTools = {
  launchToken: {
    agentKit: null,
    description: 'Launch a token on PumpFun',
    displayName: '💊 Deploy new token',
    parameters: z.object({
      requiresConfirmation: z.boolean().optional().default(true),
      name: z.string().describe('The name of the token'),
      symbol: z.string().describe('The symbol of the token'),
      description: z.string().describe('The description of the token'),
      image: z.string().describe('The image of the token'),
      initalBuySOL: z.number().describe('The amount of SOL to buy the token'),
      website: z.string().optional().describe('The website url of the token'),
      twitter: z.string().optional().describe('The twitter url of the token'),
      telegram: z.string().optional().describe('The telegram url of the token'),
    }),
    execute: async function ({
      name,
      symbol,
      description,
      image,
      initalBuySOL,
      website,
      twitter,
      telegram,
    }: {
      name: string;
      symbol: string;
      description: string;
      image: string;
      initalBuySOL: number;
      website?: string;
      twitter?: string;
      telegram?: string;
    }) {
      try {
        const agent =
          this.agentKit || (await retrieveAgentKit())?.data?.data?.agent;

        if (!agent) {
          return { success: false, error: 'Failed to retrieve agent' };
        }

        const result = await agent.launchPumpFunToken(
          name,
          symbol,
          description,
          image,
          {
            initialLiquiditySOL: initalBuySOL,
            website,
            twitter,
            telegram,
          },
        );

        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to launch token',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data: any;
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <Card className="bg-destructive/10 p-6">
            <h2 className="mb-2 text-xl font-semibold text-destructive">
              Launch Failed
            </h2>
            <pre className="text-sm text-destructive/80">
              {JSON.stringify(typedResult, null, 2)}
            </pre>
          </Card>
        );
      }

      const data = typedResult.data as {
        signature: string;
        mint: string;
        metadataUri: string;
      };
      return <LaunchResult {...data} />;
    },
  },
};
