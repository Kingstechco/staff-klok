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
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'oklok-spinner-sm';
      case 'md':
        return 'oklok-spinner';
      case 'lg':
        return 'oklok-spinner-lg';
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'primary':
        return '';
      case 'white':
        return 'oklok-spinner-white';
      case 'gray':
        return 'border-gray-400 border-t-transparent';
    }
  };

  return (
    <div 
      className={`${getSizeClass()} ${getColorClass()} ${className}`}
      role="status"
      aria-label="Loading"
    >
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