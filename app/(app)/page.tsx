import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Flame, Flag, Utensils, Dumbbell, Sparkles, Mic, ScanLine, Barcode, Send, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { WeeklyChart } from '@/components/weekly-chart'
import { HabitCards } from '@/components/habit-cards'
import { ProgressCard } from '@/components/progress-card'
import { getDailyHabits, getStreakAndWeeklyMeals } from '@/app/actions/habits'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const today = new Date().toISOString().split('T')[0]

    // Fetch today's meals
    const { data: meals } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('logged_at', today)

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch weekly data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const { data: weeklyMeals } = await supabase
        .from('meal_logs')
        .select('logged_at, calories')
        .eq('user_id', user.id)
        .gte('logged_at', sevenDaysAgo.toISOString().split('T')[0])

    const totalCalories = meals?.reduce((sum, m) => sum + m.calories, 0) ?? 0
    const totalProtein = meals?.reduce((sum, m) => sum + (m.protein ?? 0), 0) ?? 0
    const totalCarbs = meals?.reduce((sum, m) => sum + (m.carbs ?? 0), 0) ?? 0
    const totalFat = meals?.reduce((sum, m) => sum + (m.fat ?? 0), 0) ?? 0
    const dailyGoal = (profile as any)?.fitness_plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
    const caloriesLeft = Math.max(0, dailyGoal - totalCalories)
    const progressPercent = Math.min(100, (totalCalories / dailyGoal) * 100)

    // Calendar strip - last 5 days
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    const calendarDays = Array.from({ length: 5 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - 4 + i)
        return {
            day: days[d.getDay()],
            date: d.getDate(),
            isToday: i === 4,
        }
    })

    // Weekly chart data
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        const dateStr = d.toISOString().split('T')[0]
        const dayMeals = weeklyMeals?.filter((m) => m.logged_at === dateStr) ?? []
        return {
            date: days[d.getDay()],
            calories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
        }
    })

    const userName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'User'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

    const [habitsResult, progressResult] = await Promise.allSettled([
        getDailyHabits(today),
        getStreakAndWeeklyMeals(user.id),
    ])
    const habits = habitsResult.status === 'fulfilled' ? habitsResult.value : null
    const progress = progressResult.status === 'fulfilled'
        ? progressResult.value
        : { streak: 0, weeklyMealsCount: 0 }

    const habitsTableAvailable = habitsResult.status === 'fulfilled'

    const habitsData = habits ? {
        steps: habits.steps ?? 0,
        water_ml: habits.water_ml ?? 0,
        exercise_minutes: habits.exercise_minutes ?? 0,
        exercise_calories: habits.exercise_calories ?? 0,
    } : null

    return (
        <div className="bg-[#F8FAFC] min-h-screen font-sans page-enter min-w-0 overflow-x-hidden">
            <main className="p-4 lg:p-8 flex flex-col lg:flex-row gap-8 max-w-[1920px] mx-auto min-w-0">

                {/* ── LEFT PANEL ── */}
                <section className="w-full lg:w-1/4 flex flex-col gap-6">
                    {/* User greeting */}
                    <header className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl border-2 border-emerald-200">
                            {userName[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{greeting},</p>
                            <h2 className="text-xl font-bold text-slate-800">{userName} 👋</h2>
                        </div>
                    </header>

                    <Link href="/fitness-plan" className="block">
                      <div className="hoverboard-gradient rounded-[2rem] p-5 flex items-center gap-4 text-white hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <p className="font-black text-base">View My Plan 📋</p>
                          <p className="text-emerald-100 text-xs">
                            {(profile as any)?.fitness_plan
                              ? `${(profile as any).fitness_plan.daily_calories} kcal · ${(profile as any).fitness_plan.weekly_workouts}x/week`
                              : 'Set up your fitness plan'}
                          </p>
                        </div>
                      </div>
                    </Link>

                    {/* Habit Cards */}
                    {habitsTableAvailable ? (
                        <HabitCards date={today} initialHabits={habitsData} />
                    ) : (
                        <div className="glass-card rounded-[2rem] p-5 border border-amber-100 bg-amber-50/30">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Daily Habits</h3>
                            <p className="text-sm text-slate-600 mb-2">Setup required: Run the SQL migration in Supabase to enable Steps, Water & Exercise tracking.</p>
                            <p className="text-xs text-slate-500">See <code className="bg-slate-100 px-1 rounded">supabase/migrations/001_daily_habits_and_logged_at.sql</code></p>
                        </div>
                    )}

                    {/* Your Progress */}
                    <div className="mt-auto">
                        <ProgressCard streak={progress.streak} weeklyMeals={progress.weeklyMealsCount} />
                    </div>
                </section>

                {/* ── CENTER PANEL ── */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Calendar Strip */}
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-[2rem] border border-white/60">
                        <div className="flex-1 flex justify-around">
                            {calendarDays.map(({ day, date, isToday }) => (
                                <div key={date} className={`flex flex-col items-center p-3 transition-all ${isToday ? 'bg-white rounded-2xl shadow-sm scale-110' : ''}`}>
                                    <span className={`text-[10px] font-bold uppercase mb-1 ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>{day}</span>
                                    <span className={`font-bold ${isToday ? 'text-slate-900' : 'text-slate-500'}`}>{date}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Calorie Card */}
                    <Link href="/log" className="block">
                        <div className="hoverboard-card rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-emerald-50 font-medium tracking-wide mb-2">Today&apos;s Calories</p>
                                <div className="flex items-baseline gap-2">
                                    <h1 className="text-7xl font-black tracking-tight">{totalCalories.toLocaleString()}</h1>
                                    <span className="text-xl font-medium opacity-80">kcal</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                                <Flame size={24} fill="currentColor" className="text-white" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-3">
                                <p className="text-sm font-semibold opacity-90">Calories Left</p>
                                <p className="text-lg font-bold">{caloriesLeft.toLocaleString()} kcal</p>
                            </div>
                            <div className="h-4 w-full bg-black/10 rounded-full overflow-hidden p-1">
                                <div className="h-full bg-white rounded-full transition-all duration-500 relative" style={{ width: `${progressPercent}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-emerald-500 rounded-full scale-125 shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none"></div>
                        </div>
                    </Link>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Goal', value: dailyGoal.toLocaleString(), icon: <Flag size={16} fill="currentColor" />, color: 'purple' },
                            { label: 'Protein', value: `${Math.round(totalProtein)}g`, icon: <Utensils size={16} />, color: 'emerald' },
                            { label: 'Carbs', value: `${Math.round(totalCarbs)}g`, icon: <Dumbbell size={16} />, color: 'orange' },
                        ].map(({ label, value, icon, color }) => {
                            const styles: Record<string, string> = {
                                purple: 'bg-purple-100 text-purple-500',
                                emerald: 'bg-emerald-100 text-emerald-500',
                                orange: 'bg-orange-100 text-orange-500',
                            }
                            return (
                                <div key={label} className="glass-card p-5 rounded-[2rem] flex flex-col justify-between gap-4 hover:scale-[1.02] transition-transform">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                        <div className={`w-9 h-9 rounded-full ${styles[color]} flex items-center justify-center`}>{icon}</div>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-800">{value}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Weekly Chart */}
                    <div className="glass-card p-6 rounded-[2rem]">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Weekly Overview</h3>
                        <WeeklyChart data={weeklyData} goal={dailyGoal} />
                    </div>
                </div>

                {/* ── RIGHT PANEL ── */}
                <section className="w-full lg:w-1/4 flex flex-col gap-6">
                    <div className="glass-card p-7 rounded-[3rem] flex flex-col gap-7 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="relative z-10 text-center">
                            <div className="w-16 h-16 hoverboard-gradient rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/20 mx-auto">
                                <Sparkles size={28} fill="currentColor" />
                            </div>
                            <h3 className="text-xl font-extrabold leading-tight mb-2 text-slate-900">AI-Powered<br />Food Logging</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">Log your meals faster with smart vision tools.</p>
                        </div>

                        {/* AI Input - links to chat */}
                        <Link href="/chat" className="block relative z-10">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Sparkles className="text-emerald-500" size={16} />
                                </div>
                                <div className="w-full pl-10 pr-14 py-3.5 bg-slate-50 rounded-2xl text-sm font-medium text-slate-700 flex items-center">
                                    <span className="text-slate-400">Ask AI about calories, health, fitness...</span>
                                </div>
                                <div className="absolute inset-y-0 right-2 flex items-center">
                                    <span className="w-10 h-10 rounded-full hoverboard-gradient flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                        <Send className="text-white" size={16} />
                                    </span>
                                </div>
                            </div>
                        </Link>

                        {/* Smart Tools */}
                        <div className="space-y-4 z-10">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Smart Tools</h4>
                            {[
                                { label: 'Voice Log', icon: <Mic size={18} />, color: 'orange', href: '/scan' },
                                { label: 'Meal Scan', icon: <ScanLine size={18} />, color: 'pink', href: '/scan' },
                                { label: 'Barcode', icon: <Barcode size={18} />, color: 'cyan', href: '/scan' },
                            ].map(({ label, icon, color, href }) => {
                                const styles: Record<string, { bg: string; iconBg: string; iconColor: string; border: string }> = {
                                    orange: { bg: 'from-white to-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-500', border: 'border-orange-100/50' },
                                    pink: { bg: 'from-white to-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-500', border: 'border-pink-100/50' },
                                    cyan: { bg: 'from-white to-cyan-50', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500', border: 'border-cyan-100/50' },
                                }
                                const s = styles[color]
                                return (
                                    <Link key={label} href={href} className={`bg-gradient-to-br ${s.bg} p-4 rounded-[2rem] border ${s.border} flex items-center gap-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer`}>
                                        <div className={`w-10 h-10 rounded-2xl ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
                                            {icon}
                                        </div>
                                        <p className="font-bold text-slate-800">{label}</p>
                                    </Link>
                                )
                            })}
                        </div>

                        {/* Recent meals */}
                        <div className="z-10">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Today&apos;s Meals</h4>
                                <Link href="/log" className="text-xs text-emerald-500 font-semibold hover:underline">See all</Link>
                            </div>
                            {meals && meals.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {meals.slice(0, 3).map((meal) => (
                                        <Link key={meal.id} href="/log" className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{meal.food_name}</p>
                                            <span className="text-xs font-bold text-emerald-600 ml-2 shrink-0">{meal.calories} kcal</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <Link href="/scan" className="block text-center py-4">
                                    <p className="text-xs text-slate-400">No meals logged today</p>
                                    <span className="text-xs text-emerald-500 font-semibold mt-1 inline-block">Scan to add</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </section>
            </main>

        </div>
    )
}
