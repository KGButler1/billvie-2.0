import { cn } from '@/lib/utils';

const WORDMARK_URL =
  'https://bjlsespfbaqkwxbrjpwd.supabase.co/storage/v1/object/public/branding/billvie-wordmark.png';
const ICON_URL =
  'https://bjlsespfbaqkwxbrjpwd.supabase.co/storage/v1/object/public/branding/billvie-icon.png';

interface BillvieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show just the icon instead of the full wordmark */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-14',
};

const iconSizeMap = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-14 h-14',
};

export const BillvieLogo = ({ className, size = 'md', iconOnly = false }: BillvieLogoProps) => {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={iconOnly ? ICON_URL : WORDMARK_URL}
        alt="Billvie"
        className={cn(
          iconOnly ? iconSizeMap[size] : sizeMap[size],
          'w-auto object-contain',
        )}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
    </div>
  );
};

export default BillvieLogo;
