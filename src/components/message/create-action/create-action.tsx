'use client';

import { useEffect, useState } from 'react';

import { addSeconds, format } from 'date-fns';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { CreateActionDataResult } from '@/types/stream';

const TIME_UNITS = {
  second: 1,
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
} as const;

type TimeUnit = keyof typeof TIME_UNITS;

const OFFSET_UNITS = {
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
} as const;

type OffsetUnit = keyof typeof OFFSET_UNITS;

export default function CreateActionMessage({
  data,
  addToolResult,
}: {
  data: {
    success: boolean;
    result: CreateActionDataResult | null;
  };
  addToolResult: (result: CreateActionDataResult) => void;
}) {
  const [message, setMessage] = useState(data?.result?.message || '');
  const [frequency, setFrequency] = useState<number>(
    data?.result?.frequency || TIME_UNITS.hour,
  );
  const [frequencyValue, setFrequencyValue] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState<TimeUnit>('hour');
  const [startTimeOffset, setStartTimeOffset] = useState<number>(
    data?.result?.startTimeOffset || 0,
  );
  const [offsetValue, setOffsetValue] = useState('0');
  const [offsetUnit, setOffsetUnit] = useState<OffsetUnit>('minute');
  const [hasChanges, setHasChanges] = useState(false);
  const [nextExecutionTime, setNextExecutionTime] = useState('');

  // Move all useEffect hooks before any conditional returns
  useEffect(() => {
    if (data?.result?.message) {
      setMessage(data.result.message);
    }
  }, [data?.result?.message]);

  useEffect(() => {
    if (data?.result?.frequency) {
      // Find the largest unit that divides evenly into the frequency
      let value: number;
      let unit: TimeUnit;

      if (data.result.frequency % TIME_UNITS.day === 0) {
        value = data.result.frequency / TIME_UNITS.day;
        unit = 'day';
      } else if (data.result.frequency % TIME_UNITS.hour === 0) {
        value = data.result.frequency / TIME_UNITS.hour;
        unit = 'hour';
      } else if (data.result.frequency % TIME_UNITS.minute === 0) {
        value = data.result.frequency / TIME_UNITS.minute;
        unit = 'minute';
      } else {
        value = data.result.frequency; // Use the original seconds value
        unit = 'second';
      }

      setFrequencyValue(value.toString());
      setFrequencyUnit(unit);
      setFrequency(data.result.frequency);
    }
  }, [data?.result?.frequency]);

  useEffect(() => {
    if (data?.result?.startTimeOffset) {
      let value: number;
      let unit: OffsetUnit;

      if (data.result.startTimeOffset % OFFSET_UNITS.day === 0) {
        value = data.result.startTimeOffset / OFFSET_UNITS.day;
        unit = 'day';
      } else if (data.result.startTimeOffset % OFFSET_UNITS.hour === 0) {
        value = data.result.startTimeOffset / OFFSET_UNITS.hour;
        unit = 'hour';
      } else {
        value = data.result.startTimeOffset / OFFSET_UNITS.minute;
        unit = 'minute';
      }

      setOffsetValue(value.toString());
      setOffsetUnit(unit);
      setStartTimeOffset(data.result.startTimeOffset);
    }
  }, [data?.result?.startTimeOffset]);

  useEffect(() => {
    if (data?.result?.step === 'completed') return;

    const calculateNextExecution = () => {
      const now = new Date();
      const startTime = addSeconds(now, startTimeOffset);
      return format(startTime, 'PPpp');
    };

    setNextExecutionTime(calculateNextExecution());

    // Update every second if the offset is less than a minute
    if (startTimeOffset < 60000) {
      const interval = setInterval(() => {
        setNextExecutionTime(calculateNextExecution());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTimeOffset, data?.result?.step]);

  if (!data) return null;
  const { result } = data;

  const step = result?.step ?? 'tool-search';

  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    setHasChanges(true);
  };

  const handleFrequencyChange = (value: string, unit: TimeUnit) => {
    const numValue = Number.parseInt(value) || 0;
    setFrequencyValue(value);
    setFrequencyUnit(unit);
    // Convert to seconds for storage
    const newFrequency =
      unit === 'second' ? numValue : (numValue * TIME_UNITS[unit]) / 1000;
    setFrequency(newFrequency);
    setHasChanges(true);
  };

  const handleOffsetChange = (value: string, unit: OffsetUnit) => {
    const numValue = Number.parseInt(value) || 0;
    setOffsetValue(value);
    setOffsetUnit(unit);
    const newOffset = numValue * OFFSET_UNITS[unit];
    setStartTimeOffset(newOffset);
    setHasChanges(true);
  };

  const onSaveChanges = async () => {
    if (!message.trim() || !frequency) return;

    addToolResult({
      ...result,
      message,
      frequency,
      startTimeOffset,
    });
    setHasChanges(false);
  };

  const onConfirm = async () => {
    addToolResult({
      ...result,
      message,
      frequency,
      startTimeOffset,
      step: 'confirmed',
    });
  };

  const onCancel = () => {
    if (hasChanges) {
      // Cancel changes
      setMessage(result?.message || '');
      if (result?.frequency) {
        setFrequency(result.frequency);
        // Recalculate the frequency value and unit
        if (result.frequency % TIME_UNITS.day === 0) {
          setFrequencyValue((result.frequency / TIME_UNITS.day).toString());
          setFrequencyUnit('day');
        } else if (result.frequency % TIME_UNITS.hour === 0) {
          setFrequencyValue((result.frequency / TIME_UNITS.hour).toString());
          setFrequencyUnit('hour');
        } else {
          setFrequencyValue((result.frequency / TIME_UNITS.minute).toString());
          setFrequencyUnit('minute');
        }
      }
      if (result?.startTimeOffset) {
        setStartTimeOffset(result.startTimeOffset);
        if (result.startTimeOffset % OFFSET_UNITS.day === 0) {
          setOffsetValue(
            (result.startTimeOffset / OFFSET_UNITS.day).toString(),
          );
          setOffsetUnit('day');
        } else if (result.startTimeOffset % OFFSET_UNITS.hour === 0) {
          setOffsetValue(
            (result.startTimeOffset / OFFSET_UNITS.hour).toString(),
          );
          setOffsetUnit('hour');
        } else {
          setOffsetValue(
            (result.startTimeOffset / OFFSET_UNITS.minute).toString(),
          );
          setOffsetUnit('minute');
        }
      }
      setHasChanges(false);
    } else {
      // Cancel creation
      addToolResult({
        ...result,
        step: 'canceled',
        message: 'Action creation cancelled',
      });
    }
  };

  const getStepIcon = () => {
    switch (result?.step) {
      case 'tool-search':
        return <Search className="h-5 w-5 animate-pulse text-blue-500" />;
      case 'updating':
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      case 'confirmed':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-purple-500" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStepMessage = () => {
    if (result?.name) return result.name;

    switch (result?.step) {
      case 'tool-search':
        return 'Searching for required tools...';
      case 'updating':
        return 'Updating action configuration...';
      case 'confirmed':
        return 'Waiting for confirmation...';
      case 'processing':
        return 'Processing action...';
      case 'completed':
        return 'Action completed successfully!';
      case 'failed':
        return 'Action failed to complete.';
      default:
        return 'Initializing...';
    }
  };

  const getStatusColor = () => {
    switch (result?.step) {
      case 'tool-search':
        return 'bg-blue-500/10';
      case 'updating':
        return 'bg-yellow-500/10';
      case 'confirmed':
        return 'bg-orange-500/10';
      case 'processing':
        return 'bg-purple-500/10';
      case 'completed':
        return 'bg-green-500/10';
      case 'failed':
        return 'bg-red-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  const formatFrequency = (value: string, unit: TimeUnit) => {
    const num = Number.parseInt(value);
    if (num === 1) {
      return `Every ${unit}`;
    }
    return `Every ${value} ${unit}s`;
  };

  const formatOffset = (value: string, unit: OffsetUnit) => {
    const num = Number.parseInt(value);
    if (num === 0) return 'No delay';
    if (num === 1) {
      return `After ${unit}`;
    }
    return `After ${value} ${unit}s`;
  };

  if (result?.step === 'completed') {
    return (
      <Card className="w-full">
        <CardHeader className="border-b bg-muted">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">
                {getStepMessage()}
              </CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  Action Created
                </Badge>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted-foreground/20 px-2 py-1 text-xs">
                {result.actionId}
              </code>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6">
          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Description
            </h3>
            <p className="font-medium">{message}</p>
          </div>

          {/* Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Configuration
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {/* Frequency Display */}
                <div className="space-y-1 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Frequency</div>
                  <div className="font-medium">
                    {formatFrequency(frequencyValue, frequencyUnit)}
                  </div>
                </div>

                {/* Start Time Offset Display */}
                <div className="space-y-1 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">
                    Start Time
                  </div>
                  <div className="font-medium">
                    {formatOffset(offsetValue, offsetUnit)}
                  </div>
                </div>
              </div>

              {/* Next Execution Time */}
              <div className="space-y-1 rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Next Execution
                </div>
                <div className="font-medium">{result.nextExecutionTime}</div>
              </div>

              {result.maxExecutions && (
                <div className="space-y-1 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">
                    Max Executions
                  </div>
                  <div className="font-medium">{result.maxExecutions}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tools Section */}
          {result.requiredTools && result.requiredTools.length > 0 && (
            <div className="space-y-3">
              <Collapsible>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Tools
                  </h3>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      <ChevronDown className="h-4 w-4" />
                      <span className="sr-only">Toggle tools</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.requiredTools.map((tool) => (
                      <div key={tool} className="rounded-lg border p-3">
                        <span className="font-medium">{tool}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader
        className={`${getStatusColor()} transition-colors duration-200`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStepIcon()}
            <CardTitle className="text-lg font-semibold">
              {getStepMessage()}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        {/* Message */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Action Details
          </h3>
          <Input
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Enter action description"
            className="font-medium"
          />
        </div>

        {/* Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Configuration
          </h3>
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Frequency Configuration */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Frequency</div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) =>
                      handleFrequencyChange(e.target.value, frequencyUnit)
                    }
                    className="w-20"
                  />
                  <Select
                    value={frequencyUnit}
                    onValueChange={(value: TimeUnit) =>
                      handleFrequencyChange(frequencyValue, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="second">Seconds</SelectItem>
                      <SelectItem value="minute">Minutes</SelectItem>
                      <SelectItem value="hour">Hours</SelectItem>
                      <SelectItem value="day">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Time Offset Configuration */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Start Time Offset
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={offsetValue}
                    onChange={(e) =>
                      handleOffsetChange(e.target.value, offsetUnit)
                    }
                    className="w-20"
                  />
                  <Select
                    value={offsetUnit}
                    onValueChange={(value: OffsetUnit) =>
                      handleOffsetChange(offsetValue, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minute">Minutes</SelectItem>
                      <SelectItem value="hour">Hours</SelectItem>
                      <SelectItem value="day">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Next Execution Time */}
            <div className="space-y-1 rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">
                First Execution
              </div>
              <div className="font-medium">
                {step === 'completed'
                  ? result?.nextExecutionTime
                  : nextExecutionTime}
              </div>
            </div>

            {/* Action ID - Show only when completed */}
            {step === 'completed' && result?.actionId && (
              <div className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Action ID
                </div>
                <div className="font-medium">{result.actionId}</div>
              </div>
            )}

            {result?.maxExecutions && (
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  Max Executions
                </div>
                <div className="font-medium">{result.maxExecutions}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tools Section */}
        {(result?.requiredTools || result?.missingTools) && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Tools
              </h3>

              {/* Required Tools */}
              {result?.requiredTools && result.requiredTools.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Required</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.requiredTools.map((tool) => (
                      <div
                        key={tool}
                        className="rounded-lg border bg-secondary/20 p-3"
                      >
                        <span className="font-medium">{tool}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Tools */}
              {result?.missingTools && result.missingTools.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Missing</div>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {result.missingTools.map((tool) => (
                          <div
                            key={tool}
                            className="rounded-lg bg-destructive/20 p-3"
                          >
                            <span className="font-medium">{tool}</span>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {step !== 'completed' && (
          <div className="flex justify-end gap-2">
            {hasChanges ? (
              <>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={onSaveChanges}
                  disabled={
                    !message.trim() ||
                    !frequency ||
                    Number.parseInt(frequencyValue) < 1
                  }
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={
                    !message.trim() ||
                    !frequency ||
                    Number.parseInt(frequencyValue) < 1 ||
                    (result?.missingTools && result?.missingTools?.length > 0)
                  }
                >
                  Create Action
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
