import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building, Plus, ArrowRight, Loader2 } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { HouseholdService } from '@/services/HouseholdService';
import { HouseholdMembership } from '@/services/supabaseData';

const roleLabel = (accessLevel: string | null, role: string) => {
  if (accessLevel === 'owner') return 'Owner';
  if (role === 'advisor') return 'Advisor';
  if (role === 'accountant') return 'Accountant';
  return 'Trusted';
};

const SelectHousehold = () => {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    HouseholdService.listMemberships()
      .then(setHouseholds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    HouseholdService.switchTo(id);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const id = await HouseholdService.createOwnHousehold();
      HouseholdService.switchTo(id);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BillvieLogo size="lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Building className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Choose a household</h1>
            <p className="text-muted-foreground text-sm">
              You're a member of more than one household. Pick one to open, or create your own.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {households.map((h) => (
                <button
                  key={h.householdId}
                  onClick={() => handleSelect(h.householdId)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{h.householdName}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel(h.accessLevel, h.role)}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}

              <Button variant="outline" className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create your own household
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SelectHousehold;
