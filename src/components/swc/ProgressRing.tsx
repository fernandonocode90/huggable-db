interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}

export const ProgressRing = ({
  value,
  max,
  size = 280,
  stroke = 10,
  children,
}: ProgressRingProps) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative animate-float-slow" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full opacity-70 animate-glow-pulse"
        style={{ background: "var(--gradient-radial-glow)" }}
        aria-hidden
      />
      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--primary) / 0.18)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#goldGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          style={{
            filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.7))",
            transition: "stroke-dashoffset 1.2s var(--transition-smooth)",
          }}
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
        {children}
      </div>
    </div>
  );
};
