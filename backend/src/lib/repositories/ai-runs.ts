import { supabaseAdmin } from '../supabase.js';

export async function createAiRun(params: {
  organizationId: string;
  conversationId: string;
  requestedBy: string;
  model: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('ai_runs')
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      requested_by: params.requestedBy,
      provider: 'minimax',
      model: params.model,
      status: 'running',
    })
    .select('id, created_at')
    .single<{ id: string; created_at: string }>();

  if (error || !data) {
    throw new Error(`Failed to create AI run: ${error?.message || 'missing row'}`);
  }

  return {
    id: data.id,
    startedAt: new Date(data.created_at).getTime(),
  };
}

export async function completeAiRun(
  id: string,
  params: {
    promptTokens?: number;
    completionTokens?: number;
    toolCalls?: unknown[];
    startedAt: number;
  }
) {
  const { error } = await supabaseAdmin
    .from('ai_runs')
    .update({
      status: 'succeeded',
      prompt_tokens: params.promptTokens ?? null,
      completion_tokens: params.completionTokens ?? null,
      latency_ms: Date.now() - params.startedAt,
      tool_calls: params.toolCalls || [],
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to complete AI run: ${error.message}`);
  }
}

export async function failAiRun(id: string, startedAt: number, errorMessage: string) {
  const { error } = await supabaseAdmin
    .from('ai_runs')
    .update({
      status: 'failed',
      latency_ms: Date.now() - startedAt,
      error_message: errorMessage,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to fail AI run: ${error.message}`);
  }
}
