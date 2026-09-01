import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { FREE_BILL_LIMIT, FREE_EVENT_LIMIT } from '@/constants/pricing';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-base font-semibold mb-2">{title}</h2>
    <div className="text-sm text-muted-foreground space-y-2">{children}</div>
  </section>
);

const Terms = () => {
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
        <h1 className="text-2xl font-semibold mb-1">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated August 11, 2026</p>

        <p className="text-sm text-muted-foreground mb-8">
          These Terms of Service govern your use of Billvie, operated by Show 4 Reel Media Pty Ltd,
          New South Wales, Australia. By using Billvie you agree to these terms.
        </p>

        <Section title="1. Your Billvie Account">
          <p>
            You are responsible for keeping your account secure and for activity that happens under it.
            Billvie organises information for one household. If you help run more than one household,
            you may need a separate account for each until multi household support is available.
          </p>
        </Section>

        <Section title="2. Acceptable Use">
          <p>You may not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use Billvie for any unlawful purpose</li>
            <li>Attempt to access another household's data without authorisation</li>
            <li>Interfere with or disrupt Billvie or its infrastructure</li>
            <li>Use automated scripts or bots to access Billvie without our written permission</li>
            <li>Resell or exploit any part of Billvie without our written consent</li>
          </ul>
        </Section>

        <Section title="3. Subscriptions and Payments">
          <p>
            Free plan: up to {FREE_BILL_LIMIT} bills and {FREE_EVENT_LIMIT} events. Sharing with an
            advisor or accountant is included on both plans. Tax export, the household summary, and
            data backup are part of the paid plan.
          </p>
          <p>
            Billvie Annual: $79 USD per year, billed annually. Unlocks unlimited bills and events, smart
            reminders, unlimited trusted people, and tax export. Sharing with an advisor or accountant is
            always free, on any plan.
          </p>
          <p>
            Subscriptions renew automatically. You can cancel any time from Settings, you'll keep access
            until the end of your current billing period.
          </p>
          <p>
            Payments are processed by Stripe. We never see or store your card number.
          </p>
        </Section>

        <Section title="4. Your Data">
          <p>
            You own everything you put into Billvie, your bills, documents, financial details, and
            contacts. We do not sell your data or use it for advertising. You can export or clear your
            household's data at any time from Settings.
          </p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            Billvie's software, design, and trademarks are owned by Show 4 Reel Media Pty Ltd. You may
            not copy, modify, or reverse engineer any part of the service.
          </p>
        </Section>

        <Section title="6. Disclaimer of Warranties">
          <p>
            Billvie is provided as is. We do not warrant uninterrupted or error free operation. You are
            responsible for verifying the accuracy of anything you rely on, including details extracted
            by our AI bill scanning feature, before acting on it.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, our liability is limited to the amount you paid in
            the 12 months before any claim, or AUD $100, whichever is greater. Nothing in these terms
            limits liability that cannot be excluded under Australian Consumer Law.
          </p>
        </Section>

        <Section title="8. Australian Consumer Law">
          <p>
            Our services come with guarantees that cannot be excluded under Australian Consumer Law. You
            are entitled to a refund or replacement for a major failure, and compensation for any other
            reasonably foreseeable loss.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You can stop using Billvie at any time. We may suspend or terminate accounts that materially
            breach these terms. To close your account, contact hello@simplaful.com.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>These terms are governed by the laws of New South Wales, Australia.</p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We will notify you of material changes by email and by updating the date above. Continued
            use after changes means you accept the update.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>hello@simplaful.com</p>
        </Section>
      </main>
    </div>
  );
};

export default Terms;
