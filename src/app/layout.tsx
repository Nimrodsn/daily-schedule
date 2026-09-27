import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import type { ReactNode } from "react";

import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "היום שלי",
  description: "ניהול המשימות של היום לפי סדר היום",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfe" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <DirectionProvider dir="rtl">
          {children}
          <Toaster position="top-center" dir="rtl" richColors />
        </DirectionProvider>
      </body>
    </html>
  );
}
