// src/components/AssistantContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import AssistantWidget from './AssistantWidget';

export type WillowScreen = 'landing' | 'selector' | 'loading' | 'coming-soon' | 'wizard' | 'results';

export interface ScreenContextValue {
  selectedStateCode: string | null;   // populated only when exactly one state
  stateName: string | null;           // populated only when exactly one state
  selectedStateCodes: string[];
  stateNames: string[];
  screen: WillowScreen;
}

const DEFAULT_SCREEN: ScreenContextValue = {
  selectedStateCode: null,
  stateName: null,
  selectedStateCodes: [],
  stateNames: [],
  screen: 'landing',
};

interface AssistantContextShape {
  screen: ScreenContextValue;
  publish: (next: ScreenContextValue) => void;
}

const AssistantScreenContext = createContext<AssistantContextShape | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<ScreenContextValue>(DEFAULT_SCREEN);
  const publish = useCallback((next: ScreenContextValue) => setScreen(next), []);
  return (
    <AssistantScreenContext.Provider value={{ screen, publish }}>
      {children}
      <AssistantWidget />
    </AssistantScreenContext.Provider>
  );
}

export function useAssistantScreen(): ScreenContextValue {
  return useContext(AssistantScreenContext)?.screen ?? DEFAULT_SCREEN;
}

export function usePublishScreen(): (next: ScreenContextValue) => void {
  const ctx = useContext(AssistantScreenContext);
  return ctx?.publish ?? (() => {});
}
