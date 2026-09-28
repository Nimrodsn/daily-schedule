import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

import type { Database } from "./database.types";

/**
 * Keeps the single account signed in.
 *
 * This app has exactly one user and no login screen, so instead of gating
 * requests the proxy establishes the session itself: it refreshes the cookie
 * on every navigation and, when there is none, signs in with the credentials
 * held in server-side environment variables. Row level security is unchanged,
 * which is why the browser still gets a real session rather than open access.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error } = await supabase.auth.signInWithPassword({
      email: serverEnv.APP_USER_EMAIL,
      password: serverEnv.APP_USER_PASSWORD,
    });

    if (error) {
      // Nothing the user can do about it, so let the page render its own
      // error state rather than redirecting into a dead end.
      console.error("automatic sign-in failed", error.status, error.message);
    }
  }

  return response;
}
