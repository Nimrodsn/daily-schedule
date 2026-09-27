import { CalendarCheck, ChartColumn, Repeat, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "היום", icon: CalendarCheck },
  { href: "/template", label: "תבנית", icon: Repeat },
  { href: "/stats", label: "סטטיסטיקות", icon: ChartColumn },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
