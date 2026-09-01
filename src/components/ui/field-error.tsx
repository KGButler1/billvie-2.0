interface FieldErrorProps {
  message?: string | null;
}

const FieldError = ({ message }: FieldErrorProps) => {
  if (!message) return null;
  return <p className="text-sm text-[hsl(var(--destructive))]">{message}</p>;
};

export default FieldError;
