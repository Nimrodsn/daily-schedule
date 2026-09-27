import { describe, expect, it } from "vitest";

import { isNavItemActive, NAV_ITEMS } from "@/components/nav/nav-items";

describe("NAV_ITEMS", () => {
  it("exposes the four Hebrew tabs in order", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "היום",
      "תבנית",
      "סטטיסטיקות",
      "הגדרות",
    ]);
  });
});

describe("isNavItemActive", () => {
  it("matches the today tab only on the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/stats")).toBe(false);
  });

  it("matches nested routes of a section", () => {
    expect(isNavItemActive("/template", "/template")).toBe(true);
    expect(isNavItemActive("/template", "/template/special-days")).toBe(true);
  });

  it("does not match a sibling route sharing a prefix", () => {
    expect(isNavItemActive("/stats", "/stats-archive")).toBe(false);
  });
});
