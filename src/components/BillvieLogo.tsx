import { cn } from '@/lib/utils';

const WORDMARK_URL =
  'https://bjlsespfbaqkwxbrjpwd.supabase.co/storage/v1/object/public/branding/billvie-wordmark.webp';

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
      <img
        src={WORDMARK_URL}
        alt="Billvie"
        className={cn(sizeMap[size], 'w-auto object-contain')}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
    </div>
  );
};

export default BillvieLogo;
