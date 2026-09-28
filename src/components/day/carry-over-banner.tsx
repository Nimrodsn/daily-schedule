"use client";

import { CalendarArrowUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DailyTask } from "@/lib/day";

export function CarryOverBanner({
  tasks,
  onMoveAll,
  onDismiss,
  pending,
}: {
  tasks: DailyTask[];
  onMoveAll: () => void;
  onDismiss: () => void;
  pending: boolean;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3">
      <CalendarArrowUp
        className="mt-0.5 size-4 shrink-0 text-warning"
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm">
          {tasks.length === 1
            ? "משימה אחת מאתמול לא הושלמה."
            : `${tasks.length} משימות מאתמול לא הושלמו.`}
        </p>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {tasks.slice(0, 3).map((task) => (
            <li key={task.id} className="truncate">
              {task.title}
            </li>
          ))}
          {tasks.length > 3 ? <li>ועוד {tasks.length - 3}…</li> : null}
        </ul>

        <Button size="sm" onClick={onMoveAll} disabled={pending}>
          העבר הכל להיום
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="סגור את ההודעה"
        className="size-8 shrink-0"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
