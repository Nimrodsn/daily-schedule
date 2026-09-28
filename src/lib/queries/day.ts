import {
  planMoveToDate,
  planSnooze,
  type DailyTask,
  type MovePlan,
} from "@/lib/day";
import { createClient } from "@/lib/supabase/client";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { addDays, type IsoDate } from "@/lib/time";
import type { TaskInput } from "@/lib/validators";

export const dayKeys = {
  all: ["day"] as const,
  date: (date: IsoDate) => [...dayKeys.all, date] as const,
  range: (from: IsoDate, to: IsoDate) =>
    [...dayKeys.all, "range", from, to] as const,
};

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Materialises the day, then reads it. Days are never generated ahead of
 * time, so this RPC is what turns the weekly template into real rows.
 */
export async function fetchDay(date: IsoDate): Promise<DailyTask[]> {
  const supabase = createClient();

  const { error: rpcError } = await supabase.rpc("ensure_my_day", {
    p_date: date,
  });
  if (rpcError) throw rpcError;

  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("task_date", date);

  if (error) throw error;
  return data ?? [];
}

/** Read-only: used for the week strip dots and the carry-over banner. */
export async function fetchTasksInRange(
  from: IsoDate,
  to: IsoDate,
): Promise<DailyTask[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .gte("task_date", from)
    .lte("task_date", to);

  if (error) throw error;
  return data ?? [];
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_tasks")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

/** "רק היום" - touches only this instance. */
export async function updateTaskToday(
  id: string,
  input: TaskInput,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_tasks")
    .update({
      title: input.title,
      notes: input.notes,
      scheduled_time: input.scheduled_time,
      icon: input.icon,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * "מהיום והלאה" - this instance, the template itself, and any future
 * instances that are still pending. Past and completed days keep their
 * original wording.
 */
export async function updateTaskOnward(
  task: DailyTask,
  input: TaskInput,
): Promise<void> {
  if (task.template_id === null) {
    return updateTaskToday(task.id, input);
  }

  const supabase = createClient();
  const patch = {
    title: input.title,
    notes: input.notes,
    scheduled_time: input.scheduled_time,
    icon: input.icon,
  };

  const [instance, template, future] = await Promise.all([
    supabase.from("daily_tasks").update(patch).eq("id", task.id),
    supabase.from("templates").update(patch).eq("id", task.template_id),
    supabase
      .from("daily_tasks")
      .update(patch)
      .eq("template_id", task.template_id)
      .eq("status", "pending")
      .gt("task_date", task.task_date),
  ]);

  const failure = [instance, template, future].find((result) => result.error);
  if (failure?.error) throw failure.error;
}

/**
 * "רק היום" delete. The row is cancelled rather than removed so that
 * `unique (template_id, task_date)` keeps ensure_day from recreating it.
 */
export async function cancelTaskToday(id: string): Promise<void> {
  return setTaskStatus(id, "cancelled");
}

export async function restoreTask(id: string): Promise<void> {
  return setTaskStatus(id, "pending");
}

/**
 * "מהיום והלאה" delete: retire the template from yesterday, then cancel this
 * instance and every future one still pending.
 */
export async function deleteTaskOnward(task: DailyTask): Promise<void> {
  if (task.template_id === null) {
    return cancelTaskToday(task.id);
  }

  const supabase = createClient();

  const [template, instance, future] = await Promise.all([
    supabase
      .from("templates")
      .update({ active_until: addDays(task.task_date, -1) })
      .eq("id", task.template_id),
    supabase
      .from("daily_tasks")
      .update({ status: "cancelled" as const })
      .eq("id", task.id),
    supabase
      .from("daily_tasks")
      .update({ status: "cancelled" as const })
      .eq("template_id", task.template_id)
      .eq("status", "pending")
      .gt("task_date", task.task_date),
  ]);

  const failure = [template, instance, future].find((result) => result.error);
  if (failure?.error) throw failure.error;
}

export async function snoozeTask(
  task: DailyTask,
  minutes = 60,
): Promise<void> {
  const plan = planSnooze(task, minutes);
  if (plan === null) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("daily_tasks")
    .update(plan)
    .eq("id", task.id);

  if (error) throw error;
}

/**
 * What the target day already holds for this template, if anything. The day is
 * materialised first so the answer accounts for special days too, rather than
 * re-implementing the template rules from ensure_day in TypeScript.
 */
async function existingInstanceOn(
  templateId: string,
  date: IsoDate,
): Promise<{ id: string; status: TaskStatus } | null> {
  const supabase = createClient();

  const { error: rpcError } = await supabase.rpc("ensure_my_day", {
    p_date: date,
  });
  if (rpcError) throw rpcError;

  const { data, error } = await supabase
    .from("daily_tasks")
    .select("id, status")
    .eq("template_id", templateId)
    .eq("task_date", date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** "העבר למחר" / "העבר להיום". See planMoveToDate for why templates differ. */
export async function moveTaskToDate(
  task: DailyTask,
  targetDate: IsoDate,
): Promise<MovePlan["kind"]> {
  const supabase = createClient();

  const existing =
    task.template_id === null
      ? null
      : await existingInstanceOn(task.template_id, targetDate);

  const plan = planMoveToDate(task, targetDate, newId, existing);

  switch (plan.kind) {
    case "reschedule": {
      const { error } = await supabase
        .from("daily_tasks")
        .update({ task_date: plan.task_date })
        .eq("id", plan.id);
      if (error) throw error;
      break;
    }

    case "revive": {
      const { error } = await supabase
        .from("daily_tasks")
        .update({ status: "pending" as const })
        .eq("id", plan.reviveId);
      if (error) throw error;
      break;
    }

    case "copy-and-cancel": {
      // The id comes from the client, so a retry cannot double-insert.
      const { error } = await supabase
        .from("daily_tasks")
        .upsert(plan.insert, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      break;
    }

    case "cancel-only":
      break;
  }

  if (plan.kind !== "reschedule") {
    const { error } = await supabase
      .from("daily_tasks")
      .update({ status: "cancelled" as const })
      .eq("id", plan.cancelId);
    if (error) throw error;
  }

  return plan.kind;
}

export async function createOneOffTask(
  date: IsoDate,
  input: TaskInput,
  options: { source?: "oneoff" | "ai"; id?: string; sortOrder?: number } = {},
): Promise<void> {
  const supabase = createClient();

  // The id is generated client-side so an offline retry de-duplicates.
  const { error } = await supabase.from("daily_tasks").upsert(
    {
      id: options.id ?? newId(),
      task_date: date,
      title: input.title,
      notes: input.notes,
      scheduled_time: input.scheduled_time,
      icon: input.icon,
      source: options.source ?? "oneoff",
      sort_order: options.sortOrder ?? 0,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) throw error;
}