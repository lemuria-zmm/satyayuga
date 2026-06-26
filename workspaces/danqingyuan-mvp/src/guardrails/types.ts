import type { SafetyFlags } from '../types';

export interface GuardrailCheckResult {
  ok: boolean;
  safetyFlags: SafetyFlags;
  blockedReasons: string[];
  sanitizedOutput?: unknown;
}

