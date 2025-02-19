'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { CheckCircledIcon, ChevronDownIcon } from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MODEL_PREFERENCE_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { updateUser } from '@/server/actions/user';

export function ModelSelector({
  selectedModelId = 'anthropic/claude-3.5-sonnet',
  className,
  mutate,
}: {
  selectedModelId?: string;
  mutate?: () => void;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const selectedModel = useMemo(
    () => MODEL_PREFERENCE_MAP[optimisticModelId],
    [optimisticModelId],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:h-[34px] md:px-2">
          {selectedModel}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {Object.keys(MODEL_PREFERENCE_MAP).map((modelId) => (
          <DropdownMenuItem
            key={modelId}
            onSelect={() => {
              setOpen(false);

              startTransition(() => {
                setOptimisticModelId(modelId);
                updateUser({ modelPreference: modelId });
                mutate?.();
              });
            }}
            className="group/item flex flex-row items-center justify-between gap-4"
            data-active={modelId === optimisticModelId}
          >
            <div className="flex flex-col items-start gap-1">
              {MODEL_PREFERENCE_MAP[modelId]}
            </div>
            <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
              <CheckCircledIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
