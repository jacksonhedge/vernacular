import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deductCredits, checkBillingStatus } from '@/lib/credits';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELS: Record<string, string> = {
  'haiku-3': 'claude-3-haiku-20240307',
  'haiku-4.5': 'claude-haiku-4-5-20251001',
  'sonnet-4.5': 'claude-sonnet-4-5',
  'sonnet-4.6': 'claude-sonnet-4-6',
  'opus-4.5': 'claude-opus-4-5',
  'opus-4.6': 'claude-opus-4-6',
  // Legacy aliases
  'haiku': 'claude-haiku-4-5-20251001',
  'sonnet': 'claude-sonnet-4-6',
  'opus': 'claude-opus-4-6',
};

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorized();

    const { messages, model, systemPrompt, organizationId } = await request.json();

    // Prevent cross-org usage: if client passed an org id, it must match the user's org
    if (organizationId && organizationId !== authUser.org_id) return forbidden();
    const orgId = authUser.org_id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured', errorCode: 'anthropic_not_configured' }, { status: 503 });
    }

    // Pre-flight: block the call if the org is out of Vernacular credits / subscription is canceled
    const supabasePre = createServiceClient();
    const billing = await checkBillingStatus(supabasePre, orgId);
    if (!billing.allowed) {
      return NextResponse.json({
        error: billing.reason === 'subscription_canceled' ? 'Your Vernacular subscription is canceled.' : 'Your Vernacular demo has expired. Upgrade to continue using Craig.',
        errorCode: 'vernacular_credits',
        reason: billing.reason,
      }, { status: 402 });
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
      const msg = err.error?.message || '';
      const type = err.error?.type || '';
      // Detect Anthropic billing / rate-limit failures so the client can show a clear message
      const isAnthropicCreditIssue =
        claudeRes.status === 402 ||
        /credit balance is too low|insufficient_quota|billing/i.test(msg) ||
        type === 'insufficient_quota';
      const isRateLimited = claudeRes.status === 429 || type === 'rate_limit_error';
      if (isAnthropicCreditIssue) {
        return NextResponse.json({
          error: 'Vernacular is temporarily out of Claude API credits. Please contact support.',
          errorCode: 'anthropic_credits',
          upstream: msg,
        }, { status: 402 });
      }
      if (isRateLimited) {
        return NextResponse.json({
          error: 'Craig is being rate-limited by Claude. Try again in a moment.',
          errorCode: 'anthropic_rate_limit',
          upstream: msg,
        }, { status: 429 });
      }
      return NextResponse.json({
        error: msg || 'AI request failed',
        errorCode: 'anthropic_error',
      }, { status: 500 });
    }

    const data = await claudeRes.json();
    const content = data.content?.[0]?.text || '';
    const usage = data.usage || {};
    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    const modelKey = model || 'sonnet-4.6';
    const family = modelKey.split('-')[0];
    const tokenCosts: Record<string, number> = { haiku: 0.001, sonnet: 0.006, opus: 0.030 };
    const costPerK = tokenCosts[family] ?? 0.006;

    // Track usage + deduct credits
    const supabase = createServiceClient();
    await supabase.from('ai_usage').insert({
      model: modelKey,
      tokens_input: usage.input_tokens || 0,
      tokens_output: usage.output_tokens || 0,
      tokens_total: totalTokens,
      cost_estimate: (totalTokens / 1000) * costPerK,
      action: 'ai_chat',
      organization_id: orgId,
    });

    // Deduct credits for AI chat usage
    await deductCredits(
      supabase, orgId, 'ai_chat',
      `Craig (${modelKey}, ${totalTokens} tokens)`,
    );

    return NextResponse.json({
      content,
      model: selectedModel,
      tokensUsed: totalTokens,
      costEstimate: (totalTokens / 1000) * costPerK,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Internal error',
    }, { status: 500 });
  }
}
