import { z } from "zod";

/**
 * Public configuration, safe to ship to the browser.
 *
 * `NEXT_PUBLIC_*` values must be referenced as static property accesses so
 * that Next.js can inline them at build time; reading them through a computed
 * key would leave them undefined in the client bundle.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const publicEnv = parsed.data;
