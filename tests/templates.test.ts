import { describe, expect, it } from "vitest";

import {
  compareTemplates,
  planCopyDay,
  templatesForDay,
  type Template,
} from "@/lib/templates";

function makeTemplate(overrides: Partial<Template> & { id: string }): Template {
  return {
    user_id: "user-1",
    title: overrides.id,
    notes: null,
    scheduled_time: null,
    days_of_week: [0],
    icon: null,
    sort_order: 0,
    active_from: "2026-01-01",
    active_until: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("compareTemplates", () => {
  it("puts timed tasks before untimed ones", () => {
    const timed = makeTemplate({ id: "a", scheduled_time: "18:00:00" });
    const untimed = makeTemplate({ id: "b", sort_order: 0 });

    expect([untimed, timed].sort(compareTemplates).map((t) => t.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("orders timed tasks by clock time regardless of sort_order", () => {
    const late = makeTemplate({
      id: "late",
      scheduled_time: "20:00:00",
      sort_order: 0,
    });
    const early = makeTemplate({
      id: "early",
      scheduled_time: "06:30:00",
      sort_order: 99,
    });

    expect([late, early].sort(compareTemplates).map((t) => t.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("orders untimed tasks by sort_order, breaking ties by creation time", () => {
    const first = makeTemplate({
      id: "first",
      sort_order: 5,
      created_at: "2026-01-01T00:00:00Z",
    });
    const second = makeTemplate({
      id: "second",
      sort_order: 5,
      created_at: "2026-02-01T00:00:00Z",
    });
    const third = makeTemplate({ id: "third", sort_order: 9 });

    expect(
      [third, second, first].sort(compareTemplates).map((t) => t.id),
    ).toEqual(["first", "second", "third"]);
  });
});

describe("templatesForDay", () => {
  // The stage 3 acceptance check: one task assigned to Sunday and Tuesday
  // must show up under both tabs.
  const sundayAndTuesday = makeTemplate({
    id: "vitamin",
    days_of_week: [0, 2],
  });
  const wednesdayOnly = makeTemplate({ id: "gym", days_of_week: [3] });
  const all = [sundayAndTuesday, wednesdayOnly];

  it("includes a multi-day task under every day it belongs to", () => {
    expect(templatesForDay(all, 0).map((t) => t.id)).toEqual(["vitamin"]);
    expect(templatesForDay(all, 2).map((t) => t.id)).toEqual(["vitamin"]);
  });

  it("excludes it from days it is not assigned to", () => {
    expect(templatesForDay(all, 1)).toEqual([]);
    expect(templatesForDay(all, 3).map((t) => t.id)).toEqual(["gym"]);
  });
});

describe("planCopyDay", () => {
  const sunday = makeTemplate({ id: "coffee", days_of_week: [0] });
  const sundayAndMonday = makeTemplate({ id: "walk", days_of_week: [0, 1] });
  const friday = makeTemplate({ id: "shop", days_of_week: [5] });
  const all = [sunday, sundayAndMonday, friday];

  it("widens days_of_week instead of duplicating rows", () => {
    expect(planCopyDay(all, { from: 0, to: [2] })).toEqual([
      { id: "coffee", days_of_week: [0, 2] },
      { id: "walk", days_of_week: [0, 1, 2] },
    ]);
  });

  it("ignores tasks that are not on the source day", () => {
    const plan = planCopyDay(all, { from: 0, to: [2] });
    expect(plan.map((entry) => entry.id)).not.toContain("shop");
  });

  it("is idempotent: copying onto a day a task already has changes nothing", () => {
    expect(planCopyDay(all, { from: 0, to: [1] })).toEqual([
      { id: "coffee", days_of_week: [0, 1] },
    ]);
    // "walk" already covers Monday, so it is left out entirely.
  });

  it("never copies a day onto itself", () => {
    expect(planCopyDay(all, { from: 0, to: [0] })).toEqual([]);
  });

  it("keeps the day list sorted and free of duplicates", () => {
    const [entry] = planCopyDay([sunday], { from: 0, to: [6, 3, 3] });
    expect(entry.days_of_week).toEqual([0, 3, 6]);
  });
});
