import { MiniMaxMessage, MiniMaxTool, MiniMaxStreamingEvent } from '../types.js';

interface MiniMaxClientConfig {
  apiKey: string;
  baseUrl: string;
}

interface MiniMaxStreamResponse {
  fullContent: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
}

export class MiniMaxClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: MiniMaxClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async createMessage(
    systemPrompt: string,
    messages: MiniMaxMessage[],
    tools: MiniMaxTool[],
    onToken: (token: string) => void
  ): Promise<MiniMaxStreamResponse> {
    const url = `${this.baseUrl}/anthropic/v1/messages`;

    const payload = {
      model: 'MiniMax-M2.7',
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages,
      tools,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from MiniMax API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    let currentToolCall: { name: string; input: string } | null = null;
    let toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('event: ') && !line.startsWith('data: ')) continue;

        const [prefix, data] = line.split(': ');
        if (prefix === 'data' && data && data !== '[DONE]') {
          try {
            const event: MiniMaxStreamingEvent = JSON.parse(data);

            if (event.type === 'content_block_delta') {
              if (event.delta?.text) {
                fullContent += event.delta.text;
                onToken(event.delta.text);
              }
              if (event.delta?.partial_json) {
                if (currentToolCall) {
                  currentToolCall.input += event.delta.partial_json;
                } else {
                  currentToolCall = { name: '', input: event.delta.partial_json };
                }
              }
            }

            if (event.type === 'content_block_start') {
              if (event.content_block?.type === 'tool_use') {
                currentToolCall = { name: event.content_block.name || '', input: '' };
              }
            }

            if (event.type === 'content_block_stop') {
              if (currentToolCall && currentToolCall.name) {
                try {
                  toolCalls.push({
                    name: currentToolCall.name,
                    input: JSON.parse(currentToolCall.input),
                  });
                } catch {
                  // Ignore parse errors for partial tool calls
                }
                currentToolCall = null;
              }
            }

            if (event.type === 'message_delta' && event.usage) {
              usage = {
                inputTokens: event.usage.input_tokens,
                outputTokens: event.usage.output_tokens,
              };
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ') && buffer.slice(6).trim() !== '[DONE]') {
      try {
        const event: MiniMaxStreamingEvent = JSON.parse(buffer.slice(6));
        if (event.delta?.text) {
          fullContent += event.delta.text;
          onToken(event.delta.text);
        }
      } catch {
        // Skip malformed JSON
      }
    }

    return {
      fullContent,
      usage,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}

export function createMiniMaxClient(apiKey: string, baseUrl: string): MiniMaxClient {
  return new MiniMaxClient({ apiKey, baseUrl });
}
