import { useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronRight, Shield, TrendingUp, Building, Landmark, FileText, File } from 'lucide-react';
import { DocumentService } from '@/services/DocumentService';
import { HouseholdDocument, DocumentType } from '@/types/document';
import { isDemoModeActive } from '@/demo/demoFlag';

const typeIcons: Record<DocumentType, React.ElementType> = {
  insurance: Shield,
  investment: TrendingUp,
  account: Building,
  superannuation: Landmark,
  will: FileText,
  other: File,
};

const DocumentsWidget = () => {
  const navigate = useNavigate();
  const recent = DocumentService.getRecent(3);
  const total = DocumentService.getCount();

  if (total === 0) {
    return (
      <button
        onClick={() => navigate(isDemoModeActive() ? '/demo/documents' : '/documents')}
        className="w-full mb-6 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Important Documents</p>
            <p className="text-xs text-muted-foreground">Add something your household may need to find</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate(isDemoModeActive() ? '/demo/documents' : '/documents')}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Important Documents</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({total}) <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <div className="space-y-2">
        {recent.map((doc) => {
          const Icon = typeIcons[doc.type] || File;
          return (
            <button
              key={doc.id}
              onClick={() => navigate(isDemoModeActive() ? '/demo/documents' : '/documents')}
              className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                {doc.provider && <p className="text-xs text-muted-foreground truncate">{doc.provider}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentsWidget;
