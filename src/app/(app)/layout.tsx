import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/nav/bottom-nav";
import { Providers } from "@/components/providers";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // The proxy already redirects unauthenticated requests, but the Next.js docs
  // are explicit that it must not be the only check.
  const user = await getUser();
  if (!user) redirect("/login");

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
