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
          // Long-form entry for the memory's own page; `description` is the
          // short line used on cards and bubbles.
          body: string;
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
          body?: string;
          memory_date: string;
          show_in_timeline?: boolean;
          show_in_ruleta?: boolean;
          created_by: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          description?: string;
          body?: string;
          memory_date?: string;
          show_in_timeline?: boolean;
          show_in_ruleta?: boolean;
        };
        // Declared so `select("*, categories(...)")` type-checks. These mirror
        // the actual foreign keys in 0001_init.sql — without them the client
        // reports "could not find the relation" at the type level even though
        // PostgREST resolves the embed fine at runtime.
        Relationships: [
          {
            foreignKeyName: "memories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          id: string;
          memory_id: string;
          storage_path: string;
          // Downscaled copies made in the browser at upload time. Null when
          // the browser couldn't produce one, and on rows that predate them —
          // fall back to storage_path either way.
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
        Relationships: [
          {
            foreignKeyName: "media_memory_id_fkey";
            columns: ["memory_id"];
            isOneToOne: false;
            referencedRelation: "memories";
            referencedColumns: ["id"];
          },
        ];
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
      leave_couple: {
        Args: { p_couple_id: string };
        Returns: boolean;
      };
      signup_slots_left: {
        Args: Record<string, never>;
        Returns: number;
      };
      delete_account: {
        Args: Record<string, never>;
        Returns: undefined;
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
