import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';
import { generatePdfThumbnail } from '@/utils/pdfThumbnail';

export type AttachmentOwnerType = 'document' | 'tax_document';

export interface DocumentAttachment {
  id: string;
  householdId: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  storagePath: string;
  thumbnailPath: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

const BUCKET = 'household-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

function rowToAttachment(row: Record<string, unknown>): DocumentAttachment {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    ownerType: row.owner_type as AttachmentOwnerType,
    ownerId: row.owner_id as string,
    storagePath: row.storage_path as string,
    thumbnailPath: (row.thumbnail_path as string) || null,
    fileName: row.file_name as string,
    mimeType: row.mime_type as string,
    fileSize: Number(row.file_size),
    createdAt: row.created_at as string,
  };
}

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
}

export const AttachmentService = {
  validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 10MB.';
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PDF and image files are allowed.';
    }
    return null;
  },

  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    householdId: string,
    file: File
  ): Promise<DocumentAttachment | null> {
    const validationError = this.validateFile(file);
    if (validationError) {
      console.error('Attachment validation failed:', validationError);
      return null;
    }

    const attachmentId = crypto.randomUUID();
    const ext = getExtension(file.name);
    const storagePath = `${householdId}/${ownerType}/${ownerId}/${attachmentId}.${ext}`;

    // Upload the original file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error('Attachment upload failed:', uploadError);
      return null;
    }

    // Generate PDF thumbnail if applicable
    let thumbnailPath: string | null = null;
    if (file.type === 'application/pdf') {
      try {
        const thumbBlob = await generatePdfThumbnail(file);
        if (thumbBlob) {
          thumbnailPath = `${householdId}/${ownerType}/${ownerId}/${attachmentId}-thumb.jpg`;
          const { error: thumbError } = await supabase.storage
            .from(BUCKET)
            .upload(thumbnailPath, thumbBlob, { contentType: 'image/jpeg' });
          if (thumbError) {
            console.warn('Thumbnail upload failed, continuing without:', thumbError);
            thumbnailPath = null;
          }
        }
      } catch (e) {
        console.warn('Thumbnail generation failed, continuing without:', e);
        thumbnailPath = null;
      }
    }

    // Insert the metadata row
    const { data, error } = await supabase
      .from('document_attachments')
      .insert({
        id: attachmentId,
        household_id: householdId,
        owner_type: ownerType,
        owner_id: ownerId,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Attachment row insert failed:', error);
      // Clean up orphaned storage objects
      await supabase.storage.from(BUCKET).remove([storagePath]);
      if (thumbnailPath) await supabase.storage.from(BUCKET).remove([thumbnailPath]);
      return null;
    }

    return rowToAttachment(data);
  },

  async getForOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<DocumentAttachment[]> {
    const { data, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch attachments:', error);
      return [];
    }
    return (data || []).map(rowToAttachment);
  },

  async getSignedUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      // Retry once, matching BillScanService pattern
      await new Promise((r) => setTimeout(r, 500));
      const retry = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);
      if (retry.error || !retry.data?.signedUrl) {
        console.error('Signed URL failed twice:', error, retry.error);
        return null;
      }
      return retry.data.signedUrl;
    }

    return data.signedUrl;
  },

  async remove(attachmentId: string): Promise<void> {
    // Fetch the row to get storage paths
    const { data, error } = await supabase
      .from('document_attachments')
      .select('storage_path, thumbnail_path')
      .eq('id', attachmentId)
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to fetch attachment for deletion:', error);
      return;
    }

    const pathsToRemove = [data.storage_path as string];
    if (data.thumbnail_path) pathsToRemove.push(data.thumbnail_path);

    // Delete storage objects first
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(pathsToRemove);
    if (storageError) console.error('Storage removal failed:', storageError);

    // Then delete the row
    const { error: rowError } = await supabase
      .from('document_attachments')
      .delete()
      .eq('id', attachmentId);
    if (rowError) console.error('Row deletion failed:', rowError);
  },

  async removeAllForOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<void> {
    const { data, error } = await supabase
      .from('document_attachments')
      .select('id, storage_path, thumbnail_path')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId);

    if (error || !data || data.length === 0) return;

    const pathsToRemove: string[] = [];
    for (const row of data) {
      pathsToRemove.push(row.storage_path as string);
      if (row.thumbnail_path) pathsToRemove.push(row.thumbnail_path as string);
    }

    const { error: storageError } = await supabase.storage.from(BUCKET).remove(pathsToRemove);
    if (storageError) console.error('Storage bulk removal failed:', storageError);

    const { error: rowError } = await supabase
      .from('document_attachments')
      .delete()
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId);
    if (rowError) console.error('Bulk row deletion failed:', rowError);
  },
};
