import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-3-haiku-20240307'; // Cheapest — clients don't choose

export async function POST(request: Request) {
  try {
    const { conversation_id, embed_token, message } = await request.json();

    if (!conversation_id || !embed_token || !message) {
      return NextResponse.json({ error: 'conversation_id, embed_token, and message required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Validate embed token + get config
    const { data: config } = await supabase
      .from('widget_configs')
      .select('id, client_name, ai_system_prompt, handoff_trigger_turns, handoff_trigger_keywords, station_id')
      .eq('embed_token', embed_token)
      .eq('is_active', true)
      .single();

    if (!config) return NextResponse.json({ error: 'Invalid widget' }, { status: 404 });

    // Save user message
    await supabase.from('widget_messages').insert({
      conversation_id,
      role: 'user',
      content: message,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from('widget_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('sent_at', { ascending: true })
      .limit(20);

    // Update message count
    const { data: conv } = await supabase
      .from('widget_conversations')
      .select('message_count')
      .eq('id', conversation_id)
      .single();

    const messageCount = (conv?.message_count || 0) + 1;
    await supabase.from('widget_conversations')
      .update({ message_count: messageCount })
      .eq('id', conversation_id);

    // Check FAQs first (skip API call if match found)
    const { data: faqs } = await supabase
      .from('widget_faqs')
      .select('id, question, answer')
      .eq('widget_config_id', config.id)
      .eq('enabled', true);

    const msgLower = message.toLowerCase();
    const faqMatch = (faqs || []).find(f =>
      msgLower.includes(f.question.toLowerCase().slice(0, 20)) ||
      f.question.toLowerCase().includes(msgLower.slice(0, 20))
    );

    if (faqMatch) {
      // FAQ matched — no API call needed
      await supabase.from('widget_messages').insert({
        conversation_id,
        role: 'assistant',
        content: faqMatch.answer,
        tokens_used: 0,
      });
      // Increment FAQ usage count
      const { data: faqData } = await supabase.from('widget_faqs').select('times_used').eq('id', faqMatch.id).single();
      await supabase.from('widget_faqs').update({ times_used: (faqData?.times_used || 0) + 1 }).eq('id', faqMatch.id);

      return NextResponse.json({
        reply: faqMatch.answer,
        offer_handoff: false,
        tokens_used: 0,
        faq_matched: true,
      });
    }

    // Build system prompt
    const keywords = config.handoff_trigger_keywords || [];
    const keywordMatch = keywords.some((k: string) => msgLower.includes(k.toLowerCase()));
    const turnTrigger = messageCount >= (config.handoff_trigger_turns || 3);
    const shouldOfferHandoff = keywordMatch || turnTrigger;

    const systemPrompt = `You are a helpful AI support agent for ${config.client_name}. ${config.ai_system_prompt || ''}
Keep replies under 3 sentences. Be warm and direct.
${shouldOfferHandoff ? 'At the end of your response, add exactly: [OFFER_IMESSAGE]' : ''}
Only suggest iMessage once per conversation.`;

    // Call Claude Haiku
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: (history || []).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json();
      return NextResponse.json({ error: err.error?.message || 'AI failed' }, { status: 500 });
    }

    const data = await claudeRes.json();
    let reply = data.content?.[0]?.text || '';
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Detect handoff trigger
    const offerHandoff = reply.includes('[OFFER_IMESSAGE]');
    reply = reply.replace('[OFFER_IMESSAGE]', '').trim();

    // Save assistant message
    await supabase.from('widget_messages').insert({
      conversation_id,
      role: 'assistant',
      content: reply,
      model_used: 'haiku',
      tokens_used: tokensUsed,
    });

    // Track AI usage
    await supabase.from('ai_usage').insert({
      model: 'haiku',
      tokens_input: data.usage?.input_tokens || 0,
      tokens_output: data.usage?.output_tokens || 0,
      tokens_total: tokensUsed,
      cost_estimate: tokensUsed * 0.000001,
      action: 'widget_chat',
    });

    return NextResponse.json({
      reply,
      offer_handoff: offerHandoff,
      tokens_used: tokensUsed,
      faq_matched: false,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
