'use client';

import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/format';

import { TokenButton } from './token-button';

interface TokenInputProps {
  label: string;
  value: string;
  token?: {
    symbol?: string;
    mint?: string;
    balance?: number;
  };
  onChange?: (value: string) => void;
  disabled?: boolean;
  showBalance?: boolean;
}

export function TokenInput({
  label,
  value,
  token,
  onChange,
  disabled,
  showBalance = true,
}: TokenInputProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-4">
        <div className="mb-2 flex justify-between">
          <label className="text-sm text-muted-foreground">{label}</label>
          {showBalance && (
            <span className="text-sm text-muted-foreground">
              Balance: {token?.balance?.toFixed(2) ?? '0.00'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder="0.0"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 md:text-lg"
          />
          <TokenButton token={token} placeholder="Select token" />
        </div>
      </div>
    </div>
  );
}
