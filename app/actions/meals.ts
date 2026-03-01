'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveMeal(data: {
    foodName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    imageUrl?: string
    loggedAt?: string // YYYY-MM-DD, defaults to today
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    const loggedAt = data.loggedAt ?? new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        image_url: data.imageUrl ?? null,
        logged_at: loggedAt,
    } as never)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true }
}

export async function deleteMeal(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/log')
    revalidatePath('/')
    return { success: true }
}

export async function getMealsForDate(date: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return []

    const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('logged_at', date)
        .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]) ?? []
}

export async function getWeeklyCalories() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return []

    // Last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 6)

    const { data } = await supabase
        .from('meal_logs')
        .select('logged_at, calories')
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString().split('T')[0])
        .lte('logged_at', endDate.toISOString().split('T')[0])

    if (!data) return []

    // Build last 7 days map
    const grouped: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[d.toISOString().split('T')[0]] = 0
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ; (data as any[]).forEach((row) => {
        if (row.logged_at in grouped) {
            grouped[row.logged_at] += row.calories
        }
    })

    return Object.entries(grouped).map(([date, calories]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        calories,
    }))
}

export async function updateCalorieGoal(goal: number) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, daily_calorie_goal: goal } as never)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
}
