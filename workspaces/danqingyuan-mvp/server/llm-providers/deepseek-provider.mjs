export function createDeepSeekProvider() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const endpoint = `${baseUrl.replace(/\/$/u, '')}/chat/completions`;
  const maxTokens = Number(process.env.DEEPSEEK_MAX_TOKENS ?? 1400);
  const thinking = process.env.DEEPSEEK_THINKING ?? 'disabled';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek.');
  }

  return {
    name: 'deepseek',
    async generate(request, promptBundle, retryContext) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          createChatCompletionsPayload({
            model,
            request,
            promptBundle,
            retryContext,
            maxTokens,
            thinking,
          }),
        ),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`DeepSeek provider request failed: ${response.status} ${formatProviderError(body)}`);
      }

      return parseJsonOutput(extractMessageContent(body));
    },
  };
}

function createChatCompletionsPayload({ model, request, promptBundle, retryContext, maxTokens, thinking }) {
  return {
    model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(promptBundle, retryContext),
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            traceId: request.traceId,
            role: request.role,
            promptVersion: request.promptVersion,
            input: request.input,
            context: request.context,
          },
          null,
          2,
        ),
      },
    ],
    response_format: { type: 'json_object' },
    thinking: { type: thinking },
    max_tokens: maxTokens,
  };
}

function buildSystemPrompt(promptBundle, retryContext) {
  const repairInstruction =
    retryContext.retryCount > 0
      ? [
          '',
          '## 上一次输出未通过代理校验',
          `retryCount: ${retryContext.retryCount}`,
          `errors: ${retryContext.previousValidation.errors.join('; ')}`,
          '请只修复这些问题。必须输出一个可被 JSON.parse 解析的 JSON 对象，不要输出 Markdown。',
        ].join('\n')
      : '';

  return [
    promptBundle.systemPrompt,
    '',
    '重要：最终回复必须是纯 JSON 对象；不要使用 Markdown 代码块，不要添加解释文字。',
    repairInstruction,
  ].join('\n');
}

function extractMessageContent(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek provider response did not contain message content.');
  }

  return content;
}

function parseJsonOutput(text) {
  const normalized = stripJsonFence(text);
  try {
    return JSON.parse(normalized);
  } catch (firstError) {
    // 修复常见 DeepSeek JSON 破损后重试（2026-06-26 加固B）：最典型是把英文引号写成全角 “ ”
    const repaired = repairJsonQuotes(normalized);
    if (repaired !== normalized) {
      try {
        return JSON.parse(repaired);
      } catch {
        // 修复仍失败，抛原始错误（交由 proxy 重试循环）
      }
    }
    throw new Error(`DeepSeek provider returned non-JSON output: ${firstError.message}`);
  }
}

/**
 * 修复 JSON 里处于"结构位置"的全角引号（2026-06-26）：
 * LLM 常把字符串分隔的英文 " 写成全角 “ ”，导致 JSON.parse 失败。
 * 仅替换出现在 结构符(:[{,) 后 或 结构符(]},) 前 的全角引号为英文引号——
 * 字符串内容里的全角引号（真正的中文引号）不在结构位，不会被误伤。
 */
function repairJsonQuotes(text) {
  return text
    // 结构符后紧跟的全角开引号 → 英文引号：  : “   [ “   , “   { “
    .replace(/([:[{,]\s*)[“”]/gu, '$1"')
    // 全角闭引号紧跟结构符 → 英文引号：  ” :   ” ,   ” ]   ” }
    .replace(/[“”](\s*[:,\]}])/gu, '"$1');
}

function stripJsonFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/iu, '')
    .replace(/^```\s*/u, '')
    .replace(/\s*```$/u, '')
    .trim();
}

function formatProviderError(body) {
  if (typeof body?.error?.message === 'string') {
    return body.error.message;
  }
  if (typeof body === 'string') {
    return body;
  }
  return 'Unknown provider error.';
}
