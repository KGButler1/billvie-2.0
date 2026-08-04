import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ChevronRight, Lock } from 'lucide-react';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserService } from '@/services/UserService';
import UpgradeModal from '@/components/UpgradeModal';

const FinancialSnapshotWidget = () => {
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

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
    navigate('/financial');
  };

  const cta = (label: string, description: string, locked: boolean) => (
    <button
      onClick={() => (locked ? setShowUpgrade(true) : navigate('/financial'))}
      className="w-full mb-6 p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {locked ? <Lock className="w-5 h-5 text-primary" /> : <Building className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );

  if (!isPaid) {
    return (
      <>
        {cta('Financial Snapshot', 'Insurance, super, income & debts — what a spouse or advisor would need to know.', true)}
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          reason="financial"
          onUpgrade={handleUpgrade}
          onPreviewAnyway={() => {
            setShowUpgrade(false);
            navigate('/financial');
          }}
        />
      </>
    );
  }

  if (total === 0) {
    return cta('Financial Snapshot', 'Insurance, super, income & debts — what a spouse or advisor would need to know.', false);
  }

  const rows = [
    { label: 'Insurance', count: insurance.length },
    { label: 'Savings & Retirement', count: superannuation.length },
    { label: 'Income', count: income.length },
    { label: 'Debts', count: debts.length },
  ].filter(r => r.count > 0);

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate('/financial')}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Financial Snapshot</h2>
        <span className="text-xs text-primary flex items-center gap-1">
          View all ({total}) <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <button
        onClick={() => navigate('/financial')}
        className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
      >
        <Building className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0 flex flex-wrap gap-x-3 gap-y-1">
          {rows.map(r => (
            <span key={r.label} className="text-sm">
              <span className="font-medium">{r.count}</span>{' '}
              <span className="text-muted-foreground">{r.label}</span>
            </span>
          ))}
        </div>
      </button>
    </div>
  );
};

export default FinancialSnapshotWidget;
