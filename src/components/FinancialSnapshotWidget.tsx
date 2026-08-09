import { useNavigate } from 'react-router-dom';
import { Building, Lock } from 'lucide-react';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserService } from '@/services/UserService';
import UpgradeModal from '@/components/UpgradeModal';
import { isDemoModeActive } from '@/demo/demoFlag';
import HouseholdRecordRow from '@/components/HouseholdRecordRow';
import { useState } from 'react';

const FinancialSnapshotWidget = () => {
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const goFinancial = () => navigate(isDemoModeActive() ? '/demo/financial' : '/financial');

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  const insurance = FinancialInfoService.getInsurance();
  const superannuation = FinancialInfoService.getSuperannuation();
  const income = FinancialInfoService.getIncome();
  const debts = FinancialInfoService.getDebts();
  const total = insurance.length + superannuation.length + income.length + debts.length;

  const handleUpgrade = () => {
    UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
    setShowUpgrade(false);
    navigate(isDemoModeActive() ? '/demo/financial' : '/financial');
  };

  if (!isPaid) {
    return (
      <>
        <HouseholdRecordRow
          icon={Lock}
          label="Financial Snapshot"
          description="Insurance, accounts & retirement, income & debts"
          onClick={() => setShowUpgrade(true)}
        />
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          reason="financial"
          onUpgrade={handleUpgrade}
          onPreviewAnyway={() => {
            setShowUpgrade(false);
            navigate(isDemoModeActive() ? '/demo/financial' : '/financial');
          }}
        />
      </>
    );
  }

  if (total === 0) {
    return (
      <HouseholdRecordRow
        icon={Building}
        label="Financial Snapshot"
        description="Add insurance, accounts, income or debts"
        onClick={goFinancial}
      />
    );
  }

  const parts: string[] = [];
  if (insurance.length) parts.push(`${insurance.length} insurance`);
  if (superannuation.length) parts.push(`${superannuation.length} account${superannuation.length !== 1 ? 's' : ''}`);
  if (income.length) parts.push(`${income.length} income`);
  if (debts.length) parts.push(`${debts.length} debt${debts.length !== 1 ? 's' : ''}`);

  return (
    <HouseholdRecordRow
      icon={Building}
      label="Financial Snapshot"
      description={parts.join(' · ')}
      onClick={goFinancial}
    />
  );
};

export default FinancialSnapshotWidget;
