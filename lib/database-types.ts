export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics: {
        Row: {
          daily_stats: Json | null
          id: string
          last_updated: string | null
          page_views: Json | null
          total_visits: number | null
          unique_visitors: number | null
        }
        Insert: {
          daily_stats?: Json | null
          id?: string
          last_updated?: string | null
          page_views?: Json | null
          total_visits?: number | null
          unique_visitors?: number | null
        }
        Update: {
          daily_stats?: Json | null
          id?: string
          last_updated?: string | null
          page_views?: Json | null
          total_visits?: number | null
          unique_visitors?: number | null
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          password_hash: string
          role: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          password_hash: string
          role?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string
          role?: string | null
          username?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          amount_needed: number
          created_at: string | null
          dataco_number: string
          id: string
          image: string | null
          labels: string[]
          scene: string | null
          subtitle: string | null
          target_car: string[]
          task_id: string
          title: string
          type: string
          updated_at: string | null
          weather: string | null
        }
        Insert: {
          amount_needed?: number
          created_at?: string | null
          dataco_number: string
          id?: string
          image?: string | null
          labels?: string[]
          scene?: string | null
          subtitle?: string | null
          target_car?: string[]
          task_id: string
          title: string
          type: string
          updated_at?: string | null
          weather?: string | null
        }
        Update: {
          amount_needed?: number
          created_at?: string | null
          dataco_number?: string
          id?: string
          image?: string | null
          labels?: string[]
          scene?: string | null
          subtitle?: string | null
          target_car?: string[]
          task_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          amount_needed: number | null
          created_at: string | null
          dataco_number: string
          day_time: string[]
          description: Json
          id: string
          is_visible: boolean | null
          lidar: boolean | null
          locations: string[]
          priority: number | null
          project_id: string
          subtitle: string | null
          target_car: string[]
          title: string
          type: string[]
          updated_at: string | null
        }
        Insert: {
          amount_needed?: number | null
          created_at?: string | null
          dataco_number: string
          day_time?: string[]
          description?: Json
          id?: string
          is_visible?: boolean | null
          lidar?: boolean | null
          locations?: string[]
          priority?: number | null
          project_id: string
          subtitle?: string | null
          target_car?: string[]
          title: string
          type?: string[]
          updated_at?: string | null
        }
        Update: {
          amount_needed?: number | null
          created_at?: string | null
          dataco_number?: string
          day_time?: string[]
          description?: Json
          id?: string
          is_visible?: boolean | null
          lidar?: boolean | null
          locations?: string[]
          priority?: number | null
          project_id?: string
          subtitle?: string | null
          target_car?: string[]
          title?: string
          type?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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