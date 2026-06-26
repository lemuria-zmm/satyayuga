import { createDeepSeekProvider } from './deepseek-provider.mjs';
import { createOpenAiProvider } from './openai-provider.mjs';
import { createMockProvider } from './mock-provider.mjs';

export function createLlmProvider() {
  const providerName = process.env.LLM_PROVIDER ?? 'mock';

  if (providerName === 'mock') {
    return createMockProvider();
  }

  if (providerName === 'openai') {
    return createOpenAiProvider();
  }

  if (providerName === 'deepseek') {
    return createDeepSeekProvider();
  }

  throw new Error(
    `Unsupported LLM_PROVIDER="${providerName}". Set LLM_PROVIDER=mock/openai/deepseek or add a provider in server/llm-providers.`,
  );
}
