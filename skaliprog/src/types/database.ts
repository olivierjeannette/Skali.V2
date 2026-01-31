// Types generes depuis le schema Supabase
// A regenerer avec: npx supabase gen types typescript --project-id jhrbzdznuiwjojruiqee > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'owner' | 'admin' | 'coach'
export type MemberStatus = 'prospect' | 'active' | 'expired' | 'suspended' | 'archived'
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'cancelled'
export type ReservationStatus = 'confirmed' | 'cancelled' | 'no_show' | 'waitlist'
export type BlockType = 'warmup' | 'skill' | 'strength' | 'wod' | 'cooldown' | 'accessory'
export type WodType = 'amrap' | 'emom' | 'for_time' | 'tabata' | 'chipper' | 'ladder' | 'custom'
export type ScoreType = 'time' | 'rounds_reps' | 'weight' | 'reps' | 'distance' | 'calories'
export type RxScaled = 'rx' | 'scaled' | 'rx_plus'
export type DocumentType = 'medical_certificate' | 'id_card' | 'contract' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'trial_scheduled' | 'trial_done' | 'converted' | 'lost'
export type CommunicationType = 'email' | 'push' | 'discord' | 'sms'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          branding: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          branding?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          branding?: Json
          created_at?: string
          updated_at?: string
        }
      }
      organization_users: {
        Row: {
          org_id: string
          user_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role: UserRole
          created_at?: string
        }
        Update: {
          org_id?: string
          user_id?: string
          role?: UserRole
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          status: MemberStatus
          birth_date: string | null
          emergency_contact: Json | null
          notes: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          status?: MemberStatus
          birth_date?: string | null
          emergency_contact?: Json | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          status?: MemberStatus
          birth_date?: string | null
          emergency_contact?: Json | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          price: number
          duration_days: number | null
          sessions_limit: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          price: number
          duration_days?: number | null
          sessions_limit?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          price?: number
          duration_days?: number | null
          sessions_limit?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          org_id: string
          member_id: string
          plan_id: string
          status: SubscriptionStatus
          start_date: string
          end_date: string | null
          sessions_remaining: number | null
          payment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          plan_id: string
          status?: SubscriptionStatus
          start_date: string
          end_date?: string | null
          sessions_remaining?: number | null
          payment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          plan_id?: string
          status?: SubscriptionStatus
          start_date?: string
          end_date?: string | null
          sessions_remaining?: number | null
          payment_status?: string
          created_at?: string
        }
      }
      class_types: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          color: string
          default_duration: number
          default_capacity: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          color?: string
          default_duration?: number
          default_capacity?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          color?: string
          default_duration?: number
          default_capacity?: number
          is_active?: boolean
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          org_id: string
          class_type_id: string
          workout_id: string | null
          coach_id: string | null
          start_time: string
          end_time: string
          capacity: number
          is_recurring: boolean
          recurrence_rule: string | null
          cancelled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          class_type_id: string
          workout_id?: string | null
          coach_id?: string | null
          start_time: string
          end_time: string
          capacity: number
          is_recurring?: boolean
          recurrence_rule?: string | null
          cancelled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          class_type_id?: string
          workout_id?: string | null
          coach_id?: string | null
          start_time?: string
          end_time?: string
          capacity?: number
          is_recurring?: boolean
          recurrence_rule?: string | null
          cancelled?: boolean
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          org_id: string
          member_id: string
          class_id: string
          status: ReservationStatus
          checked_in: boolean
          waitlist_position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          class_id: string
          status?: ReservationStatus
          checked_in?: boolean
          waitlist_position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          class_id?: string
          status?: ReservationStatus
          checked_in?: boolean
          waitlist_position?: number | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          org_id: string
          title: string
          description: string | null
          date: string | null
          is_template: boolean
          template_name: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          description?: string | null
          date?: string | null
          is_template?: boolean
          template_name?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          title?: string
          description?: string | null
          date?: string | null
          is_template?: boolean
          template_name?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      workout_blocks: {
        Row: {
          id: string
          workout_id: string
          type: BlockType
          title: string | null
          content: Json
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          type: BlockType
          title?: string | null
          content: Json
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          type?: BlockType
          title?: string | null
          content?: Json
          order_index?: number
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          org_id: string | null
          name: string
          description: string | null
          category: string
          video_url: string | null
          is_global: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          name: string
          description?: string | null
          category: string
          video_url?: string | null
          is_global?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          name?: string
          description?: string | null
          category?: string
          video_url?: string | null
          is_global?: boolean
          created_at?: string
        }
      }
      scores: {
        Row: {
          id: string
          org_id: string
          member_id: string
          workout_id: string
          class_id: string | null
          score_type: ScoreType
          value: string
          rx_scaled: RxScaled
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          workout_id: string
          class_id?: string | null
          score_type: ScoreType
          value: string
          rx_scaled?: RxScaled
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          workout_id?: string
          class_id?: string | null
          score_type?: ScoreType
          value?: string
          rx_scaled?: RxScaled
          notes?: string | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          org_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          source: string | null
          status: LeadStatus
          notes: string | null
          converted_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          source?: string | null
          status?: LeadStatus
          notes?: string | null
          converted_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          source?: string | null
          status?: LeadStatus
          notes?: string | null
          converted_to?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          org_id: string
          member_id: string
          type: DocumentType
          name: string
          file_path: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          member_id: string
          type: DocumentType
          name: string
          file_path: string
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          member_id?: string
          type?: DocumentType
          name?: string
          file_path?: string
          expires_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      member_status: MemberStatus
      subscription_status: SubscriptionStatus
      reservation_status: ReservationStatus
      block_type: BlockType
      wod_type: WodType
      score_type: ScoreType
      rx_scaled: RxScaled
      document_type: DocumentType
      lead_status: LeadStatus
      communication_type: CommunicationType
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Shortcuts
export type Organization = Tables<'organizations'>
export type Member = Tables<'members'>
export type Plan = Tables<'plans'>
export type Subscription = Tables<'subscriptions'>
export type ClassType = Tables<'class_types'>
export type Class = Tables<'classes'>
export type Reservation = Tables<'reservations'>
export type Workout = Tables<'workouts'>
export type WorkoutBlock = Tables<'workout_blocks'>
export type Exercise = Tables<'exercises'>
export type Score = Tables<'scores'>
export type Lead = Tables<'leads'>
export type Document = Tables<'documents'>
