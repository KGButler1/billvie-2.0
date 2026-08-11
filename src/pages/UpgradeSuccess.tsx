import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';

const UpgradeSuccess = () => {
  const { isPaid, refreshPlan } = usePlan();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let active = true;
    const check = async () => {
      await refreshPlan();
      attempts += 1;
      if (active && attempts >= 8) setTimedOut(true);
    };
    void check();
    const interval = window.setInterval(() => {
      if (!active || attempts >= 8) return;
      void check();
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshPlan]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        {isPaid ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5" />
            <h1 className="text-2xl font-semibold mb-2">Your Pro plan is active</h1>
            <p className="text-muted-foreground mb-6">Your household now has access to Pro features.</p>
            <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
          </>
        ) : timedOut ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">Your subscription is still processing</h1>
            <p className="text-muted-foreground mb-6">This can take a minute. Check Settings shortly for the latest plan status.</p>
            <Button asChild><Link to="/settings">Open Settings</Link></Button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-5" />
            <h1 className="text-2xl font-semibold mb-2">Confirming your subscription...</h1>
            <p className="text-muted-foreground">We’re waiting for the payment confirmation.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UpgradeSuccess;
