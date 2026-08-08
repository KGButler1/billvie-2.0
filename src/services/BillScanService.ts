import { supabase } from '@/lib/supabase';
import { UserService } from './UserService';

export interface ScanQuota {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface TriggerScanResult {
  billId: string;
}

export interface TriggerScanError {
  error: string;
}

async function getAuthHeader(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? `Bearer ${session.access_token}` : null;
}

function getFunctionUrl(slug: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${slug}`;
}

export const BillScanService = {
  async getQuota(): Promise<ScanQuota> {
    const authHeader = await getAuthHeader();
    if (!authHeader) return { used: 0, limit: 5, remaining: 5 };

    const res = await fetch(getFunctionUrl('get-scan-quota'), {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      console.error('Failed to fetch scan quota:', await res.text());
      return { used: 0, limit: 5, remaining: 5 };
    }
    return res.json();
  },

  isUnlimitedTier(): boolean {
    const settings = UserService.getSettings();
    return settings.userType === 'paid' || settings.userType === 'accountant';
  },

  async uploadScanFile(file: File): Promise<{ documentId: string; documentUrl: string } | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const userId = session.user.id;
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('bill-scans')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = await supabase.storage
      .from('bill-scans')
      .createSignedUrl(fileName, 3600);

    const documentUrl = urlData?.signedUrl || '';

    const { data: docRow, error: docError } = await supabase
      .from('documents')
      .insert({
        household_id: (await supabase
          .from('trusted_person')
          .select('household_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle()
        ).data?.household_id,
        title: file.name,
        provider: '',
        type: 'other',
      })
      .select('id')
      .single();

    if (docError || !docRow) {
      console.error('Failed to create document row:', docError);
      return null;
    }

    return { documentId: docRow.id, documentUrl };
  },

  async deleteScanDocument(documentId: string): Promise<void> {
    await supabase.from('documents').delete().eq('id', documentId);
  },

  async triggerScan(params: {
    documentId: string;
    documentUrl: string;
    documentType: string;
    name: string;
  }): Promise<TriggerScanResult | TriggerScanError> {
    const authHeader = await getAuthHeader();
    if (!authHeader) return { error: 'Not authenticated' };

    const res = await fetch(getFunctionUrl('trigger-bill-scan'), {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    return res.json();
  },
};
