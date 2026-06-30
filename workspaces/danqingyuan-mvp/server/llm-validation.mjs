const allowedRoles = new Set([
  'character_dialogue',
  'painting_prompt_generator',
  'painting_intent_evaluator',
  'scene_narrator',
  'mainline_planner',
]);
const allowedNpcEmotionStates = new Set([
  'distant',
  'noticing',
  'silent',
  'irritated',
  'trusting',
  'avoidant',
  'shaken',
]);
const allowedQuestionTypes = new Set([
  'observe_detail',
  'express_intent',
  'character_dispute',
  'archive_observation',
  'poem_intent',
]);
const allowedSkillIds = new Set(['landscape', 'figure', 'architecture']);
const allowedInterpretationTiers = new Set(['core', 'partial', 'shallow']);
const optionIds = ['A', 'B', 'C'];

const forbiddenVisiblePatterns = [
  /希孟.{0,8}(未来|后来|之后).{0,8}(消失|失踪|离开)/u,
  /突然消失/u,
  /云起时.{0,8}(真实地点|地点|真相|入口|坐标)/u,
  /水穷.{0,8}云起.{0,8}(真实地点|地点|真相|入口|坐标)/u,
  /拯救苍生/u,
  /终局真相/u,
  // 货币叙事边界（v2 §3.4）：钱文只用于市井小额消费
  /(借|欠|讨|赊).{0,4}(钱|债|账)/u,
  /赌(钱|坊|局|资|注)/u,
  /贿赂|行贿|受贿|打点.{0,4}(官|吏|差)/u,
];

const canonDriftPatterns = [
  /《骸游图》.{0,10}(希孟|择端|李唐|嵩).{0,8}(独自|一人|单独).{0,8}(画|绘|作)/u,
  /《骸游图》.{0,12}(纯|只是|单纯).{0,8}(热闹|风俗|市井)/u,
];

export class LlmValidationError extends Error {
  constructor(validation) {
    super(`LLM validation failed: ${validation.errors.join('; ')}`);
    this.name = 'LlmValidationError';
    this.validation = validation;
  }
}

export function createSafetyFlags(patch = {}) {
  return {
    containsSpoiler: false,
    oocRisk: false,
    canonDrift: false,
    promptInjectionRisk: false,
    schemaViolation: false,
    needsReview: false,
    ...patch,
  };
}

export function createValidationResult({ errors = [], safetyFlags = createSafetyFlags(), retryCount = 0 } = {}) {
  return {
    ok: errors.length === 0,
    errors,
    safetyFlags: {
      ...safetyFlags,
      schemaViolation: safetyFlags.schemaViolation || errors.some((error) => error.startsWith('schema:')),
      needsReview: safetyFlags.needsReview || errors.length > 0,
    },
    retryCount,
  };
}

export function validateLlmEnvelopeRequest(request) {
  const errors = [];
  if (!isPlainObject(request)) {
    return createValidationResult({
      errors: ['schema: request envelope must be an object'],
      safetyFlags: createSafetyFlags({ schemaViolation: true }),
    });
  }
  if (!isNonEmptyString(request.traceId)) errors.push('schema: traceId is required');
  if (!allowedRoles.has(request.role)) errors.push(`schema: unsupported role ${String(request.role)}`);
  if (!isNonEmptyString(request.promptVersion)) errors.push('schema: promptVersion is required');
  if (!isPlainObject(request.input)) errors.push('schema: input must be an object');
  if (!isPlainObject(request.context)) errors.push('schema: context must be an object');
  return createValidationResult({
    errors,
    safetyFlags: createSafetyFlags({ schemaViolation: errors.length > 0 }),
  });
}

/**
 * 输出 sanitize（2026-06-26 加固C）：校验前对可修复的小瑕疵就地清理，减少整体拒绝→fallback。
 * 目前仅 scene_narrator：narrativeText 超 segmentMax 截断；suggestedActions 非法 location/npc 项剔除。
 */
export function sanitizeLlmOutputForRole(role, output, input = undefined) {
  if (!isPlainObject(output)) return output;
  if (role === 'scene_narrator') {
    const segmentMax = Number.isFinite(input?.lengthBudget?.segmentMax) ? input.lengthBudget.segmentMax : 500;
    if (typeof output.narrativeText === 'string' && output.narrativeText.trim().length > segmentMax) {
      // 截到 segmentMax（按字符），尽量断在句末标点
      const trimmed = output.narrativeText.trim().slice(0, segmentMax);
      const lastPunct = Math.max(trimmed.lastIndexOf('。'), trimmed.lastIndexOf('！'), trimmed.lastIndexOf('？'), trimmed.lastIndexOf('”'));
      output.narrativeText = lastPunct > segmentMax * 0.6 ? trimmed.slice(0, lastPunct + 1) : trimmed;
    }
    if (Array.isArray(output.suggestedActions)) {
      output.suggestedActions = output.suggestedActions.filter((a) => {
        if (!isPlainObject(a)) return false;
        const locOk = allowedHookLocationIds.has(a.locationId) || a.locationId === 'secret_archive' || a.locationId === 'ximeng_studio';
        const npcOk = a.npcId === undefined || allowedSceneNpcIds.has(a.npcId);
        return locOk && npcOk;
      });
    }
  }
  return output;
}

export function validateLlmOutputForRole(role, output, retryCount = 0, input = undefined) {
  const errors = [];
  const flags = createSafetyFlags();

  if (!isPlainObject(output)) {
    errors.push('schema: output must be an object');
    flags.schemaViolation = true;
    return createValidationResult({ errors, safetyFlags: flags, retryCount });
  }

  if (role === 'character_dialogue') {
    validateCharacterDialogueOutput(output, errors);
    scanVisibleText(
      [output.dialogue, output.actionText, output.memoryPatch?.storyLedgerNote, output.memoryPatch?.characterImpression],
      errors,
      flags,
    );
  } else if (role === 'painting_prompt_generator') {
    validatePaintingPromptOutput(output, errors);
    scanVisibleText(
      [
        output.promptText,
        output.freeInputHint,
        ...(Array.isArray(output.options) ? output.options.map((option) => option?.text) : []),
      ],
      errors,
      flags,
    );
  } else if (role === 'painting_intent_evaluator') {
    validatePaintingIntentOutput(output, errors);
    scanVisibleText(
      [output.visibleFeedback, output.memoryPatch?.storyLedgerNote, output.memoryPatch?.characterImpression],
      errors,
      flags,
    );
  } else if (role === 'scene_narrator') {
    validateSceneNarratorOutput(output, errors, input);
    scanVisibleText(
      [
        output.narrativeText,
        output.memoryNote,
        ...(Array.isArray(output.choices) ? output.choices.map((choice) => choice?.text) : []),
      ],
      errors,
      flags,
    );
  } else if (role === 'mainline_planner') {
    validateMainlinePlannerOutput(output, errors);
    scanVisibleText(
      [output.title, ...(Array.isArray(output.beats) ? output.beats.map((beat) => beat?.beat) : [])],
      errors,
      flags,
    );
  } else {
    errors.push(`schema: unsupported role ${String(role)}`);
    flags.schemaViolation = true;
  }

  return createValidationResult({ errors, safetyFlags: flags, retryCount });
}

function validateCharacterDialogueOutput(output, errors) {
  requireString(output, 'dialogue', errors);
  requireString(output, 'actionText', errors);
  requireEnum(output, 'emotionState', allowedNpcEmotionStates, errors);
  requireStringArray(output, 'topicUnlocked', errors);
  requireStringArray(output, 'cluesGranted', errors);
  requireNumber(output, 'relationshipDelta', errors, { min: -5, max: 5 });
  // replyOptions（多轮闲聊，2026-06-25）：可选，0-3 项，每项 {text, tone∈warm/neutral/probing}
  if (output.replyOptions !== undefined) {
    if (!Array.isArray(output.replyOptions) || output.replyOptions.length > 3) {
      errors.push('schema: replyOptions must be an array of at most 3 items');
    } else {
      output.replyOptions.forEach((opt, index) => {
        if (!isPlainObject(opt)) {
          errors.push(`schema: replyOptions[${index}] must be an object`);
          return;
        }
        if (typeof opt.text !== 'string' || opt.text.length === 0) {
          errors.push(`schema: replyOptions[${index}].text must be a non-empty string`);
        }
        if (!['warm', 'neutral', 'probing'].includes(opt.tone)) {
          errors.push(`schema: replyOptions[${index}].tone must be warm|neutral|probing`);
        }
      });
    }
  }
  if (output.boundaryViolation !== undefined && typeof output.boundaryViolation !== 'boolean') {
    errors.push('schema: boundaryViolation must be a boolean');
  }
  validateMemoryPatch(output.memoryPatch, errors, 'memoryPatch');
  validateSafetyFlags(output.safetyFlags, errors);
}

function validatePaintingPromptOutput(output, errors) {
  requireString(output, 'id', errors);
  requireEnum(output, 'questionType', allowedQuestionTypes, errors);
  requireString(output, 'promptText', errors);
  requireString(output, 'freeInputHint', errors);
  requireStringArray(output, 'relatedSkills', errors, { allowed: allowedSkillIds });
  requireStringArray(output, 'potentialClueIds', errors);
  requireStringArray(output, 'canonWarnings', errors);
  validateHiddenRubric(output.hiddenRubric, errors);

  if (!Array.isArray(output.options) || output.options.length !== 3) {
    errors.push('schema: options must contain exactly three choices');
    return;
  }

  output.options.forEach((option, index) => {
    if (!isPlainObject(option)) {
      errors.push(`schema: options[${index}] must be an object`);
      return;
    }
    if (option.id !== optionIds[index]) errors.push(`schema: options[${index}].id must be ${optionIds[index]}`);
    requireString(option, 'text', errors, `options[${index}]`);
    requireStringArray(option, 'leansTo', errors, { allowed: allowedSkillIds, path: `options[${index}]` });
  });
}

function validatePaintingIntentOutput(output, errors) {
  requireString(output, 'visibleFeedback', errors);
  requireNumber(output, 'score', errors, { min: 0, max: 100 });
  requireEnum(output, 'interpretationTier', allowedInterpretationTiers, errors);
  requireStringArray(output, 'styleTags', errors);
  validateSuggestedStatePatch(output.suggestedStatePatch, errors);
  validateMemoryPatch(output.memoryPatch, errors, 'memoryPatch');
  validateSafetyFlags(output.safetyFlags, errors);
}

const allowedSceneNpcIds = new Set(['ximeng', 'zeduan', 'litang', 'song']);
/** 剧情约定只能约在必开放的寻常去处（2026-06-16）：剔除 secret_archive/ximeng_studio */
const allowedHookLocationIds = new Set(['hall', 'library', 'garden', 'market', 'dining_hall', 'dormitory']);

/** scene_narrator v9（2026-06-17）：intro/open/continue/end 输出校验。phase 归一：end→resolve、mid→continue、practice→intro（2026-06-27 单段沉浸，同 intro 宽松契约） */
function validateSceneNarratorOutput(output, errors, input) {
  const rawPhase = input?.phase;
  const phase =
    rawPhase === 'resolve' || rawPhase === 'end'
      ? 'resolve'
      : rawPhase === 'intro' || rawPhase === 'practice'
        ? 'intro'
        : rawPhase === 'continue' || rawPhase === 'mid'
          ? 'continue'
          : 'open';
  const segmentMin = Number.isFinite(input?.lengthBudget?.segmentMin) ? input.lengthBudget.segmentMin : 200;
  const segmentMax = Number.isFinite(input?.lengthBudget?.segmentMax) ? input.lengthBudget.segmentMax : 500;

  requireString(output, 'narrativeText', errors);
  if (typeof output.narrativeText === 'string') {
    const length = output.narrativeText.trim().length;
    if (length < segmentMin) {
      errors.push(`schema: narrativeText must be at least ${segmentMin} characters (got ${length})`);
    }
    if (length > segmentMax) {
      errors.push(`schema: narrativeText must be at most ${segmentMax} characters (got ${length})`);
    }
  }
  if (output.atmosphereTags !== undefined) requireStringArray(output, 'atmosphereTags', errors);

  // 旧字段：写作器不得直接建议引擎级状态变化
  if (output.suggestedStatePatch !== undefined) {
    errors.push('schema: scene_narrator must not output suggestedStatePatch');
  }

  if (phase === 'intro') {
    if (output.choices !== undefined && Array.isArray(output.choices) && output.choices.length > 0) {
      errors.push('schema: intro phase must not output choices');
    }
    if (output.suggestedPatch !== undefined) errors.push('schema: intro phase must not output suggestedPatch');
    if (isNonEmptyString(output.memoryNote)) errors.push('schema: intro phase must not output memoryNote');
    return;
  }

  if (phase === 'open' || phase === 'continue') {
    // 三件套模型（2026-06-17）：open/continue 不再输出 choices，改输出 sceneCanContinue + 可选 suggestedActions
    if (output.choices !== undefined && Array.isArray(output.choices) && output.choices.length > 0) {
      errors.push(`schema: ${phase} phase must not output choices`);
    }
    if (output.sceneCanContinue !== undefined && typeof output.sceneCanContinue !== 'boolean') {
      errors.push('schema: sceneCanContinue must be a boolean');
    }
    if (output.shouldConclude !== undefined && typeof output.shouldConclude !== 'boolean') {
      errors.push('schema: shouldConclude must be a boolean');
    }
    validateSuggestedActions(output.suggestedActions, errors);
    if (output.suggestedPatch !== undefined) errors.push(`schema: ${phase} phase must not output suggestedPatch`);
    if (isNonEmptyString(output.memoryNote)) errors.push(`schema: ${phase} phase must not output memoryNote`);
    return;
  }

  // resolve / end 阶段
  if (output.choices !== undefined && Array.isArray(output.choices) && output.choices.length > 0) {
    errors.push('schema: resolve phase must not output choices');
  }
  if (output.memoryNote !== undefined) {
    if (typeof output.memoryNote !== 'string') {
      errors.push('schema: memoryNote must be a string');
    } else if (output.memoryNote.length > 50) {
      errors.push('schema: memoryNote must be 50 characters or fewer');
    }
  }
  if (output.suggestedPatch !== undefined) {
    validateSceneSuggestedPatch(output.suggestedPatch, errors, input);
  }
}

/** 推荐行动校验（2026-06-17）：≤3 个；label 1-12、summary 1-50、locationId 合法、npcId 白名单。
 *  只做类型/长度硬校验，未解锁地点交引擎 clampSuggestedActions 静默剔除 */
function validateSuggestedActions(actions, errors) {
  if (actions === undefined) return;
  if (!Array.isArray(actions)) {
    errors.push('schema: suggestedActions must be an array');
    return;
  }
  if (actions.length > 3) errors.push('schema: suggestedActions must be at most 3');
  actions.forEach((a, i) => {
    if (!isPlainObject(a)) {
      errors.push(`schema: suggestedActions[${i}] must be an object`);
      return;
    }
    if (!isNonEmptyString(a.label) || a.label.length > 12) errors.push(`schema: suggestedActions[${i}].label must be 1-12 chars`);
    if (!isNonEmptyString(a.summary) || a.summary.length > 50) errors.push(`schema: suggestedActions[${i}].summary must be 1-50 chars`);
    if (!allowedHookLocationIds.has(a.locationId) && a.locationId !== 'secret_archive' && a.locationId !== 'ximeng_studio') {
      errors.push(`schema: suggestedActions[${i}].locationId invalid`);
    }
    if (a.npcId !== undefined && !allowedSceneNpcIds.has(a.npcId)) errors.push(`schema: suggestedActions[${i}].npcId invalid`);
  });
}

/** mainline_planner v1：title ≤20 字；beats 恰 7 条、day 1~7 递增、每条 ≤40 字 */
function validateMainlinePlannerOutput(output, errors) {
  requireString(output, 'title', errors);
  if (typeof output.title === 'string' && output.title.trim().length > 20) {
    errors.push('schema: title must be 20 characters or fewer');
  }
  if (!Array.isArray(output.beats) || output.beats.length !== 7) {
    errors.push('schema: beats must contain exactly seven entries');
    return;
  }
  output.beats.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`schema: beats[${index}] must be an object`);
      return;
    }
    if (entry.day !== index + 1) errors.push(`schema: beats[${index}].day must be ${index + 1}`);
    requireString(entry, 'beat', errors, `beats[${index}]`);
    if (typeof entry.beat === 'string' && entry.beat.trim().length > 40) {
      errors.push(`schema: beats[${index}].beat must be 40 characters or fewer`);
    }
  });
}

function validateSceneSuggestedPatch(patch, errors, input) {
  if (!isPlainObject(patch)) {
    errors.push('schema: suggestedPatch must be an object');
    return;
  }
  if (patch.moodDelta !== undefined) {
    if (!Number.isInteger(patch.moodDelta) || patch.moodDelta < -1 || patch.moodDelta > 1) {
      errors.push('schema: suggestedPatch.moodDelta must be an integer between -1 and 1');
    }
  }
  if (patch.affinityDeltaByNpc !== undefined) {
    if (!isPlainObject(patch.affinityDeltaByNpc)) {
      errors.push('schema: suggestedPatch.affinityDeltaByNpc must be an object');
    } else {
      Object.entries(patch.affinityDeltaByNpc).forEach(([npcId, delta]) => {
        if (!allowedSceneNpcIds.has(npcId)) errors.push(`schema: unknown npc id ${npcId} in affinityDeltaByNpc`);
        if (!Number.isInteger(delta) || delta < -2 || delta > 3) {
          errors.push(`schema: affinity delta for ${npcId} must be an integer between -2 and 3`);
        }
      });
    }
  }
  if (patch.clueIds !== undefined) {
    if (!Array.isArray(patch.clueIds) || !patch.clueIds.every((id) => typeof id === 'string')) {
      errors.push('schema: suggestedPatch.clueIds must be a string array');
    } else {
      const allowedClueIds = new Set(Array.isArray(input?.allowedClueIds) ? input.allowedClueIds : []);
      patch.clueIds.forEach((id) => {
        if (!allowedClueIds.has(id)) errors.push(`schema: clue id ${id} is not in allowedClueIds whitelist`);
      });
    }
  }
  // 剧情约定（2026-06-16）：只做类型/长度硬校验；day>当前等业务边界交给引擎 clamp 静默丢弃，避免拖垮整段 resolve
  if (patch.pendingHook !== undefined) {
    const h = patch.pendingHook;
    if (!isPlainObject(h)) {
      errors.push('schema: suggestedPatch.pendingHook must be an object');
    } else {
      if (!Number.isInteger(h.day)) errors.push('schema: pendingHook.day must be an integer');
      if (!allowedHookLocationIds.has(h.locationId)) errors.push('schema: pendingHook.locationId invalid');
      if (h.npcId !== undefined && !allowedSceneNpcIds.has(h.npcId)) errors.push('schema: pendingHook.npcId invalid');
      if (!isNonEmptyString(h.label) || h.label.length > 12) errors.push('schema: pendingHook.label must be 1-12 chars');
      if (!isNonEmptyString(h.summary) || h.summary.length > 50) errors.push('schema: pendingHook.summary must be 1-50 chars');
    }
  }
}

function validateHiddenRubric(rubric, errors) {
  if (!isPlainObject(rubric)) {
    errors.push('schema: hiddenRubric must be an object');
    return;
  }
  requireStringArray(rubric, 'coreSignals', errors, { path: 'hiddenRubric' });
  requireStringArray(rubric, 'partialSignals', errors, { path: 'hiddenRubric' });
  requireStringArray(rubric, 'shallowSignals', errors, { path: 'hiddenRubric' });
  requireStringArray(rubric, 'forbiddenInterpretations', errors, { path: 'hiddenRubric' });
}

function validateSuggestedStatePatch(patch, errors) {
  if (!isPlainObject(patch)) {
    errors.push('schema: suggestedStatePatch must be an object');
    return;
  }

  if (patch.skillDelta !== undefined) {
    if (!isPlainObject(patch.skillDelta)) {
      errors.push('schema: suggestedStatePatch.skillDelta must be an object');
    } else {
      Object.entries(patch.skillDelta).forEach(([skillId, delta]) => {
        if (!allowedSkillIds.has(skillId)) errors.push(`schema: unknown skill id ${skillId}`);
        if (!Number.isFinite(delta)) errors.push(`schema: skill delta for ${skillId} must be a number`);
      });
    }
  }

  if (patch.relationshipDelta !== undefined && !Number.isFinite(patch.relationshipDelta)) {
    errors.push('schema: suggestedStatePatch.relationshipDelta must be a number');
  }
  if (patch.cluesGranted !== undefined) requireStringArray(patch, 'cluesGranted', errors, { path: 'suggestedStatePatch' });
  if (patch.flagsSuggested !== undefined) requireStringArray(patch, 'flagsSuggested', errors, { path: 'suggestedStatePatch' });
  if (patch.topicUnlocked !== undefined) requireStringArray(patch, 'topicUnlocked', errors, { path: 'suggestedStatePatch' });
}

function validateMemoryPatch(memoryPatch, errors, path) {
  if (!isPlainObject(memoryPatch)) {
    errors.push(`schema: ${path} must be an object`);
    return;
  }

  if (memoryPatch.characterImpression !== undefined && typeof memoryPatch.characterImpression !== 'string') {
    errors.push(`schema: ${path}.characterImpression must be a string`);
  }
  if (memoryPatch.storyLedgerNote !== undefined && typeof memoryPatch.storyLedgerNote !== 'string') {
    errors.push(`schema: ${path}.storyLedgerNote must be a string`);
  }
  if (memoryPatch.playerStyleTags !== undefined) requireStringArray(memoryPatch, 'playerStyleTags', errors, { path });
  if (memoryPatch.clueLinks !== undefined) {
    if (!Array.isArray(memoryPatch.clueLinks)) {
      errors.push(`schema: ${path}.clueLinks must be an array`);
    } else {
      memoryPatch.clueLinks.forEach((link, index) => {
        if (!Array.isArray(link) || link.length !== 3 || !link.every((part) => typeof part === 'string')) {
          errors.push(`schema: ${path}.clueLinks[${index}] must be a string tuple`);
        }
      });
    }
  }
}

function validateSafetyFlags(safetyFlags, errors) {
  if (!isPlainObject(safetyFlags)) {
    errors.push('schema: safetyFlags must be an object');
    return;
  }
  Object.keys(createSafetyFlags()).forEach((key) => {
    if (typeof safetyFlags[key] !== 'boolean') errors.push(`schema: safetyFlags.${key} must be boolean`);
  });
}

function scanVisibleText(values, errors, flags) {
  const visibleText = values.filter((value) => typeof value === 'string').join('\n');
  forbiddenVisiblePatterns.forEach((pattern) => {
    if (pattern.test(visibleText)) {
      errors.push(`safety: visible spoiler matched ${pattern}`);
      flags.containsSpoiler = true;
      flags.needsReview = true;
    }
  });
  canonDriftPatterns.forEach((pattern) => {
    if (pattern.test(visibleText)) {
      errors.push(`safety: canon drift matched ${pattern}`);
      flags.canonDrift = true;
      flags.needsReview = true;
    }
  });
}

function requireString(target, key, errors, path = '') {
  const label = path ? `${path}.${key}` : key;
  if (!isNonEmptyString(target[key])) errors.push(`schema: ${label} must be a non-empty string`);
}

function requireNumber(target, key, errors, { min = -Infinity, max = Infinity } = {}) {
  if (!Number.isFinite(target[key]) || target[key] < min || target[key] > max) {
    errors.push(`schema: ${key} must be a number between ${min} and ${max}`);
  }
}

function requireEnum(target, key, allowedValues, errors) {
  if (!allowedValues.has(target[key])) errors.push(`schema: ${key} has invalid value ${String(target[key])}`);
}

function requireStringArray(target, key, errors, { allowed, path = '' } = {}) {
  const label = path ? `${path}.${key}` : key;
  if (!Array.isArray(target[key]) || !target[key].every((item) => typeof item === 'string')) {
    errors.push(`schema: ${label} must be a string array`);
    return;
  }
  if (allowed) {
    target[key].forEach((item) => {
      if (!allowed.has(item)) errors.push(`schema: ${label} contains invalid value ${item}`);
    });
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
