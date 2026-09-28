"use client";

import {
  AlarmClock,
  ArrowLeftRight,
  CalendarArrowUp,
  Check,
  MoreVertical,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSwipe, vibrate } from "@/hooks/use-swipe";
import { isTimed, type DailyTask } from "@/lib/day";
import { normalizeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type TaskCardActions = {
  onToggle: (task: DailyTask) => void;
  onEdit: (task: DailyTask) => void;
  onSnooze: (task: DailyTask) => void;
  onMove: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
  onRestore: (task: DailyTask) => void;
};

/** Hint revealed under the card while it is being dragged. */
function SwipeHint({ offset }: { offset: number }) {
  if (Math.abs(offset) < 12) return null;

  const done = offset > 0;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-y-0 flex items-center gap-1.5 px-4 text-xs font-medium",
        done ? "start-0 text-success" : "end-0 text-warning",
      )}
    >
      {done ? (
        <>
          <Check className="size-4" />
          סיום
        </>
      ) : (
        <>
          <AlarmClock className="size-4" />
          דחה שעה
        </>
      )}
    </div>
  );
}

export function TaskCard({
  task,
  overdue,
  actions,
}: {
  task: DailyTask;
  overdue: boolean;
  actions: TaskCardActions;
}) {
  const time = normalizeTime(task.scheduled_time);
  const done = task.status === "done";
  const cancelled = task.status === "cancelled";
  const fromTemplate = task.template_id !== null;

  const swipe = useSwipe({
    onSwipe: (direction) => {
      if (direction === "end") {
        actions.onToggle(task);
      } else if (isTimed(task)) {
        actions.onSnooze(task);
      } else {
        actions.onMove(task);
      }
    },
  });

  // Swiping a finished or dropped task has no obvious meaning, so it is off.
  const swipeable = !done && !cancelled;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {swipeable ? <SwipeHint offset={swipe.offset} /> : null}

      <div
        {...(swipeable ? swipe.handlers : {})}
        style={
          swipe.swiping
            ? { transform: `translateX(${swipe.deltaX}px)` }
            : undefined
        }
        className={cn(
          "relative flex items-center gap-1 rounded-xl border bg-card p-2 shadow-xs",
          !swipe.swiping && "transition-transform",
          swipeable && "touch-pan-y",
          cancelled && "opacity-50",
          overdue && "border-warning/60",
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={done}
            disabled={cancelled}
            onCheckedChange={() => {
              vibrate();
              actions.onToggle(task);
            }}
            aria-label={`סימון "${task.title}" כבוצעה`}
            className="size-5"
          />
        </span>

        <button
          type="button"
          onClick={() => actions.onEdit(task)}
          className="flex min-h-11 flex-1 items-center gap-2.5 rounded-lg px-1 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {task.icon ? (
            <span aria-hidden="true" className="text-lg">
              {task.icon}
            </span>
          ) : null}

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "flex items-center gap-1.5 text-[15px]",
                (done || cancelled) && "text-muted-foreground line-through",
              )}
            >
              <span className="truncate">{task.title}</span>
              {fromTemplate ? (
                <Repeat
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-label="משימה קבועה"
                />
              ) : null}
            </span>

            {task.notes ? (
              <span className="block truncate text-[11px] text-muted-foreground">
                {task.notes}
              </span>
            ) : null}
          </span>

          {time ? (
            <span
              className={cn(
                "numeric shrink-0 text-sm",
                overdue ? "font-medium text-warning" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`פעולות עבור ${task.title}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {cancelled ? (
              <DropdownMenuItem onSelect={() => actions.onRestore(task)}>
                <RotateCcw aria-hidden="true" />
                שחזר להיום
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => actions.onEdit(task)}>
                  <Pencil aria-hidden="true" />
                  עריכה
                </DropdownMenuItem>

                {isTimed(task) ? (
                  <DropdownMenuItem onSelect={() => actions.onSnooze(task)}>
                    <AlarmClock aria-hidden="true" />
                    דחה שעה
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuItem onSelect={() => actions.onMove(task)}>
                  {fromTemplate ? (
                    <ArrowLeftRight aria-hidden="true" />
                  ) : (
                    <CalendarArrowUp aria-hidden="true" />
                  )}
                  העבר למחר
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => actions.onDelete(task)}
                >
                  <Trash2 aria-hidden="true" />
                  מחיקה
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
