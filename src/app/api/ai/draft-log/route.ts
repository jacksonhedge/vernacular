import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deductCredits } from '@/lib/credits';

// POST /api/ai/draft-log — Log AI draft outcome (approved/edited/rejected)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      organizationId, conversationId, contactId, contactPhone,
      aiDraft, finalMessage, action, // 'approved', 'edited', 'rejected', 'auto_sent'
      rejectionReason, tags, wasGood,
      inboundMessage, conversationGoal, personaName,
      modelUsed, tokensUsed, systemPrompt,
    } = body;

    if (!aiDraft || !action) {
      return NextResponse.json({ error: 'aiDraft and action required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Calculate edit distance if edited
    let editDistance = 0;
    if (action === 'edited' && finalMessage) {
      editDistance = Math.abs(aiDraft.length - finalMessage.length) +
        [...aiDraft].filter((c, i) => finalMessage[i] !== c).length;
    }

    // Log the draft outcome
    await supabase.from('ai_draft_history').insert({
      organization_id: organizationId || null,
      conversation_id: conversationId || null,
      contact_id: contactId || null,
      contact_phone: contactPhone || null,
      ai_draft: aiDraft,
      model_used: modelUsed || 'haiku',
      tokens_used: tokensUsed || 0,
      system_prompt_used: systemPrompt || null,
      action,
      final_message: finalMessage || (action === 'approved' ? aiDraft : null),
      edit_distance: editDistance,
      was_good: wasGood ?? (action === 'approved'),
      rejection_reason: rejectionReason || null,
      tags: tags || [],
      inbound_message: inboundMessage || null,
      conversation_goal: conversationGoal || null,
      persona_name: personaName || null,
    });

    // Charge $0.01 if AI message was actually sent
    if ((action === 'approved' || action === 'auto_sent') && organizationId) {
      await deductCredits(supabase, organizationId, 'ai_response_sent',
        `AI ${action}: "${(finalMessage || aiDraft).substring(0, 40)}..."`);
    }

    return NextResponse.json({ success: true, action, editDistance });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// GET /api/ai/draft-log?orgId=xxx — Get draft history with learning stats
export async function GET(request: NextRequest) {
  try {
    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();

    // Get recent drafts
    const { data: drafts } = await supabase
      .from('ai_draft_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate stats
    const all = drafts || [];
    const approved = all.filter(d => d.action === 'approved').length;
    const edited = all.filter(d => d.action === 'edited').length;
    const rejected = all.filter(d => d.action === 'rejected').length;
    const autoSent = all.filter(d => d.action === 'auto_sent').length;
    const total = all.length;

    const approvalRate = total > 0 ? Math.round(((approved + autoSent) / total) * 100) : 0;
    const editRate = total > 0 ? Math.round((edited / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const avgEditDistance = edited > 0
      ? Math.round(all.filter(d => d.action === 'edited').reduce((s, d) => s + (d.edit_distance || 0), 0) / edited)
      : 0;

    // Common rejection reasons
    const rejectionReasons: Record<string, number> = {};
    all.filter(d => d.rejection_reason).forEach(d => {
      rejectionReasons[d.rejection_reason] = (rejectionReasons[d.rejection_reason] || 0) + 1;
    });

    // Common tags
    const tagCounts: Record<string, number> = {};
    all.forEach(d => {
      (d.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    return NextResponse.json({
      stats: {
        total, approved, edited, rejected, autoSent,
        approvalRate, editRate, rejectionRate,
        avgEditDistance,
        rejectionReasons,
        tagCounts,
      },
      recentDrafts: all.slice(0, 20).map(d => ({
        id: d.id,
        aiDraft: d.ai_draft?.substring(0, 100),
        finalMessage: d.final_message?.substring(0, 100),
        action: d.action,
        wasGood: d.was_good,
        tags: d.tags,
        personaName: d.persona_name,
        editDistance: d.edit_distance,
        createdAt: d.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
