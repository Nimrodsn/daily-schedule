import type { Metadata } from "next";

import { TemplateScreen } from "@/components/template/template-screen";

export const metadata: Metadata = {
  title: "תבנית · היום שלי",
};

export default function TemplatePage() {
  return <TemplateScreen />;
}
