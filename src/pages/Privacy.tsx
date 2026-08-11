import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-base font-semibold mb-2">{title}</h2>
    <div className="text-sm text-muted-foreground space-y-2">{children}</div>
  </section>
);

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BillvieLogo size="sm" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated August 11, 2026</p>

        <p className="text-sm text-muted-foreground mb-8">
          Billvie is operated by Show 4 Reel Media Pty Ltd, New South Wales, Australia, part of the
          Simplaful group of business and household applications alongside eTimesheet, Invoicily.net,
          and Peepaly. This policy explains how Billvie collects, uses, and protects the information you
          and your household share with it.
        </p>

        <Section title="1. Who We Are">
          <p>
            Billvie is operated by Show 4 Reel Media Pty Ltd. For privacy enquiries, contact us at
            hello@simplaful.com.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p className="font-medium text-foreground">Information you provide to us:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information: name, email, and a securely hashed password</li>
            <li>Google Sign In, when available: name, email, and profile picture from Google. We never receive or store your Google password</li>
            <li>Household information: the bills, documents, financial details, key contacts, and events you choose to add</li>
            <li>Uploaded documents and scanned bills, including images you attach or photograph</li>
            <li>Payment information, processed by Stripe. We never see or store your card number</li>
            <li>Anything you send us through support</li>
          </ul>
          <p className="font-medium text-foreground pt-2">Information collected automatically:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device and browser type</li>
            <li>Usage data, such as which features you use</li>
            <li>Approximate location from your IP address</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>Operate Billvie and keep your household's information organised</li>
            <li>Process subscription payments through Stripe</li>
            <li>Send account and household related emails, such as invites and reminders</li>
            <li>Extract details from bill photos you choose to scan (see section 6)</li>
            <li>Respond to support requests</li>
            <li>Improve existing features</li>
            <li>Monitor for security issues and comply with legal obligations</li>
          </ul>
          <p>We do not sell your data. We do not use it for advertising.</p>
        </Section>

        <Section title="4. Sharing Within Your Household">
          <p>
            Nothing in your household is visible to anyone unless you specifically grant them access.
            When you invite someone, a partner, family member, advisor, or accountant, you choose exactly
            what they can see: bills, documents, financial snapshot, key contacts, or events, scope by
            scope. You can revoke access at any time. Advisors and accountants only ever see what you've
            explicitly shared with them.
          </p>
        </Section>

        <Section title="5. Third Party Services">
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase, database and authentication</li>
            <li>Stripe, payment processing</li>
            <li>Google, optional sign in</li>
            <li>Resend, account and household emails</li>
            <li>Netlify, hosting</li>
          </ul>
          <p>
            Our AI bill scanning feature sends the photo you upload to Google's Gemini model, through an
            automated workflow, to extract the bill's details such as amount, due date, and provider. The
            image and extracted data are then stored in your household's records. This only happens when
            you choose to scan a bill.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li>Deleted bills, documents, and tax documents are recoverable from Recently Deleted for 30 days, then permanently removed</li>
            <li>You can clear all your household's data at any time from Settings</li>
            <li>Payment records are retained as required for Australian tax purposes</li>
            <li>To close your account entirely, contact hello@simplaful.com</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>
            You can access, correct, or delete your personal data, and export your household's data.
            Australian users: Billvie handles personal information in accordance with the Australian
            Privacy Principles under the Privacy Act 1988 (Cth). To exercise your rights, contact
            hello@simplaful.com.
          </p>
        </Section>

        <Section title="8. Cookies and Local Storage">
          <p>
            We use essential cookies and local storage to keep you signed in and remember preferences
            like theme. We do not use advertising or tracking cookies.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Billvie is intended for adults managing a household. We do not knowingly collect information
            from children.
          </p>
        </Section>

        <Section title="10. Security">
          <p>
            All data is encrypted in transit. Passwords are hashed and never stored in plain text.
            Database access is controlled so only people you've granted access can see your household's
            data. Payment data is handled entirely by Stripe.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We will notify you of material changes by email and by updating the date above.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>hello@simplaful.com</p>
        </Section>
      </main>
    </div>
  );
};

export default Privacy;
