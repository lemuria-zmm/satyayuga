import type { GuardrailCheckResult } from './types';

const spoilerPatterns = ['希孟未来会消失', '云起时是真实地点', '拯救苍生之秘', '终局真相'];

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

