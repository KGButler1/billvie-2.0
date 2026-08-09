import { ChevronRight } from 'lucide-react';

interface HouseholdRecordRowProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}

const HouseholdRecordRow = ({ icon: Icon, label, description, onClick }: HouseholdRecordRowProps) => (
  <button
    onClick={onClick}
    className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
  >
    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{label}</p>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
  </button>
);

export default HouseholdRecordRow;
