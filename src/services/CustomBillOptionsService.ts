// Service to manage custom bill options (categories, payment methods, responsible parties)

const CUSTOM_CATEGORIES_KEY = 'billvie_custom_categories';
const CUSTOM_PAYMENT_METHODS_KEY = 'billvie_custom_payment_methods';
const CUSTOM_EVENT_CATEGORIES_KEY = 'billvie_custom_event_categories';
// `billvie_custom_responsible_parties` is deliberately left unread — the field it
// backed was retired and migrated into bill notes.


export interface CustomOption {
  id: string;
  label: string;
}

const generateId = (): string => {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export class CustomBillOptionsService {
  // Custom Categories
  static getCustomCategories(): CustomOption[] {
    const data = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  static addCustomCategory(label: string): CustomOption {
    const categories = this.getCustomCategories();
    const newCategory: CustomOption = { id: generateId(), label: label.trim() };
    categories.push(newCategory);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    return newCategory;
  }

  static deleteCustomCategory(id: string): void {
    const categories = this.getCustomCategories().filter(c => c.id !== id);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
  }

  // Custom Payment Methods
  static getCustomPaymentMethods(): CustomOption[] {
    const data = localStorage.getItem(CUSTOM_PAYMENT_METHODS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static addCustomPaymentMethod(label: string): CustomOption {
    const methods = this.getCustomPaymentMethods();
    const newMethod: CustomOption = { id: generateId(), label: label.trim() };
    methods.push(newMethod);
    localStorage.setItem(CUSTOM_PAYMENT_METHODS_KEY, JSON.stringify(methods));
    return newMethod;
  }

  static deleteCustomPaymentMethod(id: string): void {
    const methods = this.getCustomPaymentMethods().filter(m => m.id !== id);
    localStorage.setItem(CUSTOM_PAYMENT_METHODS_KEY, JSON.stringify(methods));
  }

  // Event Categories — household-defined, no app presets
  static getEventCategories(): CustomOption[] {
    const data = localStorage.getItem(CUSTOM_EVENT_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  static addEventCategory(label: string): CustomOption {
    const categories = this.getEventCategories();
    const trimmed = label.trim();
    const existing = categories.find(c => c.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const newCategory: CustomOption = { id: generateId(), label: trimmed };
    categories.push(newCategory);
    localStorage.setItem(CUSTOM_EVENT_CATEGORIES_KEY, JSON.stringify(categories));
    return newCategory;
  }

  static deleteEventCategory(id: string): void {
    const categories = this.getEventCategories().filter(c => c.id !== id);
    localStorage.setItem(CUSTOM_EVENT_CATEGORIES_KEY, JSON.stringify(categories));
  }
}


