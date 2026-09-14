export interface LinkedItem {
  id: string;
  kind: 'bill' | 'debt' | 'income' | 'superannuation' | 'event_expense';
  title: string;
  detail?: string;
  isAutoDebited?: boolean;
  path: string;
}
