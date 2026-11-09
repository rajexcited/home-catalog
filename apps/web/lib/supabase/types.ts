export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EntityStatus = "enabled" | "archived" | "removed";
export type UserRole = "user" | "admin";
export type UserStatus = "active" | "inactive" | "deleted" | "banned";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type SharePermission = "view" | "edit";
export type ShareStatus = "active" | "revoked";

export type Database = {
  public: {
    Tables: {
      containers: {
        Row: {
          id: string;
          parent_id: string | null;
          owner_user_id: string;
          name: string;
          container_type: string;
          location: string | null;
          tags: string[] | null;
          notes: string;
          unit_cost: number | null;
          priority: number | null;
          status: EntityStatus;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          status_changed_at: string;
          status_changed_by: string | null;
          status_changed_reason: string | null;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          owner_user_id: string;
          name: string;
          container_type: string;
          location?: string | null;
          tags?: string[] | null;
          notes?: string;
          unit_cost?: number | null;
          priority?: number | null;
          status?: EntityStatus;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_changed_reason?: string | null;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          owner_user_id?: string;
          name?: string;
          container_type?: string;
          location?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          unit_cost?: number | null;
          priority?: number | null;
          status?: EntityStatus;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_changed_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "containers_container_type_fkey";
            columns: ["container_type"];
            isOneToOne: false;
            referencedRelation: "container_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "containers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "containers_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "containers_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "containers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "containers_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "containers_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          container_id: string;
          owner_user_id: string;
          name: string;
          category: string | null;
          subcategory: string | null;
          location: string | null;
          tags: string[] | null;
          notes: string | null;
          quantity: number | null;
          unit_cost: number | null;
          priority: number | null;
          purchase_date: string | null;
          status: EntityStatus;
          item_attributes: Json;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          status_changed_at: string;
          status_changed_by: string | null;
          status_changed_reason: string | null;
        };
        Insert: {
          id?: string;
          container_id: string;
          owner_user_id: string;
          name: string;
          category?: string | null;
          subcategory?: string | null;
          location?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          quantity?: number | null;
          unit_cost?: number | null;
          priority?: number | null;
          purchase_date?: string | null;
          status?: EntityStatus;
          item_attributes?: Json;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_changed_reason?: string | null;
        };
        Update: {
          id?: string;
          container_id?: string;
          owner_user_id?: string;
          name?: string;
          category?: string | null;
          subcategory?: string | null;
          location?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          quantity?: number | null;
          unit_cost?: number | null;
          priority?: number | null;
          purchase_date?: string | null;
          status?: EntityStatus;
          item_attributes?: Json;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_changed_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "item_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_container_id_fkey";
            columns: ["container_id"];
            isOneToOne: false;
            referencedRelation: "containers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      item_images: {
        Row: {
          id: string;
          item_id: string;
          owner_user_id: string;
          storage_path: string;
          caption: string | null;
          status: EntityStatus;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          owner_user_id: string;
          storage_path: string;
          caption?: string | null;
          status?: EntityStatus;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          owner_user_id?: string;
          storage_path?: string;
          caption?: string | null;
          status?: EntityStatus;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_images_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      container_types: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "container_types_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_types_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_types_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      item_categories: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_categories_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      container_shares: {
        Row: {
          id: string;
          container_id: string;
          shared_with_user_id: string;
          permission: SharePermission;
          status: ShareStatus;
          granted_by: string;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          container_id: string;
          shared_with_user_id: string;
          permission: SharePermission;
          status?: ShareStatus;
          granted_by: string;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          container_id?: string;
          shared_with_user_id?: string;
          permission?: SharePermission;
          status?: ShareStatus;
          granted_by?: string;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "container_shares_container_id_fkey";
            columns: ["container_id"];
            isOneToOne: false;
            referencedRelation: "containers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_shares_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_shares_shared_with_user_id_fkey";
            columns: ["shared_with_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      member_invites: {
        Row: {
          id: string;
          email: string;
          invited_by: string;
          role_to_assign: UserRole;
          allowed_providers: string[];
          status: InviteStatus;
          expires_at: string | null;
          accepted_at: string | null;
          accepted_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          invited_by: string;
          role_to_assign?: UserRole;
          allowed_providers?: string[];
          status?: InviteStatus;
          expires_at?: string | null;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          invited_by?: string;
          role_to_assign?: UserRole;
          allowed_providers?: string[];
          status?: InviteStatus;
          expires_at?: string | null;
          accepted_at?: string | null;
          accepted_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_invites_accepted_user_id_fkey";
            columns: ["accepted_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      app_security_settings: {
        Row: {
          id: boolean;
          allow_password_signups: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          allow_password_signups?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          allow_password_signups?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_security_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          changes: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: UserRole;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_item_counts_by_container: {
        Args: { container_ids: string[]; status_filters?: EntityStatus[] };
        Returns: { container_id: string; item_count: number; child_item_ids: string[] }[];
      };
      get_visible_container_ids: {
        Args: { p_user_id: string; status_filters?: EntityStatus[]; range_start?: number; range_end?: number };
        Returns: { id: string }[];
      };
      get_visible_container_roots: {
        Args: { p_user_id: string; status_filters?: EntityStatus[] };
        Returns: {
          id: string;
          name: string;
          status: string;
          is_shared: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
