// app/api/assistant/action/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateDailyAdherence, updateJourneyProgress } from '@/app/actions/adherence'

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    if (type === 'LOG_MEAL') {
      await supabase.from('meal_logs').insert({
        user_id: user.id,
        food_name: data.foodName,
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        logged_at: today,
      } as never)
      await updateDailyAdherence(today)
      await updateJourneyProgress()
      return NextResponse.json({ success: true })
    }

    if (type === 'UPDATE_GOAL') {
      await supabase.from('profiles')
        .update({ daily_calorie_goal: Number(data.daily_calorie_goal) } as never)
        .eq('id', user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
