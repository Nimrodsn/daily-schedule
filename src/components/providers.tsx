"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // `offlineFirst` serves cached data before hitting the network,
            // which stage 8 builds on when the cache is persisted to IndexedDB.
            networkMode: "offlineFirst",
            staleTime: 30_000,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 1,
            refetchOnWindowFocus: true,
          },
          mutations: {
            networkMode: "offlineFirst",
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
