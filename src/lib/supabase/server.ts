import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Request-scoped Supabase client. It always carries the user's session, so
 * RLS applies to server code exactly as it does in the browser. There is
 * deliberately no service-role client anywhere in this project.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The proxy refreshes the
            // session on every navigation, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** The signed-in user, or null. Always verified against the auth server. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
