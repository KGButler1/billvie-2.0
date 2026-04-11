import { useNavigate } from 'react-router-dom';
import { UserCheck, ChevronRight } from 'lucide-react';
import { DocumentService } from '@/services/DocumentService';

const AdvisorWidget = () => {
  const navigate = useNavigate();
  const advisorCount = DocumentService.getAdvisorItems().length;

  if (advisorCount === 0) return null;

  return (
    <button
      onClick={() => navigate('/advisor')}
      className="w-full mb-6 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Shared with Advisor</p>
          <p className="text-xs text-muted-foreground">{advisorCount} item{advisorCount !== 1 ? 's' : ''} marked for your advisor</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
};

export default AdvisorWidget;
