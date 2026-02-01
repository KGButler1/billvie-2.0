import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { UserService } from '@/services/UserService';
import { Bill } from '@/types/bill';
import BillCard from '@/components/BillCard';
import QuickAddBill from '@/components/QuickAddBill';
import BottomNav from '@/components/BottomNav';
import DevPanel from '@/components/DevPanel';
import DashboardHeader from '@/components/DashboardHeader';

const Dashboard = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    UserService.initializeTheme();
    BillService.initialize();
    loadBills();

    // Dev panel keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDevPanel(prev => !prev);
      }
    };

    // Check URL param for dev mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setShowDevPanel(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadBills = () => {
    const allBills = BillService.getUpcomingBills();
    const paidBills = BillService.getAllBills().filter(b => b.status === 'paid');
    setBills([...allBills, ...paidBills]);
  };

  const handleAddBill = (billData: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    BillService.addBill(billData);
    loadBills();
    setIsAddingBill(false);
  };

  const handleMarkPaid = (id: string) => {
    BillService.markAsPaid(id);
    loadBills();
  };

  const handleMarkUnpaid = (id: string) => {
    BillService.markAsUnpaid(id);
    loadBills();
  };

  const handleDeleteBill = (id: string) => {
    BillService.deleteBill(id);
    loadBills();
  };

  // Group bills by status
  const overdueBills = bills.filter(b => b.status === 'overdue');
  const dueSoonBills = bills.filter(b => b.status === 'due_soon');
  const upcomingBills = bills.filter(b => b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');

  const hasSampleBills = bills.some(b => b.isSample);

  return (
    <div className="min-h-screen bg-background pb-24">
      <DashboardHeader 
        onClearSamples={() => {
          BillService.clearSampleBills();
          loadBills();
        }}
        hasSampleBills={hasSampleBills}
      />

      <main className="container mx-auto px-4 pt-20">
        {/* Overdue Bills */}
        {overdueBills.length > 0 && (
          <BillSection 
            title="Overdue" 
            bills={overdueBills}
            onMarkPaid={handleMarkPaid}
            onMarkUnpaid={handleMarkUnpaid}
            onDelete={handleDeleteBill}
          />
        )}

        {/* Due Soon */}
        {dueSoonBills.length > 0 && (
          <BillSection 
            title="Due Soon" 
            bills={dueSoonBills}
            onMarkPaid={handleMarkPaid}
            onMarkUnpaid={handleMarkUnpaid}
            onDelete={handleDeleteBill}
          />
        )}

        {/* Upcoming */}
        {upcomingBills.length > 0 && (
          <BillSection 
            title="Upcoming" 
            bills={upcomingBills}
            onMarkPaid={handleMarkPaid}
            onMarkUnpaid={handleMarkUnpaid}
            onDelete={handleDeleteBill}
          />
        )}

        {/* Paid */}
        {paidBills.length > 0 && (
          <BillSection 
            title="Paid" 
            bills={paidBills}
            onMarkPaid={handleMarkPaid}
            onMarkUnpaid={handleMarkUnpaid}
            onDelete={handleDeleteBill}
            collapsed
          />
        )}

        {/* Empty State */}
        {bills.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No bills yet</h2>
            <p className="text-muted-foreground mb-6">
              Tap the + button to add your first bill
            </p>
          </motion.div>
        )}
      </main>

      {/* FAB */}
      <motion.button
        onClick={() => setIsAddingBill(true)}
        className="fab"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isAddingBill && (
          <QuickAddBill
            onAdd={handleAddBill}
            onClose={() => setIsAddingBill(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Dev Panel */}
      <AnimatePresence>
        {showDevPanel && (
          <DevPanel 
            onClose={() => setShowDevPanel(false)}
            onDataChange={loadBills}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Bill Section Component
interface BillSectionProps {
  title: string;
  bills: Bill[];
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
}

const BillSection = ({ title, bills, onMarkPaid, onMarkUnpaid, onDelete, collapsed = false }: BillSectionProps) => {
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

export default Dashboard;
