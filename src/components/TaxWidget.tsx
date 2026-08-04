import { useNavigate } from 'react-router-dom';
import { Receipt, ChevronRight } from 'lucide-react';
import { TaxDocumentService } from '@/services/TaxDocumentService';

const TaxWidget = () => {
  const navigate = useNavigate();
  const documents = TaxDocumentService.getAllDocuments();
  const total = documents.length;

  if (total === 0) {
    return (
      <button
        onClick={() => navigate('/tax-documents')}
        className="w-full mb-6 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Tax Documents</p>
            <p className="text-xs text-muted-foreground">Keep records ready for whoever handles taxes.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  const recent = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate('/tax-documents')}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tax Documents</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({total}) <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <div className="space-y-2">
        {recent.map(doc => (
          <button
            key={doc.id}
            onClick={() => navigate('/tax-documents')}
            className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
          >
            <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground truncate">{doc.year}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaxWidget;
