import { z } from "zod";

/** Matches the Postgres `time` column once normalized to HH:mm. */
export const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה לא תקינה");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין");

export const dayOfWeekSchema = z.number().int().min(0).max(6);

export const templateInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "צריך להזין כותרת")
    .max(200, "הכותרת ארוכה מדי"),
  notes: z.string().trim().max(2000).nullable().default(null),
  scheduled_time: clockTimeSchema.nullable().default(null),
  days_of_week: z
    .array(dayOfWeekSchema)
    .min(1, "צריך לבחור לפחות יום אחד")
    .max(7)
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  icon: z.string().trim().max(8).nullable().default(null),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

/** Shared shape for editing a task instance on the day screen. */
export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "צריך להזין כותרת")
    .max(200, "הכותרת ארוכה מדי"),
  notes: z.string().trim().max(2000).nullable().default(null),
  scheduled_time: clockTimeSchema.nullable().default(null),
  icon: z.string().trim().max(8).nullable().default(null),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

/** "רק היום" vs "מהיום והלאה" for a task that came from the template. */
export const editScopeSchema = z.enum(["today", "onward"]);
export type EditScope = z.infer<typeof editScopeSchema>;

export const quickAddSchema = z.object({
  text: z.string().trim().min(1).max(300, "הטקסט ארוך מדי"),
});

export const copyDayInputSchema = z.object({
  from: dayOfWeekSchema,
  to: z.array(dayOfWeekSchema).min(1, "צריך לבחור יום יעד אחד לפחות"),
});

export type CopyDayInput = z.infer<typeof copyDayInputSchema>;
