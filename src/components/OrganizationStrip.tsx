import { Receipt, FolderOpen, Users } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';

const OrganizationStrip = () => {
  const billsTracked = BillService.getBillCount();
  const documentsStored = DocumentService.getCount();
  const peopleWithAccess = AccessService.getActivePeople().length;

  const chips = [
    { icon: Receipt, label: `${billsTracked} bill${billsTracked !== 1 ? 's' : ''} tracked` },
    { icon: FolderOpen, label: `${documentsStored} document${documentsStored !== 1 ? 's' : ''} stored` },
    { icon: Users, label: `${peopleWithAccess} with access` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {chips.map((chip, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full"
        >
          <chip.icon className="w-3 h-3" />
          {chip.label}
        </div>
      ))}
    </div>
  );
};

export default OrganizationStrip;
