import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { PeopleService } from '@/services/PeopleService';
import HouseholdRecordRow from '@/components/HouseholdRecordRow';

const AdvisorWidget = () => {
  const navigate = useNavigate();
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
