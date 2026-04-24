import { useNavigate } from "react-router-dom";
import { NightBackground } from "@/components/swc/NightBackground";
import portalImg from "@/assets/portal-ring.jpg";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pt-14">
        <p className="text-sm tracking-[0.22em] text-foreground/80 animate-fade-up">
          Divine Daily Welcome
        </p>

        <div className="mt-10 flex w-full flex-1 flex-col items-center justify-between">
          <div className="relative flex aspect-square w-full items-center justify-center animate-float-slow">
            <div
              className="absolute inset-0 rounded-full opacity-90 animate-glow-pulse"
              style={{ background: "var(--gradient-radial-glow)" }}
              aria-hidden
            />
            <img
              src={portalImg}
              alt="Glowing portal over a serene moonlit lake"
              width={1024}
              height={1024}
              className="relative h-full w-full rounded-full object-cover"
              style={{ maskImage: "radial-gradient(circle, black 70%, transparent 100%)" }}
            />
          </div>

          <div className="mt-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h1 className="font-display text-5xl font-bold leading-[1.05] text-foreground">
              Divine Daily
              <br />
              Journey
            </h1>
            <p className="mt-5 text-base text-primary">Mode: Deep Sanctuary</p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-10 mb-10 rounded-full bg-primary px-10 py-3 text-sm font-semibold tracking-[0.18em] text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-transform hover:scale-105 active:scale-95"
          >
            BEGIN
          </button>
        </div>
      </div>
    </NightBackground>
  );
};

export default Welcome;
