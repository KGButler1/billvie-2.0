import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Info, ArrowRight } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { SharingService } from '@/services/SharingService';
import ShareContentPreview from '@/components/sharing/ShareContentPreview';
import { Share } from '@/types/sharing';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-5 py-4 flex items-center">
        <BillvieLogo size="sm" />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-5 py-8 pb-16">{children}</main>
  </div>
);

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<Share | undefined>(() =>
    token ? SharingService.getShareByToken(token) : undefined
  );
  const [accepted, setAccepted] = useState(share?.status === 'accepted');

  useEffect(() => {
    if (share && share.status === 'accepted') {
      SharingService.addActivityLog(share.id, 'Viewed', share.sharedWithEmail, share.sharedWithName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share?.id]);

  if (!share) {
    return (
      <Shell>
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold mb-2">This link isn't valid</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            This link isn't valid, or access may have been removed. If you were expecting to see something here, ask the
            person who shared it to send a fresh link.
          </p>
        </div>
      </Shell>
    );
  }

  const sharerName = share.sharedWithName && share.ownerId !== 'current_user' ? share.ownerId : 'Someone';
  const resourceName = share.resourceName || 'their household';

  const handleAccept = () => {
    const updated = SharingService.acceptShare(share.id);
    if (updated) setShare(updated);
    setAccepted(true);
  };

  if (!accepted) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">
            {sharerName} shared {resourceName} with you
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Billvie is where families keep track of what's owed and what's coming up, together.
          </p>
          <Button size="lg" onClick={handleAccept}>
            Accept &amp; View
          </Button>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{resourceName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Shared with you by {sharerName}</p>
      </div>

      {share.permission === 'edit' && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Full editing is coming soon — for now this is a read-only view.</p>
        </div>
      )}

      <ShareContentPreview
        type={share.type}
        resourceId={share.resourceId}
        sharedCategories={share.sharedCategories}
        sharedYears={share.sharedYears}
      />

      <footer className="mt-12 pt-8 border-t border-border text-center">
        <p className="text-muted-foreground mb-3">Want this kind of visibility into your own household?</p>
        <Link to="/onboarding" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          Get started with Billvie
          <ArrowRight className="w-4 h-4" />
        </Link>
      </footer>
    </Shell>
  );
};

export default SharedView;
