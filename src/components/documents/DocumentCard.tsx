import { Shield, TrendingUp, Building, Landmark, FileText, File, Eye, Lock, UserCheck, Trash2, Paperclip, Link2, MapPin } from 'lucide-react';
import { HouseholdDocument, DocumentType } from '@/types/document';
import { Badge } from '@/components/ui/badge';

const typeIcons: Record<DocumentType, React.ElementType> = {
  insurance: Shield,
  investment: TrendingUp,
  account: Building,
  superannuation: Landmark,
  will: FileText,
  other: File,
};

interface DocumentCardProps {
  document: HouseholdDocument;
  onToggleAdvisor: (id: string) => void;
  onDelete: (id: string) => void;
  onAttach: (id: string) => void;
}

const DocumentCard = ({ document, onToggleAdvisor, onDelete, onAttach }: DocumentCardProps) => {
  const Icon = typeIcons[document.type] || File;
  const hasAttachment = !!(document.attachment || document.externalLink || document.physicalLocation);


  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate">{document.title}</h3>
              {document.provider && (
                <p className="text-xs text-muted-foreground truncate">{document.provider}</p>
              )}
              <div className="mt-1 space-y-0.5">
                {document.attachment && (
                  <a
                    href={document.attachment.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-w-0"
                  >
                    <Paperclip className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{document.attachment.name}</span>
                  </a>
                )}
                {document.externalLink && (
                  <a
                    href={document.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3 flex-shrink-0" /> Opens at provider
                  </a>
                )}
                {document.physicalLocation && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{document.physicalLocation}</span>
                  </p>
                )}
                {!hasAttachment && (
                  <button
                    onClick={() => onAttach(document.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Add the document itself
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {document.visibility === 'shared' ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <Eye className="w-3 h-3" /> Shared
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                  <Lock className="w-3 h-3" /> Private
                </Badge>
              )}
              {document.markedForAdvisor && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-primary/10 text-primary">
                  <UserCheck className="w-3 h-3" /> Advisor
                </Badge>
              )}
            </div>
          </div>
          {document.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{document.notes}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onToggleAdvisor(document.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {document.markedForAdvisor ? 'Remove from advisor' : 'Share with advisor'}
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => onDelete(document.id)}
              className="text-xs text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
