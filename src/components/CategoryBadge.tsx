import { BillCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/bill';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: BillCategory;
  className?: string;
}

const CategoryBadge = ({ category, className }: CategoryBadgeProps) => {
  const color = CATEGORY_COLORS[category];
  
  return (
    <span 
      className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
};

export default CategoryBadge;
