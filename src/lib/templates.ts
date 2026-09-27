import type { Tables } from "@/lib/supabase/database.types";
import { normalizeTime, timeToMinutes } from "@/lib/time";
import type { CopyDayInput } from "@/lib/validators";

/**
 * Pure weekly-template rules. Deliberately free of any Supabase import so the
 * ordering and copy-day behaviour can be unit tested without a database or
 * environment variables.
 */

export type Template = Tables<"templates">;

/**
 * Timed entries first, ordered by clock time, then untimed ones in their
 * manual `sort_order`. Mirrors the day ordering in section 5 so the template
 * preview matches what the day will actually look like.
 */
export function compareTemplates(a: Template, b: Template): number {
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

export function templatesForDay(
  templates: Template[],
  dayOfWeek: number,
): Template[] {
  return templates
    .filter((template) => template.days_of_week.includes(dayOfWeek))
    .sort(compareTemplates);
}

export function isTimed(template: Template): boolean {
  return normalizeTime(template.scheduled_time) !== null;
}

/**
 * "העתק יום" - a task that already repeats weekly is extended to more days by
 * widening its `days_of_week` rather than duplicating the row. That is what
 * stops a repeated copy from creating a second identical task.
 */
export function planCopyDay(
  templates: Template[],
  { from, to }: CopyDayInput,
): { id: string; days_of_week: number[] }[] {
  const targets = to.filter((day) => day !== from);

  return templates
    .filter((template) => template.days_of_week.includes(from))
    .map((template) => ({
      id: template.id,
      previous: template.days_of_week,
      days_of_week: [...new Set([...template.days_of_week, ...targets])].sort(
        (a, b) => a - b,
      ),
    }))
    .filter(
      ({ previous, days_of_week }) => days_of_week.length !== previous.length,
    )
    .map(({ id, days_of_week }) => ({ id, days_of_week }));
}
