import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deductCredits } from '@/lib/credits';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const MODELS: Record<string, string> = {
  'haiku': 'claude-3-haiku-20240307',
  'sonnet': 'claude-sonnet-4-6',
  'opus': 'claude-opus-4-6',
};

// Cost per 1K tokens (input + output combined estimate)
const TOKEN_COSTS: Record<string, number> = {
  'haiku': 0.001,    // ~$0.001 per 1K tokens
  'sonnet': 0.006,   // ~$0.006 per 1K tokens
  'opus': 0.030,     // ~$0.030 per 1K tokens
};

interface AIRespondRequest {
  conversationId: string;
  contactName: string;
  contactPhone: string;
  inboundMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  mode: 'draft' | 'auto';
  ghostName?: string;
  organizationId?: string;
  model?: 'haiku' | 'sonnet' | 'opus';
}

export async function POST(request: Request) {
  // AI auto-respond is FULLY DISABLED — re-enable when ready for production
  return NextResponse.json({ ok: false, error: 'AI auto-respond is disabled' }, { status: 503 });

  try {
    const body: AIRespondRequest = await request.json();
    const {
      conversationId, contactName, contactPhone, inboundMessage,
      conversationHistory, systemPrompt, mode, ghostName, organizationId, model,
    } = body;
    const modelKey = model || 'haiku';
    const selectedModel = MODELS[modelKey] || DEFAULT_MODEL;

    if (!conversationId || !inboundMessage) {
      return NextResponse.json({ error: 'conversationId and inboundMessage required' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const supabase = createServiceClient();

    // Fetch conversation goal + AI settings
    const { data: conv } = await supabase
      .from('conversations')
      .select('goal, ai_system_prompt, ai_ghost_name')
      .eq('id', conversationId)
      .single();

    const conversationGoal = conv?.goal || '';

    // Build the system prompt with goal context
    const defaultPrompt = `You are a VIP relationship manager responding via iMessage. Keep responses concise, friendly, and professional. Use casual texting tone. Max 2-3 sentences.

Contact: ${contactName || 'Unknown'} (${contactPhone})
Agent: ${ghostName || conv?.ai_ghost_name || 'Blinky'}
${conversationGoal ? `\nCONVERSATION GOAL: ${conversationGoal}\nYour responses should work toward achieving this goal. Be strategic but natural.` : ''}

Rules:
- Never reveal you are AI
- Match the contact's energy and tone
- If you don't know something, say you'll check and get back to them
- Use emoji sparingly (1 max per message)
- Never make up information about products, pricing, or commitments
- Stay focused on the conversation goal if one is set`;

    const finalPrompt = systemPrompt || conv?.ai_system_prompt || defaultPrompt;

    // Build conversation history
    const messages = [];
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'outgoing' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }
    messages.push({ role: 'user', content: inboundMessage });

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 256,
        system: finalPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json();
      return NextResponse.json({
        error: err.error?.message || 'AI generation failed',
        details: { type: err.error?.type, model: selectedModel, status: claudeRes.status }
      }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const aiResponse = claudeData.content?.[0]?.text || '';
    const inputTokens = claudeData.usage?.input_tokens || 0;
    const outputTokens = claudeData.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    if (!aiResponse) {
      return NextResponse.json({ error: 'AI generated empty response' }, { status: 500 });
    }

    // Store the AI draft/response
    const { data: savedMsg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        message: aiResponse,
        contact_phone: contactPhone,
        direction: 'Outbound',
        station: 'Wade',
        status: mode === 'auto' ? 'Queued' : 'Draft',
        source_system: 'vernacular-ai',
      })
      .select('id')
      .single();

    if (msgErr) {
      console.error('[AI] Failed to save message:', msgErr.message);
    }

    // Track token usage in ai_usage table
    await supabase.from('ai_usage').insert({
      organization_id: organizationId || null,
      conversation_id: conversationId,
      model: modelKey,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      tokens_total: totalTokens,
      cost_estimate: (totalTokens / 1000) * (TOKEN_COSTS[modelKey] || 0.001),
      action: mode === 'auto' ? 'ai_auto_response' : 'ai_draft',
    });

    // Also track in contact_activity
    await supabase.from('contact_activity').insert({
      contact_id: null,
      organization_id: organizationId || null,
      action: mode === 'auto' ? 'ai_auto_response' : 'ai_draft',
      details: `${ghostName || 'AI'}: "${aiResponse.substring(0, 50)}..."`,
      metadata: {
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        tokens_total: totalTokens,
        model: modelKey,
        model_id: selectedModel,
        cost_estimate: (totalTokens / 1000) * (TOKEN_COSTS[modelKey] || 0.001),
        conversation_id: conversationId,
        goal: conversationGoal || null,
        mode,
      },
    });

    // If auto mode, queue to outbound_queue
    if (mode === 'auto') {
      try {
        const { normalize10 } = await import('@/lib/phone');
        const n10 = normalize10(contactPhone);

        await supabase.from('outbound_queue').insert({
          station_name: 'Wade',
          contact_phone: `+1${n10}`,
          contact_name: contactName || null,
          message: aiResponse,
          source_system: 'vernacular-ai',
          ai_generated: true,
        });
      } catch (queueErr) {
        console.error('[AI] Outbound queue failed:', queueErr);
      }
    }

    // Deduct credits with token info
    if (organizationId) {
      const creditAction = mode === 'auto' ? 'ai_auto_response' : 'ai_draft';
      await deductCredits(
        supabase, organizationId, creditAction,
        `${ghostName || 'AI'} (${modelKey}, ${totalTokens} tokens): "${aiResponse.substring(0, 30)}..."`,
        undefined, savedMsg?.id || undefined
      );
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      mode,
      messageId: savedMsg?.id || null,
      tokensUsed: totalTokens,
      tokenBreakdown: { input: inputTokens, output: outputTokens },
      costEstimate: (totalTokens / 1000) * (TOKEN_COSTS[modelKey] || 0.001),
      model: modelKey,
      ghostName: ghostName || 'Blinky',
      goal: conversationGoal || null,
      status: mode === 'auto' ? 'queued_for_send' : 'awaiting_approval',
    });
  } catch (err) {
    console.error('[AI] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
