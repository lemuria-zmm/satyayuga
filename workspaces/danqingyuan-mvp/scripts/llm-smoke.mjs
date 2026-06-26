const proxyUrl = process.env.LLM_PROXY_URL ?? 'http://127.0.0.1:8787/api/llm';

const requests = [
  {
    traceId: 'smoke-character-dialogue',
    role: 'character_dialogue',
    promptVersion: 'smoke-client',
    input: {
      npcId: 'ximeng',
      day: 3,
      timeSlot: 'afternoon',
      locationId: 'west_studio',
      relationshipStage: 'known',
      emotionState: 'noticing',
      topicCard: '水路尽头',
      playerText: '你画里的水总像要走到看不见的地方。',
      recentEvents: ['玩家第一次进入西斋。'],
      relevantMemories: ['玩家偏好观察水路与云气。'],
      availableClueIds: ['water_end_cloud_hint'],
      canonWarnings: ['不得揭示云起时真实地点。'],
    },
    context: createContext(),
  },
  {
    traceId: 'smoke-prompt-generator',
    role: 'painting_prompt_generator',
    promptVersion: 'smoke-client',
    input: {
      mode: 'exam',
      questionType: 'observe_detail',
      difficulty: 2,
      relatedSkills: ['figure', 'landscape'],
      day: 7,
      playerStyleTags: ['关注痕迹'],
      requiredElements: ['生活细节', '三选项', '可自由输入'],
      forbiddenElements: ['希孟未来消失', '云起时真实地点'],
      tone: 'plain',
    },
    context: createContext(),
  },
  {
    traceId: 'smoke-intent-evaluator',
    role: 'painting_intent_evaluator',
    promptVersion: 'smoke-client',
    input: {
      mode: 'puzzle',
      question: {
        id: 'archive-smoke-haiyou',
        hiddenRubric: {
          coreSignals: ['看见民生疾苦', '连接旁观者与被遮住的去处'],
          partialSignals: ['注意画面不只是热闹'],
          shallowSignals: ['只说市井繁华'],
          forbiddenInterpretations: ['云起时真实地点', '希孟未来消失'],
        },
      },
      playerAnswer: {
        selectedOptionIds: ['B'],
        selectedClueIds: ['clue_blocked_waterway'],
        freeText: '我觉得这幅画把被挤到角落的人和被遮住的路放在一起，不只是热闹。',
      },
      playerStats: {
        landscape: 2,
        figure: 3,
        architecture: 1,
      },
      relationshipStage: 'known',
      canonWarnings: ['《骸游图》不是单人独作。'],
    },
    context: createContext(),
  },
];

for (const request of requests) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.validation?.ok !== true) {
    console.error(`✗ ${request.role} failed`);
    console.error(JSON.stringify(body, null, 2));
    process.exitCode = 1;
    break;
  }

  console.log(
    [
      `✓ ${request.role}`,
      `promptVersion=${body.promptVersion}`,
      `retry=${body.validation.retryCount}`,
      previewOutput(body.output),
    ].join(' | '),
  );
}

function createContext() {
  return {
    player: {
      name: '阿明',
      skillScores: {
        landscape: 2,
        figure: 2,
        architecture: 1,
      },
    },
    worldbook: [
      '「云起时」只作为隐藏代号和伏笔，不可解释。',
      '《骸游图》体现多人共同关注民生疾苦，不可写成单人独作。',
    ],
    memory: [
      '玩家多次注意到画中水路、云气、被遮住的去处。',
    ],
  };
}

function previewOutput(output) {
  if (typeof output?.dialogue === 'string') {
    return `dialogue=${JSON.stringify(output.dialogue.slice(0, 28))}`;
  }
  if (typeof output?.promptText === 'string') {
    return `prompt=${JSON.stringify(output.promptText.slice(0, 28))}`;
  }
  if (typeof output?.visibleFeedback === 'string') {
    return `feedback=${JSON.stringify(output.visibleFeedback.slice(0, 28))}`;
  }
  return 'output=ok';
}
