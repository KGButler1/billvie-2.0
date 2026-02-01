import { BillCategory } from '@/types/bill';

// Keywords for auto-categorization
const CATEGORY_KEYWORDS: Record<BillCategory, string[]> = {
  utilities: [
    'electric', 'electricity', 'power', 'gas', 'water', 'sewer', 'trash', 'garbage',
    'utility', 'utilities', 'pge', 'con ed', 'duke energy', 'xcel', 'national grid'
  ],
  subscriptions: [
    'netflix', 'hulu', 'disney', 'hbo', 'spotify', 'apple music', 'youtube', 'amazon prime',
    'adobe', 'microsoft', 'dropbox', 'icloud', 'google one', 'notion', 'figma', 'slack',
    'gym', 'fitness', 'membership', 'subscription', 'streaming', 'audible', 'kindle'
  ],
  insurance: [
    'insurance', 'geico', 'progressive', 'allstate', 'state farm', 'liberty mutual',
    'health insurance', 'car insurance', 'auto insurance', 'life insurance', 'home insurance',
    'renters insurance', 'dental', 'vision', 'aetna', 'cigna', 'blue cross', 'united health'
  ],
  rent_mortgage: [
    'rent', 'mortgage', 'lease', 'apartment', 'housing', 'hoa', 'condo fee',
    'property tax', 'homeowner', 'landlord'
  ],
  loans: [
    'loan', 'student loan', 'car loan', 'auto loan', 'personal loan', 'credit card',
    'debt', 'payment plan', 'financing', 'sallie mae', 'navient', 'sofi'
  ],
  services: [
    'internet', 'wifi', 'cable', 'phone', 'mobile', 'cell', 'at&t', 'verizon', 't-mobile',
    'comcast', 'xfinity', 'spectrum', 'cleaning', 'lawn', 'pest control', 'security',
    'adt', 'ring', 'simplisafe'
  ],
  other: []
};

export function categorizeByName(billName: string): BillCategory {
  const lowerName = billName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category as BillCategory;
      }
    }
  }
  
  return 'other';
}

// Simulated AI extraction - parses common bill name patterns
export interface ExtractedBillData {
  name: string;
  amount?: number;
  dueDate?: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly';
  category: BillCategory;
  confidence: number;
}

export function simulateAIExtraction(fileName: string, fileContent?: string): ExtractedBillData {
  // Clean up filename
  const cleanName = fileName
    .replace(/\.(pdf|jpg|jpeg|png|gif|webp)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try to extract amount from filename
  const amountMatch = cleanName.match(/\$?(\d+(?:[,.]\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : undefined;
  
  // Try to extract date patterns
  const datePatterns = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})/i,
  ];
  
  let dueDate: string | undefined;
  for (const pattern of datePatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      try {
        const parsedDate = new Date(match[0]);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate.toISOString();
        }
      } catch {
        // Ignore parse errors
      }
      break;
    }
  }
  
  // Determine if recurring based on common keywords
  const recurringKeywords = ['monthly', 'quarterly', 'annual', 'yearly', 'subscription', 'recurring'];
  const isRecurring = recurringKeywords.some(kw => cleanName.toLowerCase().includes(kw));
  
  // Auto-categorize
  const category = categorizeByName(cleanName);
  
  // Remove numbers and dates from name for cleaner display
  const displayName = cleanName
    .replace(/\$?\d+(?:[,.]\d{2})?/g, '')
    .replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, '')
    .replace(/\s+/g, ' ')
    .trim() || cleanName;
  
  // Capitalize first letter of each word
  const formattedName = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return {
    name: formattedName,
    amount,
    dueDate,
    isRecurring,
    recurringInterval: isRecurring ? 'monthly' : undefined,
    category,
    confidence: amount ? 0.85 : 0.6, // Higher confidence if we found an amount
  };
}
