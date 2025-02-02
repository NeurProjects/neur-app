'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

import { SwapDataResult } from '@/types/stream';

interface SwapStatusProps {
  result: SwapDataResult;
  inputAmount: string;
}

export function SwapStatus({ result, inputAmount }: SwapStatusProps) {
  const isProcessing = result.step === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-8"
    >
      <div className="flex flex-col items-center space-y-4 text-center">
        {isProcessing ? <ProcessingAnimation /> : <CompletedAnimation />}

        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            {isProcessing ? 'Processing Swap' : 'Swap Complete'}
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium">
              {inputAmount} {result.inputToken?.symbol}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {(
                (result.price ?? 0) * Number.parseFloat(inputAmount ?? '0')
              ).toFixed(2)}{' '}
              {result.outputToken?.symbol}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProcessingAnimation() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <motion.div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current"
          strokeWidth="2"
        >
          <path d="M7 16V4M7 4L3 8M7 4L11 8" />
          <path d="M17 8V20M17 20L21 16M17 20L13 16" />
        </svg>
      </div>
    </div>
  );
}

function CompletedAnimation() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
    >
      <Check className="h-8 w-8 text-primary" />
    </motion.div>
  );
}
