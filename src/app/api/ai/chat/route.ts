import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELS: Record<string, string> = {
  'haiku': 'claude-3-haiku-20240307',
  'sonnet': 'claude-sonnet-4-6',
  'opus': 'claude-opus-4-6',
};

export async function POST(request: Request) {
  try {
    const { messages, model, systemPrompt } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const selectedModel = MODELS[model || 'sonnet'] || MODELS['sonnet'];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1024,
        system: systemPrompt || 'You are a helpful AI assistant. Be concise and helpful.',
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json();
      return NextResponse.json({
        error: err.error?.message || 'AI request failed',
      }, { status: 500 });
    }

    const data = await claudeRes.json();
    const content = data.content?.[0]?.text || '';
    const usage = data.usage || {};

    return NextResponse.json({
      content,
      model: selectedModel,
      tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Internal error',
    }, { status: 500 });
  }
}
