'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { ArrowRight, Check, Copy, ExternalLink, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LaunchPumpfunResult } from '@/types/stream';

interface LaunchResultProps {
  data: {
    success: boolean;
    result?: LaunchPumpfunResult;
  };
  addToolResult: (result: LaunchPumpfunResult) => void;
}

function truncate(str: string, length = 4) {
  if (!str) return '';
  const start = str.slice(0, length);
  const end = str.slice(-length);
  return `${start}...${end}`;
}

export function LaunchResult({ data, addToolResult }: LaunchResultProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState(data?.result ?? {});

  useEffect(() => {
    if (!hasChanges) {
      setFormData(data?.result ?? {});
    }
  }, [data?.result, hasChanges]);

  if (!data) return null;
  const result = data.result;

  const handleInputChange = (
    field: keyof LaunchPumpfunResult,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleConfirm = () => {
    if (hasChanges) {
      addToolResult({
        ...formData,
      });
    } else {
      if (result?.step === 'awaiting-confirmation' && !formData.image?.trim()) {
        return;
      }
      addToolResult({ ...result, step: 'confirmed' });
    }
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges && result) {
      setFormData(result);
      setHasChanges(false);
    } else {
      addToolResult({ ...result, step: 'canceled' });
    }
  };

  if (result?.step === 'canceled') {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Launch Canceled</h3>
              <div className="text-sm text-muted-foreground">
                Token launch has been canceled
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result?.step === 'completed') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-2xl">
            Token Created Successfully!
            <span>🚀</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex gap-4">
            {result.image && (
              <div className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={result.image || '/placeholder.svg'}
                  alt={result.name || 'Token'}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{result.name}</h2>
                <div className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  ${result.symbol}
                </div>
              </div>
              {result.description && (
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result.signature && (
              <DetailItem
                label="Transaction"
                value={result.signature}
                truncateLength={6}
                link={`https://solscan.io/tx/${result.signature}`}
              />
            )}
            {result.mint && (
              <DetailItem
                label="Token Contract"
                value={result.mint}
                truncateLength={6}
                link={`https://pump.fun/mint/${result.mint}`}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const confirmButtonText = hasChanges
    ? 'Save Changes'
    : result?.step === 'awaiting-confirmation'
      ? 'Confirm Launch'
      : result?.step === 'updating'
        ? 'Updating...'
        : 'Launching...';

  const showInputs = !['processing', 'completed', 'canceled'].includes(
    result?.step || '',
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-6">
        {showInputs ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={formData.symbol || ''}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="initalBuySOL">Initial Buy (SOL)</Label>
                <Input
                  id="initalBuySOL"
                  type="text"
                  inputMode="decimal"
                  value={formData.initalBuySOL ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const numericValue =
                        value === '' ? '' : Number.parseFloat(value) || value;
                      handleInputChange('initalBuySOL', numericValue);
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Image URL *</Label>
              <Input
                id="image"
                value={formData.image || ''}
                onChange={(e) => handleInputChange('image', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="twitter">Twitter URL</Label>
                <Input
                  id="twitter"
                  value={formData.twitter || ''}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telegram">Telegram URL</Label>
                <Input
                  id="telegram"
                  value={formData.telegram || ''}
                  onChange={(e) =>
                    handleInputChange('telegram', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                {hasChanges ? 'Cancel Changes' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={
                  result?.step === 'awaiting-confirmation' &&
                  !hasChanges &&
                  !formData.image?.trim()
                }
              >
                {confirmButtonText}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ArrowRight className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {result?.step === 'processing'
                  ? 'Processing Launch'
                  : 'Launch Failed'}
              </h3>
              <div className="text-sm text-muted-foreground">
                {result?.step === 'processing'
                  ? 'Please wait while we process your token launch'
                  : 'Something went wrong while launching your token'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
  truncateLength?: number;
  link?: string;
}

function DetailItem({
  label,
  value,
  truncateLength = 4,
  link,
}: DetailItemProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card/50 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-fit cursor-help font-mono text-sm">
                {truncate(value, truncateLength)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] break-all">
              <p className="font-mono">{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8"
                onClick={() => copyToClipboard(value)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied!' : 'Copy'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {link && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  onClick={() => window.open(link, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
