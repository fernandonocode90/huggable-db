import { NightBackground } from "./NightBackground";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-12">
        {children}
      </div>
      <BottomNav />
    </NightBackground>
  );
};
