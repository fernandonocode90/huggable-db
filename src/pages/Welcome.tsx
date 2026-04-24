import { useNavigate } from "react-router-dom";
import { NightBackground } from "@/components/swc/NightBackground";
import crownImg from "@/assets/golden-crown.webp";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pt-14">
        <p className="text-[11px] uppercase tracking-[0.32em] text-primary animate-fade-up">
          A Divine Daily Welcome
        </p>

        <div className="mt-6 flex w-full flex-1 flex-col items-center justify-between">
          <div className="relative flex aspect-square w-full max-w-sm items-center justify-center animate-float-slow">
            {/* Soft golden halo behind the crown */}
            <div
              className="absolute inset-0 rounded-full opacity-80 animate-glow-pulse"
              style={{ background: "var(--gradient-radial-glow)" }}
              aria-hidden
            />
            <img
              src={crownImg}
              alt="Ornate golden royal crown of Solomon"
              width={1024}
              height={1024}
              className="relative h-[78%] w-[78%] object-contain drop-shadow-[0_10px_40px_hsl(var(--primary)/0.55)]"
            />
          </div>

          <div className="mt-2 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h1 className="font-display text-5xl font-bold leading-[1.05]">
              <span className="gold-text">Solomon</span>
              <br />
              <span className="text-foreground">Wealth Code</span>
            </h1>
            <p className="mt-5 text-sm uppercase tracking-[0.28em] text-primary/90">
              Biblical Wisdom · Lasting Wealth
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-10 mb-10 rounded-full bg-primary px-12 py-3.5 text-sm font-semibold tracking-[0.22em] text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-transform hover:scale-105 active:scale-95"
          >
            BEGIN
          </button>
        </div>
      </div>
    </NightBackground>
  );
};

export default Welcome;
