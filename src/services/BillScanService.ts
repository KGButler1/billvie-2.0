import { supabase } from '@/lib/supabase';

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

  isUnlimitedTier(isPaid: boolean): boolean {
    return isPaid;
  },

  async uploadScanFile(file: File): Promise<{ documentId: string; documentUrl: string } | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const userId = session.user.id;

    // Resolve household first so it is available before upload
    const { data: tpData } = await supabase
      .from('trusted_person')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const householdId = tpData?.household_id;
    if (!householdId) {
      console.error('No household found for scan upload');
      return null;
    }

    // Create the documents row first to get its id
    const { data: docRow, error: docError } = await supabase
      .from('documents')
      .insert({
        household_id: householdId,
        title: file.name,
        provider: '',
        type: 'other',
        scan_sourced: true,
        source: 'bill_scan',
      })
      .select('id')
      .single();

    if (docError || !docRow) {
      console.error('Failed to create document row:', docError);
      return null;
    }

    const documentId = docRow.id;
    const attachmentId = crypto.randomUUID();
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `${householdId}/document/${documentId}/${attachmentId}.${ext}`;

    // Upload to the shared household-documents bucket
    const { error: uploadError } = await supabase.storage
      .from('household-documents')
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return null;
    }

    // Insert the attachment metadata row
    const { error: attachError } = await supabase
      .from('document_attachments')
      .insert({
        id: attachmentId,
        household_id: householdId,
        owner_type: 'document',
        owner_id: documentId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      });

    if (attachError) {
      console.error('Failed to create attachment row:', attachError);
      // Clean up orphaned storage object
      await supabase.storage.from('household-documents').remove([storagePath]);
      // Still return the doc — the scan can proceed, the file just isn't tracked
    }

    // Generate signed URL from the new location
    const { data: urlData, error: signError } = await supabase.storage
      .from('household-documents')
      .createSignedUrl(storagePath, 3600);

    let documentUrl = urlData?.signedUrl || '';

    if (signError || !documentUrl) {
      await new Promise((r) => setTimeout(r, 500));
      const retry = await supabase.storage
        .from('household-documents')
        .createSignedUrl(storagePath, 3600);
      if (retry.error || !retry.data?.signedUrl) {
        console.error('Signed URL failed twice:', signError, retry.error);
        return null;
      }
      documentUrl = retry.data.signedUrl;
    }

    return { documentId, documentUrl };
  },

  async deleteScanDocument(documentId: string): Promise<void> {
    const { error } = await supabase.from('documents').delete().eq('id', documentId);
    if (error) console.error('Failed to delete orphaned scan document:', error);
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
