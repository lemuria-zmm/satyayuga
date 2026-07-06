import type { LocationId, SkillId, TimeSlot } from '../types';

/**
 * 活动卡内容池（v2 设计文档 §5）。
 * 引擎按时段筛选活动卡生成可选行动；选择活动会自动跳转到对应地点。
 */
export interface ActivityCard {
  id: string;
  label: string;
  timeSlots: TimeSlot[];
  locationId: LocationId;
  staminaCost: number;
  /** 体力恢复（食单/休息类） */
  staminaGain?: number;
  /** 钱文消费（仅市井消费卡，院内供应免费） */
  moneyCost?: number;
  effects?: {
    skills?: Partial<Record<SkillId, number>>;
    mood?: number;
    knowledge?: number;
  };
  /** 次日晨起体力修正（早歇 +1，蹴鞠 -1） */
  nextDayStaminaBonus?: number;
  /** 活动卡道具图（白底 PNG，CSS multiply 融合到纸签上） */
  art?: string;
  /**
   * 行动分轨（2026-06-12 拍板，行动三分法）：
   * - mechanical（默认，可不填）：午膳/喝茶/投壶/夜市等机械类，走纯模板 + 数值结算，不调 LLM；
   * - growth：晨课/写生/查证等成长类，调 LLM 两阶段场景，行动仅作背景、叙事主轴交给主线/主题；
   * - narrative：偶遇/首次到地/主线节拍日，完整 LLM（本轮偶遇系统未做，活动卡暂不用此值）。
   * 注：判定统一走 sceneEngine.getActionTrack，该字段仅作活动卡的数据来源。
   */
  track?: 'mechanical' | 'growth' | 'narrative' | 'practice';
  /**
   * 小游戏接入口预留（2026-06-12，本轮全部留空）：
   * 将来投壶→投掷小游戏、点茶→调茶选项等；有值则 runAction 跳小游戏组件，无值走当前结算。
   */
  minigameId?: string;
  /**
   * 学识门槛（2026-06-12 Gate①）：玩家学识 ≥ 此值时该活动卡才出现（如书房深查需 ≥10）。
   * 未设则不 gate。判定在 gameEngine.getDaySlotActions。
   */
  minKnowledge?: number;
  /** 行动结算时落的旗标（2026-06-12，如买画材落 art_supplies_ready buff） */
  setsFlag?: string;
  /**
   * 沙盒练习目标（2026-06-27 练习成长系统）：track:'practice' 的卡声明此处练的是哪项画技或学识。
   * 实际涨量由引擎 computePracticeGain 按"是否本科"判定（本科 +2 / 副 +1 / 学识 +1），卡上不写死数值。
   */
  practiceSkill?: SkillId | 'knowledge';
  /**
   * 练习基础涨量覆盖（2026-06-28）：进阶练习卡（如钻研旧档 minKnowledge:10、体力-2）涨量更高时填此值，
   * 覆盖 computePracticeGain 的默认（学识默认1/本科2/副1）。缺省走默认。
   */
  practiceAmount?: number;
  /**
   * 每日限一次（2026-06-29）：沙盒时段不推时间，免费且加属性的卡（如讨碗热茶 体力+1心情+1）否则可无限刷。
   * true 时引擎按 flag `{id}_d{day}` 当日做过即过滤，结算时落 flag。
   */
  oncePerDay?: boolean;
  /** 模板文本池，引擎随机取一条（机械类用作正文；成长类仅作 LLM 失败兜底） */
  narratives: string[];
}

/** 上午/下午行动（2026-06-11 拍板：修习三签已去除，画技成长走晨课与活动附带收益） */
export const DAY_ACTIVITIES: ActivityCard[] = [
  {
    id: 'library_research',
    art: '/cards/tool-scroll-stack.png',
    label: '书房查证',
    track: 'growth',
    timeSlots: [],
    locationId: 'library',
    staminaCost: 1,
    effects: { knowledge: 2 },
    narratives: [
      '你翻检旧画论，在一条夹注里多停了片刻。读画的眼力，原是这样一点点磨出来的。',
      '书房无人。你抄了半页《林泉高致》，墨迹干时，窗外日影已移了一寸。',
      '架上的画卷档案积着薄尘。你按年月翻过去，忽然留意到有几页里，李唐、择端、嵩几位先生的名字反复一同出现，像是共事过一桩没记入册的事。',
    ],
  },
  {
    id: 'library_deep_research',
    art: '/cards/tool-archive-box.png',
    label: '书房深查',
    track: 'growth',
    timeSlots: [],
    locationId: 'library',
    staminaCost: 2,
    effects: { knowledge: 3 },
    minKnowledge: 10,
    narratives: [
      '见识够了，你才看得懂第四层旧档的门道。一函积尘的批注被你翻出来，落款年月被人涂改过；夹在里头的半张草图，画的竟是流民疾苦——与希孟那卷青绿盛世，恰是反的。',
      '你按图索骥，从画卷档案的夹缝里抽出几页旧批。题记的年月对不上画上的落款——这中间，似乎被人动过手脚，而经手的几个名字，你都在课上见过。',
    ],
  },
  {
    id: 'market_sketch',
    art: '/cards/tool-paperweight.png',
    label: '街市写生',
    track: 'growth',
    timeSlots: [],
    locationId: 'market',
    staminaCost: 2,
    effects: { skills: { figure: 1, architecture: 1 }, knowledge: 1 },
    narratives: [
      '你在桥头支起小案。挑夫、货郎、药铺掌柜，一一入了你的速写。',
      '摊位的朝向、行人的视线，你越画越觉得这座城自有一套看不见的秩序。',
      '一个孩童在摊前停了很久。你画下他，又画下他身后那条被遮住的小巷。',
    ],
  },
  {
    id: 'garden_view',
    art: '/cards/tool-pigment-dishes.png',
    label: '后花园观景',
    track: 'growth',
    timeSlots: [],
    locationId: 'garden',
    staminaCost: 1,
    effects: { mood: 1, skills: { landscape: 1 } },
    narratives: [
      '池水尽头浮着一点云影，转眼又散了。你记下这一瞬的留白。',
      '竹影轻摇。你什么也没画，只是看，看久了，山水的远近忽然清楚了一些。',
      '风过水面，皱起细纹。你想起课上那句"水有源"，又看了一眼池水的来处。',
    ],
  },
  {
    id: 'consult_teacher',
    art: '/cards/tool-brush-set.png',
    label: '请教导师',
    track: 'growth',
    timeSlots: [],
    locationId: 'hall',
    staminaCost: 1,
    effects: { knowledge: 1 },
    narratives: [
      '李唐看过你的习作，只圈了一处："此处用笔，尚可。"得他一字，已属不易。',
      '你执卷请教。李唐讲得极简，但每一句都落在你疑惑的正中。',
    ],
  },
  {
    id: 'teahouse',
    art: '/cards/buy-teahouse.png',
    label: '茶坊吃茶',
    timeSlots: ['noon'],
    locationId: 'market',
    staminaCost: 1,
    moneyCost: 5,
    effects: { mood: 2 },
    narratives: [
      '你数过铜钱，挑了临窗的座头。建盏里汤花如雪，街声隔窗，竟也成了画意。',
      '茶博士候汤点茶，手法利落。你慢慢啜着，半日的疲意散了大半。',
    ],
  },
  {
    id: 'rent_book',
    art: '/cards/buy-rent-book.png',
    label: '赁书',
    timeSlots: ['noon', 'evening'],
    locationId: 'market',
    staminaCost: 0,
    moneyCost: 6,
    effects: { knowledge: 1 },
    narratives: [
      '街口赁书铺子按日取钱。你挑了一册画论揣回去，灯下翻了几页，见识又长了一寸。',
      '老书贾认得你是画院的，多让了一文。你赁了卷旧谱，路上就忍不住翻看起来。',
    ],
  },
  {
    id: 'buy_art_supplies',
    art: '/cards/buy-art-supplies.png',
    label: '买画材',
    timeSlots: ['noon', 'evening'],
    locationId: 'market',
    staminaCost: 0,
    moneyCost: 10,
    setsFlag: 'art_supplies_ready',
    narratives: [
      '纸墨铺里挑了好纸、新墨与两支狼毫。备齐了称手的家伙，下一笔总该更有底气。',
      '你掂量着钱袋，还是买下那刀澄心堂纸。好马配好鞍，下次落笔不能再将就。',
    ],
  },
];

/** 午膳（午间）：食堂食单 5 选 1（院内按例收几文，2026-06-15 起防刷体力）；街市另有花钱的街边吃食 */
export const MEAL_ACTIVITIES: ActivityCard[] = [
  {
    id: 'meal_chuibing',
    art: '/cards/food-chuibing.png',
    label: '炊饼配豆羹',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 1,
    moneyCost: 1,
    narratives: ['炊饼焦黄，豆羹滚热。院中常例，朴实管饱。'],
  },
  {
    id: 'meal_mantou',
    art: '/cards/food-guanjiang-mantou.png',
    label: '灌浆馒头',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 2,
    moneyCost: 2,
    effects: { mood: 1 },
    narratives: ['今日膳堂有灌浆馒头。咬开一角，汤汁烫口，众学子都吃得很急。'],
  },
  {
    id: 'meal_botuo',
    art: '/cards/food-botuo.png',
    label: '馎饦汤面',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 2,
    moneyCost: 2,
    narratives: ['一碗馎饦下肚，热汤暖到指尖。下午的笔，应当稳了。'],
  },
  {
    id: 'meal_mijian',
    art: '/cards/food-mijian-diancha.png',
    label: '蜜煎果子配点茶',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 1,
    moneyCost: 3,
    effects: { mood: 2 },
    narratives: ['蜜煎甜而不腻，盏中汤花将散未散。风雅这一刻，是自己给自己的。'],
  },
  {
    id: 'meal_together',
    art: '/cards/food-gongshan.png',
    label: '与同僚共膳',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 1,
    moneyCost: 1,
    narratives: ['长桌相对，碗箸声里夹着院中闲话。你多听了几句，似乎谁都比你消息灵通。'],
  },
  {
    id: 'meal_street',
    art: '/cards/buy-night-snack.png',
    label: '街边吃食',
    timeSlots: ['noon'],
    locationId: 'market',
    staminaCost: 0,
    staminaGain: 2,
    moneyCost: 4,
    effects: { mood: 1 },
    narratives: [
      '桥头摊上买了两个胡饼，就着一碗甜浆。市声嘈嘈，倒比膳堂吃得有滋味。',
      '你蹲在摊边吃灌肺，摊主与隔壁卖货郎拌嘴，半条街都听乐了。',
    ],
  },
];

/** 空时段轻量签（2026-06-11 拍板）：非午间食堂有一件小事可做（宿舍小憩已移除，宿舍仅晚间开启） */
export const IDLE_ACTIVITIES: ActivityCard[] = [
  {
    id: 'idle_tea',
    art: '/cards/buy-teahouse.png',
    label: '讨碗热茶',
    timeSlots: ['noon'],
    locationId: 'dining_hall',
    staminaCost: 0,
    staminaGain: 1,
    oncePerDay: true,
    effects: { mood: 1 },
    narratives: [
      '膳堂这会儿清闲。火头娘子给你舀了碗热茶，顺口数落了两句今早的柴价。',
      '你倚着长桌喝茶，灶上还温着汤。手暖了，心也定了些。',
    ],
  },
];

/** 晚间娱乐（不限次数、不推进时间；体力/钱文为闸，回宿舍就寝才收日） */
export const EVENING_ACTIVITIES: ActivityCard[] = [
  {
    id: 'eve_touhu',
    art: '/cards/play-touhu.png',
    label: '投壶',
    timeSlots: ['evening'],
    locationId: 'market',
    staminaCost: 1,
    effects: { mood: 2 },
    narratives: ['街市瓦子前支着铜壶，过往行人围作一圈。你连中两矢，赢得一片喝彩。'],
  },
  {
    id: 'eve_weiqi',
    art: '/cards/play-weiqi.png',
    label: '弈棋',
    timeSlots: ['evening'],
    locationId: 'market',
    staminaCost: 1,
    effects: { mood: 1, knowledge: 1 },
    narratives: ['茶肆灯下有人对弈，你凑上去手谈一局。输了半子，却看懂一手布局，倒像上了一课。'],
  },
  {
    id: 'eve_tingqin',
    art: '/cards/play-guqin.png',
    label: '听琴',
    timeSlots: ['evening'],
    locationId: 'garden',
    staminaCost: 1,
    effects: { mood: 2 },
    narratives: ['不知是谁在后花园抚琴。月色落在水面，琴声断处，正是留白。'],
  },
  {
    id: 'eve_cuju',
    art: '/cards/play-cuju.png',
    label: '蹴鞠',
    timeSlots: ['evening'],
    locationId: 'market',
    staminaCost: 2,
    effects: { mood: 2 },
    nextDayStaminaBonus: -1,
    narratives: ['街市空场上鞠球翻飞，你也下场踢了几脚。痛快是痛快，明早怕是要腰酸。'],
  },
  {
    id: 'eve_tingqu',
    art: '/cards/play-tingqu.png',
    label: '出院听曲',
    timeSlots: ['evening'],
    locationId: 'market',
    staminaCost: 1,
    moneyCost: 8,
    effects: { mood: 3 },
    narratives: ['瓦子里灯火通明，琵琶声压过满场人语。散场时夜风一吹，你竟有些舍不得走。'],
  },
  {
    id: 'eve_nightmarket',
    art: '/cards/buy-night-snack.png',
    label: '夜市闲逛',
    timeSlots: ['evening'],
    locationId: 'market',
    staminaCost: 1,
    moneyCost: 4,
    effects: { mood: 1 },
    narratives: ['州桥夜市灯火连绵。你买了一包炙烤小食，边走边吃，看灯影落在河面上。'],
  },
];

/**
 * 沙盒练习卡（2026-06-27 成长数值重设计）：午/晚沙盒时段，玩家自主走到书房/后花园/街市主动练技能。
 * track:'practice' → 调 LLM 出单段沉浸文（不进三件套循环、不推主线）+ 引擎确定性给技能（computePracticeGain）。
 * 防刷=体力闸（每张扣 1~2 体力，沙盒不推时间但体力靠吃饭恢复、吃饭花钱）+ 每日技能涨幅封顶 DAILY_SKILL_CAP=4。
 * 收益按 practiceSkill 声明、量由引擎判主/副（本科 +2 / 副 +1 / 学识 +1），卡上不写死 effects 数值。
 */
export const PRACTICE_ACTIVITIES: ActivityCard[] = [
  // —— 书房（学识）——
  {
    id: 'practice_read_treatise',
    art: '/cards/tool-scroll-stack.png',
    label: '研读画论',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'library',
    staminaCost: 1,
    practiceSkill: 'knowledge',
    narratives: [
      '你在窗下摊开《林泉高致》，一句"山有三远"读了又读，指尖在纸上虚摹峰峦的起落。',
      '画论里讲设色的次第，你边读边对照架上旧画，许多从前看不懂的地方，忽然通了。',
      '一册《笔法记》翻到"六要"，你逐字咀嚼，把"气、韵、思、景、笔、墨"默了一遍又一遍。',
      '读到"外师造化，中得心源"，你搁了书，望着窗外发怔——原来眼里的山水，还得先过一遍心。',
      '古人论"骨法用笔"，你拿秃笔在废纸上试了几道，才明白那一"骨"字，是提得起、按得下的分寸。',
      '书页间夹着前人一行小注，寥寥数语，却点破了你近日一处死结。你把它抄在自己的册子上。',
      '窗影移了半寸，你读得入神，连膳堂开饭的梆子都没听见。合上书时，胸中似多了一块底。',
    ],
  },
  {
    id: 'practice_view_scrolls',
    art: '/cards/tool-archive-box.png',
    label: '阅古画卷',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'library',
    staminaCost: 1,
    practiceSkill: 'knowledge',
    narratives: [
      '你小心展开一卷前朝旧画，凑近了看它的皴法与落墨，看久了，眼里像是多了一把尺子。',
      '画卷的绢色已旧，可笔意仍活。你一寸寸看过去，把前人藏在虚处的心思记在心里。',
      '一卷设色花鸟摊在案头，你盯着那只翠羽的分染，数着它到底叠了几层薄色。',
      '旧画角上有半方残印，你辨认了半晌，又循着笔势去猜作画人当年的心境。',
      '同一处树石，你把两卷不同的画法并排看，高下立见——原来"临"到最后，临的是取舍。',
      '你对着一卷山水的留白出神。空处不著一笔，偏偏最见功夫，这道理你今日才算摸到边。',
      '灯下重展那卷人物长卷，衣纹的转折你看了又看，指尖不自觉跟着虚描起来。',
    ],
  },
  {
    id: 'practice_deep_study',
    art: '/cards/tool-archive-box.png',
    label: '钻研旧档',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'library',
    staminaCost: 2,
    practiceSkill: 'knowledge',
    practiceAmount: 2,
    minKnowledge: 10,
    narratives: [
      '见识够了，你才看得懂第四层旧档的门道。一函积尘的批注被你翻出来，字里行间另有乾坤。',
      '你按图索骥，从画卷档案的夹缝里抽出几页旧批，越钻越深，半日不觉。',
      '一叠旧考课记录被虫蛀了大半，你就着残字拼读，竟拼出几位先生早年同题较艺的旧事。',
      '旧档深处一卷杂记里，记着院中采买绢帛的旧账，数目对不上的地方，被人用朱笔轻轻抹了。',
      '你翻到一份没署名的画稿题跋，笔迹眼熟，落款年月却被涂改过——这中间的曲折，够你想上一路。',
      '尘封的旧档一函函看过去，别人眼里的废纸，在你眼里字字是门径。这一钻，比读十册画论还实在。',
    ],
  },
  // —— 后花园（山水）——
  {
    id: 'practice_garden_sketch',
    art: '/cards/tool-paperweight.png',
    label: '对景写生',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'garden',
    staminaCost: 1,
    practiceSkill: 'landscape',
    narratives: [
      '你携纸笔坐到池边，对着水光竹影落笔。山石的远近，在腕底一点点活了过来。',
      '园中一角的太湖石被你画了三遍。第三遍时，你才算摸到它瘦、皱、透的筋骨。',
      '晨光斜过粉墙，投下老槐的影。你追着那道影子起稿，光一挪，笔也得跟着挪。',
      '池上一痕远山淡得几乎看不见，你偏要把它画出来——落笔极轻，像怕惊了那点云气。',
      '你试着用一枝秃笔皴石壁，涩笔拖过纸面，那种苍劲的手感，是新笔给不了的。',
      '画到水口处你犯了难：水要有源，可源在画外。你搁笔想了想，只留了一片空白。',
      '一丛修竹被风翻出叶背的浅色，你手快，三两笔勾住了那一瞬的动势，自己也觉痛快。',
    ],
  },
  {
    id: 'practice_garden_observe',
    art: '/cards/tool-pigment-dishes.png',
    label: '观竹石听泉',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'garden',
    staminaCost: 1,
    practiceSkill: 'landscape',
    narratives: [
      '你什么也不画，只是看。竹影移过粉墙，泉声断续，看久了，山水的虚实忽然在心里排布开来。',
      '风过水面皱起细纹，又慢慢抚平。你盯着这一池活水，想起课上那句"水有源"，似有所悟。',
      '你倚石而坐，听那一线细泉自石罅垂落，滴在潭面上，一声一声，把心也听静了。',
      '云影从池心掠过，转眼就散。你没去追它，只把那"来去无迹"四个字，默默记在心里。',
      '一块顽石半浸在水中，你绕着看了两圈，忽然懂了古人为何说"石分三面"——原来是脚下的路教会眼睛的。',
      '暮色里竹梢还留着一点天光。你久久不动，只觉这满园的空，比任何一笔都难画、也最该画。',
    ],
  },
  // —— 街市（人物 / 界画）——
  {
    id: 'practice_market_figure',
    art: '/cards/tool-paperweight.png',
    label: '速写市井人物',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'market',
    staminaCost: 1,
    practiceSkill: 'figure',
    narratives: [
      '你在桥头支起小案。挑夫、货郎、药铺掌柜，一一入了速写。人物的活法，比临帖扎实。',
      '一个孩童在摊前停了很久，你飞快勾下他的神态——人最难画的，原是那一点没说出口的心思。',
      '两个脚夫歇担说笑，你几笔抢下那松快的肩背。等他们起身走了，纸上还留着那口气。',
      '卖浆的老翁佝着腰舀汤，你盯着他手腕的转折画了三回，才算没把那把力气画丢。',
      '一个妇人回头唤孩子，转身那一瞬的衣纹你没抓住，懊恼半晌，索性守在原地等下一个。',
      '街边争执正凶，你却只顾看那涨红的脸、攥紧的拳——原来"神"都藏在这些将发未发的地方。',
      '收笔时你翻看今日速写，杂乱十几张里，竟有两三个眼神是活的。这点子活气，最难得。',
    ],
  },
  {
    id: 'practice_market_architecture',
    art: '/cards/tool-brush-set.png',
    label: '画桥梁屋宇',
    track: 'practice',
    timeSlots: ['noon', 'evening'],
    locationId: 'market',
    staminaCost: 1,
    practiceSkill: 'architecture',
    narratives: [
      '你对着州桥的飞虹起稿，斗拱、栏板、桥洞，一笔不苟。界画的难，全在这分毫不让的规矩里。',
      '临街的酒楼楼阁层叠，你用界尺一寸寸量着画。线越画越直，心也越画越静。',
      '你数着檐下的椽子，一根都不肯少。旁人笑你痴，你却知道，界画差一根就塌了。',
      '飞檐起翘的弧度最难拿捏，你放平界尺又提起，试了几回，才让那道翘角有了往上挑的劲。',
      '桥洞倒映在水里，虚实两道拱正好合成一个圆。你把这巧处也收进稿里，自觉得意。',
      '楼阁的透视一错，满纸皆歪。你从最里一间画起，层层推出来，总算没让梁柱打架。',
      '收工时你把界尺一搁，指节都酸了。可看着那一架规规矩矩的屋宇，心里踏实得很。',
    ],
  },
];

export const ALL_ACTIVITIES: ActivityCard[] = [...DAY_ACTIVITIES, ...MEAL_ACTIVITIES, ...EVENING_ACTIVITIES, ...IDLE_ACTIVITIES, ...PRACTICE_ACTIVITIES];

export const ACTIVITY_BY_ID: Record<string, ActivityCard> = Object.fromEntries(
  ALL_ACTIVITIES.map((card) => [card.id, card]),
);
