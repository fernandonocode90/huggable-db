export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audio_progress: {
        Row: {
          audio_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          day_number: number
          id: string
          last_position_seconds: number
          progress_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number: number
          id?: string
          last_position_seconds?: number
          progress_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number?: number
          id?: string
          last_position_seconds?: number
          progress_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_progress_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "daily_audios"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_bookmarks: {
        Row: {
          book_key: string
          book_name: string
          chapter: number
          created_at: string
          highlight_color: string | null
          id: string
          is_favorite: boolean
          note: string | null
          translation: string
          updated_at: string
          user_id: string
          verse: number
          verse_text: string | null
        }
        Insert: {
          book_key: string
          book_name: string
          chapter: number
          created_at?: string
          highlight_color?: string | null
          id?: string
          is_favorite?: boolean
          note?: string | null
          translation: string
          updated_at?: string
          user_id: string
          verse: number
          verse_text?: string | null
        }
        Update: {
          book_key?: string
          book_name?: string
          chapter?: number
          created_at?: string
          highlight_color?: string | null
          id?: string
          is_favorite?: boolean
          note?: string | null
          translation?: string
          updated_at?: string
          user_id?: string
          verse?: number
          verse_text?: string | null
        }
        Relationships: []
      }
      bible_reading_history: {
        Row: {
          book_key: string
          book_name: string
          chapter: number
          last_read_at: string
          translation: string
          user_id: string
          verse: number
        }
        Insert: {
          book_key: string
          book_name: string
          chapter: number
          last_read_at?: string
          translation: string
          user_id: string
          verse?: number
        }
        Update: {
          book_key?: string
          book_name?: string
          chapter?: number
          last_read_at?: string
          translation?: string
          user_id?: string
          verse?: number
        }
        Relationships: []
      }
      bible_verses: {
        Row: {
          book_key: string
          book_order: number
          chapter: number
          id: number
          text: string
          translation: string
          verse: number
        }
        Insert: {
          book_key: string
          book_order: number
          chapter: number
          id?: number
          text: string
          translation: string
          verse: number
        }
        Update: {
          book_key?: string
          book_order?: number
          chapter?: number
          id?: number
          text?: string
          translation?: string
          verse?: number
        }
        Relationships: []
      }
      calculator_simulations: {
        Row: {
          annual_rate: number
          created_at: string
          id: string
          initial_amount: number
          monthly_contribution: number
          name: string
          total_final: number
          updated_at: string
          user_id: string
          years: number
        }
        Insert: {
          annual_rate?: number
          created_at?: string
          id?: string
          initial_amount?: number
          monthly_contribution?: number
          name: string
          total_final?: number
          updated_at?: string
          user_id: string
          years?: number
        }
        Update: {
          annual_rate?: number
          created_at?: string
          id?: string
          initial_amount?: number
          monthly_contribution?: number
          name?: string
          total_final?: number
          updated_at?: string
          user_id?: string
          years?: number
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          message: string
          route: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          message: string
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_audios: {
        Row: {
          created_at: string
          created_by: string | null
          day_number: number | null
          description: string | null
          duration_seconds: number | null
          id: string
          prayer_text: string | null
          r2_key: string
          release_date: string | null
          scripture_reference: string | null
          scripture_text: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          prayer_text?: string | null
          r2_key: string
          release_date?: string | null
          scripture_reference?: string | null
          scripture_text?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          prayer_text?: string | null
          r2_key?: string
          release_date?: string | null
          scripture_reference?: string | null
          scripture_text?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_devotionals: {
        Row: {
          book_key: string | null
          chapter: number | null
          created_at: string
          created_by: string | null
          day_number: number
          id: string
          reflection_text: string | null
          translation: string | null
          updated_at: string
          verse_end: number | null
          verse_reference: string | null
          verse_start: number | null
          verse_text: string | null
        }
        Insert: {
          book_key?: string | null
          chapter?: number | null
          created_at?: string
          created_by?: string | null
          day_number: number
          id?: string
          reflection_text?: string | null
          translation?: string | null
          updated_at?: string
          verse_end?: number | null
          verse_reference?: string | null
          verse_start?: number | null
          verse_text?: string | null
        }
        Update: {
          book_key?: string | null
          chapter?: number | null
          created_at?: string
          created_by?: string | null
          day_number?: number
          id?: string
          reflection_text?: string | null
          translation?: string | null
          updated_at?: string
          verse_end?: number | null
          verse_reference?: string | null
          verse_start?: number | null
          verse_text?: string | null
        }
        Relationships: []
      }
      onboarding_responses: {
        Row: {
          commitment: string | null
          completed_at: string | null
          created_at: string
          experience: string | null
          intent: string | null
          practice: string | null
          season_of_life: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commitment?: string | null
          completed_at?: string | null
          created_at?: string
          experience?: string | null
          intent?: string | null
          practice?: string | null
          season_of_life?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commitment?: string | null
          completed_at?: string | null
          created_at?: string
          experience?: string | null
          intent?: string | null
          practice?: string | null
          season_of_life?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          created_at: string
          display_name: string | null
          id: string
          paywall_last_seen_at: string | null
          reminder_enabled: boolean
          reminder_time: string | null
          start_date: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          display_name?: string | null
          id: string
          paywall_last_seen_at?: string | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          start_date?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          display_name?: string | null
          id?: string
          paywall_last_seen_at?: string | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          start_date?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          id: string
          local_date: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          local_date: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          local_date?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_calculations: {
        Row: {
          calculator: string
          created_at: string
          id: string
          inputs: Json
          name: string
          snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          calculator: string
          created_at?: string
          id?: string
          inputs?: Json
          name: string
          snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          calculator?: string
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          email: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_admin_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_user_note: {
        Args: { _note: string; _user_id: string }
        Returns: string
      }
      admin_ban_user: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_bump_app_version: { Args: never; Returns: string }
      admin_clear_bookmark_note: {
        Args: { _bookmark_id: string }
        Returns: undefined
      }
      admin_delete_user_note: { Args: { _note_id: string }; Returns: undefined }
      admin_force_clear_cache: { Args: never; Returns: string }
      admin_get_audio_metrics: {
        Args: never
        Returns: {
          audio_id: string
          avg_progress: number
          completion_rate: number
          completions: number
          day_number: number
          title: string
          total_plays: number
        }[]
      }
      admin_get_calculator_stats: { Args: never; Returns: Json }
      admin_get_completions_by_day: {
        Args: { _days?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      admin_get_dropoff_by_day: {
        Args: never
        Returns: {
          completed: number
          day_number: number
          dropoff_rate: number
          reached: number
          title: string
        }[]
      }
      admin_get_health: { Args: never; Returns: Json }
      admin_get_onboarding_stats: { Args: { _days?: number }; Returns: Json }
      admin_get_overview_stats: { Args: never; Returns: Json }
      admin_get_reminder_stats: { Args: never; Returns: Json }
      admin_get_signups_by_day: {
        Args: { _days?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      admin_get_translation_counts: {
        Args: never
        Returns: {
          translation: string
          verse_count: number
        }[]
      }
      admin_get_user_detail: { Args: { _user_id: string }; Returns: Json }
      admin_gift_streak: {
        Args: { _new_best_streak: number; _user_id: string }
        Returns: undefined
      }
      admin_list_bookmark_notes: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          book_name: string
          chapter: number
          created_at: string
          display_name: string
          id: string
          note: string
          total_count: number
          translation: string
          user_email: string
          user_id: string
          verse: number
          verse_text: string
        }[]
      }
      admin_list_client_errors: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          app_version: string
          created_at: string
          id: string
          message: string
          route: string
          stack: string
          total_count: number
          user_agent: string
          user_email: string
          user_id: string
        }[]
      }
      admin_list_onboarding_responses: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          commitment: string
          completed_at: string
          created_at: string
          display_name: string
          email: string
          experience: string
          intent: string
          practice: string
          season_of_life: string
          total_count: number
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          best_streak: number
          created_at: string
          current_day: number
          current_streak: number
          display_name: string
          email: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          total_completions: number
          total_count: number
        }[]
      }
      admin_list_users_segmented: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _segment?: string
          _stuck_day?: number
        }
        Returns: {
          best_streak: number
          created_at: string
          current_day: number
          current_streak: number
          display_name: string
          email: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          total_completions: number
          total_count: number
        }[]
      }
      admin_reset_user_streak: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_set_app_setting: {
        Args: { _key: string; _value: Json }
        Returns: undefined
      }
      admin_set_user_day: {
        Args: { _new_day: number; _user_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: undefined
      }
      admin_unban_user: { Args: { _user_id: string }; Returns: undefined }
      admin_wipe_user_data: { Args: { _user_id: string }; Returns: undefined }
      get_current_day: { Args: { _user_id: string }; Returns: number }
      get_public_app_settings: { Args: never; Returns: Json }
      get_user_streak: { Args: { _user_id: string }; Returns: number }
      get_week_preview: {
        Args: { _from_day: number; _to_day: number }
        Returns: {
          day_number: number
          subtitle: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _metadata?: Json
        }
        Returns: undefined
      }
      set_audio_duration_if_missing: {
        Args: { _audio_id: string; _duration: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
