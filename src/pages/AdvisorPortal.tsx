import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Shield, Mail, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SharingService } from '@/services/SharingService';
import ShareContentPreview from '@/components/sharing/ShareContentPreview';
import BottomNav from '@/components/BottomNav';

const AdvisorPortal = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email.includes('@')) return;
    const share = SharingService.createAdvisorShare(email);
    setInviteLink(share.shareLink || '');
    setInvitedEmail(email);
    setInviteEmail('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Advisor Portal</h1>
          <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)} className="gap-1.5">
            <Mail className="w-4 h-4" /> Invite
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Description */}
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground">
            <strong>A simple place for your accountant or advisor</strong> to access key information. Share what they need — nothing more.
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Your advisor sees your bills and any documents you've marked
          </p>
        </div>

        <div className="hidden lg:flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)} className="gap-1.5">
            <Mail className="w-4 h-4" /> Invite
          </Button>
        </div>

        {/* Invite section */}
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 rounded-xl bg-card border border-border"
          >
            <h3 className="text-sm font-medium mb-2">Invite your advisor</h3>
            <p className="text-xs text-muted-foreground mb-3">
              They'll receive a link to view your bills and the documents you've marked. Always free.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="advisor@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
              <Button size="sm" disabled={!inviteEmail.includes('@')} onClick={handleInvite}>
                Send
              </Button>
            </div>

            {inviteLink && (
              <div className="bg-muted/50 rounded-lg p-3 mt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Invite sent to {invitedEmail}. Or share this link:
                </Label>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="text-xs font-mono" />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* What your advisor sees */}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          This is what your advisor can see
        </h2>

        <ShareContentPreview type="advisor" />

        <div className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
          <UserCheck className="w-4 h-4 shrink-0" />
          <p>Mark documents as "Share with advisor" in Important Documents to include them here.</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default AdvisorPortal;
