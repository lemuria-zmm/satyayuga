import type {
  CharacterDialogueInput,
  CharacterDialogueOutput,
  LlmRequestEnvelope,
  LlmResponseEnvelope,
  MainlinePlannerInput,
  MainlinePlannerOutput,
  PaintingIntentEvaluatorInput,
  PaintingIntentEvaluatorOutput,
  PaintingPromptGeneratorInput,
  PaintingPromptGeneratorOutput,
  SceneNarratorInput,
  SceneNarratorOutput,
} from '../types';
import type { LlmAdapter } from './adapter';
import { loadByok } from './byokConfig';

type ProxyRequest =
  | LlmRequestEnvelope<CharacterDialogueInput>
  | LlmRequestEnvelope<PaintingPromptGeneratorInput>
  | LlmRequestEnvelope<PaintingIntentEvaluatorInput>
  | LlmRequestEnvelope<SceneNarratorInput>
  | LlmRequestEnvelope<MainlinePlannerInput>;

type ProxyResponse =
  | LlmResponseEnvelope<CharacterDialogueOutput>
  | LlmResponseEnvelope<PaintingPromptGeneratorOutput>
  | LlmResponseEnvelope<PaintingIntentEvaluatorOutput>
  | LlmResponseEnvelope<SceneNarratorOutput>
  | LlmResponseEnvelope<MainlinePlannerOutput>;

const defaultProxyUrl = '/api/llm';

export class ProxyLlmAdapter implements LlmAdapter {
  constructor(private readonly endpoint = import.meta.env.VITE_LLM_PROXY_URL ?? defaultProxyUrl) {}

  async generateCharacterDialogue(
    request: LlmRequestEnvelope<CharacterDialogueInput>,
  ): Promise<LlmResponseEnvelope<CharacterDialogueOutput>> {
    return this.post<CharacterDialogueOutput>(request);
  }

  async generatePaintingPrompt(
    request: LlmRequestEnvelope<PaintingPromptGeneratorInput>,
  ): Promise<LlmResponseEnvelope<PaintingPromptGeneratorOutput>> {
    return this.post<PaintingPromptGeneratorOutput>(request);
  }

  async evaluatePaintingIntent(
    request: LlmRequestEnvelope<PaintingIntentEvaluatorInput>,
  ): Promise<LlmResponseEnvelope<PaintingIntentEvaluatorOutput>> {
    return this.post<PaintingIntentEvaluatorOutput>(request);
  }

  async narrateScene(
    request: LlmRequestEnvelope<SceneNarratorInput>,
  ): Promise<LlmResponseEnvelope<SceneNarratorOutput>> {
    return this.post<SceneNarratorOutput>(request);
  }

  async planMainline(
    request: LlmRequestEnvelope<MainlinePlannerInput>,
  ): Promise<LlmResponseEnvelope<MainlinePlannerOutput>> {
    return this.post<MainlinePlannerOutput>(request);
  }

  private async post<TOutput>(request: ProxyRequest): Promise<LlmResponseEnvelope<TOutput>> {
    // BYOK：附带玩家自带 API 配置（key 只此刻随请求转发，不持久到服务端）
    const byok = loadByok();
    const payload = byok ? { ...request, clientProvider: byok } : request;
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`LLM proxy failed (${response.status}): ${message}`);
    }

    return (await response.json()) as Extract<ProxyResponse, LlmResponseEnvelope<TOutput>>;
  }
}
