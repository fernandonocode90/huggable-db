import { Crown } from "lucide-react";

/**
 * Gold crown badge shown to premium users — matches the app icon's crown,
 * but rendered without a background so it can sit cleanly inline next to
 * names, on top of avatars, etc.
 */
export const PremiumCrown = ({
  className = "",
  size = 16,
  title = "Premium member",
}: {
  className?: string;
  size?: number;
  title?: string;
}) => (
  <Crown
    aria-label={title}
    role="img"
    strokeWidth={1.8}
    style={{
      width: size,
      height: size,
      filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.55))",
    }}
    className={`text-primary fill-primary/80 ${className}`}
  />
);
