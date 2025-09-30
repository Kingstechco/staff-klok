'use client';

import { useState, useEffect } from 'react';

interface TimeDisplayProps {
  className?: string;
  collapsible?: boolean;
}

export default function TimeDisplay({ className = '', collapsible = false }: TimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24HourFormat, setIs24HourFormat] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time based on user preference
  const formatTime = (date: Date) => {
    if (is24HourFormat) {
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
    } else {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
    }
  };

  // Get timezone abbreviation
  const getTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const shortTimezone = new Date().toLocaleTimeString('en-us', {timeZoneName:'short'}).split(' ')[2];
    return { full: timezone, short: shortTimezone };
  };

  const timezone = getTimezone();

  return (
    <div className={`inline-flex flex-col bg-gradient-to-br from-white/90 to-slate-50/80 rounded-2xl border border-slate-200/60 shadow-xl backdrop-blur-sm group hover:shadow-2xl hover:shadow-slate-500/10 transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-5'} ${collapsible ? 'relative' : ''} ${className}`}>
      {/* Collapse Toggle Button */}
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-2 left-2 p-1 rounded-lg hover:bg-slate-100/80 transition-all duration-300 hover:shadow-md z-10"
          title={isCollapsed ? 'Expand time card' : 'Collapse time card'}
        >
          <div className={`h-3 w-3 text-slate-500 hover:text-indigo-600 transition-all duration-300 transform ${isCollapsed ? 'rotate-180' : ''}`}>
            <ChevronUpIcon className="h-3 w-3" />
          </div>
        </button>
      )}
      
      {isCollapsed ? (
        <div className="flex items-center gap-2">
          {/* Compact Time Display */}
          <div className="text-lg font-black font-mono bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-indigo-800 transition-all duration-500">
            {formatTime(currentTime).split(':').slice(0, 2).join(':')}
          </div>
          {/* Status Indicator */}
          <div className="relative">
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-lg" />
            <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
          </div>
        </div>
      ) : (
        <>
          {/* Time Format Toggle */}
          <div className="flex items-center gap-2 mb-3 ml-auto">
            <button
              onClick={() => setIs24HourFormat(!is24HourFormat)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-200 hover:from-indigo-100 hover:to-purple-100 text-slate-600 hover:text-indigo-700 rounded-lg border border-slate-300/60 hover:border-indigo-300/60 transition-all duration-300 hover:shadow-md hover:scale-105"
              title={`Switch to ${is24HourFormat ? '12-hour' : '24-hour'} format`}
            >
              <ClockIcon className="h-3 w-3" />
              <span>{is24HourFormat ? '24H' : '12H'}</span>
            </button>
            <div className="h-4 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{timezone.short}</span>
          </div>
          
          {/* Main Time Display */}
          <div className="text-3xl font-black font-mono bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:via-purple-600 group-hover:to-indigo-800 transition-all duration-500">
            {formatTime(currentTime)}
          </div>
          
          {/* Status Indicator and Label */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-lg" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Live</p>
          </div>
          
          {/* Date Display */}
          <div className="mt-2 text-xs font-medium text-slate-500 text-center border-t border-slate-200/60 pt-2 w-full">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Icon Components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}