const responseSchemasByRole = {
  character_dialogue: {
    type: 'object',
    required: [
      'dialogue',
      'actionText',
      'emotionState',
      'topicUnlocked',
      'cluesGranted',
      'relationshipDelta',
      'memoryPatch',
      'safetyFlags',
    ],
    properties: {
      dialogue: { type: 'string' },
      actionText: { type: 'string' },
      emotionState: {
        type: 'string',
        enum: ['distant', 'noticing', 'silent', 'irritated', 'trusting', 'avoidant', 'shaken'],
      },
      topicUnlocked: { type: 'array', items: { type: 'string' } },
      cluesGranted: { type: 'array', items: { type: 'string' } },
      relationshipDelta: { type: 'number', minimum: -5, maximum: 5 },
      memoryPatch: { $ref: '#/$defs/memoryPatch' },
      safetyFlags: { $ref: '#/$defs/safetyFlags' },
    },
    $defs: sharedSchemaDefs(),
  },
  painting_prompt_generator: {
    type: 'object',
    required: [
      'id',
      'questionType',
      'promptText',
      'options',
      'freeInputHint',
      'hiddenRubric',
      'relatedSkills',
      'potentialClueIds',
      'canonWarnings',
    ],
    properties: {
      id: { type: 'string' },
      questionType: {
        type: 'string',
        enum: ['observe_detail', 'express_intent', 'character_dispute', 'archive_observation'],
      },
      promptText: { type: 'string' },
      options: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          required: ['id', 'text', 'leansTo'],
          properties: {
            id: { type: 'string', enum: ['A', 'B', 'C'] },
            text: { type: 'string' },
            leansTo: { type: 'array', items: { type: 'string', enum: ['landscape', 'figure', 'architecture'] } },
          },
          additionalProperties: false,
        },
      },
      freeInputHint: { type: 'string' },
      hiddenRubric: {
        type: 'object',
        required: ['coreSignals', 'partialSignals', 'shallowSignals', 'forbiddenInterpretations'],
        properties: {
          coreSignals: { type: 'array', items: { type: 'string' } },
          partialSignals: { type: 'array', items: { type: 'string' } },
          shallowSignals: { type: 'array', items: { type: 'string' } },
          forbiddenInterpretations: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
      relatedSkills: { type: 'array', items: { type: 'string', enum: ['landscape', 'figure', 'architecture'] } },
      potentialClueIds: { type: 'array', items: { type: 'string' } },
      canonWarnings: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
  painting_intent_evaluator: {
    type: 'object',
    required: [
      'visibleFeedback',
      'score',
      'interpretationTier',
      'styleTags',
      'suggestedStatePatch',
      'memoryPatch',
      'safetyFlags',
    ],
    properties: {
      visibleFeedback: { type: 'string' },
      score: { type: 'number', minimum: 0, maximum: 100 },
      interpretationTier: { type: 'string', enum: ['core', 'partial', 'shallow'] },
      styleTags: { type: 'array', items: { type: 'string' } },
      suggestedStatePatch: {
        type: 'object',
        properties: {
          skillDelta: {
            type: 'object',
            properties: {
              landscape: { type: 'number' },
              figure: { type: 'number' },
              architecture: { type: 'number' },
            },
            additionalProperties: false,
          },
          relationshipDelta: { type: 'number' },
          cluesGranted: { type: 'array', items: { type: 'string' } },
          flagsSuggested: { type: 'array', items: { type: 'string' } },
          topicUnlocked: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
      memoryPatch: { $ref: '#/$defs/memoryPatch' },
      safetyFlags: { $ref: '#/$defs/safetyFlags' },
    },
    additionalProperties: false,
    $defs: sharedSchemaDefs(),
  },
};

function sharedSchemaDefs() {
  return {
    memoryPatch: {
      type: 'object',
      properties: {
        characterImpression: { type: 'string' },
        playerStyleTags: { type: 'array', items: { type: 'string' } },
        storyLedgerNote: { type: 'string' },
        clueLinks: {
          type: 'array',
          items: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    safetyFlags: {
      type: 'object',
      required: [
        'containsSpoiler',
        'oocRisk',
        'canonDrift',
        'promptInjectionRisk',
        'schemaViolation',
        'needsReview',
      ],
      properties: {
        containsSpoiler: { type: 'boolean' },
        oocRisk: { type: 'boolean' },
        canonDrift: { type: 'boolean' },
        promptInjectionRisk: { type: 'boolean' },
        schemaViolation: { type: 'boolean' },
        needsReview: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  };
}

export function createOpenAiProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const endpoint = `${baseUrl.replace(/\/$/u, '')}/responses`;
  const maxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 1400);

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai.');
  }

  return {
    name: 'openai',
    async generate(request, promptBundle, retryContext) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          createResponsesApiPayload({
            model,
            request,
            promptBundle,
            retryContext,
            maxOutputTokens,
          }),
        ),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`OpenAI provider request failed: ${response.status} ${formatProviderError(body)}`);
      }

      return parseJsonOutput(extractOutputText(body));
    },
  };
}

function createResponsesApiPayload({ model, request, promptBundle, retryContext, maxOutputTokens }) {
  return {
    model,
    instructions: buildInstructions(promptBundle, retryContext),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify(
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
      },
    ],
    max_output_tokens: maxOutputTokens,
    text: {
      format: {
        type: 'json_schema',
        name: `${request.role}_output`,
        strict: false,
        schema: responseSchemasByRole[request.role],
      },
    },
  };
}

function buildInstructions(promptBundle, retryContext) {
  const repairInstruction =
    retryContext.retryCount > 0
      ? [
          '',
          '## 上一次输出未通过代理校验',
          `retryCount: ${retryContext.retryCount}`,
          `errors: ${retryContext.previousValidation.errors.join('; ')}`,
          '请只修复这些问题，仍然只输出符合 schema 的 JSON 对象。',
        ].join('\n')
      : '';

  return `${promptBundle.systemPrompt}${repairInstruction}`;
}

function extractOutputText(body) {
  if (typeof body?.output_text === 'string') {
    return body.output_text;
  }

  const textParts = [];
  if (Array.isArray(body?.output)) {
    body.output.forEach((item) => {
      if (Array.isArray(item?.content)) {
        item.content.forEach((contentItem) => {
          if (typeof contentItem?.text === 'string') {
            textParts.push(contentItem.text);
          }
        });
      }
    });
  }

  const text = textParts.join('\n').trim();
  if (!text) {
    throw new Error('OpenAI provider response did not contain output text.');
  }
  return text;
}

function parseJsonOutput(text) {
  const normalized = stripJsonFence(text);
  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`OpenAI provider returned non-JSON output: ${error.message}`);
  }
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
