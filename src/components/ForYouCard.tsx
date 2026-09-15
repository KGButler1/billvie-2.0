import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Receipt, FileText, CalendarClock } from 'lucide-react';
import { ItemFlagService } from '@/services/ItemFlagService';
import { PeopleService } from '@/services/PeopleService';
import { BillService } from '@/services/BillService';
import { DocumentService } from '@/services/DocumentService';
import { AccessService } from '@/services/AccessService';
import { useProfile } from '@/hooks/useProfile';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { SkeletonRows } from '@/components/ui/skeleton';

const ForYouCard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    ItemFlagService.refresh()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const me = useMemo(
    () => {
      if (!profile?.personId) return undefined;
      return PeopleService.getById(profile.personId);
    },
    [profile?.personId]
  );

  const ownerFirstName = useMemo(() => {
    const owner = PeopleService.getAll().find((p) => p.accessLevel === 'owner');
    return owner?.name?.split(' ')[0] ?? 'The owner';
  }, []);

  const flaggedItems = useMemo(() => {
    if (!me) return [];
    const flags = ItemFlagService.getFlagsForPerson(me.id);
    return flags
      .map((f) => {
        if (f.itemType === 'bill') {
          const bill = BillService.getBillById(f.itemId);
          if (!bill || bill.deletedAt) return null;
          return {
            id: f.itemId,
            type: 'bill' as const,
            name: bill.name,
            context: [bill.dueDate ? `Due ${format(parseISO(bill.dueDate), 'MMM d')}` : null, bill.amount !== undefined ? formatCurrency(bill.amount) : null].filter(Boolean).join(' · '),
            onClick: () => navigate('/bills'),
          };
        } else {
          const doc = DocumentService.getById(f.itemId);
          if (!doc || doc.deletedAt) return null;
          const context = doc.importantDate
            ? `${doc.importantDateLabel || 'Important date'}: ${format(parseISO(doc.importantDate), 'MMM d, yyyy')}`
            : doc.provider || doc.type;
          return {
            id: f.itemId,
            type: 'document' as const,
            name: doc.title,
            context,
            onClick: () => navigate('/documents'),
          };
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [me, navigate]);

  if (loading) {
    return (
      <div className="mb-6">
        <SkeletonRows rows={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Couldn't load your flagged items.</p>
      </div>
    );
  }

  if (flaggedItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold mb-1">For you</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {ownerFirstName} flagged these for you.
      </p>
      <div className="space-y-2">
        {flaggedItems.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={item.onClick}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {item.type === 'bill' ? (
                <Receipt className="w-4 h-4 text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.context && (
                <p className="text-xs text-muted-foreground truncate">{item.context}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default ForYouCard;
