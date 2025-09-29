'use client';

import React from 'react';

interface OklokLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'monochrome';
  showText?: boolean;
  className?: string;
}

const OklokLogo: React.FC<OklokLogoProps> = ({ 
  size = 'md', 
  variant = 'default',
  showText = true,
  className = '' 
}) => {
  const sizeMap = {
    sm: { width: 80, height: 24, fontSize: '16px' },
    md: { width: 120, height: 36, fontSize: '24px' },
    lg: { width: 160, height: 48, fontSize: '32px' },
    xl: { width: 200, height: 60, fontSize: '40px' }
  };

  const colorMap = {
    default: '#4a5568',
    white: '#ffffff',
    monochrome: '#000000'
  };

  const dimensions = sizeMap[size];
  const color = colorMap[variant];

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letter O */}
        <path
          d="M8 30C8 19.5066 15.5066 12 26 12C36.4934 12 44 19.5066 44 30C44 40.4934 36.4934 48 26 48C15.5066 48 8 40.4934 8 30Z"
          stroke={color}
          strokeWidth="4"
          fill="none"
        />
        
        {/* Letter k */}
        <rect x="52" y="12" width="4" height="36" fill={color} />
        <path
          d="M56 27L68 15H74L62 27L74 39H68L56 27Z"
          fill={color}
        />
        
        {/* Letter l */}
        <rect x="82" y="12" width="4" height="36" fill={color} />
        
        {/* Letter o with clock - outer circle */}
        <circle
          cx="104"
          cy="30"
          r="18"
          stroke={color}
          strokeWidth="4"
          fill="none"
        />
        
        {/* Clock hands inside the 'o' */}
        <g stroke={color} strokeWidth="2" strokeLinecap="round">
          {/* Hour hand pointing to 10 */}
          <line x1="104" y1="30" x2="98" y2="22" />
          {/* Minute hand pointing to 2 */}
          <line x1="104" y1="30" x2="112" y2="18" />
          {/* Center dot */}
          <circle cx="104" cy="30" r="2" fill={color} />
        </g>
        
        {/* Letter k */}
        <rect x="130" y="12" width="4" height="36" fill={color} />
        <path
          d="M134 27L146 15H152L140 27L152 39H146L134 27Z"
          fill={color}
        />
      </svg>
      
      {showText && size === 'sm' && (
        <span 
          className="ml-2 font-semibold"
          style={{ color, fontSize: '14px' }}
        >
          Oklok
        </span>
      )}
    </div>
  );
};

export default OklokLogo;