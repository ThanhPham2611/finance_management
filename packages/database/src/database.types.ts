// Snapshot of the public Supabase contract used by web and the mobile MVP.
// Regenerate from the linked test project with `npm run db:types` whenever a
// migration changes the public schema; do not edit consumer-specific fields.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string | null; currency: string; has_seen_tour: boolean; created_at: string; updated_at: string },
        { id: string; full_name?: string | null; currency?: string; has_seen_tour?: boolean; created_at?: string; updated_at?: string }
      >;
      jars: Table<
        {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          monthly_budget: number;
          alert_at_80: boolean;
          rollover: boolean;
          is_shared: boolean;
          is_active: boolean;
          is_default_savings: boolean;
          is_savings: boolean;
          household_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          monthly_budget?: number;
          alert_at_80?: boolean;
          rollover?: boolean;
          is_shared?: boolean;
          is_active?: boolean;
          is_default_savings?: boolean;
          is_savings?: boolean;
          household_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      transactions: Table<
        { id: string; user_id: string; jar_id: string; amount: number; note: string | null; transaction_date: string; type: "expense" | "deposit"; created_at: string },
        { id?: string; user_id: string; jar_id: string; amount: number; note?: string | null; transaction_date?: string; type?: "expense" | "deposit"; created_at?: string }
      >;
      incomes: Table<
        { id: string; user_id: string; period_month: string; amount: number; note: string | null; created_at: string },
        { id?: string; user_id: string; period_month: string; amount: number; note?: string | null; created_at?: string }
      >;
      jar_allocations: Table<
        { id: string; income_id: string; jar_id: string; user_id: string; percent: number | null; amount: number; created_at: string },
        { id?: string; income_id: string; jar_id: string; user_id: string; percent?: number | null; amount: number; created_at?: string }
      >;
      jar_presets: Table<
        { id: string; name: string; icon: string | null; default_color: string | null; sort_order: number },
        { id?: string; name: string; icon?: string | null; default_color?: string | null; sort_order?: number }
      >;
      expense_shares: Table<
        { id: string; owner_id: string; viewer_id: string; status: "pending" | "accepted" | "declined" | "revoked"; created_at: string; responded_at: string | null },
        { id?: string; owner_id: string; viewer_id: string; status?: "pending" | "accepted" | "declined" | "revoked"; created_at?: string; responded_at?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_share_request: { Args: { p_viewer_email: string }; Returns: undefined };
      respond_to_share_request: { Args: { p_share_id: string; p_accept: boolean }; Returns: undefined };
      revoke_share: { Args: { p_share_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
