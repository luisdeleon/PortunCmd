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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      automation_devices: {
        Row: {
          api_endpoint: string | null
          api_url: string | null
          auth_key: string | null
          community_id: string | null
          created_at: string
          device_brand: string | null
          device_channel_in: number | null
          device_channel_out: number | null
          device_id_in: string | null
          device_id_out: string | null
          device_model: string | null
          device_name: string | null
          direction_type: string | null
          divice_turn: string | null
          enabled: boolean | null
          geolocation: string | null
          guest_access: boolean | null
          id: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_url?: string | null
          auth_key?: string | null
          community_id?: string | null
          created_at?: string
          device_brand?: string | null
          device_channel_in?: number | null
          device_channel_out?: number | null
          device_id_in?: string | null
          device_id_out?: string | null
          device_model?: string | null
          device_name?: string | null
          direction_type?: string | null
          divice_turn?: string | null
          enabled?: boolean | null
          geolocation?: string | null
          guest_access?: boolean | null
          id?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_url?: string | null
          auth_key?: string | null
          community_id?: string | null
          created_at?: string
          device_brand?: string | null
          device_channel_in?: number | null
          device_channel_out?: number | null
          device_id_in?: string | null
          device_id_out?: string | null
          device_model?: string | null
          device_name?: string | null
          direction_type?: string | null
          divice_turn?: string | null
          enabled?: boolean | null
          geolocation?: string | null
          guest_access?: boolean | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_devices_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
        ]
      }
      community: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          geolocation: string | null
          googlemaps: string | null
          id: string
          maintenance_expected_completion: string | null
          name: string | null
          postal_code: string | null
          seasonal_reopening_date: string | null
          state: string | null
          status: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          geolocation?: string | null
          googlemaps?: string | null
          id: string
          maintenance_expected_completion?: string | null
          name?: string | null
          postal_code?: string | null
          seasonal_reopening_date?: string | null
          state?: string | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          geolocation?: string | null
          googlemaps?: string | null
          id?: string
          maintenance_expected_completion?: string | null
          name?: string | null
          postal_code?: string | null
          seasonal_reopening_date?: string | null
          state?: string | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      community_manager: {
        Row: {
          community_id: string
          created_at: string
          id: string
          profile_id: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          profile_id?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          profile_id?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_manager_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_manager_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_manager_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_administrators: {
        Row: {
          administrator_id: string
          assigned_at: string | null
          assigned_by: string | null
          assigned_community_ids: string[]
          created_at: string | null
          dealer_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          administrator_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_community_ids?: string[]
          created_at?: string | null
          dealer_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          administrator_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_community_ids?: string[]
          created_at?: string | null
          dealer_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_administrators_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_administrators_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_administrators_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_users: {
        Row: {
          community_id: string | null
          created_at: string
          external_user_id: string
          fcm_token: string | null
          id: string
          notifications_enabled: boolean
          onesignal_token: string | null
          property_id: string | null
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          external_user_id: string
          fcm_token?: string | null
          id?: string
          notifications_enabled?: boolean
          onesignal_token?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          external_user_id?: string
          fcm_token?: string | null
          id?: string
          notifications_enabled?: boolean
          onesignal_token?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          image: string | null
          message: string | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          message?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          message?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string
          def_community_id: string | null
          def_property_id: string | null
          display_name: string | null
          email: string
          enabled: boolean
          id: string
          language: string | null
          last_login_at: string | null
          status: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          def_community_id?: string | null
          def_property_id?: string | null
          display_name?: string | null
          email: string
          enabled?: boolean
          id: string
          language?: string | null
          last_login_at?: string | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          def_community_id?: string | null
          def_property_id?: string | null
          display_name?: string | null
          email?: string
          enabled?: boolean
          id?: string
          language?: string | null
          last_login_at?: string | null
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_def_community_id_fkey"
            columns: ["def_community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_def_property_id_fkey"
            columns: ["def_property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_role: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          profile_id: string
          role_id: string
          scope_community_ids: string[] | null
          scope_dealer_id: string | null
          scope_property_ids: string[] | null
          scope_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          role_id: string
          scope_community_ids?: string[] | null
          scope_dealer_id?: string | null
          scope_property_ids?: string[] | null
          scope_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          role_id?: string
          scope_community_ids?: string[] | null
          scope_dealer_id?: string | null
          scope_property_ids?: string[] | null
          scope_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_role_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_role_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_role_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_role_scope_dealer_id_fkey"
            columns: ["scope_dealer_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      property: {
        Row: {
          address: string
          community_id: string
          created_at: string
          id: string
          name: string
          status: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          address: string
          community_id: string
          created_at?: string
          id: string
          name: string
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          community_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      property_owner: {
        Row: {
          community_id: string | null
          created_at: string
          id: string
          profile_id: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          id?: string
          profile_id: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owner_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_owner_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_owner_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          id?: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          id: string
          key: string
          language: string
          text: Json
        }
        Insert: {
          id?: string
          key: string
          language: string
          text: Json
        }
        Update: {
          id?: string
          key?: string
          language?: string
          text?: Json
        }
        Relationships: []
      }
      visitor_record_logs: {
        Row: {
          created_at: string
          doc1_hash: string | null
          doc1_upload_url: string | null
          doc2_hash: string | null
          doc2_upload_url: string | null
          doc3_hash: string | null
          doc3_upload_url: string | null
          doc4_hash: string | null
          doc4_upload_url: string | null
          host_uid: string
          id: string
          in_time: string | null
          notes: string | null
          out_time: string | null
          record_uid: string
          updated_at: string
          visitor_name: string
        }
        Insert: {
          created_at?: string
          doc1_hash?: string | null
          doc1_upload_url?: string | null
          doc2_hash?: string | null
          doc2_upload_url?: string | null
          doc3_hash?: string | null
          doc3_upload_url?: string | null
          doc4_hash?: string | null
          doc4_upload_url?: string | null
          host_uid: string
          id?: string
          in_time?: string | null
          notes?: string | null
          out_time?: string | null
          record_uid: string
          updated_at?: string
          visitor_name: string
        }
        Update: {
          created_at?: string
          doc1_hash?: string | null
          doc1_upload_url?: string | null
          doc2_hash?: string | null
          doc2_upload_url?: string | null
          doc3_hash?: string | null
          doc3_upload_url?: string | null
          doc4_hash?: string | null
          doc4_upload_url?: string | null
          host_uid?: string
          id?: string
          in_time?: string | null
          notes?: string | null
          out_time?: string | null
          record_uid?: string
          updated_at?: string
          visitor_name?: string
        }
        Relationships: []
      }
      visitor_records_uid: {
        Row: {
          community_id: string | null
          created_at: string
          doc1_hash: string | null
          doc1_upload_url: string | null
          doc2_hash: string | null
          doc2_upload_url: string | null
          doc3_hash: string | null
          doc3_upload_url: string | null
          doc4_hash: string | null
          doc4_upload_url: string | null
          document_num: string | null
          entries_allowed: number | null
          entries_used: number | null
          host_uid: string | null
          id: string
          notes: string | null
          property_id: string | null
          qrcode_image_url: string | null
          rand_record_uid: string | null
          record_uid: string | null
          record_url: string | null
          updated_at: string
          validity_end: string | null
          validity_start: string | null
          visitor_name: string | null
          visitor_type: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          doc1_hash?: string | null
          doc1_upload_url?: string | null
          doc2_hash?: string | null
          doc2_upload_url?: string | null
          doc3_hash?: string | null
          doc3_upload_url?: string | null
          doc4_hash?: string | null
          doc4_upload_url?: string | null
          document_num?: string | null
          entries_allowed?: number | null
          entries_used?: number | null
          host_uid?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          qrcode_image_url?: string | null
          rand_record_uid?: string | null
          record_uid?: string | null
          record_url?: string | null
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          visitor_name?: string | null
          visitor_type?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string
          doc1_hash?: string | null
          doc1_upload_url?: string | null
          doc2_hash?: string | null
          doc2_upload_url?: string | null
          doc3_hash?: string | null
          doc3_upload_url?: string | null
          doc4_hash?: string | null
          doc4_upload_url?: string | null
          document_num?: string | null
          entries_allowed?: number | null
          entries_used?: number | null
          host_uid?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          qrcode_image_url?: string | null
          rand_record_uid?: string | null
          record_uid?: string | null
          record_url?: string | null
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
          visitor_name?: string | null
          visitor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_records_uid_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_records_uid_host_uid_fkey"
            columns: ["host_uid"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_records_uid_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_inactive_users: {
        Args: { p_days_threshold?: number }
        Returns: Json
      }
      can_archive_property: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      change_community_status: {
        Args: {
          p_changed_by: string
          p_community_id: string
          p_completion_date?: string
          p_new_status: string
          p_reason?: string
          p_reopening_date?: string
        }
        Returns: Json
      }
      change_property_status: {
        Args: {
          p_changed_by: string
          p_new_status: string
          p_property_id: string
          p_reason?: string
        }
        Returns: Json
      }
      change_user_status: {
        Args: {
          p_changed_by: string
          p_new_status: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      func_count_table_rows: {
        Args: {
          p_column_name?: string
          p_compare_date?: string
          p_compare_operator?: string
          p_host_uid: string
          p_table_name: string
        }
        Returns: number
      }
      func_create_user_onesignal: {
        Args: { fcmtoken: string; status: boolean; user_id: string }
        Returns: Json
      }
      func_get_subscription_id: { Args: { user_id: string }; Returns: string }
      func_get_weekly_averages: {
        Args: { p_host_uid: string; p_table_name: string }
        Returns: {
          average: number
          day_name: string
        }[]
      }
      func_get_weekly_counts: {
        Args: { p_host_uid: string; p_table_name: string }
        Returns: {
          count: number
          day_name: string
        }[]
      }
      func_update_onesignal_external_id: { Args: never; Returns: undefined }
      get_status_statistics: { Args: { p_entity_type: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
