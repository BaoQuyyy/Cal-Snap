// app/(app)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { updateCalorieGoal } from '@/app/actions/meals'
import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { User, Target, LogOut, Loader2, Plus, Minus, ClipboardList, Scale, Flame, TrendingDown, TrendingUp, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(2000)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [totalMeals, setTotalMeals] = useState(0)
  const [daysTracked, setDaysTracked] = useState(0)
  const [avgCalories, setAvgCalories] = useState(0)
  const [profile, setProfile] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [journeyStreak, setJourneyStreak] = useState(0)
  const [journeyScore, setJourneyScore] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User')

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof)
        setGoal(prof.daily_calorie_goal ?? 2000)
        setJourneyStreak(prof.journey_streak ?? 0)
        setJourneyScore(prof.journey_score ?? 0)
      }

      const { data: meals } = await supabase
        .from('meal_logs')
        .select('logged_at, calories')
        .eq('user_id', user.id)

      if (meals && meals.length > 0) {
        const dates = new Set((meals as any[]).map((m) => m.logged_at))
        const total = (meals as any[]).reduce((s, m) => s + m.calories, 0)
        setTotalMeals(meals.length)
        setDaysTracked(dates.size)
        setAvgCalories(Math.round(total / dates.size))
      }

      const { data: weights } = await supabase
        .from('weight_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(8)

      setWeightHistory(weights ?? [])
      setLoading(false)
    })
  }, [])

  const handleSaveGoal = async () => {
    setSaving(true)
    const res = await updateCalorieGoal(goal)
    setSaving(false)
    if (res.error) toast.error(res.error)
    else toast.success('Calorie goal updated!')
  }

  const plan = profile?.fitness_plan as any
  const weightDiff = profile?.weight_kg && profile?.target_weight_kg
    ? Math.abs(profile.weight_kg - profile.target_weight_kg)
    : null

  return (
    <div className="space-y-5 max-w-lg mx-auto page-enter pb-24">

      {/* Header */}
      <div className="hoverboard-card rounded-[2.5rem] p-7 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-white text-2xl font-black shrink-0">
            {(name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white truncate">{name}</h2>
            <p className="text-white/70 text-sm truncate">{email}</p>
            {plan && (
              <span className="inline-block mt-1 px-3 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
                {plan.bmi_category} · BMI {plan.bmi}
              </span>
            )}
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bữa ăn', value: totalMeals, icon: '🍽️' },
          { label: 'Ngày track', value: daysTracked, icon: '📅' },
          { label: 'TB kcal', value: avgCalories || '—', icon: '🔥' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="glass-card rounded-[2rem] p-4 text-center">
            <p className="text-lg mb-0.5">{icon}</p>
            <p className="text-xl font-black text-slate-800">{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Journey stats */}
      {(journeyStreak > 0 || journeyScore > 0) && (
        <div className="glass-card rounded-[2rem] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Hành Trình</h3>
          <div className="flex gap-3">
            <div className="flex-1 bg-orange-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-orange-500">🔥 {journeyStreak}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ngày streak</p>
            </div>
            <div className="flex-1 bg-emerald-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-emerald-600">{journeyScore}%</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">tuần này</p>
            </div>
          </div>
        </div>
      )}

      {/* My Plan summary */}
      {plan && (
        <div className="glass-card rounded-[2rem] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Plan</h3>
            <Link href="/fitness-plan" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              <ClipboardList size={12} /> Xem đầy đủ
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Calories', value: `${plan.daily_calories} kcal`, icon: '🔥' },
              { label: 'Protein', value: `${plan.daily_protein_g}g`, icon: '💪' },
              { label: 'Workouts', value: `${plan.weekly_workouts}x/tuần`, icon: '🏋️' },
              { label: 'Mục tiêu', value: profile.goal === 'lose_weight' ? 'Giảm cân' : profile.goal === 'gain_muscle' ? 'Tăng cơ' : 'Duy trì', icon: '🎯' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <div>
                  <p className="text-xs text-slate-400 font-semibold">{label}</p>
                  <p className="text-sm font-black text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/onboarding"
            className="mt-3 w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors">
            <Edit3 size={12} /> Cập nhật thông tin cá nhân
          </Link>
        </div>
      )}

      {/* Weight history */}
      {profile?.weight_kg && profile?.target_weight_kg && (
        <div className="glass-card rounded-[2rem] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cân nặng</h3>
            <Scale size={16} className="text-slate-400" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-800">{profile.weight_kg}<span className="text-base font-semibold text-slate-400">kg</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">hiện tại</p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl ${weightDiff && profile.weight_kg > profile.target_weight_kg ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {profile.weight_kg > profile.target_weight_kg ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span className="text-sm font-black">{weightDiff?.toFixed(1)}kg</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-emerald-600">{profile.target_weight_kg}<span className="text-base font-semibold text-slate-400">kg</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">mục tiêu</p>
            </div>
          </div>

          {/* Mini weight chart */}
          {weightHistory.length > 1 && (
            <div className="flex items-end gap-1 h-12 mb-2">
              {weightHistory.map((w, i) => {
                const max = Math.max(...weightHistory.map(x => x.weight_kg))
                const min = Math.min(...weightHistory.map(x => x.weight_kg))
                const range = max - min || 1
                const h = Math.max(15, ((w.weight_kg - min) / range) * 100)
                return (
                  <div key={i} title={`${w.weight_kg}kg`}
                    className="flex-1 bg-emerald-200 rounded-t-lg transition-all"
                    style={{ height: `${h}%` }} />
                )
              })}
            </div>
          )}
          {weightHistory.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Chưa có lịch sử cân — check-in từ dashboard!</p>
          )}
        </div>
      )}

      {/* Calorie goal */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-emerald-500" /> Daily Calorie Goal
        </h3>
        <div className="flex items-center gap-3">
          <button onClick={() => setGoal(g => Math.max(500, g - 100))}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Minus className="h-4 w-4 text-slate-600" />
          </button>
          <input type="number" value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value) || 2000)}
            className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xl font-black text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
          <button onClick={() => setGoal(g => Math.min(10000, g + 100))}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Plus className="h-4 w-4 text-slate-600" />
          </button>
          <span className="text-slate-400 font-medium text-sm shrink-0">kcal</span>
          <Button onClick={handleSaveGoal} disabled={saving || loading}
            className="hoverboard-gradient text-white font-bold rounded-2xl px-5 py-3">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu'}
          </Button>
        </div>
      </div>

      {/* Account */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-emerald-500" /> Account
        </h3>
        <p className="font-semibold text-slate-800">{loading ? '...' : email}</p>
        <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-600 text-xs font-semibold rounded-full">Connected</span>
      </div>

      {/* Logout */}
      <form action={logout}>
        <Button type="submit" variant="outline"
          className="w-full gap-2 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3.5">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </form>
    </div>
  )
}