import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches uncaught render errors and shows a
 * branded fallback instead of a blank white screen. Critical for app store
 * review: reviewers reject apps that crash to a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    // Hard reload as a safety net for state we can't recover from.
    if (typeof window !== "undefined") window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="bg-night relative flex min-h-screen flex-col items-center justify-center px-6 text-center text-foreground">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-radial-glow)" }}
          aria-hidden
        />
        <div className="relative max-w-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
            <AlertTriangle className="h-9 w-9 text-primary" strokeWidth={1.4} />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-primary">
            Something went wrong
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight">
            <span className="gold-text">A moment of stillness</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            We hit an unexpected issue. Try returning home — your progress is
            safe.
          </p>
          <button
            onClick={this.reset}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }
}
