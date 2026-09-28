"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { nextStatus, type DailyTask } from "@/lib/day";
import {
  cancelTaskToday,
  createOneOffTask,
  dayKeys,
  deleteTaskOnward,
  fetchDay,
  fetchTasksInRange,
  moveTaskToDate,
  restoreTask,
  setTaskStatus,
  snoozeTask,
  updateTaskOnward,
  updateTaskToday,
} from "@/lib/queries/day";
import { templateKeys } from "@/lib/queries/templates";
import type { IsoDate } from "@/lib/time";
import type { EditScope, TaskInput } from "@/lib/validators";

/** Stable keys so stage 8 can attach offline defaults via setMutationDefaults. */
export const dayMutationKeys = {
  toggle: ["day", "toggle"] as const,
  update: ["day", "update"] as const,
  remove: ["day", "remove"] as const,
  restore: ["day", "restore"] as const,
  snooze: ["day", "snooze"] as const,
  move: ["day", "move"] as const,
  create: ["day", "create"] as const,
};

export function useDay(date: IsoDate) {
  return useQuery({
    queryKey: dayKeys.date(date),
    queryFn: () => fetchDay(date),
  });
}

export function useTasksInRange(from: IsoDate, to: IsoDate) {
  return useQuery({
    queryKey: dayKeys.range(from, to),
    queryFn: () => fetchTasksInRange(from, to),
  });
}

/** Everything a write can touch: the day, neighbouring days, and templates. */
function useInvalidateEverything() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: dayKeys.all });
    void queryClient.invalidateQueries({ queryKey: templateKeys.all });
  };
}

/**
 * Ticking a task must feel instant even on a slow connection, so the cache is
 * rewritten first and rolled back if the write fails.
 */
export function useToggleTask(date: IsoDate) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: dayMutationKeys.toggle,
    mutationFn: (task: DailyTask) =>
      setTaskStatus(task.id, nextStatus(task.status)),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: dayKeys.date(date) });
      const previous = queryClient.getQueryData<DailyTask[]>(
        dayKeys.date(date),
      );

      queryClient.setQueryData<DailyTask[]>(dayKeys.date(date), (current) =>
        (current ?? []).map((item) =>
          item.id === task.id
            ? { ...item, status: nextStatus(task.status) }
            : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _task, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dayKeys.date(date), context.previous);
      }
      toast.error("העדכון נכשל, הסימון בוטל");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dayKeys.all });
    },
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.update,
    mutationFn: ({
      task,
      input,
      scope,
    }: {
      task: DailyTask;
      input: TaskInput;
      scope: EditScope;
    }) =>
      scope === "onward"
        ? updateTaskOnward(task, input)
        : updateTaskToday(task.id, input),
    onSuccess: (_data, { scope }) => {
      invalidate();
      toast.success(
        scope === "onward" ? "המשימה עודכנה מהיום והלאה" : "המשימה עודכנה להיום",
      );
    },
    onError: () => toast.error("עדכון המשימה נכשל"),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateEverything();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: dayMutationKeys.remove,
    mutationFn: ({ task, scope }: { task: DailyTask; scope: EditScope }) =>
      scope === "onward" ? deleteTaskOnward(task) : cancelTaskToday(task.id),
    onSuccess: (_data, { task, scope }) => {
      invalidate();

      if (scope === "today") {
        toast.success(`"${task.title}" הוסרה מהיום`, {
          action: {
            label: "ביטול",
            onClick: () => {
              void restoreTask(task.id).then(() =>
                queryClient.invalidateQueries({ queryKey: dayKeys.all }),
              );
            },
          },
        });
      } else {
        toast.success(`"${task.title}" לא תופיע יותר`);
      }
    },
    onError: () => toast.error("מחיקת המשימה נכשלה"),
  });
}

export function useRestoreTask() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.restore,
    mutationFn: (task: DailyTask) => restoreTask(task.id),
    onSuccess: () => {
      invalidate();
      toast.success("המשימה שוחזרה");
    },
    onError: () => toast.error("שחזור המשימה נכשל"),
  });
}

export function useSnoozeTask() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.snooze,
    mutationFn: ({ task, minutes }: { task: DailyTask; minutes?: number }) =>
      snoozeTask(task, minutes),
    onSuccess: () => {
      invalidate();
      toast.success("המשימה נדחתה בשעה");
    },
    onError: () => toast.error("דחיית המשימה נכשלה"),
  });
}

export function useMoveTask() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.move,
    mutationFn: ({ task, to }: { task: DailyTask; to: IsoDate }) =>
      moveTaskToDate(task, to),
    onSuccess: (kind) => {
      invalidate();
      toast.success(
        kind === "cancel-only"
          ? "המשימה כבר מתוכננת ליום הבא, הוסרה מהיום"
          : "המשימה הועברה",
      );
    },
    onError: () => toast.error("העברת המשימה נכשלה"),
  });
}

export function useMoveManyTasks() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.move,
    mutationFn: async ({ tasks, to }: { tasks: DailyTask[]; to: IsoDate }) => {
      for (const task of tasks) {
        await moveTaskToDate(task, to);
      }
      return tasks.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast.success(`${count} משימות הועברו`);
    },
    onError: () => toast.error("העברת המשימות נכשלה"),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateEverything();

  return useMutation({
    mutationKey: dayMutationKeys.create,
    mutationFn: ({
      date,
      input,
      source,
      sortOrder,
    }: {
      date: IsoDate;
      input: TaskInput;
      source?: "oneoff" | "ai";
      sortOrder?: number;
    }) => createOneOffTask(date, input, { source, sortOrder }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("הוספת המשימה נכשלה"),
  });
}
