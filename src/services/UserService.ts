import { UserSettings } from '@/types/bill';

const SETTINGS_KEY = 'billvie_settings';

const DEFAULT_SETTINGS: UserSettings = {
  userType: 'anonymous',
  hasSeenOnboarding: false,
  hasEventsAccess: false,
  theme: 'dark', // Dark mode default as requested
};

export class UserService {
  // Get user settings
  static getSettings(): UserSettings {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      // Initialize with defaults (don't call saveSettings to avoid recursion)
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      this.applyTheme(DEFAULT_SETTINGS.theme);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  }

  // Save settings (reads directly from localStorage to avoid recursion)
  static saveSettings(settings: Partial<UserSettings>): UserSettings {
    const data = localStorage.getItem(SETTINGS_KEY);
    const current = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    
    // Apply theme
    this.applyTheme(updated.theme);
    
    return updated;
  }

  // Apply theme to document
  static applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  // Initialize theme on app load
  static initializeTheme(): void {
    const settings = this.getSettings();
    this.applyTheme(settings.theme);
  }

  // Set user type (for dev panel)
  static setUserType(userType: UserSettings['userType']): void {
    const hasEventsAccess = userType === 'paid' || userType === 'accountant';
    this.saveSettings({ userType, hasEventsAccess });
  }

  // Check if user can add more bills
  static canAddBill(currentBillCount: number): boolean {
    const settings = this.getSettings();
    const { userType } = settings;
    
    if (userType === 'paid' || userType === 'accountant') return true;
    return currentBillCount < 25;
  }

  // Check if user can add more events
  static canAddEvent(currentEventCount: number): boolean {
    const settings = this.getSettings();
    const { userType, hasEventsAccess } = settings;
    
    if (!hasEventsAccess) return false;
    if (userType === 'paid' || userType === 'accountant') return true;
    return currentEventCount < 3;
  }

  // Clear all user data
  static clearAllData(): void {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem('billvie_bills');
    localStorage.removeItem('billvie_sample_shown');
  }

  // Get localStorage state (for dev panel)
  static getLocalStorageState(): Record<string, unknown> {
    const keys = ['billvie_bills', 'billvie_settings', 'billvie_sample_shown'];
    const state: Record<string, unknown> = {};
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      state[key] = value ? JSON.parse(value) : null;
    });
    
    return state;
  }
}
