import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { FunctionDeclaration } from '@google/generative-ai'
import { saveMeal } from '@/app/actions/meals'
import { createClient } from '@/lib/supabase/server'

const BASE_SYSTEM_PROMPT = `You are CalSnap AI, a friendly coach specialized in calorie tracking, health, and fitness. Your expertise includes:
- Calorie counting & macro tracking (protein, carbs, fat)
- Nutrition advice & meal planning
- Fitness & workout suggestions
- Healthy eating tips & weight management
- Sức khỏe (health) - general wellness
- Fitness routines for different goals

IMPORTANT: You are fluent in both English and Tiếng Việt. Respond in the same language the user writes in.

When the user mentions they ate something with calories (e.g. "hôm qua tôi ăn cơm tấm 400 calo", "yesterday I had pho ~500 calories"), ALWAYS use the log_meal function to add it to their meal log. Extract:
- food_name: the food/dish name
- calories: the number (estimate if not given, e.g. cơm tấm ~400, pho ~500)
- date: "today", "yesterday", "hôm qua", "hôm kia" etc. → convert to YYYY-MM-DD
- protein, carbs, fat: estimate from typical values for that food (optional, can use 0 if unknown)

Examples: "ăn cơm tấm 400 calo hôm qua" → log_meal(food_name="Cơm tấm", calories=400, date=yesterday)
Keep responses concise. After logging, confirm briefly (e.g. "Đã thêm Cơm tấm 400 kcal vào log của bạn!").`

const LOG_MEAL_DECLARATION = {
  name: 'log_meal',
  description: 'Add a meal to the user\'s calorie log. Use when the user mentions eating something with calories (e.g. "hôm qua tôi ăn cơm tấm 400 calo").',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      food_name: { type: SchemaType.STRING, description: 'Name of the food or dish' },
      calories: { type: SchemaType.NUMBER, description: 'Calories' },
      date: { type: SchemaType.STRING, description: 'Date YYYY-MM-DD' },
      protein: { type: SchemaType.NUMBER, description: 'Protein grams' },
      carbs: { type: SchemaType.NUMBER, description: 'Carbs grams' },
      fat: { type: SchemaType.NUMBER, description: 'Fat grams' },
    },
    required: ['food_name', 'calories', 'date'],
  },
} as FunctionDeclaration

function getDateFromRelative(relative: string): string {
  const today = new Date()
  const d = new Date(today)
  const lower = relative.toLowerCase()
  if (lower.includes('hôm nay') || lower.includes('today')) {
    return d.toISOString().split('T')[0]
  }
  if (lower.includes('hôm qua') || lower.includes('yesterday')) {
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }
  if (lower.includes('hôm kia') || lower.includes('day before')) {
    d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  }
  if (lower.includes('2 days ago') || lower.includes('hai ngày trước')) {
    d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  }
  if (lower.includes('3 days ago') || lower.includes('ba ngày trước')) {
    d.setDate(d.getDate() - 3)
    return d.toISOString().split('T')[0]
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(relative)) return relative
  return today.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey || apiKey.length < 10 || apiKey.startsWith('your_')) {
    return NextResponse.json(
      { error: 'Google AI API key is not configured.' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { messages } = body as { messages: { role: string; content: string }[] }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let planContext = ''
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const today = new Date().toISOString().split('T')[0]
      const { data: adherence } = await supabase
        .from('plan_adherence')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (profile?.fitness_plan) {
        const plan = profile.fitness_plan as any
        planContext = `
CONTEXT VỀ USER:
- Mục tiêu: ${profile.goal} | BMI: ${plan.bmi}
- Calories goal: ${plan.daily_calories} kcal/ngày
- Protein: ${plan.daily_protein_g}g | Carbs: ${plan.daily_carbs_g}g | Fat: ${plan.daily_fat_g}g
- Hôm nay đã ăn: ${adherence?.calories_actual ?? 0} kcal (${adherence?.protein_actual ?? 0}g protein)
- On track hôm nay: ${adherence?.is_on_track ? 'CÓ ✅' : 'CHƯA ❌'} | Điểm: ${adherence?.adherence_score ?? 0}/100
Dựa vào context này, đưa lời khuyên cá nhân hóa khi phù hợp.
`
      }
    }

    const systemPrompt = planContext
      ? `${BASE_SYSTEM_PROMPT}\n${planContext}`
      : BASE_SYSTEM_PROMPT

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: [LOG_MEAL_DECLARATION] }],
    })

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    let result = await chat.sendMessage(lastMessage.content)
    let response = result.response
    const functionCalls = response.functionCalls?.()

    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
        if (fc.name === 'log_meal' && fc.args) {
          const args = fc.args as {
            food_name?: string
            calories?: number
            date?: string
            protein?: number
            carbs?: number
            fat?: number
          }
          const foodName = args.food_name || 'Meal'
          const calories = typeof args.calories === 'number' ? Math.round(args.calories) : 0
          const dateStr = args.date ? getDateFromRelative(String(args.date)) : new Date().toISOString().split('T')[0]
          const protein = typeof args.protein === 'number' ? args.protein : 0
          const carbs = typeof args.carbs === 'number' ? args.carbs : 0
          const fat = typeof args.fat === 'number' ? args.fat : 0

          const saveResult = await saveMeal({
            foodName,
            calories,
            protein,
            carbs,
            fat,
            loggedAt: dateStr,
          })

          const funcResponse = saveResult.error
            ? { error: saveResult.error }
            : { success: true, message: `Đã thêm ${foodName} (${calories} kcal) vào ngày ${dateStr}` }

          result = await chat.sendMessage([
            {
              functionResponse: {
                name: 'log_meal',
                response: funcResponse,
              },
            },
          ])
          response = result.response
        }
      }
    }

    const reply = response.text()

    return NextResponse.json({ reply: reply || 'Sorry, I could not generate a response.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/chat] Error:', message)
    return NextResponse.json(
      { error: `Failed to get AI response: ${message}` },
      { status: 500 }
    )
  }
}
