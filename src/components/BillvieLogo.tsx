import wordmark from '@/assets/billvie-wordmark.png.asset.json';
import { cn } from '@/lib/utils';

interface BillvieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-16',
};

export const BillvieLogo = ({ className, size = 'md' }: BillvieLogoProps) => {
  return (
    <div className={cn('flex items-center', className)}>
      <img src={wordmark.url} alt="Billvie" className={cn(sizeMap[size], 'w-auto object-contain')} />
    </div>
  );
};

export default BillvieLogo;
