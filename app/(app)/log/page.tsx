'use client'

import { useState, useEffect } from 'react'
import { getMealsForDate } from '@/app/actions/meals'
import { MealCard } from '@/components/meal-card'
import { BookOpen, Flame, Beef, Wheat, Droplets } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { MacroPill } from '@/components/macro-pill'

type Meal = {
  id: string
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: string
  logged_at: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function LogPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const dateObj = new Date(date + 'T12:00:00')
  const dayName = DAYS[dateObj.getDay()]

  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    setLoading(true)
    getMealsForDate(date).then((data) => {
      setMeals(data as Meal[])
      setLoading(false)
    })
  }, [date])

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="space-y-6 max-w-lg mx-auto page-enter">
      <PageHeader title="Meal Log 📋" subtitle="View and manage your meals by day" />

      {/* 7-day pill date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1">
        {sevenDays.map((d) => {
          const isActive = d === date
          const dObj = new Date(d + 'T12:00:00')
          const label = DAYS[dObj.getDay()].slice(0, 2)
          const num = dObj.getDate()
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                isActive
                  ? 'hoverboard-gradient text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label} {num}
            </button>
          )
        })}
      </div>

      {/* Daily summary */}
      <div className="hoverboard-card rounded-[2rem] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 mb-4">
          {dayName} Summary
        </h3>
        <div className="flex items-baseline gap-2 mb-4">
          <Flame className="h-6 w-6 text-white" />
          <span className="text-3xl font-black text-white">{Math.round(totals.calories)}</span>
          <span className="text-white/80">kcal</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <MacroPill type="protein" value={Math.round(totals.protein)} variant="light" />
          <MacroPill type="carbs" value={Math.round(totals.carbs)} variant="light" />
          <MacroPill type="fat" value={Math.round(totals.fat)} variant="light" />
        </div>
      </div>

      {/* Swipe hint - mobile only */}
      {meals.length > 0 && (
        <p className="text-xs text-slate-400 text-center md:hidden">
          Tap delete icon to remove meals
        </p>
      )}

      {/* Meal cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[2rem] glass-card animate-pulse" />
          ))
        ) : meals.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12 text-slate-300 mx-auto" />}
            title="No meals yet"
            subtitle="Scan a meal to start tracking"
            ctaLabel="Scan Food"
            ctaHref="/scan"
          />
        ) : (
          meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
        )}
      </div>

      {/* FAB - desktop only */}
      <Link
        href="/scan"
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 hoverboard-gradient rounded-full items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
        aria-label="Scan food"
      >
        <Flame className="h-6 w-6" />
      </Link>
    </div>
  )
}
