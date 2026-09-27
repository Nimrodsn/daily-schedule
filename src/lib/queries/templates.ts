import { createClient } from "@/lib/supabase/client";
import { planCopyDay, type Template } from "@/lib/templates";
import type { CopyDayInput, TemplateInput } from "@/lib/validators";

export const templateKeys = {
  all: ["templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
};

export async function fetchTemplates(): Promise<Template[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .insert({
      title: input.title,
      notes: input.notes,
      scheduled_time: input.scheduled_time,
      days_of_week: input.days_of_week,
      icon: input.icon,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplate(
  id: string,
  input: TemplateInput,
): Promise<Template> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .update({
      title: input.title,
      notes: input.notes,
      scheduled_time: input.scheduled_time,
      days_of_week: input.days_of_week,
      icon: input.icon,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete. Keeping the row means already-materialised `daily_tasks` still
 * point at it, so completed history and streaks survive.
 */
export async function deactivateTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

export async function reactivateTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("templates")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw error;
}

export async function reorderTemplates(
  ordered: { id: string; sort_order: number }[],
): Promise<void> {
  const supabase = createClient();

  const results = await Promise.all(
    ordered.map(({ id, sort_order }) =>
      supabase.from("templates").update({ sort_order }).eq("id", id),
    ),
  );

  const failure = results.find((result) => result.error);
  if (failure?.error) throw failure.error;
}

export async function copyDay(
  templates: Template[],
  input: CopyDayInput,
): Promise<number> {
  const supabase = createClient();
  const updates = planCopyDay(templates, input);

  const results = await Promise.all(
    updates.map(({ id, days_of_week }) =>
      supabase.from("templates").update({ days_of_week }).eq("id", id),
    ),
  );

  const failure = results.find((result) => result.error);
  if (failure?.error) throw failure.error;

  return updates.length;
}
