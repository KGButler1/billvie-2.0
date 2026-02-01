import { Share, ShareType, SharePermission, ShareStatus, ActivityLogEntry } from '@/types/sharing';

const SHARES_KEY = 'billvie_shares';
const ACTIVITY_LOG_KEY = 'billvie_activity_log';

const generateId = (): string => {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateShareLink = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `https://billvie.app/shared/${result}`;
};

export class SharingService {
  // Get all shares
  static getAllShares(): Share[] {
    const data = localStorage.getItem(SHARES_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Get shares by type
  static getSharesByType(type: ShareType): Share[] {
    return this.getAllShares().filter(s => s.type === type);
  }

  // Get active shares (owned by current user)
  static getActiveShares(): Share[] {
    return this.getAllShares().filter(s => s.status === 'accepted');
  }

  // Create a new share
  static createShare(
    type: ShareType,
    email: string,
    permission: SharePermission,
    resourceId?: string,
    resourceName?: string
  ): Share {
    const share: Share = {
      id: generateId(),
      type,
      resourceId,
      resourceName: resourceName || (type === 'bills' ? 'All Bills' : 'Tax Documents'),
      ownerId: 'current_user', // In real app, this would be the actual user ID
      sharedWithEmail: email,
      permission,
      status: 'pending',
      shareLink: generateShareLink(),
      createdAt: new Date().toISOString(),
    };

    const shares = this.getAllShares();
    shares.push(share);
    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));

    // Log activity
    this.addActivityLog(share.id, `Shared ${type} with ${email}`, 'current_user', 'You');

    return share;
  }

  // Accept a share
  static acceptShare(shareId: string): Share | undefined {
    const shares = this.getAllShares();
    const index = shares.findIndex(s => s.id === shareId);
    if (index === -1) return undefined;

    shares[index] = {
      ...shares[index],
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    };

    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
    this.addActivityLog(shareId, 'Share accepted', shares[index].sharedWithEmail);

    return shares[index];
  }

  // Revoke a share
  static revokeShare(shareId: string): boolean {
    const shares = this.getAllShares();
    const share = shares.find(s => s.id === shareId);
    if (!share) return false;

    const filtered = shares.filter(s => s.id !== shareId);
    localStorage.setItem(SHARES_KEY, JSON.stringify(filtered));

    this.addActivityLog(shareId, `Revoked access for ${share.sharedWithEmail}`, 'current_user', 'You');
    return true;
  }

  // Get share by link
  static getShareByLink(link: string): Share | undefined {
    return this.getAllShares().find(s => s.shareLink === link);
  }

  // Activity Log
  static getActivityLog(shareId?: string): ActivityLogEntry[] {
    const data = localStorage.getItem(ACTIVITY_LOG_KEY);
    const logs: ActivityLogEntry[] = data ? JSON.parse(data) : [];
    
    if (shareId) {
      return logs.filter(l => l.shareId === shareId);
    }
    
    // Return last 50 entries
    return logs.slice(-50);
  }

  static addActivityLog(
    shareId: string,
    action: string,
    performedBy: string,
    performedByName?: string,
    details?: string
  ): void {
    const logs = this.getActivityLog();
    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}`,
      shareId,
      action,
      performedBy,
      performedByName,
      details,
      timestamp: new Date().toISOString(),
    };

    logs.push(entry);
    
    // Keep only last 100 entries
    const trimmedLogs = logs.slice(-100);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmedLogs));
  }

  // Get recent activity for all shares
  static getRecentActivity(): ActivityLogEntry[] {
    return this.getActivityLog().slice(-20).reverse();
  }

  // Clear all sharing data
  static clearAll(): void {
    localStorage.removeItem(SHARES_KEY);
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  }

  // Simulate receiving a shared item
  static simulateReceivedShare(type: ShareType, from: string): Share {
    const share: Share = {
      id: generateId(),
      type,
      resourceName: type === 'event' ? 'Sample Shared Trip' : 'Bills',
      ownerId: from,
      sharedWithEmail: 'you@example.com',
      sharedWithName: 'You',
      permission: 'view',
      status: 'accepted',
      createdAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
    };

    const shares = this.getAllShares();
    shares.push(share);
    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));

    return share;
  }

  // Inject sample shares for testing
  static injectSampleShares(): void {
    const samples: Share[] = [
      {
        id: 'sample_share_1',
        type: 'bills',
        resourceName: 'All Bills',
        ownerId: 'current_user',
        sharedWithEmail: 'partner@example.com',
        sharedWithName: 'Partner',
        permission: 'edit',
        status: 'accepted',
        shareLink: generateShareLink(),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        acceptedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sample_share_2',
        type: 'event',
        resourceId: 'event_sample_1',
        resourceName: 'Hawaii Trip',
        ownerId: 'current_user',
        sharedWithEmail: 'family@example.com',
        sharedWithName: 'Family',
        permission: 'view',
        status: 'pending',
        shareLink: generateShareLink(),
        createdAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem(SHARES_KEY, JSON.stringify(samples));

    // Add sample activity
    this.addActivityLog('sample_share_1', 'Partner marked Electric bill as paid', 'partner@example.com', 'Partner');
    this.addActivityLog('sample_share_1', 'Partner added Water bill ($45)', 'partner@example.com', 'Partner');
  }
}
