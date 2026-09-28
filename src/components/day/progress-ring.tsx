import type { DayProgress } from "@/lib/day";
import { cn } from "@/lib/utils";

const SIZE = 56;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  progress,
  className,
}: {
  progress: DayProgress;
  className?: string;
}) {
  const complete = progress.total > 0 && progress.done === progress.total;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`הושלמו ${progress.done} מתוך ${progress.total} משימות`}
    >
      {/* Rotated so the arc starts at 12 o'clock and runs clockwise. */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress.percent / 100)}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            complete ? "text-success" : "text-primary",
          )}
        />
      </svg>

      <span className="numeric absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {progress.percent}%
      </span>
    </div>
  );
}
