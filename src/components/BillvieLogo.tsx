import logoIcon from '@/assets/billvie-logo.png.asset.json';
import wordmark from '@/assets/billvie-wordmark.png.asset.json';
import { cn } from '@/lib/utils';

interface BillvieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon' | 'wordmark';
}

const sizeMap = {
  sm: { icon: 'h-6', word: 'h-8' },
  md: { icon: 'h-8', word: 'h-10' },
  lg: { icon: 'h-12', word: 'h-16' },
};

export const BillvieLogo = ({ className, size = 'md', variant = 'full' }: BillvieLogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {variant !== 'wordmark' && (
        <img src={logoIcon.url} alt="Billvie" className={cn(s.icon, 'w-auto object-contain')} />
      )}
      {variant !== 'icon' && (
        <img src={wordmark.url} alt="Billvie" className={cn(s.word, 'w-auto object-contain')} />
      )}
    </div>
  );
};

export default BillvieLogo;
