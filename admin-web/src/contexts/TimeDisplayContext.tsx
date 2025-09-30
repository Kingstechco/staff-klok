'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimeDisplayContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const TimeDisplayContext = createContext<TimeDisplayContextType | undefined>(undefined);

export function TimeDisplayProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('timeDisplayCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('timeDisplayCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapsed = () => setIsCollapsed(!isCollapsed);

  return (
    <TimeDisplayContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      {children}
    </TimeDisplayContext.Provider>
  );
}

export function useTimeDisplay() {
  const context = useContext(TimeDisplayContext);
  if (context === undefined) {
    throw new Error('useTimeDisplay must be used within a TimeDisplayProvider');
  }
  return context;
}