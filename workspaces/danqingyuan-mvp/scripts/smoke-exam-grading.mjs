// 冒烟：丹青试评分标准 + 落榜原因点评（Task #26）
const proxyUrl = process.env.LLM_PROXY_URL ?? 'http://127.0.0.1:8787/api/llm';

function ctx() {
  return {
    player: { name: '阿明', skillScores: { landscape: 3, figure: 2, architecture: 1 } },
    worldbook: ['《骸游图》为四人共创，秘阁揭开前不点破。'],
    memory: ['玩家本科山水，七日里注意后花园竹石与第三日骤雨。'],
  };
}

const freeRubric = {
  coreSignals: ['灵感熔于立意', '有巧思', '合本科'],
  partialSignals: ['用了灵感但堆砌', '立意平平'],
  shallowSignals: ['离题', '空泛套话', '没真用灵感'],
  forbiddenInterpretations: ['骸游图四人共创', '希孟未来消失'],
};

const requests = [
  {
    traceId: 'grade-shallow',
    role: 'painting_intent_evaluator',
    promptVersion: 'smoke-client',
    input: {
      mode: 'exam',
      question: { id: 'free-shallow', hiddenRubric: freeRubric },
      playerAnswer: { selectedOptionIds: [], freeText: '我要画得很美很有意境，让人看了很感动。' },
      playerStats: { landscape: 3, figure: 2, architecture: 1 },
      knowledge: 10,
      relationshipStage: 'known',
      canonWarnings: ['不得点破骸游图四人共创'],
    },
    context: ctx(),
  },
  {
    traceId: 'grade-partial',
    role: 'painting_intent_evaluator',
    promptVersion: 'smoke-client',
    input: {
      mode: 'exam',
      question: { id: 'free-partial', hiddenRubric: freeRubric },
      playerAnswer: {
        selectedOptionIds: [],
        freeText:
          '我想以后花园的竹石为近景，几竿瘦竹斜出，配一块湿漉漉的太湖石；远处留白作雨后初霁的水汽。第三日那场骤雨刚歇，正好画竹叶滴水、石面反光，取"雨洗新绿"的清气，用淡墨分远近，近浓远淡。',
      },
      playerStats: { landscape: 3, figure: 2, architecture: 1 },
      knowledge: 20,
      relationshipStage: 'known',
      canonWarnings: ['不得点破骸游图四人共创'],
    },
    context: ctx(),
  },
  {
    traceId: 'mentor-fail',
    role: 'character_dialogue',
    promptVersion: 'smoke-client',
    input: {
      npcId: 'litang',
      day: 7,
      timeSlot: 'afternoon',
      locationId: 'main_hall',
      relationshipStage: 'known',
      emotionState: 'noticing',
      topicCard: '丹青试点评',
      examReview: {
        tier: 'fail',
        score: 48,
        failed: true,
        majorSkillLabel: '山水',
        perQuestion: [
          { label: '选题', tier: 'partial', feedback: '看出了画里被挤到角落的人，尚算用心。' },
          { label: '自由创作', tier: 'shallow', feedback: '只喊"画得很美很有意境"，没把所选灵感熔进具体构图，立意空泛。' },
        ],
      },
      recentEvents: ['玩家在丹青试落第。'],
      relevantMemories: ['玩家本科山水。'],
      availableClueIds: [],
      canonWarnings: ['不得点破骸游图四人共创'],
    },
    context: ctx(),
  },
];

const run = async () => {
  for (const req of requests) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    });
    const json = await res.json();
    const out = json.output ?? json;
    console.log(`\n=== ${req.traceId} ===`);
    if (out.visibleFeedback !== undefined) {
      console.log(`tier=${out.interpretationTier} score=${out.score}`);
      console.log(`feedback=${out.visibleFeedback}`);
    } else if (out.dialogue !== undefined) {
      console.log(`dialogue=${out.dialogue}`);
      console.log(`actionText=${out.actionText}`);
    } else {
      console.log(JSON.stringify(out).slice(0, 300));
    }
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
