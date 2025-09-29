'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
}

export default function Input({
  label,
  error,
  helpText,
  required,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  const getInputClass = () => {
    if (error) {
      return 'oklok-input-error';
    }
    return 'oklok-input';
  };

  return (
    <div className="oklok-form-group">
      {label && (
        <label 
          htmlFor={inputId} 
          className={`oklok-label ${required ? 'oklok-label-required' : ''}`}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={`${getInputClass()} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim()}
        required={required}
      />
      {error && (
        <div id={errorId} className="oklok-form-error" role="alert">
          {error}
        </div>
      )}
      {helpText && (
        <div id={helpId} className="oklok-form-help">
          {helpText}
        </div>
      )}
    </div>
  );
}