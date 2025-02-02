'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { truncate } from '@/lib/utils/format';
import type { TransferDataResult } from '@/types/stream';

interface TransferStatusProps {
  result: TransferDataResult;
  amount: string;
}

export function TransferStatus({ result, amount }: TransferStatusProps) {
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
            {isProcessing ? 'Processing Transfer' : 'Transfer Complete'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {amount} {result.token?.symbol} to{' '}
            {truncate(result.receiverAddress ?? '', 4)}
          </p>
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
