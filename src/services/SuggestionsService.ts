import { User, FileText, Chrome as Home, Users, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { DocumentService } from '@/services/DocumentService';
import { KeyPeopleService } from '@/services/KeyPeopleService';
import { AccessService } from '@/services/AccessService';
import { FREE_BILL_LIMIT, FREE_EVENT_LIMIT } from '@/constants/pricing';

const DISMISSED_KEY = 'billvie_suggestions_dismissed';

export interface Suggestion {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  actionPath: string;
  condition: () => boolean;
}

function buildSuggestions(isPaid: boolean): Suggestion[] {
  return [
    {
      id: 'add_contact',
      icon: User,
      title: 'Add one contact your family may need',
      description: 'A plumber, accountant, or someone to call in a pinch.',
      action: 'Do it now',
      actionPath: '/key-people',
      condition: () => KeyPeopleService.getAllKeyPeople().length === 0,
    },
    {
      id: 'upload_document',
      icon: FileText,
      title: 'Upload one important document',
      description: 'A lease, insurance policy, or anything hard to find in a hurry.',
      action: 'Do it now',
      actionPath: '/documents',
      condition: () => DocumentService.getCount() === 0,
    },
    {
      id: 'add_another_bill',
      icon: Home,
      title: 'Add another household bill',
      description: 'The more you add, the clearer things are for your family.',
      action: 'Do it now',
      actionPath: '/bills',
      condition: () => BillService.getBillCount() === 1,
    },
    {
      id: 'invite_someone',
      icon: Users,
      title: 'Invite someone you trust',
      description: "Share visibility so you're not the only one who knows.",
      action: 'Do it now',
      actionPath: '/people',
      condition: () => AccessService.getActivePeople().length === 0,
    },
    {
      id: 'events',
      icon: Calendar,
      title: 'Planning something big?',
      description: 'Plan and organise big moments together — trips, weddings, or any special occasion.',
      action: 'Explore Events',
      actionPath: '/events',
      condition: () => BillService.getBillCount() >= 10 && EventService.getEventCount() === 0 && !isPaid,
    },
    {
      id: 'upgrade_events',
      icon: Sparkles,
      title: 'Need more Events?',
      description: "You've used your free event! Upgrade for unlimited events, sharing, and analytics.",
      action: 'Learn More',
      actionPath: '/settings',
      condition: () => EventService.getEventCount() >= FREE_EVENT_LIMIT && !isPaid,
    },
    {
      id: 'upgrade_bills',
      icon: TrendingUp,
      title: 'Approaching bill limit',
      description: `You're close to ${FREE_BILL_LIMIT} bills! Upgrade for unlimited tracking and premium features.`,
      action: 'Upgrade Now',
      actionPath: '/settings',
      condition: () => {
        const count = BillService.getBillCount();
        return count >= FREE_BILL_LIMIT - 5 && count < FREE_BILL_LIMIT && !isPaid;
      },
    },
    {
      id: 'sharing',
      icon: Users,
      title: 'Share visibility with family?',
      description: "Make sure you're not the only one who knows. Share household visibility with your partner or family.",
      action: 'Learn About Sharing',
      actionPath: '/settings',
      condition: () => {
        const bills = BillService.getAllBills();
        return bills.some((b) => (b.taggedPersonIds?.length ?? 0) > 0) && !isPaid;
      },
    },
  ];
}

function getDismissed(): string[] {
  const stored = localStorage.getItem(DISMISSED_KEY);
  return stored ? JSON.parse(stored) : [];
}

export const SuggestionsService = {
  getEligibleSuggestion(isPaid: boolean): Suggestion | null {
    const dismissed = getDismissed();
    const suggestions = buildSuggestions(isPaid);
    return suggestions.find((s) => s.condition() && !dismissed.includes(s.id)) ?? null;
  },

  dismiss(id: string) {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]));
    }
  },
};
