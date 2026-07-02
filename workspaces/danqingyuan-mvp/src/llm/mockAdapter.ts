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
import { safeFlags } from '../types';
import type { LlmAdapter } from './adapter';

const validation = {
  ok: true,
  errors: [],
  safetyFlags: safeFlags,
  retryCount: 0,
};

export class MockLlmAdapter implements LlmAdapter {
  async generateCharacterDialogue(
    request: LlmRequestEnvelope<CharacterDialogueInput>,
  ): Promise<LlmResponseEnvelope<CharacterDialogueOutput>> {
    const isFinal = request.input.isFinalExchange === true;
    // mock 续聊开场（2026-06-26）：希孟主动开口
    if (request.input.isOpening === true) {
      const output: CharacterDialogueOutput = {
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
      return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
    }
    // mock 结局导师点评（2026-06-30）：examReview 非空 → 按档位点评、单向（replyOptions=[]、delta=0）
    if (request.input.examReview) {
      const { tier, score, failed, majorSkillLabel } = request.input.examReview;
      const dialogue = failed
        ? `${majorSkillLabel}的火候还差着一层，笔意未到，章法也散。不过——画院惜才，准你补试一场，莫要再辜负。`
        : tier === 'excellent'
          ? `好。这一笔下去，意在笔先，是可造之材。${majorSkillLabel}能画到这般地步，院里多年未见。`
          : tier === 'good'
            ? `${majorSkillLabel}上见了功夫，意境也立住了。再沉住气磨上些时日，必有大成。`
            : `${score}分，勉强过关。${majorSkillLabel}的根骨还浅，章法尚可意趣不足，往后须多下苦功。`;
      const output: CharacterDialogueOutput = {
        dialogue,
        actionText: failed
          ? '他搁下朱笔，神色凝重，话锋却又松了一寸。'
          : '他端详着你的卷子，捻须微微颔首。',
        emotionState: failed ? 'distant' : tier === 'excellent' ? 'trusting' : 'noticing',
        topicUnlocked: [],
        cluesGranted: [],
        relationshipDelta: 0,
        replyOptions: [],
        memoryPatch: { characterImpression: '', playerStyleTags: [], storyLedgerNote: '' },
        safetyFlags: safeFlags,
      };
      return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
    }
    // mock 结局见希孟（2026-06-30 批二）：endingMeet 非空 → 希孟话别预热语、单向（replyOptions=[]、delta=0）
    if (request.input.endingMeet) {
      const output: CharacterDialogueOutput = {
        dialogue: '你既留下了，那条没画完的水路，迟早要一起去走一趟。',
        actionText: '希孟难得地看了你许久，将手中半卷青绿轻轻按了按，像是把一句没说尽的话压在了画里。',
        emotionState: 'trusting',
        topicUnlocked: [],
        cluesGranted: [],
        relationshipDelta: 0,
        replyOptions: [],
        memoryPatch: { characterImpression: '', playerStyleTags: [], storyLedgerNote: '' },
        safetyFlags: safeFlags,
      };
      return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
    }
    // mock 越界检测（2026-06-26）：playerReply 命中元游戏/AI 词 → boundaryViolation
    const reply = request.input.playerReply ?? '';
    const isBoundary = /AI|人工智能|大模型|模型|prompt|提示词|游戏|gpt|deepseek/i.test(reply);
    if (isBoundary) {
      const output: CharacterDialogueOutput = {
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
      return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
    }
    const output: CharacterDialogueOutput = {
      dialogue: isFinal
        ? '你说的我记下了。天色不早，我那卷画也还欠几笔——改日再叙罢。'
        : '这卷青绿要进献宫里，呈的是盛世气象。有些景……画了也不一定合适。',
      actionText: isFinal
        ? '希孟说罢，已转身回到案前，重新执起了笔。'
        : '希孟把笔尖在砚边停了停，像是听见了什么，又没有解释。',
      emotionState: 'avoidant',
      topicUnlocked: ['水路尽头'],
      cluesGranted: [],
      relationshipDelta: request.input.replyTone === 'warm' ? 2 : request.input.replyTone === 'probing' ? -1 : 0,
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
    return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
  }

  async generatePaintingPrompt(
    request: LlmRequestEnvelope<PaintingPromptGeneratorInput>,
  ): Promise<LlmResponseEnvelope<PaintingPromptGeneratorOutput>> {
    const prompts: Record<string, Omit<PaintingPromptGeneratorOutput, 'questionType' | 'relatedSkills'>> = {
      express_intent: {
        id: 'mock-express-intent-water-end',
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
        id: 'mock-observe-detail-rain-courtyard',
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
        id: 'mock-character-dispute-market',
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
        id: 'mock-archive-haiyou-evaluator',
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
      poem_intent: {
        id: 'mock-poem-intent-zhu-suo',
        promptText: '试帖以一句古诗为题——「竹锁桥边卖酒家」。监试问：这个"锁"字，你怎么画？',
        options: [
          { id: 'A', text: '只在竹林深处斜挑一面酒帘，酒家不见。', leansTo: ['landscape'] },
          { id: 'B', text: '把桥边酒家、竹丛、客人都端端正正画出。', leansTo: ['architecture'] },
          { id: 'C', text: '画一把大锁挂在酒家门上，扣题。', leansTo: ['figure'] },
        ],
        freeInputHint: '也可以写下你会怎么藏这个"锁"字。',
        hiddenRubric: {
          coreSignals: ['以竹掩家见"锁"意', '以景写意不照实', '以少胜多'],
          partialSignals: ['画对了景却失于照实', '不够含蓄'],
          shallowSignals: ['照字面画实物', '画错了重点'],
          forbiddenInterpretations: ['坐实希孟消失原因', '骸游图四人共创'],
        },
        potentialClueIds: [],
        canonWarnings: ['以诗入画雅题，不揭示主线秘密。'],
      },
    };
    const selectedPrompt = prompts[request.input.questionType];
    const output: PaintingPromptGeneratorOutput = {
      ...selectedPrompt,
      questionType: request.input.questionType,
      relatedSkills: request.input.relatedSkills,
    };
    return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
  }

  async evaluatePaintingIntent(
    request: LlmRequestEnvelope<PaintingIntentEvaluatorInput>,
  ): Promise<LlmResponseEnvelope<PaintingIntentEvaluatorOutput>> {
    const isPuzzle = request.input.mode === 'puzzle';
    const isObserveQuestion = request.input.question.id.includes('observe');
    const isDisputeQuestion = request.input.question.id.includes('dispute');
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
    const output: PaintingIntentEvaluatorOutput = {
      visibleFeedback: isPuzzle
        ? '秘阁批语像是后来补上的：看见苦处，不急着替画中人说尽。'
        : examFeedback,
      score: 82,
      interpretationTier: 'core',
      styleTags: isPuzzle ? ['关注民生', '能连线索'] : examStyleTags,
      suggestedStatePatch: {
        skillDelta: isPuzzle ? { figure: 1, landscape: 1 } : examSkillDelta,
        cluesGranted: isPuzzle ? ['clue_blocked_waterway'] : [],
        flagsSuggested: [],
      },
      memoryPatch: {
        playerStyleTags: isPuzzle ? ['关注民生', '能连线索'] : examStyleTags,
        storyLedgerNote: isPuzzle
          ? '玩家在秘阁解读《骸游图》，把药瓶、婴孩、旁观者和被遮住的水路连在一起。'
          : '玩家在丹青试中注意到画面的留白与去处。',
      },
      safetyFlags: safeFlags,
    };
    return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
  }

  async narrateScene(
    request: LlmRequestEnvelope<SceneNarratorInput>,
  ): Promise<LlmResponseEnvelope<SceneNarratorOutput>> {
    const { phase, weather, facts, lengthBudget, playerChoice } = request.input;
    const padding =
      '院墙外有担子经过，铜铃响了两声又远了。檐下的光挪了一指宽，砚里的墨干得比想象慢。有人在廊下低声说话，听不清说的什么，只觉得这一刻丹青院安静得像一张未落笔的纸。';
    const base =
      phase === 'open'
        ? `${weather}。${facts.join('，')}。${padding}`
        : phase === 'intro'
          ? `丹青院门前，${facts.join('，')}。${padding}`
          : phase === 'practice'
            ? `${facts.join('，')}。你凝神运笔，半日不觉。${padding}`
            : `你${playerChoice ? `选择了「${playerChoice}」。` : '应了一声。'}${facts.join('，')}。${padding}`;
    const narrativeText = base.repeat(Math.ceil((lengthBudget?.segmentMin ?? 200) / base.length)).slice(0, lengthBudget?.segmentMax ?? 500);

    const output: SceneNarratorOutput =
      phase === 'open' || phase === 'continue' || phase === 'mid'
        ? {
            narrativeText,
            // 三件套 mock（2026-06-17）：open 段还可续；continue 段模拟"这场已尽"→ 收束信号
            sceneCanContinue: phase !== 'continue',
            shouldConclude: phase === 'continue',
            // VN 逐句 mock（2026-06-30）：切两段，一旁白一对白（speaker 取在场首位 NPC，无则全旁白）
            segments: (() => {
              const firstNpc = request.input.npcsPresent?.[0]?.id ?? null;
              const half = Math.ceil(narrativeText.length / 2);
              return [
                { text: narrativeText.slice(0, half), speaker: null },
                { text: narrativeText.slice(half), speaker: firstNpc },
              ];
            })() as SceneNarratorOutput['segments'],
            suggestedActions: [
              { label: '去街市看看', locationId: 'market', summary: '循着方才的念头去街市走走' },
            ],
            entitiesIntroduced: request.input.npcsPresent?.[0]
              ? [{ name: request.input.npcsPresent[0].name, kind: 'npc' as const, note: '在场的先生' }]
              : [],
            atmosphereTags: ['日常', weather],
          }
        : phase === 'intro' || phase === 'practice'
          ? {
              narrativeText,
              atmosphereTags: [phase === 'practice' ? '用功' : '入院', weather],
            }
          : {
              narrativeText,
              suggestedPatch: { moodDelta: 0 },
              memoryNote: '',
              atmosphereTags: ['日常', weather],
            };
    return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
  }

  async planMainline(
    request: LlmRequestEnvelope<MainlinePlannerInput>,
  ): Promise<LlmResponseEnvelope<MainlinePlannerOutput>> {
    const { motifLabel, npcName, objectLabel, locationLabel } = request.input.seed;
    const output: MainlinePlannerOutput = {
      title: `${motifLabel}（暗题）`,
      beats: [
        { day: 1, beat: `${locationLabel}里，${objectLabel}头一回出现，无人留意` },
        { day: 2, beat: `${objectLabel}再现，与「${motifLabel}」隐约相关` },
        { day: 3, beat: `${npcName}欲言又止，话头被岔开` },
        { day: 4, beat: `${objectLabel}换了地方出现，对不上前两次` },
        { day: 5, beat: `玩家撞见${npcName}慌张离开的背影` },
        { day: 6, beat: '一句无意的话把几次见闻串到一起' },
        { day: 7, beat: `揭开一层：${motifLabel}背后有人安排，更深处仍未明` },
      ],
    };
    return { traceId: request.traceId, role: request.role, promptVersion: request.promptVersion, output, validation };
  }
}
