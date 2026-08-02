import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bill } from '@/types/bill';
import BillCard from '@/components/BillCard';

type SectionKey = 'overdue' | 'due_soon' | 'upcoming' | 'paid';

interface BillSectionProps {
  title: string;
  bills: Bill[];
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
}

export const BillSection = ({
  title,
  bills,
  onMarkPaid,
  onMarkUnpaid,
  onDelete,
  collapsed = false,
}: BillSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 mb-4 w-full text-left"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">({bills.length})</span>
        <motion.span
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          className="ml-auto text-muted-foreground"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {bills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BillCard
                  bill={bill}
                  onMarkPaid={onMarkPaid}
                  onMarkUnpaid={onMarkUnpaid}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const DEFAULT_TITLES: Record<SectionKey, string> = {
  overdue: 'Needs Attention',
  due_soon: 'Due Soon',
  upcoming: 'Coming Up',
  paid: 'Handled',
};

interface BillListProps {
  bills: Bill[];
  mode: 'grouped' | 'flat';
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
  sectionTitle?: (section: SectionKey) => string;
  emptyState?: React.ReactNode;
}

const BillList = ({
  bills,
  mode,
  onMarkPaid,
  onMarkUnpaid,
  onDelete,
  sectionTitle,
  emptyState,
}: BillListProps) => {
  if (bills.length === 0) return <>{emptyState ?? null}</>;

  const title = (key: SectionKey) => (sectionTitle ? sectionTitle(key) : DEFAULT_TITLES[key]);

  if (mode === 'flat') {
    return (
      <div className="space-y-3 mb-8">
        {bills.map((bill, index) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index, 10) * 0.03 }}
          >
            <BillCard
              bill={bill}
              onMarkPaid={onMarkPaid}
              onMarkUnpaid={onMarkUnpaid}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  const groups: { key: SectionKey; items: Bill[]; collapsed?: boolean }[] = [
    { key: 'overdue', items: bills.filter(b => b.status === 'overdue') },
    { key: 'due_soon', items: bills.filter(b => b.status === 'due_soon') },
    { key: 'upcoming', items: bills.filter(b => b.status === 'pending') },
    { key: 'paid', items: bills.filter(b => b.status === 'paid'), collapsed: true },
  ];

  return (
    <>
      {groups
        .filter(g => g.items.length > 0)
        .map(g => (
          <BillSection
            key={g.key}
            title={title(g.key)}
            bills={g.items}
            onMarkPaid={onMarkPaid}
            onMarkUnpaid={onMarkUnpaid}
            onDelete={onDelete}
            collapsed={g.collapsed}
          />
        ))}
    </>
  );
};

export default BillList;
