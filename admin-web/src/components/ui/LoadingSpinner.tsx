'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { width: 16, height: 16, strokeWidth: 1.5 };
      case 'md':
        return { width: 20, height: 20, strokeWidth: 2 };
      case 'lg':
        return { width: 24, height: 24, strokeWidth: 2 };
    }
  };

  const getColor = () => {
    switch (color) {
      case 'primary':
        return '#4F46E5'; // indigo-600
      case 'white':
        return '#FFFFFF';
      case 'gray':
        return '#6B7280'; // gray-500
    }
  };

  const { width, height, strokeWidth } = getSizeConfig();
  const strokeColor = getColor();

  return (
    <div 
      className={`inline-block ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="oklok-clock-spinner"
      >
        {/* Clock face */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.3"
        />
        
        {/* Clock tick marks */}
        <g stroke={strokeColor} strokeWidth={strokeWidth * 0.8} opacity="0.4">
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="22" y1="12" x2="20" y2="12" />
          <line x1="12" y1="22" x2="12" y2="20" />
          <line x1="2" y1="12" x2="4" y2="12" />
        </g>
        
        {/* Spinning minute hand */}
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="6"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="oklok-clock-minute-hand"
        />
        
        {/* Spinning hour hand */}
        <line
          x1="12"
          y1="12"
          x2="15"
          y2="9"
          stroke={strokeColor}
          strokeWidth={strokeWidth * 1.2}
          strokeLinecap="round"
          className="oklok-clock-hour-hand"
        />
        
        {/* Center dot */}
        <circle
          cx="12"
          cy="12"
          r={strokeWidth * 0.8}
          fill={strokeColor}
        />
      </svg>
      <span className="oklok-sr-only">Loading...</span>
    </div>
  );
}

export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`oklok-loading-dots ${className}`} role="status" aria-label="Loading">
      <div></div>
      <div></div>
      <div></div>
      <span className="oklok-sr-only">Loading...</span>
    </div>
  );
}

export function LoadingSkeleton({ 
  lines = 1, 
  className = '',
  height = 'h-4'
}: { 
  lines?: number; 
  className?: string;
  height?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i} 
          className={`oklok-skeleton ${height} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        ></div>
      ))}
      <span className="oklok-sr-only">Loading content...</span>
    </div>
  );
}