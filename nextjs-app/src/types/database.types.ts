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
      members: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          emergency_contact: Json
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          joined_at: string
          last_name: string
          medical_info: Json
          member_number: string | null
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: Json
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          joined_at?: string
          last_name: string
          medical_info?: Json
          member_number?: string | null
          org_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: Json
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          joined_at?: string
          last_name?: string
          medical_info?: Json
          member_number?: string | null
          org_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          permissions: Json
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id: string
          permissions?: Json
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price: number
          currency: string
          duration_days: number | null
          session_count: number | null
          max_classes_per_week: number | null
          max_bookings_per_day: number | null
          features: Json
          is_active: boolean
          display_order: number
          stripe_product_id: string | null
          stripe_price_id: string | null
          stripe_price_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price: number
          currency?: string
          duration_days?: number | null
          session_count?: number | null
          max_classes_per_week?: number | null
          max_bookings_per_day?: number | null
          features?: Json
          is_active?: boolean
          display_order?: number
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          stripe_price_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price?: number
          currency?: string
          duration_days?: number | null
          session_count?: number | null
          max_classes_per_week?: number | null
          max_bookings_per_day?: number | null
          features?: Json
          is_active?: boolean
          display_order?: number
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          stripe_price_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          org_id: string
          member_id: string
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          start_date: string
          end_date: string | null
          paused_at: string | null
          cancelled_at: string | null
          sessions_total: number | null
          sessions_used: number
          price_paid: number | null
          discount_percent: number | null
          discount_reason: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          auto_renew: boolean
          renewal_reminder_sent: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          start_date: string
          end_date?: string | null
          paused_at?: string | null
          cancelled_at?: string | null
          sessions_total?: number | null
          sessions_used?: number
          price_paid?: number | null
          discount_percent?: number | null
          discount_reason?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          auto_renew?: boolean
          renewal_reminder_sent?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          start_date?: string
          end_date?: string | null
          paused_at?: string | null
          cancelled_at?: string | null
          sessions_total?: number | null
          sessions_used?: number
          price_paid?: number | null
          discount_percent?: number | null
          discount_reason?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          auto_renew?: boolean
          renewal_reminder_sent?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          org_id: string
          member_id: string
          subscription_id: string | null
          amount: number
          currency: string
          status: Database["public"]["Enums"]["payment_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          description: string | null
          paid_at: string | null
          due_date: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          stripe_charge_id: string | null
          refunded_amount: number | null
          refunded_at: string | null
          refund_reason: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          subscription_id?: string | null
          amount: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          description?: string | null
          paid_at?: string | null
          due_date?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          stripe_charge_id?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          refund_reason?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          subscription_id?: string | null
          amount?: number
          currency?: string
          status?: Database["public"]["Enums"]["payment_status"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          description?: string | null
          paid_at?: string | null
          due_date?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          stripe_charge_id?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          refund_reason?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_templates: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          duration_minutes: number
          max_participants: number | null
          min_participants: number
          color: string
          default_coach_id: string | null
          default_location: string | null
          requires_subscription: boolean
          allowed_plan_types: string[] | null
          session_cost: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          duration_minutes?: number
          max_participants?: number | null
          min_participants?: number
          color?: string
          default_coach_id?: string | null
          default_location?: string | null
          requires_subscription?: boolean
          allowed_plan_types?: string[] | null
          session_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          duration_minutes?: number
          max_participants?: number | null
          min_participants?: number
          color?: string
          default_coach_id?: string | null
          default_location?: string | null
          requires_subscription?: boolean
          allowed_plan_types?: string[] | null
          session_cost?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_default_coach_id_fkey"
            columns: ["default_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          id: string
          org_id: string
          template_id: string | null
          name: string
          description: string | null
          class_type: Database["public"]["Enums"]["class_type"]
          status: Database["public"]["Enums"]["class_status"]
          start_time: string
          end_time: string
          duration_minutes: number
          max_participants: number | null
          min_participants: number
          current_participants: number
          waitlist_count: number
          coach_id: string | null
          assistant_coach_id: string | null
          location: string | null
          room: string | null
          color: string
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          recurrence_id: string | null
          recurrence_end_date: string | null
          requires_subscription: boolean
          drop_in_price: number | null
          session_cost: number
          allowed_plan_types: string[] | null
          notes: string | null
          cancelled_reason: string | null
          cancelled_at: string | null
          workout_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          template_id?: string | null
          name: string
          description?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          status?: Database["public"]["Enums"]["class_status"]
          start_time: string
          end_time: string
          duration_minutes: number
          max_participants?: number | null
          min_participants?: number
          current_participants?: number
          waitlist_count?: number
          coach_id?: string | null
          assistant_coach_id?: string | null
          location?: string | null
          room?: string | null
          color?: string
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_id?: string | null
          recurrence_end_date?: string | null
          requires_subscription?: boolean
          drop_in_price?: number | null
          session_cost?: number
          allowed_plan_types?: string[] | null
          notes?: string | null
          cancelled_reason?: string | null
          cancelled_at?: string | null
          workout_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          template_id?: string | null
          name?: string
          description?: string | null
          class_type?: Database["public"]["Enums"]["class_type"]
          status?: Database["public"]["Enums"]["class_status"]
          start_time?: string
          end_time?: string
          duration_minutes?: number
          max_participants?: number | null
          min_participants?: number
          current_participants?: number
          waitlist_count?: number
          coach_id?: string | null
          assistant_coach_id?: string | null
          location?: string | null
          room?: string | null
          color?: string
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_id?: string | null
          recurrence_end_date?: string | null
          requires_subscription?: boolean
          drop_in_price?: number | null
          session_cost?: number
          allowed_plan_types?: string[] | null
          notes?: string | null
          cancelled_reason?: string | null
          cancelled_at?: string | null
          workout_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          org_id: string
          class_id: string
          member_id: string
          subscription_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          waitlist_position: number | null
          checked_in_at: string | null
          checked_in_by: string | null
          is_drop_in: boolean
          drop_in_payment_id: string | null
          sessions_deducted: number
          cancelled_at: string | null
          cancelled_reason: string | null
          no_show_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          class_id: string
          member_id: string
          subscription_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          waitlist_position?: number | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          is_drop_in?: boolean
          drop_in_payment_id?: string | null
          sessions_deducted?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          no_show_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          class_id?: string
          member_id?: string
          subscription_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          waitlist_position?: number | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          is_drop_in?: boolean
          drop_in_payment_id?: string | null
          sessions_deducted?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          no_show_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          id: string
          org_id: string
          title: string
          description: string | null
          scheduled_date: string | null
          wod_type: string | null
          status: string
          is_template: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          description?: string | null
          scheduled_date?: string | null
          wod_type?: string | null
          status?: string
          is_template?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          title?: string
          description?: string | null
          scheduled_date?: string | null
          wod_type?: string | null
          status?: string
          is_template?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_blocks: {
        Row: {
          id: string
          workout_id: string
          name: string | null
          block_type: string
          wod_type: string | null
          time_cap: number | null
          rounds: number | null
          work_time: number | null
          rest_time: number | null
          position: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          name?: string | null
          block_type?: string
          wod_type?: string | null
          time_cap?: number | null
          rounds?: number | null
          work_time?: number | null
          rest_time?: number | null
          position?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          name?: string | null
          block_type?: string
          wod_type?: string | null
          time_cap?: number | null
          rounds?: number | null
          work_time?: number | null
          rest_time?: number | null
          position?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_blocks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          }
        ]
      }
      block_exercises: {
        Row: {
          id: string
          block_id: string
          exercise_id: string | null
          custom_name: string | null
          reps: number | null
          reps_unit: string | null
          weight_male: number | null
          weight_female: number | null
          weight_unit: string | null
          distance: number | null
          distance_unit: string | null
          time_seconds: number | null
          calories: number | null
          position: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          exercise_id?: string | null
          custom_name?: string | null
          reps?: number | null
          reps_unit?: string | null
          weight_male?: number | null
          weight_female?: number | null
          weight_unit?: string | null
          distance?: number | null
          distance_unit?: string | null
          time_seconds?: number | null
          calories?: number | null
          position?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          block_id?: string
          exercise_id?: string | null
          custom_name?: string | null
          reps?: number | null
          reps_unit?: string | null
          weight_male?: number | null
          weight_female?: number | null
          weight_unit?: string | null
          distance?: number | null
          distance_unit?: string | null
          time_seconds?: number | null
          calories?: number | null
          position?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "workout_blocks"
            referencedColumns: ["id"]
          }
        ]
      }
      exercises: {
        Row: {
          id: string
          org_id: string | null
          name: string
          name_en: string | null
          description: string | null
          category: string
          video_url: string | null
          image_url: string | null
          equipment: string[]
          is_global: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          name: string
          name_en?: string | null
          description?: string | null
          category?: string
          video_url?: string | null
          image_url?: string | null
          equipment?: string[]
          is_global?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          name?: string
          name_en?: string | null
          description?: string | null
          category?: string
          video_url?: string | null
          image_url?: string | null
          equipment?: string[]
          is_global?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_scores: {
        Row: {
          id: string
          workout_id: string
          member_id: string
          block_id: string | null
          score_type: string
          score_value: number
          score_secondary: number | null
          is_rx: boolean
          notes: string | null
          recorded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          member_id: string
          block_id?: string | null
          score_type: string
          score_value: number
          score_secondary?: number | null
          is_rx?: boolean
          notes?: string | null
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          member_id?: string
          block_id?: string | null
          score_type?: string
          score_value?: number
          score_secondary?: number | null
          is_rx?: boolean
          notes?: string | null
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_scores_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      personal_records: {
        Row: {
          id: string
          member_id: string
          exercise_id: string
          record_type: string
          record_value: number
          record_unit: string
          workout_id: string | null
          notes: string | null
          achieved_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          exercise_id: string
          record_type: string
          record_value: number
          record_unit: string
          workout_id?: string | null
          notes?: string | null
          achieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          exercise_id?: string
          record_type?: string
          record_value?: number
          record_unit?: string
          workout_id?: string | null
          notes?: string | null
          achieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      is_org_staff: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      gender_type: "male" | "female" | "other"
      member_status: "active" | "inactive" | "suspended" | "archived"
      org_role: "owner" | "admin" | "coach" | "staff"
      plan_type: "monthly" | "quarterly" | "biannual" | "annual" | "session_card" | "unlimited"
      subscription_status: "active" | "paused" | "expired" | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      payment_method: "card" | "sepa" | "cash" | "check" | "transfer" | "other"
      class_type: "group" | "private" | "open_gym" | "event" | "workshop"
      class_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      booking_status: "confirmed" | "waitlist" | "cancelled" | "no_show" | "attended"
      recurrence_type: "none" | "daily" | "weekly" | "biweekly" | "monthly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Convenience types
export type Organization = Tables<"organizations">
export type Profile = Tables<"profiles">
export type OrganizationUser = Tables<"organization_users">
export type Member = Tables<"members">
export type Plan = Tables<"plans">
export type Subscription = Tables<"subscriptions">
export type Payment = Tables<"payments">
export type ClassTemplate = Tables<"class_templates">
export type Class = Tables<"classes">
export type Booking = Tables<"bookings">
