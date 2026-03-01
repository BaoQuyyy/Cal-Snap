'use client'

import { useState, useEffect } from 'react'
import { updateCalorieGoal } from '@/app/actions/meals'
import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { User, Target, LogOut, Loader2, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [goal, setGoal] = useState<number>(2000)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [totalMeals, setTotalMeals] = useState(0)
  const [daysTracked, setDaysTracked] = useState(0)
  const [avgCalories, setAvgCalories] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '')
        setName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User')
        supabase
          .from('profiles')
          .select('daily_calorie_goal')
          .eq('id', user.id)
          .single()
          .then(({ data }: { data: { daily_calorie_goal?: number } | null }) => {
            if (data?.daily_calorie_goal) {
              setGoal(data.daily_calorie_goal)
            }
            setLoading(false)
          })
        supabase
          .from('meal_logs')
          .select('logged_at, calories')
          .eq('user_id', user.id)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const dates = new Set((data as { logged_at: string }[]).map((m) => m.logged_at))
              const total = (data as { calories: number }[]).reduce((s, m) => s + m.calories, 0)
              setTotalMeals(data.length)
              setDaysTracked(dates.size)
              setAvgCalories(Math.round(total / dates.size))
            }
          })
      }
    })
  }, [])

  const handleSaveGoal = async () => {
    setSaving(true)
    const res = await updateCalorieGoal(goal)
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Calorie goal updated!')
    }
  }

  const adjustGoal = (delta: number) => {
    const newGoal = Math.max(500, Math.min(10000, goal + delta))
    setGoal(newGoal)
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto page-enter">
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

      {/* Profile header */}
      <div className="hoverboard-card rounded-[2.5rem] p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-white text-2xl font-black">
            {(name || 'User')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-white/80 text-sm">{email}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-[2rem] p-5 text-center">
          <p className="text-2xl font-black text-slate-800">{totalMeals}</p>
          <p className="text-xs text-slate-500 font-medium">Total Meals</p>
        </div>
        <div className="glass-card rounded-[2rem] p-5 text-center">
          <p className="text-2xl font-black text-slate-800">{daysTracked}</p>
          <p className="text-xs text-slate-500 font-medium">Days Tracked</p>
        </div>
        <div className="glass-card rounded-[2rem] p-5 text-center">
          <p className="text-2xl font-black text-slate-800">{avgCalories}</p>
          <p className="text-xs text-slate-500 font-medium">Avg Calories</p>
        </div>
      </div>

      {/* Daily Goal card */}
      <div className="glass-card rounded-[2rem] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-emerald-500" />
          Daily Goal
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustGoal(-100)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value, 10) || 2000)}
              min={500}
              max={10000}
              className="w-24 px-4 py-3 bg-slate-50 rounded-2xl text-xl font-bold text-slate-800 text-center border-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => adjustGoal(100)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-slate-500 font-medium">kcal</span>
          <Button
            onClick={handleSaveGoal}
            disabled={saving || loading}
            className="gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-3.5 px-5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>

      {/* Account card */}
      <div className="glass-card rounded-[2rem] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-emerald-500" />
          Account
        </h3>
        <p className="font-semibold text-slate-800">
          {loading ? <span className="text-slate-400 italic">Loading…</span> : email}
        </p>
        <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-600 text-xs font-semibold rounded-full">
          Connected
        </span>
      </div>

      {/* Logout */}
      <form action={logout}>
        <Button
          type="submit"
          variant="outline"
          className="w-full gap-2 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold py-3.5"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </form>
    </div>
  )
}
