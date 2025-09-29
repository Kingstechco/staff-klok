'use client';

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'oklok-button-primary';
      case 'secondary':
        return 'oklok-button-secondary';
      case 'danger':
        return 'oklok-button-danger';
      case 'success':
        return 'oklok-button-success';
      default:
        return 'oklok-button-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'md':
        return 'px-4 py-2 text-base';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${getVariantClass()} ${getSizeClass()} ${className} ${
        isDisabled ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <LoadingSpinner size="sm" color={variant === 'secondary' ? 'primary' : 'white'} className="mr-2" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}