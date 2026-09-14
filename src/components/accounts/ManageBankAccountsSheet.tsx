import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Landmark, Pencil, Trash2, ArrowLeft, ArrowRightLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BankAccount } from '@/types/bankAccount';
import { BankAccountService } from '@/services/BankAccountService';
import { BillService } from '@/services/BillService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserService } from '@/services/UserService';
import { LinkedItem } from '@/types/linkedItem';
import FieldError from '@/components/ui/field-error';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import AdminOnly from '@/components/AdminOnly';
import EditOnly from '@/components/EditOnly';
import BankAccountPicker from '@/components/bills/BankAccountPicker';
import { toast } from 'sonner';

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

const KIND_LABELS: Record<LinkedItem['kind'], string> = {
  bill: 'Bills',
  debt: 'Debts',
  income: 'Income',
  superannuation: 'Savings & retirement',
  event_expense: 'Event expenses',
};

const ManageBankAccountsSheet = ({ onClose }: ManageBankAccountsSheetProps) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<string | undefined>(undefined);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const refresh = () => {
    setAccounts(BankAccountService.getAll());
  };

  useEffect(() => {
    BankAccountService.refresh().then(refresh).catch(console.error);
  }, []);

  const detailAccount = detailId ? BankAccountService.getById(detailId) : null;
  const linkedItems = detailId ? BankAccountService.getLinkedItems(detailId) : [];

  const startEdit = (account: BankAccount) =>
    setDraft({
      id: account.id,
      nickname: account.nickname,
      institution: account.institution ?? '',
      lastDigits: account.lastDigits ?? '',
      notes: account.notes ?? '',
    });

  const save = async () => {
    if (!draft?.nickname.trim()) { setNicknameError('Give this account a nickname.'); return; }
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

  const handleDelete = (account: BankAccount) => {
    const warnKey = 'bankAccount';
    if (!UserService.shouldWarnBeforeDelete(warnKey)) {
      void BankAccountService.remove(account.id).then(refresh);
      return;
    }
    setPendingDelete({ id: account.id, name: account.nickname });
  };

  const confirmDelete = async () => {
    if (pendingDelete) {
      await BankAccountService.remove(pendingDelete.id);
      refresh();
    }
    setPendingDelete(null);
  };

  const handleNavigateToItem = (item: LinkedItem) => {
    onClose();
    if (item.kind === 'bill') {
      navigate(`/bills?paidFrom=account:${item.id}`);
    } else {
      navigate(item.path);
    }
  };

  const startBulkMove = () => {
    setBulkSelected(new Set(linkedItems.map((i) => i.id)));
    setBulkTarget(undefined);
    setShowBulkMove(true);
  };

  const toggleBulkItem = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulkMove = async () => {
    if (!detailId || !bulkTarget || bulkTarget === detailId) return;
    setBulkLoading(true);
    const items = linkedItems.filter((i) => bulkSelected.has(i.id));
    let success = 0;
    let failures = 0;
    for (const item of items) {
      try {
        if (item.kind === 'bill') {
          await BillService.updateBill(item.id, { bankAccountId: bulkTarget, paymentCardId: undefined });
        } else if (item.kind === 'debt') {
          await FinancialInfoService.updateDebt(item.id, { linkedBankAccountId: bulkTarget, linkedPaymentCardId: undefined });
        } else if (item.kind === 'income') {
          await FinancialInfoService.updateIncome(item.id, { linkedBankAccountId: bulkTarget });
        } else if (item.kind === 'superannuation') {
          await FinancialInfoService.updateSuperannuation(item.id, { linkedBankAccountId: bulkTarget });
        }
        success++;
      } catch {
        failures++;
      }
    }
    await Promise.all([BillService.refresh(), FinancialInfoService.refresh()]);
    setBulkLoading(false);
    setShowBulkMove(false);
    refresh();
    if (failures === 0) {
      toast.success(`Moved ${success} ${success === 1 ? 'item' : 'items'} to ${BankAccountService.getById(bulkTarget)?.nickname ?? 'the new account'}.`);
    } else {
      toast.error(`Moved ${success} of ${success + failures}. ${failures} couldn't be updated — try again.`);
    }
  };

  const renderDetail = () => {
    if (!detailAccount) return null;
    const grouped = linkedItems.reduce<Record<string, LinkedItem[]>>((acc, item) => {
      (acc[item.kind] ??= []).push(item);
      return acc;
    }, {});

    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setDetailId(null)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back to accounts">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">{detailAccount.nickname}</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              {[
                detailAccount.institution,
                detailAccount.lastDigits && `···${detailAccount.lastDigits}`,
              ].filter(Boolean).join(' · ') || 'No institution recorded'}
            </p>
          </div>
        </div>

        {detailAccount.notes && (
          <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/50">{detailAccount.notes}</p>
        )}

        {linkedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nothing is paid from this yet.</p>
        ) : (
          <>
            {Object.entries(grouped).map(([kind, items]) => (
              <div key={kind} className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{KIND_LABELS[kind as LinkedItem['kind']]}</h3>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateToItem(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                      </div>
                      {item.isAutoDebited && (
                        <span className="text-xs text-muted-foreground italic flex-shrink-0">pays itself</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <AdminOnly>
            <EditOnly>
              <Button variant="outline" className="w-full mt-4" onClick={startBulkMove}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Move everything to another account
              </Button>
            </EditOnly>
            </AdminOnly>
          </>
        )}

        <AdminOnly>
        <EditOnly>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => { startEdit(detailAccount); setDetailId(null); }}>
            <Pencil className="w-4 h-4 mr-1.5" /> Edit
          </Button>
          <Button variant="ghost" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(detailAccount)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        </div>
        </EditOnly>
        </AdminOnly>
      </>
    );
  };

  const renderBulkMove = () => {
    const selectedCount = bulkSelected.size;
    const targetAccount = bulkTarget ? BankAccountService.getById(bulkTarget) : null;
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowBulkMove(false)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Move to another account</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Move to</Label>
            <BankAccountPicker value={bulkTarget} onChange={setBulkTarget} excludeId={detailId ?? undefined} />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {linkedItems.map((item) => (
                <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(item.id)}
                    onChange={() => toggleBulkItem(item.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABELS[item.kind]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
            {selectedCount > 0 && targetAccount
              ? `Move ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} from ${detailAccount?.nickname ?? 'this account'} to ${targetAccount.nickname}?`
              : 'Choose a destination account and at least one item.'}
          </div>

          <Button
            className="w-full"
            disabled={!bulkTarget || bulkTarget === detailId || selectedCount === 0 || bulkLoading}
            onClick={confirmBulkMove}
          >
            {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving…</> : <><Check className="w-4 h-4 mr-2" /> Confirm move</>}
          </Button>
        </div>
      </>
    );
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
        role="dialog"
        aria-labelledby="mba-title"
      >
        {showBulkMove && detailAccount ? (
          renderBulkMove()
        ) : detailId && detailAccount ? (
          renderDetail()
        ) : draft ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 id="mba-title" className="text-xl font-semibold">{draft.id ? 'Edit account' : 'Add an account'}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mba-nickname">What do you call it? <span className="text-[hsl(var(--destructive))]">*</span></Label>
                <Input
                  id="mba-nickname"
                  placeholder="e.g., Everyday account"
                  value={draft.nickname}
                  onChange={(e) => { setDraft({ ...draft, nickname: e.target.value }); setNicknameError(''); }}
                  className={nicknameError ? 'border-destructive' : undefined}
                  autoFocus
                />
                <FieldError message={nicknameError} />
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
                <Button onClick={save}>
                  {draft.id ? 'Save changes' : 'Add account'}
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 id="mba-title" className="text-xl font-semibold">Bank Accounts</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Nickname and last digits only — no account numbers, no online banking details.
            </p>

            <div className="space-y-2">
              {accounts.map((account) => {
                const summary = BankAccountService.linkedSummary(account.id);
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-4 h-4 text-primary" />
                    </div>
                    <button
                      onClick={() => setDetailId(account.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-medium truncate">{account.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          account.institution,
                          account.lastDigits && `···${account.lastDigits}`,
                          summary,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(account)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleDelete(account)}
                    >
                      <Trash2 className="w-4 h-4" />
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

            <Button className="w-full mt-6" onClick={() => setDraft({ ...emptyDraft })}>
              Add an account
            </Button>
          </>
        )}
      </motion.div>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        warnKey="bankAccount"
        title={`Delete ${pendingDelete?.name ?? 'this account'}?`}
        linkedSummary={pendingDelete ? BankAccountService.linkedSummary(pendingDelete.id) : undefined}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
};

export default ManageBankAccountsSheet;
