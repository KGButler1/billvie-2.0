import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HouseholdService } from '@/services/HouseholdService';
import { HouseholdMembership } from '@/services/supabaseData';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const roleLabel = (accessLevel: string | null, role: string) => {
  if (accessLevel === 'owner') return 'Owner';
  if (role === 'advisor') return 'Advisor';
  if (role === 'accountant') return 'Accountant';
  return 'Trusted';
};

const HouseholdSwitcher = () => {
  const { profile } = useProfile();
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    HouseholdService.listMemberships()
      .then(setHouseholds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.householdId]);

  if (loading || households.length < 2) return null;

  const current = households.find((h) => h.householdId === profile?.householdId) || households[0];
  const others = households.filter((h) => h.householdId !== current.householdId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Building className="w-4 h-4" />
          <span className="max-w-[120px] truncate">{current.householdName}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {roleLabel(current.accessLevel, current.role)}
          </span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-background z-50">
        <DropdownMenuLabel>Switch household</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {others.map((h) => (
          <DropdownMenuItem key={h.householdId} onClick={() => HouseholdService.switchTo(h.householdId)}>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{h.householdName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel(h.accessLevel, h.role)}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            const id = await HouseholdService.createOwnHousehold();
            HouseholdService.switchTo(id);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create your own household
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HouseholdSwitcher;
