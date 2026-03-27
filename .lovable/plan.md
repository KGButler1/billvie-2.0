

# Billvie Repositioning: From Bill Tracker to Household Control Centre

## Overview
Reposition Billvie through copy changes, label updates, and minimal UI additions across 14 files. No new features or complex components -- just language, labels, and small trust-signal elements.

---

## 1. Landing Page Hero Rewrite (`src/pages/LandingPage.tsx`)

**Current headline:** "Stop using spreadsheets to track bills and plan events"

**New headline (option to pick during implementation):**
"Everything your household runs on -- in one place, ready for anyone to step in"

**New subheading:**
"The private control centre that gives your family clarity, continuity, and peace of mind -- so you're never the only one who knows."

**CTA changes:**
- Primary: "Set Up Your Household" (replaces "Start Tracking Free")
- Secondary: "See How It Works" (keep)
- Sub-CTA text: "Free to start. No financial credentials stored." (replaces "No signup required to start tracking")

**Features section rewrites:**
| Current | New Title | New Description |
|---------|-----------|-----------------|
| Ultra-Fast Entry | Quick Capture | Add a bill or commitment in seconds. Name it, save it, done. |
| Smart Reminders | Nothing Falls Through | Get alerted before anything is missed -- even if you're not around. |
| Couples Sharing | Shared Visibility | Make sure you're not the only one who knows what's due. |
| Event Planning | Life's Big Moments | Budget for weddings, moves, and milestones together. |
| Tax-Ready | Always Organised | Export tidy records whenever you need them. |

**Pricing section copy tweaks:**
- Free description: "Perfect for getting your household organised"
- Pro description: "For families who want full peace of mind"
- Pro features: "Couples sharing" becomes "Shared household visibility"

---

## 2. Dashboard Reframe (`src/components/DashboardStats.tsx`, `src/pages/Dashboard.tsx`)

**DashboardStats label changes:**
| Current | New |
|---------|-----|
| "Upcoming" | "Coming Up" |
| "Due Soon" | "Due Soon" (keep -- it's clear) |
| "Overdue" | "Needs Attention" |

**SpendingChart rename** (`src/components/SpendingChart.tsx`):
- "Spending by Category" becomes "Household Overview"

**ActiveEventsWidget rename** (`src/components/ActiveEventsWidget.tsx`):
- "Active Events" becomes "Upcoming Life Events"

**Empty state rewrite** (Dashboard.tsx):
- "No bills yet" becomes "Nothing tracked yet"
- "Tap the + button to add your first bill" becomes "Add your first household bill or commitment -- so your family always knows what's running"

**New trust signal** -- add a small muted text line below the stats cards:
"Only you and people you invite can see this"

---

## 3. Emergency/Family View Toggle (Lightweight) (`src/pages/Dashboard.tsx`, `src/components/DashboardHeader.tsx`)

Add a simple toggle button in the dashboard header (next to settings):
- Icon: Shield or Eye
- Label: "Family View"
- When active, it sets a state that changes section titles:
  - "Coming Up" becomes "What needs to be handled"
  - "Needs Attention" becomes "Urgent -- handle these first"
  - "Due Soon" becomes "Due soon -- don't miss these"
  - "Paid" becomes "Already taken care of"
- The stats card labels also shift:
  - "Coming Up" becomes "To handle"
  - "Needs Attention" becomes "Urgent"
- A small banner appears at top: "Family View -- Here's what needs to be handled if you're stepping in"
- Toggle off returns to normal labels
- No new data, no new components -- just conditional label strings

---

## 4. Bill Language Reframe

**QuickAddBill modal** (`src/components/QuickAddBill.tsx`):
- Title: "Add Bill" becomes "Add Household Bill"
- Name label: "Bill Name *" becomes "What is it? *"
- Placeholder: "e.g., Electric Bill" becomes "e.g., Electricity, Internet, Council rates"
- "Who's Responsible?" -- keep as-is (already good for continuity framing)
- "Recurring bill" becomes "This repeats regularly"

**BillCard** (`src/components/BillCard.tsx`):
- "Mark as paid" button text (if visible) stays, but tooltip/aria: "Mark as handled"

**Bill section headers** (Dashboard.tsx BillSection):
- Already handled by Family View toggle above for alternate labels
- Default labels: "Coming Up", "Due Soon", "Needs Attention", "Paid" becomes "Handled"

---

## 5. Sharing Feature Reposition

**BottomNav** (`src/components/BottomNav.tsx`):
- No label changes needed (Dashboard, Bills, Events, More are generic enough)

**Landing page features** (already covered in section 1):
- "Couples Sharing" becomes "Shared Visibility"

**TaxSharingPanel** (`src/components/tax/TaxSharingPanel.tsx`):
- "Share with Your Accountant" becomes "Give someone else access"
- "Give your tax professional secure access to documents" becomes "Let a trusted person or professional see what they need"
- "Add Accountant Access" becomes "Invite someone"

**ShareModal** (`src/components/sharing/ShareModal.tsx`):
- Update title/description copy to use "shared visibility" language (read file to confirm exact changes needed)

---

## 6. Trust & Privacy Microcopy

Add small, non-intrusive trust text in these locations:

| Location | Text | Implementation |
|----------|------|----------------|
| Dashboard (below stats) | "Only you and people you invite can see this" | Small `text-xs text-muted-foreground` paragraph |
| QuickAddBill (bottom of form, above submit) | "We never store your login credentials or bank details" | Small muted text |
| Settings page | "Your data stays private. We don't sell or share it." | Add to existing settings sections |
| Landing page footer area | Already has privacy link -- add inline: "Your data is private by default" | Near existing footer content |

---

## 7. De-emphasise / Rename Financial-Tracker Elements

| Element | Current | Change |
|---------|---------|--------|
| SpendingChart title | "Spending by Category" | "Household Overview" (rename only) |
| More page "Premium Features" section | "Premium Features" | "Household Tools" |
| More page "LoanReady" description | "Employment, rental history & assets" | "Your records, ready when you need them" |
| More page "Financial Info" description | "Insurance, super & documents" | "Important details in one place" |
| Category filter placeholder | "Filter by category" | "Filter by type" |
| ProgressiveHints | "Track your travel expenses in Events!" | "Plan and organise big moments together" |

---

## Files to Modify (14 files)

1. `src/pages/LandingPage.tsx` -- hero, features, pricing copy
2. `src/components/DashboardStats.tsx` -- stat labels
3. `src/components/SpendingChart.tsx` -- chart title
4. `src/components/ActiveEventsWidget.tsx` -- widget title
5. `src/pages/Dashboard.tsx` -- empty state, section titles, trust text, Family View state
6. `src/components/DashboardHeader.tsx` -- Family View toggle button
7. `src/components/QuickAddBill.tsx` -- form labels and trust text
8. `src/components/BillCard.tsx` -- minor label tweaks
9. `src/components/tax/TaxSharingPanel.tsx` -- sharing copy
10. `src/pages/More.tsx` -- section titles and descriptions
11. `src/components/ProgressiveHints.tsx` -- hint copy
12. `src/components/BottomNav.tsx` -- rename "Bills" tab to "Household" (optional, can keep)
13. `src/components/sharing/ShareModal.tsx` -- sharing language
14. `src/pages/Settings.tsx` -- trust microcopy

No new files created. No new dependencies. No structural changes.

