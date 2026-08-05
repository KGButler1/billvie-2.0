import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomBillOptionsService, CustomOption } from '@/services/CustomBillOptionsService';
import { TaxDocumentService } from '@/services/TaxDocumentService';
import { UserService } from '@/services/UserService';

const ADD_NEW_VALUE = '__add_new__';

export interface TaxRelevanceValue {
  enabled: boolean;
  taxYear: number;
  taxType: 'personal' | 'business';
  businessName?: string;
}

// The tax year a date falls into, respecting the household's tax year start month.
export const taxYearForDate = (dateISO?: string): number => {
  const startMonth = UserService.getSettings().taxYearStartMonth ?? 1;
  const d = dateISO ? new Date(dateISO) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  if (startMonth === 7) {
    // July–June financial year, labelled by the year it ends in.
    return valid.getMonth() + 1 >= 7 ? valid.getFullYear() + 1 : valid.getFullYear();
  }
  return valid.getFullYear();
};

export const emptyTaxRelevance = (dateISO?: string): TaxRelevanceValue => ({
  enabled: false,
  taxYear: taxYearForDate(dateISO),
  taxType: 'personal',
});

interface TaxRelevanceFieldsProps {
  value: TaxRelevanceValue;
  onChange: (value: TaxRelevanceValue) => void;
}

const TaxRelevanceFields = ({ value, onChange }: TaxRelevanceFieldsProps) => {
  const [businessNames, setBusinessNames] = useState<CustomOption[]>([]);
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');

  useEffect(() => {
    setBusinessNames(CustomBillOptionsService.getCustomBusinessNames());
  }, []);

  const years = TaxDocumentService.getAvailableYears();
  const yearOptions = Array.from(new Set<number>([value.taxYear, ...years])).sort((a, b) => b - a);

  const set = (patch: Partial<TaxRelevanceValue>) => onChange({ ...value, ...patch });

  const handleAddBusiness = async () => {
    const trimmed = newBusinessName.trim();
    if (!trimmed) return;
    const created = await CustomBillOptionsService.addCustomBusinessName(trimmed);
    setBusinessNames(CustomBillOptionsService.getCustomBusinessNames());
    set({ businessName: created.label });
    setNewBusinessName('');
    setIsAddingBusiness(false);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={value.enabled}
          onCheckedChange={(checked) => set({ enabled: checked === true })}
        />
        <span className="text-sm font-medium">Relevant for tax?</span>
      </label>

      {value.enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-border">
          <div className="space-y-1.5">
            <Label>Tax year</Label>
            <Select value={String(value.taxYear)} onValueChange={(v) => set({ taxYear: parseInt(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Personal or business?</Label>
            <div className="flex gap-2">
              {(['personal', 'business'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ taxType: t, businessName: t === 'personal' ? undefined : value.businessName })}
                  className={
                    'flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ' +
                    (value.taxType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted')
                  }
                >
                  {t === 'personal' ? 'Personal' : 'Business'}
                </button>
              ))}
            </div>
          </div>

          {value.taxType === 'business' && (
            <div className="space-y-1.5">
              <Label>Business name</Label>
              {isAddingBusiness ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Business name"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBusiness();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddBusiness}>
                    Add
                  </Button>
                </div>
              ) : (
                <Select
                  value={value.businessName ?? ''}
                  onValueChange={(v) =>
                    v === ADD_NEW_VALUE ? setIsAddingBusiness(true) : set({ businessName: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a business" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {businessNames.map((b) => (
                      <SelectItem key={b.id} value={b.label}>
                        {b.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={ADD_NEW_VALUE} className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add a business...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxRelevanceFields;
