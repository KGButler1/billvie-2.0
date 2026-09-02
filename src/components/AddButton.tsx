import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddButtonProps {
  label: string;
  onClick: () => void;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const AddButton = ({ label, onClick, size = 'sm', className }: AddButtonProps) => {
  return (
    <Button size={size} onClick={onClick} className={`gap-1.5 ${className ?? ''}`}>
      <Plus className="w-4 h-4" />
      {label}
    </Button>
  );
};

export default AddButton;
