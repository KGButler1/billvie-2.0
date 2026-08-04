import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface UserProfile {
  personId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  householdId: string;
  householdName: string;
}

export const useProfile = () => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('trusted_person')
      .select(`
        id,
        display_name,
        email,
        avatar_url,
        household_id,
        households ( name )
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const household = Array.isArray(data.households) ? data.households[0] : data.households;

    setProfile({
      personId: data.id,
      displayName: data.display_name || data.email?.split('@')[0] || 'You',
      email: data.email || '',
      avatarUrl: data.avatar_url,
      householdId: data.household_id,
      householdName: household?.name || 'My Household',
    });
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateDisplayName = async (name: string) => {
    if (!profile) return { error: 'No profile loaded' };
    const { error } = await supabase
      .from('trusted_person')
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq('id', profile.personId);
    if (error) return { error: error.message };
    setProfile({ ...profile, displayName: name });
    return { error: null };
  };

  const uploadAvatar = async (file: File): Promise<{ error: string | null; url: string | null }> => {
    if (!profile || !session?.user?.id) return { error: 'No profile loaded', url: null };

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${session.user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) return { error: uploadError.message, url: null };

    const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('trusted_person')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', profile.personId);

    if (updateError) return { error: updateError.message, url: null };

    setProfile({ ...profile, avatarUrl: publicUrl });
    return { error: null, url: publicUrl };
  };

  return { profile, loading, updateDisplayName, uploadAvatar, reload: loadProfile };
};
