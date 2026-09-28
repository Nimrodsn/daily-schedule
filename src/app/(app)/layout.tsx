import type { ReactNode } from "react";

import { BottomNav } from "@/components/nav/bottom-nav";
import { Providers } from "@/components/providers";
import { getUser } from "@/lib/supabase/server";

function SessionError() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-sm space-y-2 text-center">
        <h1 className="text-lg font-semibold">אין חיבור לחשבון</h1>
        <p className="text-sm text-muted-foreground">
          לא הצלחנו להתחבר לשרת. בדוק את החיבור לרשת ורענן את הדף.
        </p>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  // The proxy signs the single account in and refreshes its cookie. A Server
  // Component cannot write cookies, so it can only report the failure.
  const user = await getUser();
  if (!user) return <SessionError />;

  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomNav />
      </div>
    </Providers>
  );
}
