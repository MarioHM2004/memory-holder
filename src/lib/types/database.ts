// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate/replace with `supabase gen types typescript` once the project is linked.

export interface Database {
  public: {
    Views: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      couples: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        // Created only via the create_couple() RPC — never inserted/updated directly.
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      couple_members: {
        Row: {
          couple_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        // Created only via create_couple() / join_couple_by_code().
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          color: string;
          icon: string;
          position: number;
          created_at: string;
        };
        Insert: {
          couple_id: string;
          name: string;
          color?: string;
          icon?: string;
          position?: number;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string;
          position?: number;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          couple_id: string;
          category_id: string | null;
          title: string;
          description: string;
          memory_date: string;
          show_in_timeline: boolean;
          show_in_ruleta: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          couple_id: string;
          category_id?: string | null;
          title: string;
          description?: string;
          memory_date: string;
          show_in_timeline?: boolean;
          show_in_ruleta?: boolean;
          created_by: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          description?: string;
          memory_date?: string;
          show_in_timeline?: boolean;
          show_in_ruleta?: boolean;
        };
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          memory_id: string;
          storage_path: string;
          // Downscaled copies made at upload time. Null on rows created before
          // 0002_media_derivatives.sql — fall back to storage_path.
          thumbnail_path: string | null;
          preview_path: string | null;
          media_type: "image" | "video";
          position: number;
          created_at: string;
        };
        Insert: {
          memory_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          preview_path?: string | null;
          media_type: "image" | "video";
          position?: number;
        };
        Update: {
          position?: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_couple: {
        Args: { p_name: string };
        Returns: string;
      };
      join_couple_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      is_couple_member: {
        Args: { p_couple_id: string };
        Returns: boolean;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type CoupleMember = Database["public"]["Tables"]["couple_members"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type Media = Database["public"]["Tables"]["media"]["Row"];
