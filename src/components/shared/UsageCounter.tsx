interface UsageCounterProps {
  count: number;
  limit: number;
  label: string;
  variant?: 'standalone' | 'inline';
  className?: string;
}

const UsageCounter = ({ count, limit, label, variant = 'standalone', className }: UsageCounterProps) => {
  if (limit === Infinity) return null;

  const text = `${count} / ${limit} ${label} used`;

  if (variant === 'inline') {
    return (
      <>
        {' · '}
        <span className={className}>{text}</span>
      </>
    );
  }

  return <p className={`text-sm text-muted-foreground mb-4${className ? ` ${className}` : ''}`}>{text}</p>;
};

export default UsageCounter;
