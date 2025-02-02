import { Card, CardContent } from '@/components/ui/card';
import type { TransferDataResult } from '@/types/stream';

import { TransferForm } from './transfer-form';

interface TransferCardProps {
  data: {
    success: boolean;
    result: TransferDataResult;
  };
  addToolResult: (result: TransferDataResult) => void;
}

export function TransferCard({ data, addToolResult }: TransferCardProps) {
  if (!data) return null;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="p-4 sm:p-6">
        <TransferForm data={data} onTransfer={addToolResult} />
      </CardContent>
    </Card>
  );
}
