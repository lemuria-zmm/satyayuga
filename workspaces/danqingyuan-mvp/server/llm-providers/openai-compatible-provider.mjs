/**
 * 通用 OpenAI 兼容 chat provider（2026-07-11 BYOK 玩家自带 key）。
 * deepseek / 智谱GLM / Kimi / MiniMax 均为 OpenAI 兼容 /chat/completions 接口，用 {baseUrl,apiKey,model} 参数化一套覆盖。
 * 每次请求由玩家配置临时构建；apiKey 只过内存转发，不落库、不写日志。
 */

/** 三家厂商预设（玩家可覆盖 model；2026-07-12 明明更新模型名） */
export const BYOK_PRESETS = {
  deepseek: { label: 'DeepSeek 深度求索', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash' },
  glm: { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.6' },
  kimi: { label: 'Kimi 月之暗面', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-128k' },
};

/** 单请求超时（毫秒）：防某家 API 挂起导致"一直没有响应"，超时后抛明确错误可重试。 */
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? 90000);

/** 按玩家配置 {provider, apiKey, model?, baseUrl?} 建一个一次性 provider */
export function createProviderFromClientConfig(cfg) {
  const preset = cfg && BYOK_PRESETS[cfg.provider];
  if (!preset) {
    throw new Error(`不支持的厂商："${cfg?.provider}"（可选 deepseek / glm / kimi）。`);
  }
  const apiKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
  if (!apiKey) {
    throw new Error('未填写 API Key，无法调用自定义 API。');
  }
  const baseUrl = (cfg.baseUrl || preset.baseUrl).replace(/\/$/u, '');
  const model = (typeof cfg.model === 'string' && cfg.model.trim()) || preset.model;
  const maxTokens = Number(process.env.LLM_MAX_TOKENS ?? 4096);
  const endpoint = `${baseUrl}/chat/completions`;

  return {
    name: `byok:${cfg.provider}`,
    async generate(request, promptBundle, retryContext) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload({ model, request, promptBundle, retryContext, maxTokens })),
          signal: controller.signal,
        });
      } catch (err) {
        if (err?.name === 'AbortError') {
          throw new Error(`自定义 API（${cfg.provider}）在 ${Math.round(REQUEST_TIMEOUT_MS / 1000)} 秒内无响应，请检查网络或模型名后重试。`);
        }
        throw new Error(`自定义 API（${cfg.provider}）连接失败：${err?.message ?? '网络错误'}`);
      } finally {
        clearTimeout(timer);
      }
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        // 不回显 key；只带厂商返回的错误信息
        throw new Error(`自定义 API（${cfg.provider}）调用失败：${response.status} ${formatProviderError(body)}`);
      }
      return parseJsonOutput(extractMessageContent(body));
    },
  };
}

function buildPayload({ model, request, promptBundle, retryContext, maxTokens }) {
  return {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(promptBundle, retryContext) },
      {
        role: 'user',
        content: JSON.stringify(
          { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, input: request.input, context: request.context },
          null,
          2,
        ),
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: maxTokens,
  };
}

function buildSystemPrompt(promptBundle, retryContext) {
  const repair =
    retryContext.retryCount > 0
      ? ['', '## 上一次输出未通过代理校验', `retryCount: ${retryContext.retryCount}`, `errors: ${retryContext.previousValidation.errors.join('; ')}`, '请只修复这些问题。必须输出可被 JSON.parse 解析的 JSON 对象，不要输出 Markdown。'].join('\n')
      : '';
  return [promptBundle.systemPrompt, '', '重要：最终回复必须是纯 JSON 对象；不要使用 Markdown 代码块，不要添加解释文字。', repair].join('\n');
}

function extractMessageContent(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('自定义 API 返回内容为空或格式异常。');
  }
  return content;
}

function parseJsonOutput(text) {
  const normalized = stripJsonFence(text);
  try {
    return JSON.parse(normalized);
  } catch (firstError) {
    const repaired = repairJsonQuotes(normalized);
    if (repaired !== normalized) {
      try {
        return JSON.parse(repaired);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`自定义 API 返回了非 JSON 输出：${firstError.message}`);
  }
}

function repairJsonQuotes(text) {
  return text.replace(/([:[{,]\s*)[“”]/gu, '$1"').replace(/[“”](\s*[:,\]}])/gu, '"$1');
}

function stripJsonFence(text) {
  return text.trim().replace(/^```json\s*/iu, '').replace(/^```\s*/u, '').replace(/\s*```$/u, '').trim();
}

function formatProviderError(body) {
  if (typeof body?.error?.message === 'string') return body.error.message;
  if (typeof body?.base_resp?.status_msg === 'string') return body.base_resp.status_msg; // MiniMax
  if (typeof body === 'string') return body;
  return '未知错误。';
}
