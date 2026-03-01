import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Droplets, Dumbbell, Clock, Target, CheckCircle2, TrendingDown } from 'lucide-react'

function getBmiColor(cat: string) {
  const map: Record<string, string> = {
    Underweight: 'text-blue-500 bg-blue-50',
    Normal: 'text-emerald-500 bg-emerald-50',
    Overweight: 'text-orange-500 bg-orange-50',
    Obese: 'text-red-500 bg-red-50',
  }
  return map[cat] ?? 'text-slate-500 bg-slate-50'
}

function getGoalLabel(goal: string) {
  const map: Record<string, string> = {
    lose_weight: '🔥 Lose Weight',
    maintain: '⚖️ Maintain',
    gain_muscle: '💪 Gain Muscle',
  }
  return map[goal] ?? goal
}

export default async function FitnessPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.fitness_plan) redirect('/onboarding')

  const plan = profile.fitness_plan as any
  const userName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'User'
  const total = (plan.daily_protein_g ?? 0) + (plan.daily_carbs_g ?? 0) + (plan.daily_fat_g ?? 0)
  const proteinPct = total ? Math.round((plan.daily_protein_g / total) * 100) : 33
  const carbsPct = total ? Math.round((plan.daily_carbs_g / total) * 100) : 34
  const fatPct = total ? Math.round((plan.daily_fat_g / total) * 100) : 33
  const weightDiff = Math.abs((profile.weight_kg ?? 0) - (profile.target_weight_kg ?? 0))

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-4 lg:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm w-fit">
          <ChevronLeft size={18} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="hoverboard-card rounded-[3rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-50 text-sm font-medium mb-1">Your Fitness Plan 🎯</p>
            <h1 className="text-3xl font-black mb-4">{userName}&apos;s Plan</h1>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-2xl text-sm font-bold">{getGoalLabel(profile.goal ?? '')}</span>
              <span className={`px-4 py-1.5 rounded-2xl text-sm font-bold ${getBmiColor(plan.bmi_category)}`}>BMI {plan.bmi} · {plan.bmi_category}</span>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Daily Nutrition */}
        <div className="glass-card rounded-[2.5rem] p-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Daily Nutrition</h2>
          <div className="text-center mb-8">
            <p className="text-6xl font-black hoverboard-gradient bg-clip-text text-transparent">{plan.daily_calories?.toLocaleString()}</p>
            <p className="text-slate-400 font-semibold mt-1">kcal / day</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Protein', g: plan.daily_protein_g, pct: proteinPct, color: 'text-emerald-600' },
              { label: 'Carbs', g: plan.daily_carbs_g, pct: carbsPct, color: 'text-orange-600' },
              { label: 'Fat', g: plan.daily_fat_g, pct: fatPct, color: 'text-blue-600' },
            ].map(({ label, g, pct, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                      strokeLinecap="round" className={color} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${color}`}>{pct}%</span>
                </div>
                <p className="font-black text-slate-800">{Math.round(g)}g</p>
                <p className="text-xs font-bold text-slate-400">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
            <Droplets className="text-blue-500" size={22} />
            <div>
              <p className="font-bold text-slate-800">{plan.water_liters}L water / day</p>
              <p className="text-xs text-slate-400">{Array.from({ length: Math.round(plan.water_liters / 0.25) }, (_, i) => <span key={i}>💧</span>)}</p>
            </div>
          </div>
        </div>

        {/* Workout */}
        <div className="glass-card rounded-[2.5rem] p-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Workout Plan</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Dumbbell size={18} className="text-emerald-600" /></div>
              <div><p className="font-black text-slate-800 text-lg">{plan.weekly_workouts}x</p><p className="text-xs text-slate-400">per week</p></div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><Clock size={18} className="text-orange-600" /></div>
              <div><p className="font-black text-slate-800 text-lg">{plan.workout_duration_minutes}min</p><p className="text-xs text-slate-400">per session</p></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {plan.workout_types?.map((t: string) => <span key={t} className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-2xl text-sm font-bold">{t}</span>)}
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl">
            <Target className="text-purple-500 shrink-0" size={20} />
            <p className="font-semibold text-slate-700 text-sm">Estimated <span className="font-black text-purple-600">{plan.estimated_weeks_to_goal} weeks</span> to reach your goal</p>
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card rounded-[2.5rem] p-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Personalized Tips</h2>
          <div className="flex flex-col gap-3">
            {plan.tips?.map((tip: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-slate-700">{tip}</p>
              </div>
            ))}
          </div>
          {plan.summary && <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-sm font-medium text-emerald-800">{plan.summary}</p></div>}
        </div>

        {/* Progress */}
        {profile.weight_kg && profile.target_weight_kg && (
          <div className="hoverboard-card rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-6">Progress Estimate</h2>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center"><p className="text-3xl font-black">{profile.weight_kg}kg</p><p className="text-emerald-200 text-xs mt-1">Current</p></div>
                <TrendingDown size={28} className="text-emerald-300" />
                <div className="text-center"><p className="text-3xl font-black">{profile.target_weight_kg}kg</p><p className="text-emerald-200 text-xs mt-1">Target</p></div>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[5%]" />
              </div>
              <p className="text-emerald-200 text-xs mt-2 text-center">{weightDiff}kg to go</p>
            </div>
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        <Link href="/onboarding" className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-center hover:bg-slate-200 transition-colors block">
          🔄 Recalculate Plan
        </Link>
        <div className="h-8" />
      </div>
    </div>
  )
}

