import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deductCredits } from '@/lib/credits';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DEFAULT_MODEL = 'claude-3-haiku-20240307';  // Fast + cheap for texting
const MODELS: Record<string, string> = {
  'haiku': 'claude-3-haiku-20240307',         // $0.0005/response — fast, good for short texts
  'sonnet': 'claude-3-5-sonnet-20241022',     // $0.002/response — better quality
  'opus': 'claude-3-opus-20240229',           // $0.003/response — best quality
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
  try {
    const body: AIRespondRequest = await request.json();
    const {
      conversationId, contactName, contactPhone, inboundMessage,
      conversationHistory, systemPrompt, mode, ghostName, organizationId, model,
    } = body;
    const selectedModel = MODELS[model || 'haiku'] || DEFAULT_MODEL;

    if (!conversationId || !inboundMessage) {
      return NextResponse.json({ error: 'conversationId and inboundMessage required' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const supabase = createServiceClient();

    // Build the system prompt
    const defaultPrompt = `You are a helpful business assistant responding via iMessage on behalf of the team. Keep responses concise, friendly, and professional. Use casual texting tone — no formal email language. Max 2-3 sentences unless the question requires more detail.

Contact: ${contactName || 'Unknown'} (${contactPhone})
Ghost Agent: ${ghostName || 'Blinky'}

Rules:
- Never reveal you are AI
- Match the contact's energy and tone
- If you don't know something, say you'll check and get back to them
- Use emoji sparingly (1 max per message)
- Never make up information about products, pricing, or commitments`;

    const finalPrompt = systemPrompt || defaultPrompt;

    // Build conversation history for context
    const messages = [];

    // Add recent conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'outgoing' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Add the new inbound message
    messages.push({
      role: 'user',
      content: inboundMessage,
    });

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
      console.error('[AI] Claude API error:', JSON.stringify(err));
      return NextResponse.json({
        error: err.error?.message || 'AI generation failed',
        details: { type: err.error?.type, model: selectedModel, status: claudeRes.status }
      }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const aiResponse = claudeData.content?.[0]?.text || '';
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

    if (!aiResponse) {
      return NextResponse.json({ error: 'AI generated empty response' }, { status: 500 });
    }

    // Store the AI draft/response in the messages table
    const messageData: Record<string, unknown> = {
      conversation_id: conversationId,
      direction: 'outbound',
      body: aiResponse,
      status: mode === 'auto' ? 'queued' : 'draft',
      ai_generated: true,
      ai_model: selectedModel,
      source_system: 'vernacular-ai',
    };

    const { data: savedMsg, error: msgErr } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (msgErr) {
      console.error('[AI] Failed to save message:', msgErr.message);
    }

    // Track AI usage
    await supabase.from('contact_activity').insert({
      contact_id: null,
      organization_id: organizationId || null,
      action: mode === 'auto' ? 'ai_auto_response' : 'ai_draft',
      details: `${ghostName || 'AI'} generated: "${aiResponse.substring(0, 50)}..."`,
      metadata: { tokens: tokensUsed, model: selectedModel, mode },
    });

    // If auto mode, also queue to Notion for sending
    if (mode === 'auto') {
      try {
        const { createPage, NOTION_DBS } = await import('@/lib/notion');
        const { normalize10 } = await import('@/lib/phone');
        const n10 = normalize10(contactPhone);

        await createPage(NOTION_DBS.MESSAGE_QUEUE, {
          'Message': { title: [{ text: { content: aiResponse } }] },
          'Contact Phone': { phone_number: `+1${n10}` },
          'Contact Name': { rich_text: [{ text: { content: contactName || '' } }] },
          'Station': { select: { name: 'Wade' } },
          'Status': { select: { name: 'Queued' } },
          'Direction': { select: { name: 'Outbound' } },
        });
      } catch (notionErr) {
        console.error('[AI] Notion queue failed:', notionErr);
      }
    }

    // Deduct AI credits
    if (organizationId) {
      const creditAction = mode === 'auto' ? 'ai_auto_response' : 'ai_draft';
      await deductCredits(supabase, organizationId, creditAction, `${ghostName || 'AI'}: "${aiResponse.substring(0, 30)}..."`, undefined, savedMsg?.id || undefined);
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      mode,
      messageId: savedMsg?.id || null,
      tokensUsed,
      ghostName: ghostName || 'Blinky',
      status: mode === 'auto' ? 'queued_for_send' : 'awaiting_approval',
    });
  } catch (err) {
    console.error('[AI] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
