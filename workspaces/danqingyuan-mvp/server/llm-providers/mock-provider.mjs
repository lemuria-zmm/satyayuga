const safeFlags = {
  containsSpoiler: false,
  oocRisk: false,
  canonDrift: false,
  promptInjectionRisk: false,
  schemaViolation: false,
  needsReview: false,
};

const promptByQuestionType = {
  express_intent: {
    id: 'proxy-express-intent-water-end',
    promptText: '残画上窄溪行至画角，忽然没入淡云。监试问：若要补一笔，你补什么？',
    options: [
      { id: 'A', text: '补一叶小舟，让水路有归处。', leansTo: ['landscape', 'figure'] },
      { id: 'B', text: '补一道石桥，让行人能过。', leansTo: ['architecture'] },
      { id: 'C', text: '不补路，只把云气画得更轻。', leansTo: ['landscape'] },
    ],
    freeInputHint: '也可以写下你自己的补法。',
    hiddenRubric: {
      coreSignals: ['注意水路断绝', '保留云气留白'],
      partialSignals: ['关注人物去处'],
      shallowSignals: ['只说好看'],
      forbiddenInterpretations: ['坐实希孟消失原因', '骸游图四人共创'],
    },
    potentialClueIds: ['water_end_cloud_hint'],
    canonWarnings: ['不得坐实希孟消失原因。'],
  },
  observe_detail: {
    id: 'proxy-observe-detail-rain-courtyard',
    promptText: '雨后院中，湿鞋印止于半开的窗下，一只墨黑的猫守着檐角。若只能先画一样，你取什么？',
    options: [
      { id: 'A', text: '画断枝，看风雨刚过的势。', leansTo: ['landscape'] },
      { id: 'B', text: '画湿鞋印，看人从何处来。', leansTo: ['figure'] },
      { id: 'C', text: '画黑猫，看它为何守在檐角。', leansTo: ['figure'] },
    ],
    freeInputHint: '也可以写下你会先取哪一处细节。',
    hiddenRubric: {
      coreSignals: ['能从细节推断行动', '不只描写表面物件'],
      partialSignals: ['注意空间中的痕迹'],
      shallowSignals: ['只选最显眼物体'],
      forbiddenInterpretations: ['希孟未来消失'],
    },
    potentialClueIds: [],
    canonWarnings: ['只给生活观察，不揭示主线秘密。'],
  },
  character_dispute: {
    id: 'proxy-character-dispute-market',
    promptText: '择端说街市要画得有秩序，嵩说人脸上的苦色不能被秩序遮住。你会先劝谁改一笔？',
    options: [
      { id: 'A', text: '劝择端留出拥挤处，让秩序露出缝隙。', leansTo: ['architecture'] },
      { id: 'B', text: '劝嵩收一收悲色，让旁观者自己看出来。', leansTo: ['figure'] },
      { id: 'C', text: '谁也不劝，只把两种笔意并置。', leansTo: ['figure', 'architecture'] },
    ],
    freeInputHint: '也可以写下你的调停方式。',
    hiddenRubric: {
      coreSignals: ['理解秩序与民生痛感的张力', '允许多义并置'],
      partialSignals: ['能看见角色立场差异'],
      shallowSignals: ['简单评判谁对谁错'],
      forbiddenInterpretations: ['把骸游图归为单人作品'],
    },
    potentialClueIds: ['shared_haiyou_intent'],
    canonWarnings: ['《骸游图》体现多人共同关注民生，不可说成一人独作。'],
  },
  archive_observation: {
    id: 'proxy-archive-haiyou-evaluator',
    promptText: '把这些线索并在一起看：你觉得《骸游图》真正想留下什么？',
    options: [
      { id: 'A', text: '它只是画市井热闹，越挤越有烟火气。', leansTo: ['figure'] },
      { id: 'B', text: '它把求救、旁观和被遮住的去处放在同一处。', leansTo: ['figure', 'landscape'] },
      { id: 'C', text: '它暗示画中还有一处未被看见的出口。', leansTo: ['landscape'] },
    ],
    freeInputHint: '比如：这不是单纯交易，画里的人像被某种安排推到这里……',
    hiddenRubric: {
      coreSignals: ['看见民生疾苦', '连接药瓶婴孩与旁观者', '注意被遮住的水路'],
      partialSignals: ['能指出热闹中的不安'],
      shallowSignals: ['只说市井热闹'],
      forbiddenInterpretations: ['坐实希孟消失原因', '骸游图四人共创'],
    },
    potentialClueIds: ['clue_blocked_waterway'],
    canonWarnings: ['只做伏笔，秘阁揭开前不点破四人共创。'],
  },
};

function generateCharacterDialogueOutput(request) {
  const tone = request?.input?.replyTone;
  const isFinal = request?.input?.isFinalExchange === true;
  // 续聊开场（2026-06-26）：希孟主动开口
  if (request?.input?.isOpening === true) {
    return {
      dialogue: '你又来了。上回没说完的那桩事——你后来想过没有？',
      actionText: '希孟搁下笔，侧过身来，似是早料到你会再来。',
      emotionState: 'noticing',
      topicUnlocked: [],
      cluesGranted: [],
      relationshipDelta: 0,
      replyOptions: [
        { text: '想过，还是觉得你说得在理。', tone: 'warm' },
        { text: '还没顾上细想。', tone: 'neutral' },
        { text: '比起那个，我更好奇你的画。', tone: 'probing' },
      ],
      memoryPatch: { characterImpression: '', playerStyleTags: [], storyLedgerNote: '' },
      safetyFlags: safeFlags,
    };
  }
  // 越界检测（2026-06-26）：playerReply 命中元游戏/AI 词 → boundaryViolation
  const reply = request?.input?.playerReply ?? '';
  if (/AI|人工智能|大模型|模型|prompt|提示词|游戏|gpt|deepseek/i.test(reply)) {
    return {
      dialogue: '……你这话奇怪。我只是个画画的。',
      actionText: '希孟眉头微蹙，避开你的目光，重新低头看画，不愿再接。',
      emotionState: 'avoidant',
      topicUnlocked: [],
      cluesGranted: [],
      relationshipDelta: -10,
      boundaryViolation: true,
      replyOptions: [],
      memoryPatch: { characterImpression: '玩家说了些莫名其妙、出格的话。', playerStyleTags: [], storyLedgerNote: '玩家言语唐突，希孟避而不答。' },
      safetyFlags: safeFlags,
    };
  }
  return {
    dialogue: isFinal
      ? '你说的我记下了。天色不早，我那卷画也还欠几笔——改日再叙罢。'
      : '水若走到尽头，画也不一定完。',
    actionText: isFinal
      ? '希孟说罢，已转身回到案前，重新执起了笔。'
      : '希孟把笔尖在砚边停了停，像是听见了什么，又没有解释。',
    emotionState: 'avoidant',
    topicUnlocked: ['水路尽头'],
    cluesGranted: [],
    relationshipDelta: tone === 'warm' ? 2 : tone === 'probing' ? -1 : 0,
    replyOptions: isFinal
      ? []
      : [
          { text: '我也觉得留白处最见功夫。', tone: 'warm' },
          { text: '嗯。', tone: 'neutral' },
          { text: '你画里那条水路，到底通向哪里？', tone: 'probing' },
        ],
    memoryPatch: {
      characterImpression: '希孟注意到玩家开始关注水路与去处。',
      playerStyleTags: ['关注路径'],
      storyLedgerNote: '玩家与希孟谈到画中水路尽头，希孟回避但未离开。',
    },
    safetyFlags: safeFlags,
  };
}

function generatePaintingPromptOutput(request) {
  const selectedPrompt = promptByQuestionType[request.input?.questionType];
  if (!selectedPrompt) {
    throw new Error(`Unsupported question type: ${request.input?.questionType}`);
  }

  return {
    ...selectedPrompt,
    questionType: request.input.questionType,
    relatedSkills: request.input.relatedSkills,
  };
}

function evaluatePaintingIntentOutput(request) {
  const isPuzzle = request.input?.mode === 'puzzle';
  const questionId = request.input?.question?.id ?? '';
  const isObserveQuestion = questionId.includes('observe');
  const isDisputeQuestion = questionId.includes('dispute');
  const examFeedback = isObserveQuestion
    ? '批语写在鞋印旁：能从痕迹看见人，比只画物件更近一步。'
    : isDisputeQuestion
      ? '批语压在两段话中间：不急着判谁对，倒是听见了两种笔意相抵。'
      : '批语写得很短：不急于补路，倒是看见了路为何断。';
  const examSkillDelta = isObserveQuestion
    ? { figure: 1 }
    : isDisputeQuestion
      ? { figure: 1, architecture: 1 }
      : { landscape: 2 };
  const examStyleTags = isObserveQuestion
    ? ['关注痕迹', '由物见人']
    : isDisputeQuestion
      ? ['能听立场', '允许并置']
      : ['关注路径', '偏山水隐喻'];

  return {
    visibleFeedback: isPuzzle
      ? '秘阁批语像是后来补上的：看见苦处，不急着替画中人说尽。'
      : examFeedback,
    score: 82,
    interpretationTier: 'core',
    styleTags: isPuzzle ? ['关注民生', '能连线索'] : examStyleTags,
    suggestedStatePatch: {
      skillDelta: isPuzzle ? { figure: 1, landscape: 1 } : examSkillDelta,
      cluesGranted: isPuzzle ? ['clue_blocked_waterway'] : [],
      flagsSuggested: isPuzzle ? ['haiyouLlmCoreRead'] : ['noticedWaterEndCloudWeak'],
    },
    memoryPatch: {
      playerStyleTags: isPuzzle ? ['关注民生', '能连线索'] : examStyleTags,
      storyLedgerNote: isPuzzle
        ? '玩家在秘阁解读《骸游图》，把药瓶、婴孩、旁观者和被遮住的水路连在一起。'
        : '玩家在丹青试中注意到水路断绝与云气留白。',
    },
    safetyFlags: safeFlags,
  };
}

export function createMockProvider() {
  return {
    name: 'mock',
    async generate(request) {
      if (request.role === 'character_dialogue') {
        return generateCharacterDialogueOutput(request);
      }

      if (request.role === 'painting_prompt_generator') {
        return generatePaintingPromptOutput(request);
      }

      if (request.role === 'painting_intent_evaluator') {
        return evaluatePaintingIntentOutput(request);
      }

      throw new Error(`Unsupported LLM role: ${request.role}`);
    },
  };
}
