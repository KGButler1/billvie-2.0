import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { getReadinessSummary } from '@/utils/readiness';
import BottomNav from '@/components/BottomNav';

const Readiness = () => {
  const navigate = useNavigate();
  const { checks, covered, total } = getReadinessSummary();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Household readiness</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">How ready is your household?</h1>
        <p className="text-muted-foreground mb-2">
          A few areas that help someone else step in if needed.
        </p>
        <p className="text-sm text-muted-foreground mb-6">{covered} of {total} areas covered</p>

        <div className="space-y-3">
          {checks.map((check, i) => (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    check.covered ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  {check.covered ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{check.label}</p>
                  {check.covered ? (
                    <>
                      <p className="text-sm text-muted-foreground mt-0.5">Covered</p>
                      <button
                        onClick={() => navigate(check.viewPath)}
                        className="text-sm text-primary mt-2 hover:underline"
                      >
                        View
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mt-0.5">{check.nudge}</p>
                      <button
                        onClick={() => navigate(check.actionPath)}
                        className="text-sm text-primary mt-2 hover:underline"
                      >
                        {check.actionLabel}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Nothing here is urgent — it's just a quiet check whenever you feel like looking.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Readiness;
