import { Card, CardContent } from '@/components/ui/card';
import { SwapDataResult } from '@/types/stream';

import { SwapForm } from './swap-form';

interface SwapCardProps {
  data: {
    success: boolean;
    result: SwapDataResult;
  };
  addToolResult: (result: SwapDataResult) => void;
}

export function SwapCard({ data, addToolResult }: SwapCardProps) {
  if (!data) return null;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="p-4 sm:p-6">
        <SwapForm data={data} onSwap={addToolResult} />
      </CardContent>
    </Card>
  );
}
