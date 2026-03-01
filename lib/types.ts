export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          daily_calorie_goal: number
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          food_name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          image_url: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          image_url?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_name?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          image_url?: string | null
          logged_at?: string
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type MealLog = Database['public']['Tables']['meal_logs']['Row']

export interface NutritionResult {
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'high' | 'medium' | 'low'
}

export interface AnalyzeResponse {
  result?: NutritionResult
  error?: string
}
