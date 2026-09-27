import { Check, Flame } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const APP_TIMEZONE = "Asia/Jerusalem";

const SAMPLE_TASKS = [
  { time: "07:30", title: "כוס קפה וסקירת היום", done: true, streak: 12 },
  { time: "09:00", title: "פגישת סטטוס עם הצוות", done: true, streak: 0 },
  { time: "11:15", title: "להתקשר למוסך", done: false, overdue: true },
  { time: "17:00", title: "אימון בחדר כושר", done: false, streak: 4 },
  { time: null, title: "לקנות חלב בדרך הביתה", done: false },
];

function formatToday() {
  const now = new Date();
  const gregorian = new Intl.DateTimeFormat("he-IL", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const hebrew = new Intl.DateTimeFormat("he-u-ca-hebrew", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return { gregorian, hebrew };
}

export default function TodayPage() {
  const { gregorian, hebrew } = formatToday();
  const done = SAMPLE_TASKS.filter((task) => task.done).length;

  return (
    <>
      <PageHeading
        title={gregorian}
        subtitle={hebrew}
        action={
          <div
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/25 text-primary"
            role="img"
            aria-label={`בוצעו ${done} מתוך ${SAMPLE_TASKS.length} משימות`}
          >
            <span className="numeric text-sm font-bold">
              {done}/{SAMPLE_TASKS.length}
            </span>
          </div>
        }
      />

      <ul className="space-y-2.5">
        {SAMPLE_TASKS.map((task) => (
          <li
            key={task.title}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs",
              task.overdue && "border-warning/45 bg-warning/5",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                task.done
                  ? "border-success bg-success text-success-foreground"
                  : "border-muted-foreground/35",
              )}
              aria-hidden="true"
            >
              {task.done ? <Check className="size-4" strokeWidth={3} /> : null}
            </span>

            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[15px]",
                task.done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>

            {task.streak && task.streak >= 3 ? (
              <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground dark:text-warning">
                <Flame className="size-3" aria-hidden="true" />
                <span className="numeric">{task.streak}</span>
              </span>
            ) : null}

            <span className="numeric w-11 text-end text-sm text-muted-foreground">
              {task.time ?? "—"}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        תצוגה לדוגמה לשלב 1. מסך היום האמיתי נבנה בשלב 4.
      </p>
    </>
  );
}
