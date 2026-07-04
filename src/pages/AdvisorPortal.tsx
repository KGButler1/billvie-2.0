import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Shield, FileText, Receipt, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentService } from '@/services/DocumentService';
import { BillService } from '@/services/BillService';
import { HouseholdDocument } from '@/types/document';
import { Bill } from '@/types/bill';
import BottomNav from '@/components/BottomNav';

const AdvisorPortal = () => {
  const [advisorDocs, setAdvisorDocs] = useState<HouseholdDocument[]>([]);
  const [advisorBills, setAdvisorBills] = useState<Bill[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    setAdvisorDocs(DocumentService.getAdvisorItems());
    // Bills don't have markedForAdvisor yet — show none for now
    setAdvisorBills([]);
  }, []);

  const totalItems = advisorDocs.length + advisorBills.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Advisor Portal</h1>
          <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)} className="gap-1.5">
            <Mail className="w-4 h-4" /> Invite
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Description */}
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground">
            <strong>A simple place for your accountant or advisor</strong> to access key information. Share what they need — nothing more.
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Your advisor only sees items you've specifically marked
          </p>
        </div>

        {/* Invite section */}
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 rounded-xl bg-card border border-border"
          >
            <h3 className="text-sm font-medium mb-2">Invite your advisor</h3>
            <p className="text-xs text-muted-foreground mb-3">They'll receive a link to view only the items you've marked</p>
            <div className="flex gap-2">
              <Input
                placeholder="advisor@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
              <Button size="sm" disabled={!inviteEmail.includes('@')}>Send</Button>
            </div>
          </motion.div>
        )}

        {/* What your advisor sees */}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          This is what your advisor can see
        </h2>

        {totalItems === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nothing shared yet</h2>
            <p className="text-muted-foreground text-sm mb-2 max-w-sm mx-auto">
              Mark bills or documents as "Share with advisor" and they'll appear here — no back-and-forth emails.
            </p>
            <p className="text-xs text-muted-foreground">
              Go to <strong>Important Documents</strong> or any bill to mark items
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Documents section */}
            {advisorDocs.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Documents ({advisorDocs.length})
                </h3>
                <div className="space-y-2">
                  {advisorDocs.map((doc) => (
                    <div key={doc.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        {doc.provider && <p className="text-xs text-muted-foreground">{doc.provider}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bills section — future */}
            {advisorBills.length > 0 && (
              <section>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  Bills ({advisorBills.length})
                </h3>
                <div className="space-y-2">
                  {advisorBills.map((bill) => (
                    <div key={bill.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bill.name}</p>
                        {bill.amount && <p className="text-xs text-muted-foreground">${bill.amount}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default AdvisorPortal;
