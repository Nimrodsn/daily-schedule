"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  copyDay,
  createTemplate,
  deactivateTemplate,
  fetchTemplates,
  reactivateTemplate,
  reorderTemplates,
  templateKeys,
  updateTemplate,
} from "@/lib/queries/templates";
import type { Template } from "@/lib/templates";
import type { CopyDayInput, TemplateInput } from "@/lib/validators";

/** Stable keys so stage 8 can attach offline defaults via setMutationDefaults. */
export const templateMutationKeys = {
  create: ["templates", "create"] as const,
  update: ["templates", "update"] as const,
  deactivate: ["templates", "deactivate"] as const,
  reorder: ["templates", "reorder"] as const,
  copyDay: ["templates", "copy-day"] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: fetchTemplates,
  });
}

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: templateKeys.all });
}

export function useCreateTemplate() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationKey: templateMutationKeys.create,
    mutationFn: (input: TemplateInput) => createTemplate(input),
    onSuccess: () => {
      void invalidate();
      toast.success("המשימה נוספה לתבנית");
    },
    onError: () => toast.error("הוספת המשימה נכשלה"),
  });
}

export function useUpdateTemplate() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationKey: templateMutationKeys.update,
    mutationFn: ({ id, input }: { id: string; input: TemplateInput }) =>
      updateTemplate(id, input),
    onSuccess: () => {
      void invalidate();
      toast.success("המשימה עודכנה");
    },
    onError: () => toast.error("עדכון המשימה נכשל"),
  });
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: templateMutationKeys.deactivate,
    mutationFn: (template: Template) => deactivateTemplate(template.id),
    onSuccess: (_data, template) => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success(`"${template.title}" נמחקה מהתבנית`, {
        action: {
          label: "ביטול",
          onClick: () => {
            void reactivateTemplate(template.id).then(() =>
              queryClient.invalidateQueries({ queryKey: templateKeys.all }),
            );
          },
        },
      });
    },
    onError: () => toast.error("מחיקת המשימה נכשלה"),
  });
}

export function useReorderTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: templateMutationKeys.reorder,
    mutationFn: (ordered: { id: string; sort_order: number }[]) =>
      reorderTemplates(ordered),
    // Dragging must feel instant, so the cache is rewritten before the round trip.
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.list() });
      const previous = queryClient.getQueryData<Template[]>(
        templateKeys.list(),
      );

      if (previous) {
        const bySortOrder = new Map(
          ordered.map(({ id, sort_order }) => [id, sort_order]),
        );
        queryClient.setQueryData<Template[]>(
          templateKeys.list(),
          previous.map((template) =>
            bySortOrder.has(template.id)
              ? { ...template, sort_order: bySortOrder.get(template.id)! }
              : template,
          ),
        );
      }

      return { previous };
    },
    onError: (_error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(templateKeys.list(), context.previous);
      }
      toast.error("שינוי הסדר נכשל");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useCopyDay() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationKey: templateMutationKeys.copyDay,
    mutationFn: ({
      templates,
      input,
    }: {
      templates: Template[];
      input: CopyDayInput;
    }) => copyDay(templates, input),
    onSuccess: (count) => {
      void invalidate();
      toast.success(
        count === 0 ? "לא היו משימות להעתקה" : `הועתקו ${count} משימות`,
      );
    },
    onError: () => toast.error("העתקת היום נכשלה"),
  });
}
