import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import HouseholdRecordRow from '@/components/HouseholdRecordRow';
import { SkeletonCard } from '@/components/ui/skeleton';

const AdvisorWidget = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => !(PeopleService.isLoaded() && DocumentService.isLoaded() && AccessService.isLoaded()));
  useEffect(() => { if (PeopleService.isLoaded() && DocumentService.isLoaded() && AccessService.isLoaded()) setIsLoading(false); });
  if (isLoading) return <SkeletonCard className="mb-2" />;
  const professionals = PeopleService.getAll().filter(
    (p) => p.role === 'advisor' || p.role === 'accountant'
  );
  const advisorCount = DocumentService.getAll().filter((doc) =>
    professionals.some((p) => AccessService.canSee(p.id, 'documents', doc.id))
  ).length;

  if (advisorCount === 0) return null;

  return (
    <HouseholdRecordRow
      icon={UserCheck}
      label="Shared with Advisor"
      description={`${advisorCount} item${advisorCount !== 1 ? 's' : ''} marked for your advisor`}
      onClick={() => navigate('/people')}
    />
  );
};

export default AdvisorWidget;
