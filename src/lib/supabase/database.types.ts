/**
 * Mirrors supabase/migrations/0001_init.sql.
 *
 * Kept by hand rather than generated so the types exist before the migration
 * is applied. Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          user_id: string;
          timezone: string;
          morning_brief_enabled: boolean;
          evening_review_time: string;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          timezone?: string;
          morning_brief_enabled?: boolean;
          evening_review_time?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          timezone?: string;
          morning_brief_enabled?: boolean;
          evening_review_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          scheduled_time: string | null;
          days_of_week: number[];
          icon: string | null;
          sort_order: number;
          active_from: string;
          active_until: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          notes?: string | null;
          scheduled_time?: string | null;
          days_of_week: number[];
          icon?: string | null;
          sort_order?: number;
          active_from?: string;
          active_until?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string | null;
          scheduled_time?: string | null;
          days_of_week?: number[];
          icon?: string | null;
          sort_order?: number;
          active_from?: string;
          active_until?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      day_overrides: {
        Row: {
          user_id: string;
          override_date: string;
          label: string;
          mode: Database["public"]["Enums"]["override_mode"];
          use_dow: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          override_date: string;
          label: string;
          mode: Database["public"]["Enums"]["override_mode"];
          use_dow?: number | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          override_date?: string;
          label?: string;
          mode?: Database["public"]["Enums"]["override_mode"];
          use_dow?: number | null;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_date: string;
          template_id: string | null;
          title: string;
          notes: string | null;
          scheduled_time: string | null;
          icon: string | null;
          status: Database["public"]["Enums"]["task_status"];
          source: Database["public"]["Enums"]["task_source"];
          sort_order: number;
          done_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          task_date: string;
          template_id?: string | null;
          title: string;
          notes?: string | null;
          scheduled_time?: string | null;
          icon?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          source: Database["public"]["Enums"]["task_source"];
          sort_order?: number;
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_date?: string;
          template_id?: string | null;
          title?: string;
          notes?: string | null;
          scheduled_time?: string | null;
          icon?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          source?: Database["public"]["Enums"]["task_source"];
          sort_order?: number;
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_tasks_template_id_fkey";
            columns: ["template_id"];
            referencedRelation: "templates";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      daily_briefs: {
        Row: {
          user_id: string;
          brief_date: string;
          kind: string;
          content: string;
          refresh_count: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          brief_date: string;
          kind: string;
          content: string;
          refresh_count?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          brief_date?: string;
          kind?: string;
          content?: string;
          refresh_count?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          id: number;
          user_id: string;
          kind: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id?: string;
          kind: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string;
          kind?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      ensure_my_day: {
        Args: { p_date: string };
        Returns: undefined;
      };
      ensure_my_range: {
        Args: { p_from: string; p_to: string };
        Returns: undefined;
      };
      apply_day_override: {
        Args: { p_date: string };
        Returns: undefined;
      };
    };
    Enums: {
      override_mode: "skip_template" | "use_dow";
      task_status: "pending" | "done" | "cancelled";
      task_source: "template" | "oneoff" | "ai";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

export type TaskStatus = Enums<"task_status">;
export type TaskSource = Enums<"task_source">;
export type OverrideMode = Enums<"override_mode">;
