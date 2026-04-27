import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Globe, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION, APP_BUILD_DATE, SUPPORT_EMAIL, LANDING_URL } from "@/lib/appVersion";
import { getPlatform } from "@/lib/platform";
import { openExternal } from "@/lib/externalUrl";

const About = () => {
  const platform = getPlatform();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur">
        <Link to="/" aria-label="Back">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-base font-medium">About</h1>
      </header>

      <main className="mx-auto max-w-md space-y-8 px-5 py-8">
        {/* Brand block */}
        <section className="text-center">
          <img
            src="/pwa-512.png"
            alt="Solomon Wealth Code"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg"
            draggable={false}
          />
          <h2 className="text-xl font-semibold">Solomon Wealth Code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A daily sanctuary of biblical wisdom on prosperity.
          </p>
        </section>

        {/* Version */}
        <section className="rounded-2xl border border-border/40 bg-card/40 p-4 text-sm">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Build</span>
            <span className="font-mono text-xs">{APP_BUILD_DATE}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-mono text-xs capitalize">{platform}</span>
          </div>
        </section>

        {/* Links */}
        <section className="space-y-2">
          <button
            onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=Solomon%20Wealth%20Code%20support`)}
            className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-left text-sm transition-colors hover:bg-card/60"
          >
            <span className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Contact support
            </span>
            <span className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</span>
          </button>

          <button
            onClick={() => openExternal(LANDING_URL)}
            className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-left text-sm transition-colors hover:bg-card/60"
          >
            <span className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website
            </span>
            <span className="text-xs text-muted-foreground">solomonwealthcode.com</span>
          </button>

          <Link
            to="/privacy-policy"
            className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-card/60"
          >
            <span className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Privacy Policy
            </span>
          </Link>

          <Link
            to="/terms"
            className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-card/60"
          >
            <span className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Terms of Service
            </span>
          </Link>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Solomon Wealth Code. All rights reserved.
        </footer>
      </main>
    </div>
  );
};

export default About;
