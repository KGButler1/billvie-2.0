import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import HouseholdRecordRow from '@/components/HouseholdRecordRow';
import { SkeletonCard } from '@/components/ui/skeleton';

const TaxWidget = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => !TaxDocumentService.isLoaded());
  useEffect(() => { if (TaxDocumentService.isLoaded()) setIsLoading(false); });
  if (isLoading) return <SkeletonCard className="mb-2" />;
  const documents = TaxDocumentService.getAllDocuments();
  const total = documents.length;

  if (total === 0) {
    return (
      <HouseholdRecordRow
        icon={Receipt}
        label="Tax Documents"
        description="Keep records ready for whoever handles taxes"
        onClick={() => navigate('/tax-documents')}
      />
    );
  }

  const recent = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const description =
    total > 1
      ? `${recent?.name ?? ''} · ${total} total`
      : recent?.name ?? `${total} document${total !== 1 ? 's' : ''}`;

  return (
    <HouseholdRecordRow
      icon={Receipt}
      label="Tax Documents"
      description={description}
      onClick={() => navigate('/tax-documents')}
    />
  );
};

export default TaxWidget;
