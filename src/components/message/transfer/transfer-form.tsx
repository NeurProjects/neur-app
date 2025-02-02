'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';

import { TokenInput } from '@/components/message/token-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { TransferDataResult } from '@/types/stream';

import { TransferStatus } from './transfer-status';

interface TransferFormProps {
  data: {
    success: boolean;
    result: TransferDataResult;
  };
  onTransfer: (result: TransferDataResult) => void;
}

const TRANSFER_BUTTON_TEXT = {
  'token-search': 'Select Token',
  updating: 'Updating...',
  'awaiting-confirmation': 'Confirm Transfer',
  confirmed: 'Confirmed',
  processing: 'Processing...',
  completed: 'Transfer Complete',
  canceled: 'Canceled',
  failed: 'Transfer Failed',
} as const;

export function TransferForm({ data, onTransfer }: TransferFormProps) {
  const { result } = data;
  const step = result?.step ?? 'token-search';

  const [amount, setAmount] = useState(result?.amount?.toString() ?? '');
  const [receiverAddress, setReceiverAddress] = useState(
    result?.receiverAddress ?? '',
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const onConfirm = async () => {
    if (hasChanges) {
      // Save changes
      onTransfer({
        ...result,
        amount: Number.parseFloat(amount) || 0,
        receiverAddress,
      });
      setHasChanges(false);
    } else {
      // Confirm transfer
      onTransfer({
        ...result,
        step: 'confirmed',
      });
    }
  };

  useEffect(() => {
    if (result?.amount) {
      setAmount(result.amount.toString());
      setReceiverAddress(result?.receiverAddress ?? '');
      setHasChanges(false);
    }
  }, [result?.amount, result?.receiverAddress]);

  useEffect(() => {
    if (false && step === 'awaiting-confirmation' && !hasChanges) {
      setCountdown(15);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            onConfirm();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [step, hasChanges, onConfirm]);

  const transferButtonText = TRANSFER_BUTTON_TEXT[step];

  const status = {
    isSearching: step === 'token-search',
    isProcessing: step === 'processing',
    isCompleted: step === 'completed',
    isCanceled: step === 'canceled',
    showInputs: !['processing', 'completed', 'canceled'].includes(step),
  };

  // Replace the hook usage with dummy data
  const tokenBalances = {
    data: {
      tokens: [
        {
          symbol: 'SOL',
          mint: '11111111111111111111111111111111',
          balance: 10.5,
          decimals: 9,
        },
        {
          symbol: 'USDC',
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          balance: 1000.0,
          decimals: 6,
        },
        {
          symbol: 'BONK',
          mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          balance: 1000000.0,
          decimals: 5,
        },
      ],
    },
  };

  const tokenData = tokenBalances?.data?.tokens?.find(
    (t) => t.mint === result?.token?.mint,
  );
  const tokenBalance =
    tokenData?.balance ?? 0 / Math.pow(10, tokenData?.decimals ?? 1);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setHasChanges(true);
  };

  const handleReceiverChange = (value: string) => {
    setReceiverAddress(value);
    setHasChanges(true);
  };

  const onCancel = () => {
    if (hasChanges) {
      // Cancel changes
      setAmount(result?.amount?.toString() ?? '');
      setReceiverAddress(result?.receiverAddress ?? '');
      setHasChanges(false);
    } else {
      // Cancel transfer
      onTransfer({
        ...result,
        step: 'canceled',
      });
    }
  };

  if (status.isCanceled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="py-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Transfer Canceled</h3>
              <p className="text-sm text-muted-foreground">
                {amount} {result?.token?.symbol} to {receiverAddress}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        {status.showInputs ? (
          <div className="space-y-4">
            <TokenInput
              label="Amount to Transfer"
              value={amount}
              token={{
                balance: tokenBalance,
                ...result?.token,
              }}
              onChange={handleAmountChange}
            />

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Recipient Address
              </label>
              <Input
                placeholder="Enter recipient address"
                value={receiverAddress}
                onChange={(e) => handleReceiverChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <TransferStatus result={result!} amount={amount} />
        )}
      </AnimatePresence>

      {!status.isSearching && result?.token && (
        <>
          <Separator />
          <TransferDetails
            result={result}
            isCompleted={status.isCompleted}
            transferButtonText={transferButtonText}
            hasChanges={hasChanges}
            onConfirm={onConfirm}
            onCancel={onCancel}
            countdown={countdown}
          />
        </>
      )}
    </div>
  );
}

function TransferDetails({
  result,
  isCompleted,
  transferButtonText,
  hasChanges,
  onConfirm,
  onCancel,
  countdown,
}: {
  result: TransferDataResult;
  isCompleted: boolean;
  transferButtonText: string;
  hasChanges: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  countdown: number | null;
}) {
  return (
    <>
      {isCompleted && result.signature && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Transaction</span>
            <a
              href={`https://solscan.io/tx/${result.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <span className="font-mono">
                {result.signature.slice(0, 8)}...
                {result.signature.slice(-8)}
              </span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
      {!isCompleted && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            size="lg"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            size="lg"
            onClick={onConfirm}
            disabled={result.step !== 'awaiting-confirmation' && !hasChanges}
          >
            {hasChanges
              ? 'Save Changes'
              : countdown
                ? `Confirm Transfer (${countdown}s)`
                : transferButtonText}
          </Button>
        </div>
      )}
    </>
  );
}
