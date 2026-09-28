"use client";

import { TaskCard, type TaskCardActions } from "@/components/day/task-card";
import { isTimed, type DailyTask } from "@/lib/day";
import { normalizeTime, timeToMinutes } from "@/lib/time";

function NowLine({ label }: { label: string }) {
  return (
    <li aria-hidden="true" className="flex items-center gap-2 py-0.5">
      <span className="numeric text-[11px] font-medium text-primary">
        {label}
      </span>
      <span className="h-px flex-1 bg-primary/50" />
      <span className="size-1.5 rounded-full bg-primary" />
    </li>
  );
}

export function TaskList({
  tasks,
  overdueIds,
  nowMinutes,
  nowLabel,
  actions,
}: {
  tasks: DailyTask[];
  overdueIds: Set<string>;
  /** Null unless the list is showing today, so no line is drawn otherwise. */
  nowMinutes: number | null;
  nowLabel: string | null;
  actions: TaskCardActions;
}) {
  const timed = tasks.filter(isTimed);
  const untimed = tasks.filter((task) => !isTimed(task));

  // The line sits before the first task still ahead of the current time, or at
  // the very end once every timed task is in the past.
  const upcomingIndex =
    nowMinutes === null
      ? -1
      : timed.findIndex(
          (task) =>
            timeToMinutes(normalizeTime(task.scheduled_time)!) > nowMinutes,
        );
  const showLine = nowLabel !== null && timed.length > 0;

  return (
    <div className="space-y-4">
      {timed.length > 0 ? (
        <ul className="space-y-2">
          {timed.flatMap((task, index) => {
            const row = (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  overdue={overdueIds.has(task.id)}
                  actions={actions}
                />
              </li>
            );

            return showLine && index === upcomingIndex
              ? [<NowLine key="now" label={nowLabel} />, row]
              : [row];
          })}
          {showLine && upcomingIndex === -1 ? (
            <NowLine label={nowLabel} />
          ) : null}
        </ul>
      ) : null}

      {untimed.length > 0 ? (
        <section aria-labelledby="untimed-tasks-heading">
          <h2
            id="untimed-tasks-heading"
            className="mb-2 text-xs font-semibold text-muted-foreground"
          >
            ללא שעה
          </h2>
          {/* Order comes from the template screen, where it is draggable. */}
          <ul className="space-y-2">
            {untimed.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  overdue={overdueIds.has(task.id)}
                  actions={actions}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
