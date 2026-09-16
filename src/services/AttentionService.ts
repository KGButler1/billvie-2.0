import { supabase } from '@/lib/supabase';
import { getHouseholdId } from './supabaseData';

export type AttentionCategory = 'due' | 'stale' | 'gap';
export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
  ruleKey: string;
  category: AttentionCategory;
  severity: AttentionSeverity;
  entityType: string | null;
  entityId: string | null;
  title: string;
  detail: string | null;
  actionPath: string;
  dueAt: string | null;
  paidOnly: boolean;
}

export interface DismissalRecord {
  id: string;
  ruleKey: string;
  entityId: string | null;
  snoozedUntil: string | null;
  dismissedAt: string | null;
  title: string | null;
  detail: string | null;
}

function rowToItem(row: Record<string, unknown>): AttentionItem {
  return {
    ruleKey: row.rule_key as string,
    category: row.category as AttentionCategory,
    severity: row.severity as AttentionSeverity,
    entityType: (row.entity_type as string) || null,
    entityId: (row.entity_id as string) || null,
    title: row.title as string,
    detail: (row.detail as string) || null,
    actionPath: row.action_path as string,
    dueAt: row.due_at ? String(row.due_at) : null,
    paidOnly: row.paid_only as boolean,
  };
}

export function computeSnoozeUntil(item: AttentionItem, bufferDays: number): Date {
  const FLAT_SNOOZE_DAYS = 30;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (!item.dueAt) {
    return new Date(Date.now() + FLAT_SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  }
  const due = new Date(item.dueAt);
  const target = new Date(due.getTime() - bufferDays * 24 * 60 * 60 * 1000);
  return target > tomorrow ? target : tomorrow;
}

export const AttentionService = {
  async fetchItems(): Promise<AttentionItem[]> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase.rpc('get_household_attention_items', {
      p_household_id: householdId,
    });
    if (error) throw error;
    return (data || []).map(rowToItem);
  },

  async snooze(
    ruleKey: string,
    entityId: string | null,
    snoozedUntil: string,
    title?: string,
    detail?: string | null
  ): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase
      .from('attention_dismissals')
      .upsert(
        {
          household_id: householdId,
          rule_key: ruleKey,
          entity_id: entityId,
          snoozed_until: snoozedUntil,
          dismissed_at: null,
          title: title ?? null,
          detail: detail ?? null,
        },
        { onConflict: 'household_id,rule_key,entity_id' }
      );
    if (error) throw error;
  },

  async snoozeAll(rows: { ruleKey: string; entityId: string | null; snoozedUntil: string; title: string; detail: string | null }[]): Promise<void> {
    const householdId = await getHouseholdId();
    const dbRows = rows.map((r) => ({
      household_id: householdId,
      rule_key: r.ruleKey,
      entity_id: r.entityId,
      snoozed_until: r.snoozedUntil,
      dismissed_at: null,
      title: r.title,
      detail: r.detail,
    }));
    const { error } = await supabase
      .from('attention_dismissals')
      .upsert(dbRows, { onConflict: 'household_id,rule_key,entity_id' });
    if (error) throw error;
  },

  async dismiss(
    ruleKey: string,
    entityId: string | null,
    title?: string,
    detail?: string | null
  ): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase
      .from('attention_dismissals')
      .upsert(
        {
          household_id: householdId,
          rule_key: ruleKey,
          entity_id: entityId,
          dismissed_at: new Date().toISOString(),
          snoozed_until: null,
          title: title ?? null,
          detail: detail ?? null,
        },
        { onConflict: 'household_id,rule_key,entity_id' }
      );
    if (error) throw error;
  },

  async getDismissals(): Promise<DismissalRecord[]> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('attention_dismissals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      ruleKey: r.rule_key as string,
      entityId: (r.entity_id as string) || null,
      snoozedUntil: (r.snoozed_until as string) || null,
      dismissedAt: (r.dismissed_at as string) || null,
      title: (r.title as string) || null,
      detail: (r.detail as string) || null,
    }));
  },

  async getPermanentDismissals(): Promise<DismissalRecord[]> {
    const all = await this.getDismissals();
    return all.filter((d) => d.dismissedAt !== null);
  },

  async removeDismissal(ruleKey: string, entityId: string | null): Promise<void> {
    const householdId = await getHouseholdId();
    let query = supabase
      .from('attention_dismissals')
      .delete()
      .eq('household_id', householdId)
      .eq('rule_key', ruleKey);
    if (entityId) {
      query = query.eq('entity_id', entityId);
    } else {
      query = query.is('entity_id', null);
    }
    const { error } = await query;
    if (error) throw error;
  },

  async getDigestFrequency(): Promise<'off' | 'weekly' | 'monthly'> {
    const householdId = await getHouseholdId();
    const { data, error } = await supabase
      .from('households')
      .select('reminders_digest_frequency')
      .eq('id', householdId)
      .single();
    if (error) throw error;
    return (data?.reminders_digest_frequency as 'off' | 'weekly' | 'monthly') ?? 'weekly';
  },

  async updateDigestFrequency(frequency: 'off' | 'weekly' | 'monthly'): Promise<void> {
    const householdId = await getHouseholdId();
    const { error } = await supabase.rpc('update_reminders_digest_frequency', {
      p_household_id: householdId,
      p_frequency: frequency,
    });
    if (error) throw error;
  },
};
