"use client";

import { useMemo, useState } from "react";

import { CarryOverBanner } from "@/components/day/carry-over-banner";
import { DayHeader } from "@/components/day/day-header";
import { QuickAdd } from "@/components/day/quick-add";
import { TaskCard, type TaskCardActions } from "@/components/day/task-card";
import { TaskEditor } from "@/components/day/task-editor";
import { TaskList } from "@/components/day/task-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateTask,
  useDay,
  useDeleteTask,
  useMoveManyTasks,
  useMoveTask,
  useRestoreTask,
  useSnoozeTask,
  useTasksInRange,
  useToggleTask,
  useUpdateTask,
} from "@/hooks/use-day";
import { useNow } from "@/hooks/use-now";
import {
  carryOverCandidates,
  dayProgress,
  groupTasks,
  isTaskOverdue,
  nextSortOrder,
  yesterdayOf,
  type DailyTask,
  type DayProgress,
} from "@/lib/day";
import {
  addDays,
  DEFAULT_TIMEZONE,
  nowClock,
  timeToMinutes,
  todayIso,
  weekStrip,
  type IsoDate,
} from "@/lib/time";
import type { EditScope, TaskInput } from "@/lib/validators";

/** Stable empty array so the memos below do not rerun on every render. */
const NO_TASKS: DailyTask[] = [];

function DaySkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-15 rounded-xl" />
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  tasks,
  actions,
}: {
  title: string;
  tasks: DailyTask[];
  actions: TaskCardActions;
}) {
  if (tasks.length === 0) return null;

  return (
    <details className="group">
      <summary className="mb-2 cursor-pointer list-none text-xs font-semibold text-muted-foreground marker:content-none">
        {title} ({tasks.length})
      </summary>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskCard task={task} overdue={false} actions={actions} />
          </li>
        ))}
      </ul>
    </details>
  );
}

export function DayScreen() {
  const [date, setDate] = useState<IsoDate>(() => todayIso());
  const [editing, setEditing] = useState<DailyTask | null>(null);
  const [deleting, setDeleting] = useState<DailyTask | null>(null);
  const [dismissedCarryOver, setDismissedCarryOver] = useState<IsoDate[]>([]);

  const now = useNow();
  const today = todayIso(DEFAULT_TIMEZONE, now ?? undefined);
  const week = weekStrip(date);

  const day = useDay(date);
  const range = useTasksInRange(week[0], week[6]);

  const toggle = useToggleTask(date);
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const restore = useRestoreTask();
  const snooze = useSnoozeTask();
  const move = useMoveTask();
  const moveMany = useMoveManyTasks();
  const create = useCreateTask();

  const tasks = day.data ?? NO_TASKS;
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const progress = useMemo(() => dayProgress(tasks), [tasks]);

  const overdueIds = useMemo(() => {
    if (now === null) return new Set<string>();
    return new Set(
      tasks
        .filter((task) => isTaskOverdue(task, DEFAULT_TIMEZONE, now))
        .map((task) => task.id),
    );
  }, [tasks, now]);

  const progressByDate = useMemo(() => {
    const byDate = new Map<IsoDate, DailyTask[]>();
    for (const task of range.data ?? []) {
      const bucket = byDate.get(task.task_date);
      if (bucket) bucket.push(task);
      else byDate.set(task.task_date, [task]);
    }

    // The open day is authoritative for itself, including optimistic edits.
    byDate.set(date, tasks);

    return new Map<IsoDate, DayProgress>(
      [...byDate].map(([day, dayTasks]) => [day, dayProgress(dayTasks)]),
    );
  }, [range.data, date, tasks]);

  // Read-only, so it only surfaces days that were actually opened before.
  // Stage 7's ensure_my_range will widen this.
  const carryOver = useMemo(() => {
    if (date !== today || dismissedCarryOver.includes(date)) return [];
    const yesterday = yesterdayOf(date);
    return carryOverCandidates(
      (range.data ?? []).filter((task) => task.task_date === yesterday),
    );
  }, [range.data, date, today, dismissedCarryOver]);

  const actions: TaskCardActions = {
    onToggle: (task) => toggle.mutate(task),
    onEdit: (task) => setEditing(task),
    onSnooze: (task) => snooze.mutate({ task }),
    onMove: (task) => move.mutate({ task, to: addDays(task.task_date, 1) }),
    onDelete: (task) => {
      // A one-off just goes, with an undo. A template task needs the scope.
      if (task.template_id === null) {
        remove.mutate({ task, scope: "today" });
      } else {
        setDeleting(task);
      }
    },
    onRestore: (task) => restore.mutate(task),
  };

  function handleSave(input: TaskInput, scope: EditScope) {
    if (!editing) return;
    update.mutate({ task: editing, input, scope });
    setEditing(null);
  }

  function handleDeleteFromEditor(scope: EditScope) {
    if (!editing) return;
    remove.mutate({ task: editing, scope });
    setEditing(null);
  }

  const nowIsToday = date === today && now !== null;

  return (
    <div className="space-y-4">
      <DayHeader
        date={date}
        today={today}
        progress={progress}
        progressByDate={progressByDate}
        onSelect={setDate}
      />

      {carryOver.length > 0 ? (
        <CarryOverBanner
          tasks={carryOver}
          pending={moveMany.isPending}
          onMoveAll={() => moveMany.mutate({ tasks: carryOver, to: date })}
          onDismiss={() =>
            setDismissedCarryOver((current) => [...current, date])
          }
        />
      ) : null}

      <QuickAdd
        pending={create.isPending}
        onAdd={(input) =>
          create.mutate({ date, input, sortOrder: nextSortOrder(tasks) })
        }
      />

      {day.isPending ? <DaySkeleton /> : null}

      {day.isError ? (
        <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">
          לא הצלחנו לטעון את היום. אפשר לנסות שוב בעוד רגע.
        </p>
      ) : null}

      {day.isSuccess ? (
        <>
          {groups.pending.length === 0 &&
          groups.done.length === 0 &&
          groups.cancelled.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              אין משימות ליום הזה. אפשר להוסיף כאן, או לקבוע משימה קבועה
              בלשונית &laquo;תבנית&raquo;.
            </p>
          ) : null}

          <TaskList
            tasks={groups.pending}
            overdueIds={overdueIds}
            nowMinutes={
              nowIsToday ? timeToMinutes(nowClock(DEFAULT_TIMEZONE, now)) : null
            }
            nowLabel={nowIsToday ? nowClock(DEFAULT_TIMEZONE, now) : null}
            actions={actions}
          />

          <CollapsibleSection
            title="בוצעו"
            tasks={groups.done}
            actions={actions}
          />
          <CollapsibleSection
            title="הוסרו מהיום"
            tasks={groups.cancelled}
            actions={actions}
          />
        </>
      ) : null}

      <TaskEditor
        task={editing}
        date={date}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onDelete={handleDeleteFromEditor}
        saving={update.isPending}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>מחיקת משימה קבועה</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.title}" חוזרת לפי התבנית השבועית. מה למחוק?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate({ task: deleting, scope: "today" });
                setDeleting(null);
              }}
            >
              רק היום
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate({ task: deleting, scope: "onward" });
                setDeleting(null);
              }}
            >
              מהיום והלאה
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
