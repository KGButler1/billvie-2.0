export interface LinkedItem {
  id: string;
  kind: 'bill' | 'debt' | 'income' | 'superannuation';
  title: string;
  detail?: string;
  isAutoDebited?: boolean;
  path: string;
}
