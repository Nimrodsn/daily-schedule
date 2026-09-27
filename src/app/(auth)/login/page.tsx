import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "כניסה · היום שלי",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">היום שלי</CardTitle>
        <CardDescription>
          נשלח אליך קוד חד-פעמי למייל. אין צורך בסיסמה.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next ?? "/"} />
      </CardContent>
    </Card>
  );
}
