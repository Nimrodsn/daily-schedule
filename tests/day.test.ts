import { describe, expect, it } from "vitest";

import {
  carryOverCandidates,
  compareTasks,
  dayProgress,
  groupTasks,
  isTaskOverdue,
  nextSortOrder,
  planMoveToDate,
  planSnooze,
  type DailyTask,
} from "@/lib/day";
import { DEFAULT_TIMEZONE } from "@/lib/time";

function makeTask(overrides: Partial<DailyTask> & { id: string }): DailyTask {
  return {
    user_id: "user-1",
    task_date: "2026-09-27",
    template_id: null,
    title: overrides.id,
    notes: null,
    scheduled_time: null,
    icon: null,
    status: "pending",
    source: "oneoff",
    sort_order: 0,
    done_at: null,
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
    ...overrides,
  };
}

describe("compareTasks", () => {
  it("orders timed tasks by clock time ahead of untimed ones", () => {
    const untimed = makeTask({ id: "untimed", sort_order: 0 });
    const late = makeTask({ id: "late", scheduled_time: "21:00:00" });
    const early = makeTask({ id: "early", scheduled_time: "06:00:00" });

    expect([untimed, late, early].sort(compareTasks).map((t) => t.id)).toEqual([
      "early",
      "late",
      "untimed",
    ]);
  });

  it("orders untimed tasks by their manual sort_order", () => {
    const second = makeTask({ id: "second", sort_order: 1 });
    const first = makeTask({ id: "first", sort_order: 0 });

    expect([second, first].sort(compareTasks).map((t) => t.id)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("groupTasks", () => {
  it("separates pending, done and cancelled while keeping each sorted", () => {
    const tasks = [
      makeTask({ id: "done-late", status: "done", scheduled_time: "20:00:00" }),
      makeTask({ id: "cancelled", status: "cancelled" }),
      makeTask({ id: "pending-am", scheduled_time: "08:00:00" }),
      makeTask({ id: "done-early", status: "done", scheduled_time: "07:00:00" }),
    ];

    const groups = groupTasks(tasks);
    expect(groups.pending.map((t) => t.id)).toEqual(["pending-am"]);
    expect(groups.done.map((t) => t.id)).toEqual(["done-early", "done-late"]);
    expect(groups.cancelled.map((t) => t.id)).toEqual(["cancelled"]);
  });
});

describe("dayProgress", () => {
  it("ignores cancelled tasks in both numerator and denominator", () => {
    const tasks = [
      makeTask({ id: "a", status: "done" }),
      makeTask({ id: "b", status: "pending" }),
      makeTask({ id: "c", status: "cancelled" }),
    ];

    expect(dayProgress(tasks)).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("reports zero rather than dividing by zero on an empty day", () => {
    expect(dayProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(dayProgress([makeTask({ id: "x", status: "cancelled" })])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe("isTaskOverdue", () => {
  const now = new Date("2026-09-27T09:00:00Z"); // 12:00 in Jerusalem

  it("flags a pending task whose time has passed", () => {
    const task = makeTask({ id: "a", scheduled_time: "10:00:00" });
    expect(isTaskOverdue(task, DEFAULT_TIMEZONE, now)).toBe(true);
  });

  it("never flags a task that is already done or cancelled", () => {
    const done = makeTask({
      id: "b",
      scheduled_time: "10:00:00",
      status: "done",
    });
    const cancelled = makeTask({
      id: "c",
      scheduled_time: "10:00:00",
      status: "cancelled",
    });

    expect(isTaskOverdue(done, DEFAULT_TIMEZONE, now)).toBe(false);
    expect(isTaskOverdue(cancelled, DEFAULT_TIMEZONE, now)).toBe(false);
  });
});

describe("planSnooze", () => {
  it("pushes a timed task forward by an hour", () => {
    const task = makeTask({ id: "a", scheduled_time: "09:15:00" });
    expect(planSnooze(task)).toEqual({
      task_date: "2026-09-27",
      scheduled_time: "10:15",
    });
  });

  it("rolls past midnight onto the next day", () => {
    const task = makeTask({ id: "a", scheduled_time: "23:30:00" });
    expect(planSnooze(task)).toEqual({
      task_date: "2026-09-28",
      scheduled_time: "00:30",
    });
  });

  it("does nothing for a task without a time", () => {
    expect(planSnooze(makeTask({ id: "a" }))).toBeNull();
  });
});

describe("planMoveToDate", () => {
  const newId = () => "generated-id";

  it("just reschedules a one-off task", () => {
    const task = makeTask({ id: "oneoff", template_id: null });

    expect(planMoveToDate(task, "2026-09-28", newId)).toEqual({
      kind: "reschedule",
      id: "oneoff",
      task_date: "2026-09-28",
    });
  });

  it("only drops today's copy when the target day already has the task", () => {
    // Copying here would leave two identical rows tomorrow.
    const task = makeTask({ id: "from-template", template_id: "tpl-1" });

    expect(
      planMoveToDate(task, "2026-09-28", newId, {
        id: "tomorrows-instance",
        status: "pending",
      }),
    ).toEqual({ kind: "cancel-only", cancelId: "from-template" });
  });

  it("revives a cancelled instance on the target day instead of copying", () => {
    const task = makeTask({ id: "from-template", template_id: "tpl-1" });

    expect(
      planMoveToDate(task, "2026-09-28", newId, {
        id: "tomorrows-instance",
        status: "cancelled",
      }),
    ).toEqual({
      kind: "revive",
      cancelId: "from-template",
      reviveId: "tomorrows-instance",
    });
  });

  it("copies a template task as a one-off and cancels the original", () => {
    // A straight date change would hit `unique (template_id, task_date)` as
    // soon as the target day materialises the same template.
    const task = makeTask({
      id: "from-template",
      template_id: "tpl-1",
      title: "להתקשר למוסך",
      scheduled_time: "11:00:00",
      icon: "📞",
      source: "template",
    });

    expect(planMoveToDate(task, "2026-09-28", newId)).toEqual({
      kind: "copy-and-cancel",
      cancelId: "from-template",
      insert: {
        id: "generated-id",
        task_date: "2026-09-28",
        title: "להתקשר למוסך",
        notes: null,
        scheduled_time: "11:00:00",
        icon: "📞",
        source: "oneoff",
        sort_order: 0,
      },
    });
  });

  it("ignores the target day's contents for a one-off", () => {
    const task = makeTask({ id: "oneoff", template_id: null });

    expect(
      planMoveToDate(task, "2026-09-28", newId, {
        id: "unrelated",
        status: "pending",
      }),
    ).toEqual({ kind: "reschedule", id: "oneoff", task_date: "2026-09-28" });
  });

  it("drops the template link so the copy cannot collide again", () => {
    const task = makeTask({ id: "t", template_id: "tpl-1" });
    const plan = planMoveToDate(task, "2026-09-28", newId);

    expect(plan.kind).toBe("copy-and-cancel");
    if (plan.kind === "copy-and-cancel") {
      expect(plan.insert).not.toHaveProperty("template_id");
      expect(plan.insert.source).toBe("oneoff");
    }
  });
});

describe("nextSortOrder", () => {
  it("lands after everything already on the day", () => {
    expect(
      nextSortOrder([
        makeTask({ id: "a", sort_order: 0 }),
        makeTask({ id: "b", sort_order: 4 }),
      ]),
    ).toBe(5);
  });

  it("starts at zero on an empty day", () => {
    expect(nextSortOrder([])).toBe(0);
  });
});

describe("carryOverCandidates", () => {
  it("returns only the tasks left pending yesterday", () => {
    const yesterday = [
      makeTask({ id: "still-open", task_date: "2026-09-26" }),
      makeTask({ id: "finished", task_date: "2026-09-26", status: "done" }),
      makeTask({
        id: "dropped",
        task_date: "2026-09-26",
        status: "cancelled",
      }),
    ];

    expect(carryOverCandidates(yesterday).map((t) => t.id)).toEqual([
      "still-open",
    ]);
  });
});
