import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { DocumentService } from '@/services/DocumentService';
import { HouseholdDocument } from '@/types/document';
import { isDemoModeActive } from '@/demo/demoFlag';
import HouseholdRecordRow from '@/components/HouseholdRecordRow';

const DocumentsWidget = () => {
  const navigate = useNavigate();
  const recent = DocumentService.getRecent(3);
  const total = DocumentService.getCount();
  const go = () => navigate(isDemoModeActive() ? '/demo/documents' : '/documents');

  if (total === 0) {
    return (
      <button
        onClick={go}
        className="w-full mb-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Important Documents</p>
            <p className="text-xs text-muted-foreground">Add something your household may need to find</p>
          </div>
        </div>
      </button>
    );
  }

  const latest = recent[0] as HouseholdDocument | undefined;
  const description = latest
    ? total > 1
      ? `${latest.title} · ${total} total`
      : latest.title
    : `${total} document${total !== 1 ? 's' : ''}`;

  return (
    <HouseholdRecordRow
      icon={FolderOpen}
      label="Important Documents"
      description={description}
      onClick={go}
    />
  );
};

export default DocumentsWidget;
