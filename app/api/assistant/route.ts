// app/api/assistant/route.ts
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { message, imageBase64, history } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    // Fetch user context
    const [{ data: profile }, { data: todayMeals }, { data: adherence }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_logs').select('food_name, calories, protein, carbs, fat').eq('user_id', user.id).eq('logged_at', today),
      supabase.from('plan_adherence').select('*').eq('user_id', user.id).eq('date', today).single(),
    ])

    const plan = profile?.fitness_plan as any
    const actualCalories = todayMeals?.reduce((s, m) => s + m.calories, 0) ?? 0
    const calorieGoal = plan?.daily_calories ?? profile?.daily_calorie_goal ?? 2000
    const caloriesLeft = calorieGoal - actualCalories

    const systemPrompt = `Bạn là trợ lý AI cá nhân của CalSnap với quyền truy cập đầy đủ dữ liệu dinh dưỡng của người dùng.

DỮ LIỆU HÔM NAY (${today}):
- Đã ăn: ${actualCalories} / ${calorieGoal} kcal (còn ${caloriesLeft} kcal)
- Protein: ${adherence?.protein_actual ?? 0}g / ${adherence?.protein_goal ?? plan?.daily_protein_g ?? 0}g
- Carbs: ${adherence?.carbs_actual ?? 0}g / ${adherence?.carbs_goal ?? plan?.daily_carbs_g ?? 0}g
- Fat: ${adherence?.fat_actual ?? 0}g / ${adherence?.fat_goal ?? plan?.daily_fat_g ?? 0}g
- On track: ${adherence?.is_on_track ? 'CÓ ✅' : 'CHƯA ❌'}
- Điểm hôm nay: ${adherence?.adherence_score ?? 0}/100

CÁC BỮA ĂN HÔM NAY:
${todayMeals?.map(m => `- ${m.food_name}: ${m.calories} kcal (P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join('\n') || '- Chưa có bữa nào'}

THÔNG TIN CÁ NHÂN:
- Mục tiêu: ${profile?.goal ?? 'chưa set'}
- Cân nặng: ${profile?.weight_kg ?? '?'}kg → mục tiêu ${profile?.target_weight_kg ?? '?'}kg
- Streak: ${profile?.journey_streak ?? 0} ngày
${plan ? `- Plan: ${plan.daily_calories} kcal, ${plan.daily_protein_g}g protein, tập ${plan.weekly_workouts}x/tuần` : ''}

BẠN CÓ THỂ THỰC HIỆN CÁC HÀNH ĐỘNG bằng cách thêm vào CUỐI response:
[ACTION:LOG_MEAL:{"foodName":"Phở bò","calories":400,"protein":25,"carbs":45,"fat":8}]
[ACTION:UPDATE_GOAL:{"daily_calorie_goal":1800}]

QUY TẮC:
- Luôn xác nhận trước khi thực hiện hành động xóa dữ liệu
- Ngắn gọn, thân thiện, khuyến khích
- Dùng tiếng Việt nếu user viết tiếng Việt
- Ước tính macro theo suất ăn Việt Nam điển hình khi log food
- Đưa lời khuyên cụ thể dựa trên dữ liệu thực của user`

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Build parts
    const parts: any[] = []
    if (message) parts.push({ text: message })
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
    }

    // Build chat history
    const chatHistory = (history ?? []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'System context: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Đã hiểu! Tôi sẵn sàng hỗ trợ bạn.' }] },
        ...chatHistory,
      ],
    })

    const result = await chat.sendMessage(parts)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Assistant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
