import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// POST /api/ai/analyze-tone — Analyze outbound messages to build a tone profile
export async function POST(request: Request) {
  try {
    const { organizationId, contactPhone, limit: msgLimit } = await request.json();

    const supabase = createServiceClient();

    // Get outbound messages (what the user actually writes)
    let query = supabase
      .from('messages')
      .select('message, contact_phone')
      .eq('direction', 'Outbound')
      .not('source_system', 'eq', 'vernacular-ai') // exclude AI-written messages
      .order('created_at', { ascending: false })
      .limit(msgLimit || 50);

    if (contactPhone) {
      query = query.ilike('contact_phone', `%${contactPhone.replace(/\D/g, '').slice(-4)}%`);
    }

    const { data: messages } = await query;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No outbound messages found to analyze' }, { status: 404 });
    }

    // Send to Claude for analysis
    const messageTexts = messages.map(m => m.message).filter(Boolean).join('\n---\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `You are a writing style analyst. Analyze the following outbound text messages sent by a business professional. Create a detailed tone profile that an AI could use to mimic their writing style.

Output a JSON object with these fields:
{
  "summary": "2-3 sentence summary of their writing style",
  "formality": 1-5 (1=very casual, 5=very formal),
  "warmth": 1-5 (1=cold/transactional, 5=very warm/friendly),
  "verbosity": 1-5 (1=extremely brief, 5=detailed),
  "emoji_usage": "none|rare|moderate|frequent",
  "greeting_style": "how they typically open messages",
  "closing_style": "how they typically end messages",
  "vocabulary": ["list of characteristic words/phrases they use often"],
  "patterns": ["specific patterns like 'always asks a question', 'uses exclamation marks'"],
  "avoid": ["things they never do in messages"],
  "example_prompt": "A system prompt paragraph that captures their exact tone for AI to follow",
  "sample_messages": ["3 example messages that perfectly capture their style"]
}

Only output valid JSON, no markdown.`,
        messages: [{ role: 'user', content: `Analyze these ${messages.length} outbound messages:\n\n${messageTexts}` }],
      }),
    });

    if (!claudeRes.ok) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    const data = await claudeRes.json();
    const analysisText = data.content?.[0]?.text || '';

    // Try to parse as JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // If not valid JSON, return raw text
      analysis = { summary: analysisText, raw: true };
    }

    // Save the analysis as org knowledge
    if (organizationId && analysis.example_prompt) {
      await supabase.from('org_knowledge').upsert({
        organization_id: organizationId,
        title: 'Tone Profile — Auto-Generated',
        content: `## Writing Style Analysis (based on ${messages.length} messages)\n\n${analysis.summary}\n\n### System Prompt for AI:\n${analysis.example_prompt}\n\n### Vocabulary:\n${(analysis.vocabulary || []).join(', ')}\n\n### Patterns:\n${(analysis.patterns || []).map((p: string) => `- ${p}`).join('\n')}\n\n### Avoid:\n${(analysis.avoid || []).map((a: string) => `- ${a}`).join('\n')}`,
        category: 'tone',
      }, { onConflict: 'id' });
    }

    // Track AI usage
    await supabase.from('ai_usage').insert({
      organization_id: organizationId || null,
      model: 'haiku',
      tokens_input: data.usage?.input_tokens || 0,
      tokens_output: data.usage?.output_tokens || 0,
      tokens_total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      cost_estimate: ((data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)) * 0.000001,
      action: 'tone_analysis',
    });

    return NextResponse.json({
      analysis,
      messagesAnalyzed: messages.length,
      saved: !!organizationId,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
