import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Landmark, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BankAccount } from '@/types/bankAccount';
import { BankAccountService } from '@/services/BankAccountService';

interface ManageBankAccountsSheetProps {
  onClose: () => void;
}

interface Draft {
  id?: string;
  nickname: string;
  institution: string;
  lastDigits: string;
  notes: string;
}

const emptyDraft: Draft = { nickname: '', institution: '', lastDigits: '', notes: '' };

const ManageBankAccountsSheet = ({ onClose }: ManageBankAccountsSheetProps) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [archived, setArchived] = useState<BankAccount[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  const refresh = () => {
    setAccounts(BankAccountService.getAll());
    setArchived(BankAccountService.getArchived());
  };

  useEffect(() => {
    BankAccountService.refresh().then(refresh).catch(console.error);
  }, []);

  const startEdit = (account: BankAccount) =>
    setDraft({
      id: account.id,
      nickname: account.nickname,
      institution: account.institution ?? '',
      lastDigits: account.lastDigits ?? '',
      notes: account.notes ?? '',
    });

  const save = async () => {
    if (!draft?.nickname.trim()) return;
    const payload = {
      nickname: draft.nickname.trim(),
      institution: draft.institution.trim() || undefined,
      lastDigits: draft.lastDigits.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };
    if (draft.id) await BankAccountService.update(draft.id, payload);
    else await BankAccountService.add(payload);
    setDraft(null);
    refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-dramatic p-6 pb-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Bank Accounts</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Nickname and last digits only — no account numbers, no online banking details.
        </p>

        {draft ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mba-nickname">What do you call it?</Label>
              <Input
                id="mba-nickname"
                placeholder="e.g., Everyday account"
                value={draft.nickname}
                onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mba-institution">Institution</Label>
                <Input
                  id="mba-institution"
                  placeholder="e.g., Commonwealth Bank"
                  value={draft.institution}
                  onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mba-digits">Last digits</Label>
                <Input
                  id="mba-digits"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={draft.lastDigits}
                  onChange={(e) => setDraft({ ...draft, lastDigits: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mba-notes">Notes</Label>
              <Textarea
                id="mba-notes"
                rows={2}
                placeholder="Anything someone else would need to know"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={!draft.nickname.trim()}>
                {draft.id ? 'Save changes' : 'Add account'}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {accounts.map((account) => {
                const bills = BankAccountService.countLinkedBills(account.id);
                const income = BankAccountService.countLinkedIncome(account.id);
                const debts = BankAccountService.countLinkedDebts(account.id);
                const superannuation = BankAccountService.countLinkedSuperannuation(account.id);
                const parts: string[] = [];
                if (bills) parts.push(`${bills} ${bills === 1 ? 'bill' : 'bills'}`);
                if (income) parts.push(`${income} income ${income === 1 ? 'source' : 'sources'}`);
                if (debts) parts.push(`${debts} ${debts === 1 ? 'debt' : 'debts'}`);
                if (superannuation) parts.push(`${superannuation} ${superannuation === 1 ? 'account' : 'accounts'}`);
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          account.institution,
                          account.lastDigits && `···${account.lastDigits}`,
                          parts.join(', '),
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(account)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={async () => {
                        await BankAccountService.remove(account.id);
                        refresh();
                      }}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}

              {!accounts.length && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No accounts recorded yet.
                </p>
              )}
            </div>

            {!!archived.length && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Archived</h3>
                <div className="space-y-2">
                  {archived.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border opacity-70"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{account.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            account.institution,
                            account.lastDigits && `···${account.lastDigits}`,
                          ].filter(Boolean).join(' · ') || 'No details recorded'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await BankAccountService.restore(account.id);
                          refresh();
                        }}
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={() => setDraft({ ...emptyDraft })}>
              Add an account
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ManageBankAccountsSheet;
