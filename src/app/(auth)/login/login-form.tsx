"use client";

import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

import { loginAction } from "./actions";
import { initialLoginState } from "./state";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.step === "email" ? (
        <>
          <input type="hidden" name="intent" value="request" />

          <div className="space-y-2">
            <Label htmlFor="email">כתובת מייל</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              required
              defaultValue={state.email}
              placeholder="you@example.com"
              aria-describedby={state.error ? "login-error" : undefined}
              className="text-start"
            />
          </div>

          <SubmitButton>
            <Mail className="size-4" aria-hidden="true" />
            שלח לי קוד
          </SubmitButton>
        </>
      ) : (
        <>
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="email" value={state.email} />

          <div className="space-y-3">
            <Label htmlFor="code">הקוד שקיבלת במייל</Label>
            <div className="flex justify-center" dir="ltr">
              <InputOTP
                id="code"
                name="code"
                maxLength={6}
                autoFocus
                inputMode="numeric"
                aria-describedby={state.error ? "login-error" : undefined}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-12 text-lg font-semibold"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <SubmitButton>
            כניסה
            <ArrowRight className="size-4" aria-hidden="true" />
          </SubmitButton>
        </>
      )}

      {state.notice ? (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {state.notice}
        </p>
      ) : null}

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="text-center text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {state.step === "code" ? (
        <Button
          type="submit"
          name="restart"
          value="1"
          variant="ghost"
          className="w-full"
        >
          שינוי כתובת המייל
        </Button>
      ) : null}
    </form>
  );
}
