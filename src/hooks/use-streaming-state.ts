'use client';

import { create } from 'zustand';

import { CreateActionDataResult, SwapDataResult } from '@/types/stream';

export interface StreamingState {
  status: 'idle' | 'streaming' | 'completed' | string;
  result: SwapDataResult | CreateActionDataResult | null;
  toolCallId: string | null;
}

interface StreamingStateById {
  [id: string]: StreamingState;
}

interface StreamingStateStore {
  statesById: StreamingStateById;
  setStreamingState: (id: string, newState: Partial<StreamingState>) => void;
  resetById: (id: string) => void;
  resetAll: () => void;
}

const initialState: StreamingState = {
  status: 'idle',
  result: null,
  toolCallId: null,
};

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Recursively merges two objects.
 * B properties override A if there is a conflict,
 * but nested objects are merged individually.
 */
function deepMerge<
  A extends Record<string, any>,
  B extends Record<string, any>,
>(a: A, b: B): Record<string, any> {
  const result: Record<string, any> = { ...a };

  for (const key of Object.keys(b)) {
    if (isObject(b[key]) && isObject(a[key])) {
      result[key] = deepMerge(a[key], b[key]);
    } else {
      result[key] = b[key];
    }
  }

  return result;
}

export const useStreamingState = create<StreamingStateStore>((set) => ({
  statesById: {},
  setStreamingState: (id, newState) =>
    set((store: StreamingStateStore): Partial<StreamingStateStore> => {
      const existing = store.statesById[id] || initialState;
      const mergedResult = deepMerge(existing || {}, newState || {});
      return {
        statesById: {
          ...store.statesById,
          [id]: mergedResult as StreamingState,
        },
      };
    }),
  resetById: (id) =>
    set((store) => ({
      statesById: {
        ...store.statesById,
        [id]: { ...initialState },
      },
    })),
  resetAll: () => set({ statesById: {} }),
}));
