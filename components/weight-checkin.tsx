'use client'

import { useState } from 'react'
import { Scale, TrendingDown, TrendingUp, Plus } from 'lucide-react'
import { addWeightCheckin } from '@/app/actions/weight'

interface WeightHistoryItem {
  date: string
  weight_kg: number
}

interface WeightCheckinProps {
  currentWeight: number
  targetWeight: number
  history: WeightHistoryItem[]
}

export function WeightCheckin({
  currentWeight: initial,
  targetWeight,
  history,
}: WeightCheckinProps) {
  const [current, setCurrent] = useState(initial)
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(false)

  const diff = current - targetWeight
  const isLosing = diff > 0

  const weeksLeft = Math.abs(diff) / 0.5
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + Math.round(weeksLeft * 7))

  const handleSave = async () => {
    const kg = parseFloat(input)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    setLoading(true)
    await addWeightCheckin(kg)
    setCurrent(kg)
    setInput('')
    setShowInput(false)
    setLoading(false)
  }

  const recentHistory = history.slice(-8)
  const max =
    recentHistory.length > 0
      ? Math.max(...recentHistory.map((x) => x.weight_kg))
      : current
  const min =
    recentHistory.length > 0
      ? Math.min(...recentHistory.map((x) => x.weight_kg))
      : current
  const range = max - min || 1

  return (
    <div className="glass-card rounded-[2rem] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Theo dõi cân nặng
        </h3>
        <button
          onClick={() => setShowInput((v) => !v)}
          className="w-8 h-8 rounded-xl hoverboard-gradient flex items-center justify-center text-white"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-4xl font-black text-slate-800">
            {current}
            <span className="text-lg font-semibold text-slate-400">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">hiện tại</p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl ${
            isLosing ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {isLosing ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          <span className="text-sm font-black">
            {Math.abs(diff).toFixed(1)}kg {isLosing ? 'cần giảm' : 'cần tăng'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-emerald-600">
            {targetWeight}
            <span className="text-lg font-semibold text-slate-400">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">mục tiêu</p>
        </div>
      </div>

      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full hoverboard-gradient rounded-full transition-all"
          style={{
            width: `${Math.max(
              5,
              Math.min(95, 100 - (Math.abs(diff) / (Math.abs(diff) + 1)) * 100)
            )}%`,
          }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mb-4">
        ~{Math.round(weeksLeft)} tuần nữa ·{' '}
        {targetDate.toLocaleDateString('vi-VN', {
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {recentHistory.length > 1 && (
        <div className="flex items-end gap-1 h-10 mb-4">
          {recentHistory.map((h, i) => {
            const pct = ((h.weight_kg - min) / range) * 100
            return (
              <div
                key={i}
                className="flex-1 bg-emerald-200 rounded-t"
                style={{ height: `${Math.max(10, pct)}%` }}
              />
            )
          })}
        </div>
      )}

      {showInput && (
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập kg..."
            step="0.1"
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:border-emerald-400"
          />
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl hoverboard-gradient text-white font-bold text-sm disabled:opacity-50"
          >
            Lưu
          </button>
        </div>
      )}
    </div>
  )
}

