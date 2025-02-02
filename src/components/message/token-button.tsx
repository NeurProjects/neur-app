'use client';

import { memo } from 'react';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface TokenButtonProps {
  token?: {
    symbol?: string;
    mint?: string;
  };
  placeholder: string;
}

export const TokenButton = memo(function TokenButton({
  token,
  placeholder,
}: TokenButtonProps) {
  if (!token?.mint || !token?.symbol) {
    return (
      <Button variant="secondary" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Searching...</span>
      </Button>
    );
  }

  return (
    <Button variant="secondary" className="gap-2">
      <span>{token.symbol}</span>
      <span className="text-xs text-muted-foreground">
        {token.mint
          ? `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`
          : ''}
      </span>
    </Button>
  );
});
