import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, FileText, Shield, CircleHelp as HelpCircle, Lock, ChevronRight, Building, Receipt, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  locked?: boolean;
  badge?: string;
}

const MenuItem = ({ icon: Icon, label, description, onClick, locked, badge }: MenuItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
  >
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 text-left">
      <div className="flex items-center gap-2">
        <p className="font-medium">{label}</p>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {locked ? (
      <Lock className="w-5 h-5 text-muted-foreground" />
    ) : (
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    )}
  </button>
);

const More = () => {
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'financial' | 'general'>('financial');
  
  const { profile } = useProfile();
  const isPaid = profile?.isPaid ?? false;
  const isAccountant = profile?.role === 'advisor' || profile?.role === 'accountant';

  const handleLockedFeature = (feature: 'financial') => {
    if (isPaid) {
      navigate('/financial');
    } else {
      setUpgradeReason(feature);
      setShowUpgradeModal(true);
    }
  };

  const handlePreviewAnyway = () => {
    navigate('/financial');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-xl font-bold">More</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Records & Tools */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Records &amp; Tools
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            <MenuItem
              icon={Receipt}
              label="Bills"
              description="Everything running, in one list"
              onClick={() => navigate('/bills')}
            />
            <MenuItem
              icon={Calendar}
              label="Events"
              description="One-off plans and what they cost"
              onClick={() => navigate('/events')}
            />
            <MenuItem
              icon={Receipt}
              label="Tax Documents"
              description="Receipts, deductions & records"
              onClick={() => navigate('/tax-documents')}
            />
            <MenuItem
              icon={Building}
              label="Financial Snapshot"
              description="Insurance, super, income & debts in one place"
              onClick={() => handleLockedFeature('financial')}
              locked={!isPaid}
              badge={isPaid ? undefined : 'Paid'}
            />
            <MenuItem
              icon={Users}
              label="Key People"
              description="Who to call, and why"
              onClick={() => navigate('/key-people')}
            />
            {isAccountant && (
              <MenuItem
                icon={Users}
                label="Accountant Portal"
                description="Manage your clients"
                onClick={() => navigate('/accountant')}
              />
            )}
          </div>
        </section>


        {/* App Settings */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            App
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            <MenuItem
              icon={Settings}
              label="Settings"
              description="Theme, notifications & data"
              onClick={() => navigate('/settings')}
            />
            <MenuItem
              icon={HelpCircle}
              label="Help & Support"
              description="FAQs and contact"
              onClick={() => {}}
            />
          </div>
        </section>

        {/* Legal */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Legal
          </h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            <MenuItem
              icon={FileText}
              label="Terms of Service"
              onClick={() => navigate('/terms')}
            />
            <MenuItem
              icon={Shield}
              label="Privacy Policy"
              onClick={() => navigate('/privacy')}
            />
          </div>
        </section>
      </main>

      <BottomNav />

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        onPreviewAnyway={handlePreviewAnyway}
      />
    </div>
  );
};

export default More;
