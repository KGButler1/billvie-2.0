import { Receipt, FolderOpen, Users } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';

const OrganizationStrip = () => {
  const billsTracked = BillService.getBillCount();
  const documentsStored = DocumentService.getCount();
  const peopleWithAccess = AccessService.getActivePeople().length;

  const stats = [
    { icon: Receipt, label: `${billsTracked} bill${billsTracked !== 1 ? 's' : ''} tracked` },
    { icon: FolderOpen, label: `${documentsStored} document${documentsStored !== 1 ? 's' : ''} stored` },
    { icon: Users, label: `${peopleWithAccess} with access` },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-3 h-full">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
          <stat.icon className="w-4 h-4 flex-shrink-0" />
          {stat.label}
        </div>
      ))}
    </div>
  );
};

export default OrganizationStrip;
