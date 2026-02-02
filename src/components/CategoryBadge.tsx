import { BillCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/bill';
import { cn } from '@/lib/utils';
import { CustomBillOptionsService } from '@/services/CustomBillOptionsService';

interface CategoryBadgeProps {
  category: BillCategory | string;
  className?: string;
}

const CategoryBadge = ({ category, className }: CategoryBadgeProps) => {
  // Check if it's a built-in category
  const isBuiltIn = category in CATEGORY_LABELS;
  
  let label: string;
  let color: string;
  
  if (isBuiltIn) {
    label = CATEGORY_LABELS[category as BillCategory];
    color = CATEGORY_COLORS[category as BillCategory];
  } else {
    // Custom category - look up the label
    const customCategories = CustomBillOptionsService.getCustomCategories();
    const custom = customCategories.find(c => c.id === category);
    label = custom?.label || category;
    color = 'hsl(var(--primary))'; // Use primary color for custom categories
  }
  
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
      {label}
    </span>
  );
};

export default CategoryBadge;
