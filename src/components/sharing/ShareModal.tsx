import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Link2, Mail, Copy, Check, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShareType, SharePermission, SHARE_PERMISSION_LABELS } from '@/types/sharing';
import { SharingService } from '@/services/SharingService';
import { UserService } from '@/services/UserService';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ShareType;
  resourceId?: string;
  resourceName?: string;
  onRequireUpgrade?: () => void;
}

const ShareModal = ({ 
  isOpen, 
  onClose, 
  type, 
  resourceId, 
  resourceName,
  onRequireUpgrade 
}: ShareModalProps) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('view');
  const [showLink, setShowLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!isPaid) {
      onRequireUpgrade?.();
      return;
    }

    if (!email.trim()) return;

    setIsSharing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const share = SharingService.createShare(
      type,
      email.trim(),
      permission,
      resourceId,
      resourceName
    );

    setGeneratedLink(share.shareLink || '');
    setShared(true);
    setIsSharing(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setPermission('view');
    setShowLink(false);
    setGeneratedLink('');
    setShared(false);
    onClose();
  };

  const typeLabels: Record<ShareType, string> = {
    bills: 'Bills',
    event: 'Event',
    tax_documents: 'Tax Documents',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl w-full max-w-md p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Share {resourceName || typeLabels[type]}</h2>
              <p className="text-sm text-muted-foreground">
                Give someone you trust visibility
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isPaid ? (
          /* Upgrade prompt for free users */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Upgrade to Share</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Sharing is available on the Pro plan. Upgrade so your family can see what matters.
            </p>
            <Button onClick={onRequireUpgrade} className="w-full">
              Upgrade to Premium
            </Button>
          </div>
        ) : shared ? (
          /* Success state */
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-green-500" />
            </motion.div>
            <h3 className="font-semibold mb-2">Invite Sent!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {email} will receive an invitation to view your {typeLabels[type].toLowerCase()}.
            </p>
            
            {generatedLink && (
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Or share this link:</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="text-xs font-mono"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            
            <Button variant="outline" onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          /* Share form */
          <div className="space-y-6">
            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email">Share with</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Permission level */}
            <div className="space-y-3">
              <Label>Permission level</Label>
              <RadioGroup value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
                <div className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  permission === 'view' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="view" id="view" />
                  <Label htmlFor="view" className="flex-1 cursor-pointer">
                    <span className="font-medium">View Only</span>
                    <p className="text-xs text-muted-foreground">Can view but not make changes</p>
                  </Label>
                </div>
                <div className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  permission === 'edit' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}>
                  <RadioGroupItem value="edit" id="edit" />
                  <Label htmlFor="edit" className="flex-1 cursor-pointer">
                    <span className="font-medium">Full Access</span>
                    <p className="text-xs text-muted-foreground">Can add, edit, and delete items</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Toggle link option */}
            <button
              onClick={() => setShowLink(!showLink)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Link2 className="w-4 h-4" />
              {showLink ? 'Hide share link' : 'Or generate a share link'}
            </button>

            {showLink && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-muted/50 rounded-lg p-3"
              >
                <p className="text-xs text-muted-foreground mb-2">
                  Anyone with this link can access your {typeLabels[type].toLowerCase()}.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Link2 className="w-4 h-4 mr-2" />
                  Generate Link
                </Button>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleShare} 
                disabled={!email.trim() || isSharing}
                className="flex-1"
              >
                {isSharing ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ShareModal;
