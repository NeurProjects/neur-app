'use client';

import { useEffect, useRef } from 'react';

import { useChat } from 'ai/react';

import { useStreamingState } from '@/hooks/use-streaming-state';

import type { DataStreamDelta } from '../types/stream';

interface DataStreamHandlerProps {
  id: string;
}

function isDataStreamDelta(value: unknown): value is DataStreamDelta {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'type' in obj && 'content' in obj && 'toolCallId' in obj;
}

export function DataStreamHandler({ id }: DataStreamHandlerProps) {
  // Grab the latest chat data for this specific conversation ID
  const { data: dataStream } = useChat({ id });

  // Keep track of how many deltas we've processed so far
  const lastProcessedIndex = useRef(-1);

  // Zustand store methods & per-ID state
  const { setStreamingState, resetById } = useStreamingState();

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      if (!isDataStreamDelta(delta)) return;
      const { type, content, toolCallId, status } = delta;

      if (type === 'stream-result-data') {
        setStreamingState(toolCallId, {
          status: status ?? 'streaming',
          result: content,
          toolCallId,
        });
      }
    });
  }, [dataStream, id, setStreamingState]);

  // Reset only this ID’s state when this component unmounts or ID changes
  useEffect(() => {
    return () => {
      resetById(id);
    };
  }, [id, resetById]);

  return null;
}
