'use client';

import React from 'react';

interface OklokIconProps {
  size?: number;
  variant?: 'default' | 'white' | 'monochrome';
  className?: string;
}

const OklokIcon: React.FC<OklokIconProps> = ({ 
  size = 32, 
  variant = 'default',
  className = '' 
}) => {
  const colorMap = {
    default: '#4a5568',
    white: '#ffffff',
    monochrome: '#000000'
  };

  const color = colorMap[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Clock circle */}
      <circle
        cx="18"
        cy="18"
        r="16"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      
      {/* Clock hands */}
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        {/* Hour hand pointing to 10 */}
        <line x1="18" y1="18" x2="13" y2="10" />
        {/* Minute hand pointing to 2 */}
        <line x1="18" y1="18" x2="25" y2="8" />
        {/* Center dot */}
        <circle cx="18" cy="18" r="2" fill={color} />
      </g>
    </svg>
  );
};

export default OklokIcon;