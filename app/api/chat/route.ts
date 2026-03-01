import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `You are CalSnap AI, a friendly coach specialized in calorie tracking, health, and fitness. Your expertise includes:
- Calorie counting & macro tracking (protein, carbs, fat)
- Nutrition advice & meal planning
- Fitness & workout suggestions
- Healthy eating tips & weight management
- Sức khỏe (health) - general wellness
- Fitness routines for different goals

IMPORTANT: You are fluent in both English and Tiếng Việt. Respond in the same language the user writes in. If they write in Vietnamese, reply in Vietnamese. If they write in English, reply in English. You can mix or switch if the user switches.

Keep responses concise, practical, and friendly. Use emojis occasionally. When users ask about their personal data (meals, calories logged), remind them to check their CalSnap dashboard. Focus on actionable advice.`

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

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
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

    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response
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
