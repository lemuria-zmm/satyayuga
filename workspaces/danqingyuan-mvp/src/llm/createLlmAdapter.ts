import type { LlmAdapter } from './adapter';
import { MockLlmAdapter } from './mockAdapter';
import { ProxyLlmAdapter } from './proxyAdapter';

export function createLlmAdapter(): LlmAdapter {
  if (import.meta.env.VITE_LLM_ADAPTER === 'proxy') {
    return new ProxyLlmAdapter();
  }

  return new MockLlmAdapter();
}
