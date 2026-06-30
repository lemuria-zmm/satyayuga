import type { GuardrailCheckResult } from './types';

const spoilerPatterns = ['希孟未来会消失', '希孟是被', '四人共创', '四位先生共同', '进献警戒', '终局真相'];

export function validateLlmOutput(output: unknown): GuardrailCheckResult {
  const serialized = JSON.stringify(output);
  const blockedReasons = spoilerPatterns.filter((pattern) => serialized.includes(pattern));

  return {
    ok: blockedReasons.length === 0,
    safetyFlags: {
      containsSpoiler: blockedReasons.length > 0,
      oocRisk: false,
      canonDrift: false,
      promptInjectionRisk: false,
      schemaViolation: output === null || typeof output !== 'object',
      needsReview: blockedReasons.length > 0,
    },
    blockedReasons,
    sanitizedOutput: blockedReasons.length === 0 ? output : undefined,
  };
}

