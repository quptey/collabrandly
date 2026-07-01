export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          full_name: string;
          email: string;
          phone: string;
          social_link: string;
          company_name: string;
          website: string;
          status: string;
          created_at: string;
          reviewed_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          full_name?: string;
          email?: string;
          phone?: string;
          social_link?: string;
          company_name?: string;
          website?: string;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          social_link?: string;
          company_name?: string;
          website?: string;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      brand_info: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          company_logo: string;
          business_email: string;
          phone: string;
          website: string;
          industry: string;
          company_description: string;
          company_size: string;
          company_country: string;
          verification_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string;
          company_logo?: string;
          business_email?: string;
          phone?: string;
          website?: string;
          industry?: string;
          company_description?: string;
          company_size?: string;
          company_country?: string;
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          company_logo?: string;
          business_email?: string;
          phone?: string;
          website?: string;
          industry?: string;
          company_description?: string;
          company_size?: string;
          company_country?: string;
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_info: {
        Row: {
          id: string;
          user_id: string;
          instagram_url: string;
          tiktok_url: string;
          youtube_url: string;
          other_social_links: Json;
          content_category: string;
          bio: string;
          audience_size: string;
          collaboration_preferences: Json;
          creator_status: string;
          profile_completion_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          instagram_url?: string;
          tiktok_url?: string;
          youtube_url?: string;
          other_social_links?: Json;
          content_category?: string;
          bio?: string;
          audience_size?: string;
          collaboration_preferences?: Json;
          creator_status?: string;
          profile_completion_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          instagram_url?: string;
          tiktok_url?: string;
          youtube_url?: string;
          other_social_links?: Json;
          content_category?: string;
          bio?: string;
          audience_size?: string;
          collaboration_preferences?: Json;
          creator_status?: string;
          profile_completion_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shopper_info: {
        Row: {
          id: string;
          user_id: string;
          favorite_creators: string[] | null;
          saved_products: string[] | null;
          wishlist: string[] | null;
          recently_viewed: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          favorite_creators?: string[] | null;
          saved_products?: string[] | null;
          wishlist?: string[] | null;
          recently_viewed?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          favorite_creators?: string[] | null;
          saved_products?: string[] | null;
          wishlist?: string[] | null;
          recently_viewed?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      affiliate_links: {
        Row: {
          code: string | null;
          created_at: string;
          creator_id: string;
          id: string;
          product_id: string | null;
          url: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          creator_id: string;
          id?: string;
          product_id?: string | null;
          url: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          creator_id?: string;
          id?: string;
          product_id?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_requests: {
        Row: {
          brand_name: string;
          budget_range: Database["public"]["Enums"]["budget_range"];
          contact_person: string;
          created_at: string;
          creator_id: string;
          goal: string | null;
          id: string;
          message: string;
          sender_id: string | null;
          status: Database["public"]["Enums"]["request_status"];
        };
        Insert: {
          brand_name: string;
          budget_range: Database["public"]["Enums"]["budget_range"];
          contact_person: string;
          created_at?: string;
          creator_id: string;
          goal?: string | null;
          id?: string;
          message: string;
          sender_id?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Update: {
          brand_name?: string;
          budget_range?: Database["public"]["Enums"]["budget_range"];
          contact_person?: string;
          created_at?: string;
          creator_id?: string;
          goal?: string | null;
          id?: string;
          message?: string;
          sender_id?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Relationships: [
          {
            foreignKeyName: "brand_requests_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_applications: {
        Row: {
          campaign_id: string;
          created_at: string;
          creator_id: string;
          id: string;
          message: string | null;
          portfolio: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          creator_id: string;
          id?: string;
          message?: string | null;
          portfolio?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          creator_id?: string;
          id?: string;
          message?: string | null;
          portfolio?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_applications_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          brand_id: string;
          brief: string | null;
          budget_range: string | null;
          category: string | null;
          compensation_type: string | null;
          created_at: string;
          deadline: string | null;
          deliverables: string | null;
          engagement_rate: string | null;
          id: string;
          platform: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          target_followers: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          brief?: string | null;
          budget_range?: string | null;
          category?: string | null;
          compensation_type?: string | null;
          created_at?: string;
          deadline?: string | null;
          deliverables?: string | null;
          engagement_rate?: string | null;
          id?: string;
          platform?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          target_followers?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          brief?: string | null;
          budget_range?: string | null;
          category?: string | null;
          compensation_type?: string | null;
          created_at?: string;
          deadline?: string | null;
          deliverables?: string | null;
          engagement_rate?: string | null;
          id?: string;
          platform?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          target_followers?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          cover_url: string | null;
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          brand_id: string;
          code: string;
          created_at: string;
          discount_percent: number;
          id: string;
        };
        Insert: {
          active?: boolean;
          brand_id: string;
          code: string;
          created_at?: string;
          discount_percent?: number;
          id?: string;
        };
        Update: {
          active?: boolean;
          brand_id?: string;
          code?: string;
          created_at?: string;
          discount_percent?: number;
          id?: string;
        };
        Relationships: [];
      };
      link_clicks: {
        Row: {
          affiliate_link_id: string;
          created_at: string;
          id: string;
          referrer: string | null;
          user_agent: string | null;
        };
        Insert: {
          affiliate_link_id: string;
          created_at?: string;
          id?: string;
          referrer?: string | null;
          user_agent?: string | null;
        };
        Update: {
          affiliate_link_id?: string;
          created_at?: string;
          id?: string;
          referrer?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "link_clicks_affiliate_link_id_fkey";
            columns: ["affiliate_link_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_links";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          record_id: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          record_id?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          record_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          collection_id: string;
          created_at: string;
          creator_id: string;
          description: string | null;
          external_link: string | null;
          id: string;
          image_url: string | null;
          name: string;
          position: number;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          creator_id: string;
          description?: string | null;
          external_link?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          position?: number;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          external_link?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approved: boolean;
          avatar_url: string | null;
          bio: string | null;
          brand_name: string | null;
          category: Database["public"]["Enums"]["creator_category"] | null;
          city: Database["public"]["Enums"]["kz_city"] | null;
          contact_person: string | null;
          country: string | null;
          cover_url: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          email_verified: boolean | null;
          engagement_rate: string | null;
          first_name: string | null;
          follower_range: Database["public"]["Enums"]["follower_range"] | null;
          id: string;
          industry: string | null;
          languages: unknown;
          last_login: string | null;
          last_name: string | null;
          locale: string;
          onboarded: boolean;
          phone: string | null;
          phone_verified: boolean | null;
          rejection_reason: string | null;
          role: Database["public"]["Enums"]["user_role"];
          social_link: string | null;
          social_platform: string | null;
          instagram_url: string | null;
          tiktok_url: string | null;
          youtube_url: string | null;
          x_url: string | null;
          facebook_url: string | null;
          linkedin_url: string | null;
          telegram_url: string | null;
          suspended: boolean;
          updated_at: string;
          username: string | null;
          verification_status: string;
          website: string | null;
        };
        Insert: {
          approved?: boolean;
          avatar_url?: string | null;
          bio?: string | null;
          brand_name?: string | null;
          category?: Database["public"]["Enums"]["creator_category"] | null;
          city?: Database["public"]["Enums"]["kz_city"] | null;
          contact_person?: string | null;
          country?: string | null;
          cover_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          email_verified?: boolean | null;
          engagement_rate?: string | null;
          first_name?: string | null;
          follower_range?: Database["public"]["Enums"]["follower_range"] | null;
          id: string;
          industry?: string | null;
          languages?: unknown;
          last_login?: string | null;
          last_name?: string | null;
          locale?: string;
          onboarded?: boolean;
          phone?: string | null;
          phone_verified?: boolean | null;
          rejection_reason?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          social_link?: string | null;
          social_platform?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          youtube_url?: string | null;
          x_url?: string | null;
          facebook_url?: string | null;
          linkedin_url?: string | null;
          telegram_url?: string | null;
          suspended?: boolean;
          updated_at?: string;
          username?: string | null;
          verification_status?: string;
          website?: string | null;
        };
        Update: {
          approved?: boolean;
          avatar_url?: string | null;
          bio?: string | null;
          brand_name?: string | null;
          category?: Database["public"]["Enums"]["creator_category"] | null;
          city?: Database["public"]["Enums"]["kz_city"] | null;
          contact_person?: string | null;
          country?: string | null;
          cover_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          email_verified?: boolean | null;
          engagement_rate?: string | null;
          first_name?: string | null;
          follower_range?: Database["public"]["Enums"]["follower_range"] | null;
          id?: string;
          industry?: string | null;
          languages?: unknown;
          last_login?: string | null;
          last_name?: string | null;
          locale?: string;
          onboarded?: boolean;
          phone?: string | null;
          phone_verified?: boolean | null;
          rejection_reason?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          social_link?: string | null;
          social_platform?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          youtube_url?: string | null;
          x_url?: string | null;
          facebook_url?: string | null;
          linkedin_url?: string | null;
          telegram_url?: string | null;
          suspended?: boolean;
          updated_at?: string;
          username?: string | null;
          verification_status?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      saved_creators: {
        Row: {
          brand_id: string;
          created_at: string;
          creator_id: string;
          id: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          creator_id: string;
          id?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          creator_id?: string;
          id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          price_monthly: number;
          currency: string;
          role: string;
          features: Json;
          limitations: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          price_monthly: number;
          currency?: string;
          role: string;
          features?: Json;
          limitations?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          price_monthly?: number;
          currency?: string;
          role?: string;
          features?: Json;
          limitations?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: string;
          current_period_start?: string;
          current_period_end?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      budget_range: "< 100K KZT" | "100K-500K KZT" | "500K-1M KZT" | "1M+ KZT";
      campaign_status: "draft" | "active" | "closed" | "archived";
      creator_category: "beauty" | "fashion" | "fitness" | "food" | "lifestyle" | "tech";
      follower_range: "1K-10K" | "10K-50K" | "50K-200K" | "200K+";
      kz_city:
        | "Almaty"
        | "Astana"
        | "Shymkent"
        | "Aktau"
        | "Aktobe"
        | "Atyrau"
        | "Karaganda"
        | "Kokshetau"
        | "Kostanay"
        | "Kyzylorda"
        | "Oral"
        | "Oskemen"
        | "Pavlodar"
        | "Petropavlovsk"
        | "Semey"
        | "Taldykorgan"
        | "Taraz"
        | "Turkistan"
        | "Ekibastuz"
        | "Rudny"
        | "Temirtau";
      request_status: "pending" | "accepted" | "rejected";
      user_role: "creator" | "brand" | "admin" | "shopper";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      budget_range: ["< 100K KZT", "100K-500K KZT", "500K-1M KZT", "1M+ KZT"],
      campaign_status: ["draft", "active", "closed", "archived"],
      creator_category: ["beauty", "fashion", "fitness", "food", "lifestyle", "tech"],
      follower_range: ["1K-10K", "10K-50K", "50K-200K", "200K+"],
      kz_city: [
        "Almaty",
        "Astana",
        "Shymkent",
        "Aktau",
        "Aktobe",
        "Atyrau",
        "Karaganda",
        "Kokshetau",
        "Kostanay",
        "Kyzylorda",
        "Oral",
        "Oskemen",
        "Pavlodar",
        "Petropavlovsk",
        "Semey",
        "Taldykorgan",
        "Taraz",
        "Turkistan",
        "Ekibastuz",
        "Rudny",
        "Temirtau",
      ],
      request_status: ["pending", "accepted", "rejected"],
      user_role: ["creator", "brand", "admin", "shopper"],
    },
  },
} as const;
