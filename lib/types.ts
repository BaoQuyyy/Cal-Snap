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
          // Onboarding fields
          height_cm: number | null
          weight_kg: number | null
          target_weight_kg: number | null
          goal: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age: number | null
          gender: 'male' | 'female' | null
          fitness_plan: Json | null
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          target_weight_kg?: number | null
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age?: number | null
          gender?: 'male' | 'female' | null
          fitness_plan?: Json | null
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          daily_calorie_goal?: number
          full_name?: string | null
          created_at?: string
          height_cm?: number | null
          weight_kg?: number | null
          target_weight_kg?: number | null
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
          age?: number | null
          gender?: 'male' | 'female' | null
          fitness_plan?: Json | null
          onboarding_completed?: boolean
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

export interface FitnessPlan {
  bmi: number
  bmi_category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese'
  bmr: number
  tdee: number
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  water_liters: number
  weekly_workouts: number
  workout_duration_minutes: number
  workout_types: string[]
  estimated_weeks_to_goal: number
  tips: string[]
  summary: string
}

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
