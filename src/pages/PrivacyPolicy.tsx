import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NightBackground } from "@/components/swc/NightBackground";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <NightBackground>
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <header className="mb-8 animate-fade-up">
          <h1 className="font-display text-4xl">
            <span className="gold-text">Privacy</span>{" "}
            <span className="text-foreground">Policy</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </header>

        <article className="glass-card rounded-3xl p-6 space-y-6 text-sm leading-relaxed text-foreground/90 animate-fade-up">
          <section>
            <h2 className="font-display text-xl text-primary mb-2">1. Who we are</h2>
            <p>
              Solomon Wealth Code ("we", "our", "the App") is a mobile and web
              application that delivers daily biblical audio teachings, Bible
              reading, prayer, and educational financial calculators. This
              policy explains what data we collect, how we use it, and your
              rights over it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">2. Data we collect</h2>
            <p className="mb-2">When you use the App we may collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/85">
              <li><strong>Account information:</strong> email address, display name, and (optionally) a profile photo you upload.</li>
              <li><strong>Authentication data:</strong> if you sign in with Google or Apple, we receive your name, email, and profile picture from the provider.</li>
              <li><strong>Usage data:</strong> which audios you completed, your listening position, your reading history, favorites, highlights and notes in the Bible, and your daily streak.</li>
              <li><strong>Device & locale data:</strong> your time zone (to unlock the correct daily teaching) and a push-notification token if you enable reminders.</li>
              <li><strong>Calculator inputs:</strong> any financial scenarios you choose to save (stored under your account only).</li>
            </ul>
            <p className="mt-2">
              We <strong>do not</strong> collect precise location, contacts,
              health data, photos beyond the avatar you upload, or browsing
              activity outside the App.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1 text-foreground/85">
              <li>To create and secure your account.</li>
              <li>To unlock the correct daily teaching based on your start date and time zone.</li>
              <li>To save your progress, streak, favorites and notes so they sync across devices.</li>
              <li>To send the daily reminder push notification — only if you enable it.</li>
              <li>To improve reliability and diagnose errors (no personal content is sold).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">4. Legal basis</h2>
            <p>
              We process your data on the basis of the contract you enter into
              when creating an account, your consent (for reminders), and our
              legitimate interest in operating and improving the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">5. Sharing</h2>
            <p>
              We do not sell your personal data. We share data only with the
              service providers strictly required to run the App:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/85 mt-2">
              <li><strong>Supabase</strong> — authentication, database and avatar storage.</li>
              <li><strong>Cloudflare R2</strong> — secure storage for audio files.</li>
              <li><strong>Google / Apple</strong> — only if you choose to sign in with them.</li>
              <li><strong>Web Push services</strong> — only if you enable daily reminders.</li>
            </ul>
            <p className="mt-2">
              These providers act as data processors on our behalf and are
              bound by their own privacy commitments.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">6. Storage & security</h2>
            <p>
              Your data is stored on encrypted servers operated by Supabase.
              Access is protected by row-level security so that no other user
              can read your account data. Passwords are hashed and never
              visible to us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">7. Retention</h2>
            <p>
              We keep your account data for as long as your account is active.
              When you delete your account from <em>Privacy & Account</em>,
              your profile, progress, bookmarks, calculator scenarios, push
              subscriptions and avatar are permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">8. Your rights</h2>
            <p>
              You may at any time: access your data, correct it, export it,
              withdraw consent for reminders, or delete your account. Most of
              these are available directly inside the App. For other requests,
              contact us using the details in section 11.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">9. Children</h2>
            <p>
              The App is not directed at children under 13. If we discover
              that we have inadvertently collected data from a child under
              13, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">10. International transfers</h2>
            <p>
              Your data may be processed in countries other than your own.
              Where required, we rely on standard contractual clauses to
              protect your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">11. Contact</h2>
            <p>
              For privacy questions or to exercise your rights, contact us at{" "}
              <a href="mailto:support@solomonwealthcode.com" className="text-primary hover:underline">
                support@solomonwealthcode.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary mb-2">12. Changes</h2>
            <p>
              We may update this policy occasionally. The "Last updated" date
              above will reflect any change. Continued use after changes
              constitutes acceptance of the revised policy.
            </p>
          </section>
        </article>
      </div>
    </NightBackground>
  );
};

export default PrivacyPolicy;
