import { useEffect, useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BankAccount } from '@/types/bankAccount';
import { BankAccountService } from '@/services/BankAccountService';
import { cn } from '@/lib/utils';
import FieldError from '@/components/ui/field-error';

interface BankAccountPickerProps {
  value?: string;
  onChange: (accountId: string | undefined) => void;
}

const BankAccountPicker = ({ value, onChange }: BankAccountPickerProps) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [nickname, setNickname] = useState('');
  const [institution, setInstitution] = useState('');
  const [lastDigits, setLastDigits] = useState('');
  const [nicknameError, setNicknameError] = useState('');

  useEffect(() => {
    BankAccountService.refresh().then(() => setAccounts(BankAccountService.getAll())).catch(console.error);
  }, []);

  const reset = () => {
    setNickname('');
    setInstitution('');
    setLastDigits('');
    setIsAdding(false);
  };

  const handleAdd = async () => {
    if (!nickname.trim()) { setNicknameError('Give this account a nickname.'); return; }
    const account = await BankAccountService.add({
      nickname: nickname.trim(),
      institution: institution.trim() || undefined,
      lastDigits: lastDigits.trim() || undefined,
    });
    setAccounts(BankAccountService.getAll());
    onChange(account.id);
    reset();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {accounts.map((account) => {
          const selected = account.id === value;
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onChange(selected ? undefined : account.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              )}
            >
              {selected && <Check className="w-3 h-3" />}
              {account.nickname}
              {account.institution && (
                <span className={selected ? 'opacity-80' : 'text-muted-foreground'}>
                  {account.institution}
                </span>
              )}
              {account.lastDigits && (
                <span className={selected ? 'opacity-80' : 'text-muted-foreground'}>
                  ···{account.lastDigits}
                </span>
              )}
            </button>
          );
        })}

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add an account
          </button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="acct-nickname" className="text-xs">
              What do you call it? <span className="text-[hsl(var(--destructive))]">*</span>
            </Label>
            <Input
              id="acct-nickname"
              placeholder="e.g., Everyday account, Mortgage offset"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNicknameError(''); }}
              className={cn(nicknameError && 'border-destructive')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                } else if (e.key === 'Escape') {
                  reset();
                }
              }}
            />
            <FieldError message={nicknameError} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="acct-institution" className="text-xs">
                Institution
              </Label>
              <Input
                id="acct-institution"
                placeholder="e.g., Commonwealth Bank"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-digits" className="text-xs">
                Last digits
              </Label>
              <Input
                id="acct-digits"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                value={lastDigits}
                onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Just enough to help someone else find the right account — no account number, no online banking details.
          </p>

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd}>
              Save account
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!!accounts.length && !isAdding && (
        <p className="text-xs text-muted-foreground">
          Updating an account here updates every bill on it.
        </p>
      )}
    </div>
  );
};

export default BankAccountPicker;
