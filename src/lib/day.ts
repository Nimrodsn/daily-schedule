import type { Tables, TaskStatus } from "@/lib/supabase/database.types";
import {
  addDays,
  DEFAULT_TIMEZONE,
  isOverdue,
  normalizeTime,
  snoozeByMinutes,
  timeToMinutes,
  todayIso,
  type IsoDate,
} from "@/lib/time";

/**
 * Pure rules for a single day. No Supabase import, so every decision here is
 * unit testable without a database.
 */

export type DailyTask = Tables<"daily_tasks">;

/**
 * Section 5 ordering: timed tasks first by clock time, then untimed tasks in
 * their manual order. Drag and drop only ever reorders the untimed group.
 */
export function compareTasks(a: DailyTask, b: DailyTask): number {
  const aTime = normalizeTime(a.scheduled_time);
  const bTime = normalizeTime(b.scheduled_time);

  if (aTime !== null && bTime !== null) {
    const diff = timeToMinutes(aTime) - timeToMinutes(bTime);
    if (diff !== 0) return diff;
  } else if (aTime !== null) {
    return -1;
  } else if (bTime !== null) {
    return 1;
  }

  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
}

export function isTimed(task: DailyTask): boolean {
  return normalizeTime(task.scheduled_time) !== null;
}

export type DayGroups = {
  pending: DailyTask[];
  done: DailyTask[];
  cancelled: DailyTask[];
};

export function groupTasks(tasks: DailyTask[]): DayGroups {
  const sorted = [...tasks].sort(compareTasks);
  return {
    pending: sorted.filter((task) => task.status === "pending"),
    done: sorted.filter((task) => task.status === "done"),
    cancelled: sorted.filter((task) => task.status === "cancelled"),
  };
}

export type DayProgress = { done: number; total: number; percent: number };

/** Cancelled tasks are excluded from progress entirely, per section 5. */
export function dayProgress(tasks: DailyTask[]): DayProgress {
  const counted = tasks.filter((task) => task.status !== "cancelled");
  const done = counted.filter((task) => task.status === "done").length;
  const total = counted.length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function isTaskOverdue(
  task: DailyTask,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): boolean {
  if (task.status !== "pending") return false;
  return isOverdue(
    task.task_date,
    normalizeTime(task.scheduled_time),
    timeZone,
    now,
  );
}

/**
 * "דחה שעה". A task without a time has nothing to push, so it is left alone.
 * Crossing midnight moves it to the next day.
 */
export function planSnooze(
  task: DailyTask,
  minutes = 60,
): { task_date: IsoDate; scheduled_time: string } | null {
  const time = normalizeTime(task.scheduled_time);
  if (time === null) return null;

  const next = snoozeByMinutes(task.task_date, time, minutes);
  return { task_date: next.date, scheduled_time: next.time };
}

export type MovePlan =
  | { kind: "reschedule"; id: string; task_date: IsoDate }
  | { kind: "cancel-only"; cancelId: string }
  | { kind: "revive"; cancelId: string; reviveId: string }
  | {
      kind: "copy-and-cancel";
      cancelId: string;
      insert: {
        id: string;
        task_date: IsoDate;
        title: string;
        notes: string | null;
        scheduled_time: string | null;
        icon: string | null;
        source: "oneoff";
        sort_order: number;
      };
    };

/**
 * "העבר למחר" / "העבר להיום".
 *
 * A one-off simply changes date. A task that came from the template cannot,
 * because `unique (template_id, task_date)` would collide with the instance
 * the target day generates from the same template. What to do instead depends
 * on what the target day already holds:
 *
 * - a live instance: the task is already scheduled there, so only today's
 *   copy is dropped. Copying would leave the user staring at two identical
 *   rows tomorrow.
 * - a cancelled instance: the user had removed it there, so bring it back.
 * - nothing: copy it across as a one-off and drop today's.
 */
export function planMoveToDate(
  task: DailyTask,
  targetDate: IsoDate,
  newId: () => string,
  existingOnTarget: { id: string; status: TaskStatus } | null = null,
): MovePlan {
  if (task.template_id === null) {
    return { kind: "reschedule", id: task.id, task_date: targetDate };
  }

  if (existingOnTarget !== null) {
    return existingOnTarget.status === "cancelled"
      ? { kind: "revive", cancelId: task.id, reviveId: existingOnTarget.id }
      : { kind: "cancel-only", cancelId: task.id };
  }

  return {
    kind: "copy-and-cancel",
    cancelId: task.id,
    insert: {
      id: newId(),
      task_date: targetDate,
      title: task.title,
      notes: task.notes,
      scheduled_time: task.scheduled_time,
      icon: task.icon,
      source: "oneoff",
      sort_order: task.sort_order,
    },
  };
}

export function nextStatus(current: TaskStatus): TaskStatus {
  return current === "done" ? "pending" : "done";
}

/** Tasks still pending on days before the one being viewed. */
export function carryOverCandidates(
  previousDayTasks: DailyTask[],
): DailyTask[] {
  return previousDayTasks
    .filter((task) => task.status === "pending")
    .sort(compareTasks);
}

/** Puts a newly added task at the end of the untimed group. */
export function nextSortOrder(tasks: DailyTask[]): number {
  return tasks.reduce((highest, task) => Math.max(highest, task.sort_order), -1) + 1;
}

export function yesterdayOf(date: IsoDate): IsoDate {
  return addDays(date, -1);
}

export function isToday(
  date: IsoDate,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): boolean {
  return date === todayIso(timeZone, now);
}
