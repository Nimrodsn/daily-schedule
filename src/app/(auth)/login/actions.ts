"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isAllowedEmail } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";

import { initialLoginState, type LoginState } from "./state";

const emailSchema = z.email("כתובת המייל אינה תקינה");
const codeSchema = z.string().regex(/^\d{6}$/, "הקוד מורכב מ-6 ספרות");

/** Only allow relative paths so `next` cannot be used as an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function requestCode(formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      step: "email",
      email: String(formData.get("email") ?? ""),
      error: parsed.error.issues[0].message,
      notice: null,
    };
  }

  const email = parsed.data.trim().toLowerCase();

  // Checked before touching Supabase so an unauthorized address never
  // triggers an email or creates a user.
  if (!isAllowedEmail(email)) {
    return {
      step: "email",
      email,
      error: "כתובת המייל הזו אינה מורשית להתחבר לאפליקציה.",
      notice: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return {
      step: "email",
      email,
      error:
        error.status === 429
          ? "נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות."
          : "שליחת הקוד נכשלה. בדוק את החיבור לרשת ונסה שוב.",
      notice: null,
    };
  }

  return {
    step: "code",
    email,
    error: null,
    notice: `שלחנו קוד בן 6 ספרות אל ${email}`,
  };
}

async function verifyCode(formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = codeSchema.safeParse(formData.get("code"));

  if (!parsed.success) {
    return {
      step: "code",
      email,
      error: parsed.error.issues[0].message,
      notice: null,
    };
  }

  if (!isAllowedEmail(email)) {
    return { ...initialLoginState, error: "כתובת המייל אינה מורשית." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });

  if (error) {
    return {
      step: "code",
      email,
      error: "הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.",
      notice: null,
    };
  }

  return { step: "code", email, error: null, notice: null };
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // `restart` has its own field name: the step-two form already carries a
  // hidden `intent`, and formData.get() would return that one instead.
  if (formData.get("restart") === "1") {
    return initialLoginState;
  }

  if (formData.get("intent") === "request") {
    return requestCode(formData);
  }

  const result = await verifyCode(formData);

  // redirect() throws, so it must run outside the try/catch inside verifyCode.
  if (result.error === null && result.notice === null) {
    redirect(safeNext(formData.get("next")));
  }

  return result;
}
