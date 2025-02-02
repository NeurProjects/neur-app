interface SwapDataResult {
  inputToken: { symbol: string } | null;
  outputToken: { symbol: string } | null;
  price: number | null;
}

interface SwapDetailsProps {
  result: SwapDataResult;
  isCompleted: boolean;
  countdown: number | null;
  swapButtonText: string;
  onConfirm: () => void;
}

function SwapDetails({
  result,
  isCompleted,
  countdown,
  swapButtonText,
  onConfirm,
}: SwapDetailsProps) {
  return (
    <div>
      <h1>Swap Details</h1>
      <p>Is Completed: {isCompleted.toString()}</p>
      <p>Countdown: {countdown ? countdown.toString() : 'N/A'}</p>
      <p>
        <span>
          1 {result.inputToken?.symbol} = {result.price?.toFixed(2) || '??'}{' '}
          {result.outputToken?.symbol}
        </span>
      </p>
      <button onClick={onConfirm} disabled={isCompleted}>
        {swapButtonText}
      </button>
    </div>
  );
}

export default SwapDetails;
