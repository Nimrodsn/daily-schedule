import "server-only";

import { z } from "zod";

/**
 * Server-only configuration, validated once when the server boots.
 *
 * ANTHROPIC_API_KEY is deliberately optional: section 7 of the spec requires
 * every Claude feature to degrade to a local fallback, and removing the key is
 * the documented way to exercise that path.
 */
const serverEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  ALLOWED_EMAIL: z
    .email("ALLOWED_EMAIL must be a valid email address")
    .transform((value) => value.trim().toLowerCase()),
  APP_TIMEZONE: z.string().min(1).default("Asia/Jerusalem"),
});

const parsed = serverEnvSchema.safeParse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  CLAUDE_MODEL: process.env.CLAUDE_MODEL,
  ALLOWED_EMAIL: process.env.ALLOWED_EMAIL,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase() === serverEnv.ALLOWED_EMAIL;
}
