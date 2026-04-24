import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NightBackground } from "@/components/swc/NightBackground";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <NightBackground>
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-safe-top pt-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <header className="mb-8 animate-fade-up">
          <h1 className="font-display text-4xl">
            <span className="gold-text">Terms</span>{" "}
            <span className="text-foreground">of Service</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: April 2026
          </p>
        </header>

        <article className="glass-card rounded-3xl p-6 space-y-6 text-sm leading-relaxed text-foreground/90 animate-fade-up">
          <section>
            <h2 className="font-display text-xl text-primary mb-2">1. Acceptance</h2>
            <p>
              By creating an account or using Solomon Wealth Code ("the App"),
              you agree to these Terms of Service and our Privacy Policy. If you
              do not agree, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">2. The Service</h2>
            <p>
              Solomon Wealth Code provides daily biblical audio teachings,
              scripture reading, prayer, and educational financial calculators.
              All financial tools are for educational purposes only and do not
              constitute financial, legal, or tax advice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">3. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity under your account. You
              must be at least 13 years old to use the App.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">4. Acceptable Use</h2>
            <p>
              You agree not to misuse the App, attempt to access other users'
              data, reverse-engineer the service, or use it for unlawful
              purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">5. Content</h2>
            <p>
              Audio teachings, prayers, and devotional text are the intellectual
              property of Solomon Wealth Code. Bible translations are used under
              their respective public-domain or licensed terms. You may share
              individual verse images for personal, non-commercial use.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">6. Disclaimers</h2>
            <p>
              The App is provided "as is" without warranties of any kind. We do
              not guarantee uninterrupted access. Financial calculators are
              estimates — always consult a qualified professional before making
              financial decisions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">7. Termination</h2>
            <p>
              You may delete your account at any time from the Privacy settings.
              We may suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">8. Changes</h2>
            <p>
              We may update these terms from time to time. Continued use after
              changes constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">9. Contact</h2>
            <p>
              For questions about these terms, contact us through the support
              option in the app.
            </p>
          </section>
        </article>
      </div>
    </NightBackground>
  );
};

export default Terms;
