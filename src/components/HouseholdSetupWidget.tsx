import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Check,
  Plus,
  Receipt,
  Users,
  Wallet,
  BookUser,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { getReadinessSummary } from '@/utils/readiness';

const STORAGE_KEY = 'billvie_setup_widget_collapsed';

const icons: Record<string, React.ElementType> = {
  bills: Receipt,
  access: Users,
  financial: Wallet,
  people: BookUser,
  documents: FolderOpen,
};

const ProgressRing = ({ covered, total }: { covered: number; total: number }) => {
  const size = 40;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? covered / total : 0;

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className="stroke-primary transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
};

const HouseholdSetupWidget = () => {
  const navigate = useNavigate();
  const { checks, covered, total } = getReadinessSummary();
  const complete = covered === total;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (complete) return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return false;
  });

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <section className="bg-card border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <ProgressRing covered={covered} total={total} />
        <div className="min-w-0 flex-1">
          <Link
            to="/readiness"
            className="font-medium text-sm text-foreground hover:underline"
          >
            Household setup
          </Link>
          {complete ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" /> Household set up
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {covered} of {total} areas covered
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand household setup' : 'Collapse household setup'}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <motion.span animate={{ rotate: isCollapsed ? 0 : 180 }} className="block">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <div className="grid grid-cols-5 gap-2">
                {checks.map((check) => {
                  const Icon = icons[check.id] || Receipt;
                  const isPending = check.id === 'access' && check.pending;
                  return (
                    <button
                      key={check.id}
                      onClick={() => navigate(check.covered ? check.viewPath : isPending ? '/people' : check.actionPath)}
                      className="flex flex-col items-center gap-1.5 text-center group"
                    >
                      <span className="relative">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            check.covered
                              ? 'bg-primary/10 text-primary'
                              : isPending
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                                : 'border border-dashed border-border text-muted-foreground group-hover:border-primary/50'
                          }`}
                        >
                          {isPending && check.id === 'access' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                            check.covered
                              ? 'bg-primary text-primary-foreground'
                              : isPending
                                ? 'bg-amber-500 text-white'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {check.covered ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : isPending ? (
                            <Clock className="w-2.5 h-2.5" />
                          ) : (
                            <Plus className="w-2.5 h-2.5" />
                          )}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${
                          check.covered ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {check.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HouseholdSetupWidget;
