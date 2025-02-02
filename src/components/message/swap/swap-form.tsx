'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowRight, ExternalLink, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWalletPortfolio } from '@/hooks/use-wallet-portfolio';
import type { SwapDataResult } from '@/types/stream';

import { TokenInput } from '../token-input';
import { SwapStatus } from './swap-status';

interface SwapFormProps {
  data: {
    success: boolean;
    result: SwapDataResult;
  };
  onSwap: (result: SwapDataResult) => void;
}

const SWAP_BUTTON_TEXT = {
  'token-search': 'Pending...',
  'fetching-balance': 'Pending...',
  'awaiting-confirmation': 'Confirm Swap',
  confirmed: 'Confirmed',
  canceled: 'Canceled',
  updating: 'Updating...',
  processing: 'Processing...',
  completed: 'Swap Complete',
  failed: 'Swap Failed',
} as const;

export function SwapForm({ data, onSwap }: SwapFormProps) {
  const { result } = data;
  const step = result?.step ?? 'token-search';

  const [inputAmount, setInputAmount] = useState(
    result?.inputAmount?.toString() ?? '',
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const onConfirm = async () => {
    if (hasChanges) {
      // Save changes
      onSwap({
        ...result,
        inputAmount: Number.parseFloat(inputAmount) || 0,
      });
      setHasChanges(false);
    } else {
      // Confirm swap
      onSwap({
        ...result,
        step: 'confirmed',
      });
    }
  };

  useEffect(() => {
    if (result?.inputAmount) {
      setInputAmount(result.inputAmount.toString());
      setHasChanges(false);
    }
  }, [result?.inputAmount]);

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

  const swapButtonText = SWAP_BUTTON_TEXT[step];

  const outputAmount =
    (result?.price ?? 0) * Number.parseFloat(inputAmount ?? '0') || '';

  const status = {
    isSearching: step === 'token-search',
    isProcessing: step === 'processing',
    isCompleted: step === 'completed',
    isCanceled: step === 'canceled',
    showInputs: !['processing', 'completed', 'canceled'].includes(step),
  };

  const tokenBalances = useWalletPortfolio();

  const inputTokenData = tokenBalances?.data?.tokens?.find(
    (t) => t.mint === result?.inputToken?.mint,
  );
  const outputTokenData = tokenBalances?.data?.tokens?.find(
    (t) => t.mint === result?.outputToken?.mint,
  );

  const inputTokenBalance =
    inputTokenData?.balance ?? 0 / Math.pow(10, inputTokenData?.decimals ?? 1);
  const outputTokenBalance =
    outputTokenData?.balance ??
    0 / Math.pow(10, outputTokenData?.decimals ?? 1);

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    setHasChanges(true);
    setCountdown(null);
  };

  const onCancel = () => {
    if (hasChanges) {
      // Cancel changes
      setInputAmount(result?.inputAmount?.toString() ?? '');
      setHasChanges(false);
    } else {
      // Cancel swap
      onSwap({
        ...result,
        step: 'canceled',
      });
    }
  };

  if (status.isCanceled) {
    return (
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-8"
          >
            <div className="flex flex-col items-center space-y-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
              >
                <X className="h-8 w-8 text-destructive" />
              </motion.div>

              <div className="space-y-1">
                <h3 className="text-lg font-medium">Swap Canceled</h3>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-medium">
                    {inputAmount} {result?.inputToken?.symbol}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {(
                      (result?.price ?? 0) *
                      Number.parseFloat(inputAmount ?? '0')
                    ).toFixed(2)}{' '}
                    {result?.outputToken?.symbol}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span>
              1 {result?.inputToken?.symbol} ={' '}
              {result.price?.toFixed(2) || '??'} {result?.outputToken?.symbol}
            </span>
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
              label="You Pay"
              value={inputAmount}
              token={{
                balance: inputTokenBalance,
                ...result?.inputToken,
              }}
              onChange={handleInputChange}
            />

            <div className="relative z-10 -my-2 flex justify-center">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            <TokenInput
              label="You Receive ≈"
              value={outputAmount ? outputAmount.toFixed(6) : ''}
              token={{
                balance: outputTokenBalance,
                ...result?.outputToken,
              }}
              disabled
            />
          </div>
        ) : (
          <SwapStatus result={result!} inputAmount={inputAmount} />
        )}
      </AnimatePresence>

      {/* Additional Details */}
      {!status.isSearching && result?.inputToken && result?.outputToken && (
        <>
          <Separator />
          <SwapDetails
            result={result}
            isCompleted={status.isCompleted}
            countdown={countdown}
            swapButtonText={swapButtonText}
            hasChanges={hasChanges}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </>
      )}
    </div>
  );
}

function SwapDetails({
  result,
  isCompleted,
  countdown,
  swapButtonText,
  hasChanges,
  onConfirm,
  onCancel,
}: {
  result: SwapDataResult;
  isCompleted: boolean;
  countdown: number | null;
  swapButtonText: string;
  hasChanges: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rate</span>
          <span>
            1 {result?.inputToken?.symbol ?? ''} ={' '}
            {result.price?.toFixed(2) || '??'}{' '}
            {result?.outputToken?.symbol ?? ''}
          </span>
        </div>
        {isCompleted && result.signature && (
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
        )}
      </div>
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
                ? `Confirm Swap (${countdown}s)`
                : swapButtonText}
          </Button>
        </div>
      )}
    </>
  );
}
