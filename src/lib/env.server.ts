import "server-only";

import { z } from "zod";

/**
 * Server-only configuration, validated once when the server boots.
 *
 * ANTHROPIC_API_KEY is deliberately optional: section 7 of the spec requires
 * every Claude feature to degrade to a local fallback, and removing the key is
 * the documented way to exercise that path.
 *
 * APP_USER_EMAIL and APP_USER_PASSWORD belong to the single account this app
 * serves. The app signs itself in with them, so there is no login screen; the
 * password stays on the server and never reaches the browser. Row level
 * security still scopes every row to that account's id.
 */
const serverEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  APP_USER_EMAIL: z
    .email("APP_USER_EMAIL must be a valid email address")
    .transform((value) => value.trim().toLowerCase()),
  APP_USER_PASSWORD: z
    .string()
    .min(8, "APP_USER_PASSWORD must be at least 8 characters"),
  APP_TIMEZONE: z.string().min(1).default("Asia/Jerusalem"),
});

const parsed = serverEnvSchema.safeParse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  CLAUDE_MODEL: process.env.CLAUDE_MODEL,
  APP_USER_EMAIL: process.env.APP_USER_EMAIL,
  APP_USER_PASSWORD: process.env.APP_USER_PASSWORD,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;
