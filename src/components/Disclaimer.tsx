import { Info } from "lucide-react";

interface Props {
  /** Variant tunes the wording for the surface where it's shown. */
  variant?: "financial" | "general";
}

/**
 * Compact legal disclaimer. Required by app store review guidelines for
 * any tool offering financial or spiritual "advice" — the user must be
 * told these are educational tools, not professional counsel.
 */
export const Disclaimer = ({ variant = "general" }: Props) => {
  const text =
    variant === "financial"
      ? "For educational purposes only. These calculators are estimates and do not constitute financial, tax, or investment advice. Always consult a qualified professional before making financial decisions."
      : "Solomon Wealth Code provides biblical teachings and educational tools. It does not constitute professional spiritual, financial, legal, or medical advice.";

  return (
    <div className="mt-6 flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
      <p>{text}</p>
    </div>
  );
};
