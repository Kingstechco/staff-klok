'use client';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`oklok-empty-state ${className}`}>
      {Icon && (
        <Icon className="oklok-empty-state-icon" aria-hidden="true" />
      )}
      <h3 className="oklok-empty-state-title">{title}</h3>
      <p className="oklok-empty-state-description">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className={`oklok-button-${action.variant || 'primary'}`}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

function DefaultEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

EmptyState.defaultProps = {
  icon: DefaultEmptyIcon
};