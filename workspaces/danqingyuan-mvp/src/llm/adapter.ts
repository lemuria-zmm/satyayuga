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

export interface LlmAdapter {
  generateCharacterDialogue(
    request: LlmRequestEnvelope<CharacterDialogueInput>,
  ): Promise<LlmResponseEnvelope<CharacterDialogueOutput>>;

  generatePaintingPrompt(
    request: LlmRequestEnvelope<PaintingPromptGeneratorInput>,
  ): Promise<LlmResponseEnvelope<PaintingPromptGeneratorOutput>>;

  evaluatePaintingIntent(
    request: LlmRequestEnvelope<PaintingIntentEvaluatorInput>,
  ): Promise<LlmResponseEnvelope<PaintingIntentEvaluatorOutput>>;

  narrateScene(
    request: LlmRequestEnvelope<SceneNarratorInput>,
  ): Promise<LlmResponseEnvelope<SceneNarratorOutput>>;

  planMainline(
    request: LlmRequestEnvelope<MainlinePlannerInput>,
  ): Promise<LlmResponseEnvelope<MainlinePlannerOutput>>;
}

