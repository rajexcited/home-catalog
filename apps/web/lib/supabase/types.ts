export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      containers: {
        Row: {
          id: string;
          parent_id: string | null;
          owner_user_id: string;
          name: string;
          container_type: string | null;
          location: string | null;
          tags: string[] | null;
          notes: string | null;
          path: string;
          status: string;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          removed_at: string | null;
          removed_by: string | null;
          removed_reason: string | null;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          owner_user_id: string;
          name: string;
          container_type?: string | null;
          location?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          path?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          owner_user_id?: string;
          name?: string;
          container_type?: string | null;
          location?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          path?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
        };
        Relationships: [
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
          priority: string | null;
          serial_no: string | null;
          barcode: string | null;
          qr_code: string | null;
          purchase_date: string | null;
          warranty_expiry: string | null;
          status: string;
          product_mfg_company: string | null;
          product_seller: string | null;
          product_buyer: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
          removed_at: string | null;
          removed_by: string | null;
          removed_reason: string | null;
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
          priority?: string | null;
          serial_no?: string | null;
          barcode?: string | null;
          qr_code?: string | null;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          status?: string;
          product_mfg_company?: string | null;
          product_seller?: string | null;
          product_buyer?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
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
          priority?: string | null;
          serial_no?: string | null;
          barcode?: string | null;
          qr_code?: string | null;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          status?: string;
          product_mfg_company?: string | null;
          product_seller?: string | null;
          product_buyer?: string | null;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
        };
        Relationships: [
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
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          owner_user_id: string;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          owner_user_id?: string;
          storage_path?: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
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
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
