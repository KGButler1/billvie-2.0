import { Receipt, FolderOpen, Users } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';

interface OrganizationStripProps {
  showBills?: boolean;
  showDocuments?: boolean;
  showPeople?: boolean;
}

const OrganizationStrip = ({
  showBills = true,
  showDocuments = true,
  showPeople = true,
}: OrganizationStripProps) => {
  const billsTracked = BillService.getBillCount();
  const documentsStored = DocumentService.getCount();
  const peopleWithAccess = AccessService.getActivePeople().length;

  const stats: { icon: typeof Receipt; label: string; visible: boolean }[] = [
    { icon: Receipt, label: `${billsTracked} bill${billsTracked !== 1 ? 's' : ''} tracked`, visible: showBills },
    { icon: FolderOpen, label: `${documentsStored} document${documentsStored !== 1 ? 's' : ''} stored`, visible: showDocuments },
    { icon: Users, label: `${peopleWithAccess} with access`, visible: showPeople },
  ];

  const visibleStats = stats.filter((s) => s.visible);

  if (visibleStats.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-3 h-full">
      {visibleStats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
          <stat.icon className="w-4 h-4 flex-shrink-0" />
          {stat.label}
        </div>
      ))}
    </div>
  );
};

export default OrganizationStrip;
