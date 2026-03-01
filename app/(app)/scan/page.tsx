'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveMeal } from '@/app/actions/meals'
import { Camera, Upload, Loader2, Flame, Beef, Wheat, Droplets, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { toast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { NutritionResult } from '@/lib/types'

type State = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

export default function ScanPage() {
    const [state, setState] = useState<State>('idle')
    const [imageData, setImageData] = useState<string | null>(null)
    const [result, setResult] = useState<NutritionResult | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            setImageData(reader.result as string)
            setState('preview')
            setSaved(false)
            setResult(null)
        }
        reader.readAsDataURL(file)
    }, [])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) handleFile(file)
    }

    const analyze = async () => {
        if (!imageData) return
        setState('analyzing')
        setErrorMsg(null)

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData }),
            })
            const data = await res.json()

            if (data.error) {
                setErrorMsg(data.error)
                setState('error')
            } else {
                setResult(data.result)
                setState('result')
            }
        } catch {
            setErrorMsg('Failed to connect to AI service. Please try again.')
            setState('error')
        }
    }

    const handleSave = async () => {
        if (!result) return
        setSaving(true)
        const res = await saveMeal({
            foodName: result.foodName,
            calories: result.calories,
            protein: result.protein,
            carbs: result.carbs,
            fat: result.fat,
        })
        setSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            setSaved(true)
            toast.success('Saved to your log!')
            setTimeout(() => router.push('/log'), 1500)
        }
    }

    const reset = () => {
        setState('idle')
        setImageData(null)
        setResult(null)
        setErrorMsg(null)
        setSaved(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const confidenceColor = {
        high: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        medium: 'bg-amber-100 text-amber-600 border-amber-200',
        low: 'bg-red-100 text-red-600 border-red-200',
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto min-w-0 overflow-x-hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Scan Food</h1>
                <p className="text-slate-500 text-sm mt-0.5">Upload a photo to get instant nutrition analysis</p>
            </div>

            {/* Image Upload / Preview — glass card */}
            <div className="glass-card rounded-[2rem] overflow-hidden border border-white/40">
                {!imageData ? (
                    <div
                        className="flex flex-col items-center justify-center min-h-[200px] h-64 cursor-pointer hover:bg-white/50 transition-all duration-200 gap-4 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 m-2 touch-target"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                        aria-label="Upload food image"
                    >
                        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600">
                            <Camera className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-slate-800">Drop an image here or click to upload</p>
                            <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
                        </div>
                        <span className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Choose File
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileInput}
                            aria-label="Food image file input"
                        />
                    </div>
                ) : (
                    <div className="relative p-2">
                        <div className="relative h-64 w-full rounded-2xl overflow-hidden">
                            <Image
                                src={imageData}
                                alt="Food preview"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                            {state === 'analyzing' && (
                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center space-y-3 text-white">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
                                        <p className="text-sm font-medium">Analyzing with AI…</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl touch-target flex items-center justify-center"
                            onClick={reset}
                            aria-label="Remove image"
                        >
                            <RotateCcw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                )}
            </div>

            {state === 'preview' && (
                <Button
                    className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-4 min-h-[44px] shadow-lg shadow-emerald-500/25 touch-target"
                    size="lg"
                    onClick={analyze}
                >
                    <Camera className="h-5 w-5" />
                    Analyze with AI
                </Button>
            )}

            {state === 'error' && (
                <div className="glass-card rounded-[2rem] p-6 border border-red-100 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-red-700">{errorMsg}</p>
                            <Button variant="ghost" size="sm" className="mt-2 text-slate-600" onClick={() => setState('preview')}>
                                Try again
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {state === 'result' && result && (
                <div className="glass-card rounded-[2rem] p-6 border border-white/40">
                    <div className="flex items-start justify-between gap-2 mb-4">
                        <h2 className="text-lg font-bold text-slate-800">{result.foodName}</h2>
                        <Badge variant="outline" className={confidenceColor[result.confidence]}>
                            {result.confidence} confidence
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-2xl font-bold text-slate-800 mb-4">
                        <Flame className="h-6 w-6 text-emerald-500" />
                        <span>{result.calories}</span>
                        <span className="text-base font-normal text-slate-500">kcal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <MacroItem icon={Beef} label="Protein" value={result.protein} color="text-blue-500" bg="bg-blue-100" />
                        <MacroItem icon={Wheat} label="Carbs" value={result.carbs} color="text-amber-600" bg="bg-amber-100" />
                        <MacroItem icon={Droplets} label="Fat" value={result.fat} color="text-orange-500" bg="bg-orange-100" />
                    </div>
                    {!saved ? (
                        <Button
                            className="w-full gap-2 hoverboard-gradient text-white font-bold rounded-2xl py-3.5"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                            ) : (
                                <>Save to Log</>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
                            <CheckCircle className="h-5 w-5" />
                            Saved to your log!
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function MacroItem({
    icon: Icon,
    label,
    value,
    color,
    bg,
}: {
    icon: React.ElementType
    label: string
    value: number
    color: string
    bg: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className={`p-1.5 rounded-xl ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <span className="text-base font-bold text-slate-800">{value}g</span>
            <span className="text-xs text-slate-500">{label}</span>
        </div>
    )
}
