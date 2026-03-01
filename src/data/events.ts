export const EVENTS = [
  {
    id: "fm1",
    stage: "firstMeet",
    scene: {
      zh: "你在{{meeting_place}}遇见了{{loverName}}。对方第一眼看起来有点{{loverTrait}}，但眼神里藏着温柔。",
      en: "You met {{loverName}} at {{meeting_place}}. They looked {{loverTrait}} at first, but their eyes held warmth.",
    },
    keyInput: "meeting_place",
    choices: [
      {
        text: { zh: "主动打招呼并问对方最近在忙什么", en: "Say hi first and ask what they've been up to" },
        impact: { affection: 8, chemistry: 6, understanding: 4 },
        reply: {
          zh: "{{loverName}}笑了一下：\"原来你是会先开口的人。\"",
          en: "{{loverName}} smiled: \"So you're the one who starts the conversation.\"",
        },
        inner: {
          zh: "其实我刚才也想开口，只是怕显得太主动。",
          en: "I wanted to speak first too, but I was afraid to seem too eager.",
        },
      },
      {
        text: { zh: "礼貌点头，先观察气氛", en: "Nod politely and read the room first" },
        impact: { affection: 3, chemistry: 2, understanding: 6 },
        reply: {
          zh: "{{loverName}}轻声说：\"你很会看人情绪。\"",
          en: "{{loverName}} said softly: \"You read emotions really well.\"",
        },
        inner: {
          zh: "他很稳，让我觉得安心。",
          en: "They're calm. That makes me feel safe.",
        },
      },
      {
        text: { zh: "开玩笑缓解尴尬", en: "Crack a joke to break the awkwardness" },
        impact: { affection: 6, chemistry: 8, understanding: -1 },
        reply: {
          zh: "{{loverName}}被逗笑了：\"你比我想象中有趣。\"",
          en: "{{loverName}} laughed: \"You're funnier than I expected.\"",
        },
        inner: {
          zh: "我笑得很开心，但也在想他是不是总拿轻松掩饰认真。",
          en: "I laughed, but wondered if they hide sincerity behind humor.",
        },
      },
      {
        text: { zh: "保持距离，只聊必要内容", en: "Keep distance and stick to essentials" },
        impact: { affection: -4, chemistry: -2, understanding: 1 },
        reply: {
          zh: "{{loverName}}礼貌回应，但语气慢慢冷了下来。",
          en: "{{loverName}} stayed polite, but their tone turned colder.",
        },
        inner: {
          zh: "是不是我让对方觉得难以靠近？",
          en: "Maybe I came off as hard to approach.",
        },
      },
    ],
  },
  {
    id: "fm2",
    stage: "firstMeet",
    scene: {
      zh: "聊天中你发现你们都喜欢{{sharedHobby}}，气氛突然自然了很多。",
      en: "In conversation, you discover you both love {{sharedHobby}}, and the vibe becomes much easier.",
    },
    choices: [
      {
        text: { zh: "顺势约下次一起体验", en: "Suggest doing it together next time" },
        impact: { affection: 7, chemistry: 8, understanding: 3 },
        reply: {
          zh: "{{loverName}}点头：\"那说好了，不准放我鸽子。\"",
          en: "{{loverName}} nodded: \"Deal. Don't ghost me.\"",
        },
        inner: {
          zh: "我其实很期待这次约定。",
          en: "I'm secretly looking forward to it.",
        },
      },
      {
        text: { zh: "认真听对方分享经历", en: "Listen closely to their story" },
        impact: { affection: 5, chemistry: 4, understanding: 8 },
        reply: {
          zh: "{{loverName}}说：\"你听人说话的时候很专注。\"",
          en: "{{loverName}} said: \"You really listen.\"",
        },
        inner: {
          zh: "被认真倾听的感觉太久违了。",
          en: "It's been a while since I felt truly heard.",
        },
      },
      {
        text: { zh: "讲自己的高光时刻吸引注意", en: "Share your proud moment to impress them" },
        impact: { affection: 2, chemistry: 5, understanding: -3 },
        reply: {
          zh: "{{loverName}}夸了你，但眼神有点飘。",
          en: "{{loverName}} praised you, though their gaze drifted a bit.",
        },
        inner: {
          zh: "他很优秀，但我更想被理解，不只是被震撼。",
          en: "They're impressive, but I wanted understanding, not just a performance.",
        },
      },
      {
        text: { zh: "故作冷静，结束话题", en: "Play it cool and end the topic" },
        impact: { affection: -3, chemistry: -4, understanding: 2 },
        reply: {
          zh: "{{loverName}}轻轻应了一声，气氛变得克制。",
          en: "{{loverName}} replied softly, and the mood became restrained.",
        },
        inner: {
          zh: "我有点失落，以为我们可以更近一点。",
          en: "I felt a little disappointed. I thought we could be closer.",
        },
      },
    ],
  },
  {
    id: "fm3",
    stage: "firstMeet",
    scene: {
      zh: "分别前，{{loverName}}问你：\"下次还会见吗？\" 风吹过{{meeting_place}}，你心跳突然快了一拍。",
      en: "Before parting, {{loverName}} asked, \"Will I see you again?\" The wind at {{meeting_place}} made your heart skip.",
    },
    choices: [
      {
        text: { zh: "直接说期待再见", en: "Say you look forward to seeing them again" },
        impact: { affection: 8, chemistry: 6, understanding: 4 },
        reply: {
          zh: "{{loverName}}低头笑：\"那我会认真准备下一次。\"",
          en: "{{loverName}} smiled shyly: \"Then I'll prepare properly for next time.\"",
        },
        inner: {
          zh: "原来他也会紧张。",
          en: "So they were nervous too.",
        },
      },
      {
        text: { zh: "把决定权交给对方", en: "Let them decide the next step" },
        impact: { affection: 4, chemistry: 3, understanding: 6 },
        reply: {
          zh: "{{loverName}}说：\"那我来定时间，你别逃。\"",
          en: "{{loverName}} said: \"Then I'll pick the time. Don't run away.\"",
        },
        inner: {
          zh: "被信任的感觉很好。",
          en: "Being trusted feels good.",
        },
      },
      {
        text: { zh: "打趣回避，没给明确答案", en: "Deflect with humor and avoid a clear answer" },
        impact: { affection: 1, chemistry: 2, understanding: -2 },
        reply: {
          zh: "{{loverName}}跟着笑了，但沉默了几秒。",
          en: "{{loverName}} laughed too, but went silent for a few seconds.",
        },
        inner: {
          zh: "我怕自己会错意，所以没再追问。",
          en: "I was afraid to misread this, so I didn't ask more.",
        },
      },
      {
        text: { zh: "礼貌告别，不提下次", en: "Say goodbye politely, no mention of next time" },
        impact: { affection: -5, chemistry: -3, understanding: 1 },
        reply: {
          zh: "{{loverName}}点点头：\"好，那路上小心。\"",
          en: "{{loverName}} nodded: \"Alright, take care on your way home.\"",
        },
        inner: {
          zh: "也许我该更主动一点。",
          en: "Maybe I should have tried harder.",
        },
      },
    ],
  },
  {
    id: "am1",
    stage: "ambiguous",
    scene: {
      zh: "你们约去看了《{{movie_name}}》。散场后，{{loverName}}一路都在悄悄看你反应。",
      en: "You watched \"{{movie_name}}\" together. Afterward, {{loverName}} kept glancing at you quietly.",
    },
    keyInput: "movie_name",
    choices: [
      {
        text: { zh: "主动聊电影里的情感细节", en: "Discuss emotional details from the movie" },
        impact: { affection: 6, chemistry: 4, understanding: 8 },
        reply: {
          zh: "{{loverName}}说：\"你居然注意到了我最在意的那一幕。\"",
          en: "{{loverName}} said: \"You noticed the exact scene that mattered most to me.\"",
        },
        inner: {
          zh: "他真的在理解我。",
          en: "They really try to understand me.",
        },
      },
      {
        text: { zh: "夸对方观影品味并打趣", en: "Compliment their taste and tease playfully" },
        impact: { affection: 7, chemistry: 8, understanding: 2 },
        reply: {
          zh: "{{loverName}}笑着撞了你一下肩膀。",
          en: "{{loverName}} bumped your shoulder with a grin.",
        },
        inner: {
          zh: "和他在一起很轻松。",
          en: "Being around them feels easy.",
        },
      },
      {
        text: { zh: "说电影一般，话题结束", en: "Say it was average and end the topic" },
        impact: { affection: -2, chemistry: -2, understanding: -4 },
        reply: {
          zh: "{{loverName}}愣了下：\"啊...我还挺喜欢的。\"",
          en: "{{loverName}} paused: \"Oh... I actually liked it.\"",
        },
        inner: {
          zh: "是不是我表达太直接了。",
          en: "Maybe I was too blunt.",
        },
      },
      {
        text: { zh: "把话题拉到工作/学习", en: "Switch topic to work/study" },
        impact: { affection: -1, chemistry: -3, understanding: 3 },
        reply: {
          zh: "{{loverName}}点头配合，但情绪慢慢收了起来。",
          en: "{{loverName}} followed your lead, but withdrew emotionally.",
        },
        inner: {
          zh: "我以为我们会多聊一点心里的话。",
          en: "I thought we'd share something deeper tonight.",
        },
      },
    ],
  },
  {
    id: "am2",
    stage: "ambiguous",
    scene: {
      zh: "第二天你收到了{{gift_item}}。卡片只写了三个字：\"给你呀\"。",
      en: "The next day, you received {{gift_item}}. The card had only three words: \"For you.\"",
    },
    keyInput: "gift_item",
    choices: [
      {
        text: { zh: "认真表达感谢并回赠小礼物", en: "Express sincere thanks and give a small gift back" },
        impact: { affection: 8, chemistry: 5, understanding: 5 },
        reply: {
          zh: "{{loverName}}耳尖发红：\"你这样我会更想对你好。\"",
          en: "{{loverName}} blushed: \"Now I want to treat you even better.\"",
        },
        inner: {
          zh: "他有把我的心意放在心上。",
          en: "They truly value my feelings.",
        },
      },
      {
        text: { zh: "轻松道谢，顺便约见面", en: "Thank them casually and suggest meeting" },
        impact: { affection: 6, chemistry: 7, understanding: 3 },
        reply: {
          zh: "{{loverName}}秒回：\"今晚就见？\"",
          en: "{{loverName}} replied instantly: \"Tonight?\"",
        },
        inner: {
          zh: "原来他也在等我的回应。",
          en: "They were waiting for my response too.",
        },
      },
      {
        text: { zh: "故意慢回消息保持神秘", en: "Reply late on purpose to stay mysterious" },
        impact: { affection: -1, chemistry: 2, understanding: -3 },
        reply: {
          zh: "{{loverName}}回了个表情，之后沉默很久。",
          en: "{{loverName}} sent an emoji, then stayed silent for hours.",
        },
        inner: {
          zh: "我有点不安，不确定是不是打扰到他。",
          en: "I grew uneasy, wondering if I crossed a line.",
        },
      },
      {
        text: { zh: "直接问对方是不是喜欢你", en: "Ask directly if they like you" },
        impact: { affection: 3, chemistry: 1, understanding: 2 },
        reply: {
          zh: "{{loverName}}停顿后说：\"我...正在努力靠近你。\"",
          en: "{{loverName}} paused: \"I... am trying to get closer to you.\"",
        },
        inner: {
          zh: "我还没准备好立刻给答案。",
          en: "I wasn't ready to answer right away.",
        },
      },
    ],
  },
  {
    id: "am3",
    stage: "ambiguous",
    scene: {
      zh: "最近{{loverName}}有时很热情，有时突然失联。你决定如何回应这种若即若离？",
      en: "Lately, {{loverName}} is warm one day and distant the next. How do you respond to this push-pull dynamic?",
    },
    choices: [
      {
        text: { zh: "坦诚表达你的不安并询问原因", en: "Honestly share your anxiety and ask why" },
        impact: { affection: 5, chemistry: 4, understanding: 9 },
        reply: {
          zh: "{{loverName}}叹了口气：\"我害怕太认真会失去你。\"",
          en: "{{loverName}} sighed: \"I'm scared if I get serious, I'll lose you.\"",
        },
        inner: {
          zh: "谢谢你愿意问，而不是直接离开。",
          en: "Thank you for asking instead of leaving.",
        },
      },
      {
        text: { zh: "用同样节奏回应，观望对方", en: "Mirror their rhythm and observe" },
        impact: { affection: -1, chemistry: 3, understanding: -1 },
        reply: {
          zh: "{{loverName}}语气变轻松，但边界也更模糊。",
          en: "{{loverName}} became lighter, but boundaries got blurrier.",
        },
        inner: {
          zh: "他是不是也在试探我。",
          en: "Maybe they are testing me too.",
        },
      },
      {
        text: { zh: "制造惊喜拉回热度", en: "Create a surprise to pull things closer" },
        impact: { affection: 7, chemistry: 8, understanding: -1 },
        reply: {
          zh: "{{loverName}}很感动：\"你总能让我心软。\"",
          en: "{{loverName}} was touched: \"You always melt me.\"",
        },
        inner: {
          zh: "他好像懂得怎么点亮我。",
          en: "They know how to light me up.",
        },
      },
      {
        text: { zh: "拉开距离，保护自己", en: "Step back to protect yourself" },
        impact: { affection: -5, chemistry: -4, understanding: 2 },
        reply: {
          zh: "{{loverName}}说：\"如果你想退后，我尊重你。\"",
          en: "{{loverName}} said: \"If you need distance, I respect that.\"",
        },
        inner: {
          zh: "我好像把他推远了。",
          en: "I think I pushed them away.",
        },
      },
    ],
  },
  {
    id: "cf1",
    stage: "confession",
    scene: {
      zh: "你约{{loverName}}在{{confession_place}}见面。夜色很静，你知道这会是关键时刻。",
      en: "You asked {{loverName}} to meet at {{confession_place}}. The night is quiet; this is a turning point.",
    },
    keyInput: "confession_place",
    choices: [
      {
        text: { zh: "直接告白：我想和你正式在一起", en: "Confess directly: I want us to be official" },
        impact: { affection: 10, chemistry: 5, understanding: 4 },
        reply: {
          zh: "{{loverName}}眼眶微红：\"我等这句话很久了。\"",
          en: "{{loverName}}'s eyes softened: \"I've waited so long to hear that.\"",
        },
        inner: {
          zh: "终于，不用再猜了。",
          en: "Finally, no more guessing.",
        },
      },
      {
        text: { zh: "先问对方是否准备好进入关系", en: "Ask if they're ready for a relationship first" },
        impact: { affection: 6, chemistry: 4, understanding: 9 },
        reply: {
          zh: "{{loverName}}说：\"你很认真地在考虑我的感受。\"",
          en: "{{loverName}} said: \"You truly consider how I feel.\"",
        },
        inner: {
          zh: "被尊重的感觉让我更想答应。",
          en: "Feeling respected makes me want to say yes.",
        },
      },
      {
        text: { zh: "用玩笑语气试探告白", en: "Confess in a joking tone to test the waters" },
        impact: { affection: 2, chemistry: 5, understanding: -3 },
        reply: {
          zh: "{{loverName}}笑了下：\"你是认真的吗？\"",
          en: "{{loverName}} smiled lightly: \"Are you serious?\"",
        },
        inner: {
          zh: "我需要一个确定的答案，不想只听玩笑。",
          en: "I needed certainty, not just jokes.",
        },
      },
      {
        text: { zh: "临时改口，今天先不聊关系", en: "Back out and postpone relationship talk" },
        impact: { affection: -6, chemistry: -5, understanding: -1 },
        reply: {
          zh: "{{loverName}}点点头，但明显失落。",
          en: "{{loverName}} nodded, clearly disappointed.",
        },
        inner: {
          zh: "他是不是后悔来了。",
          en: "Maybe they regret coming.",
        },
      },
    ],
  },
  {
    id: "cf2",
    stage: "confession",
    scene: {
      zh: "关系确认后，{{loverName}}提议：\"我们定个相处规则吧？\"",
      en: "After becoming official, {{loverName}} suggested: \"Should we define how we want this relationship to work?\"",
    },
    choices: [
      {
        text: { zh: "一起讨论边界与期待", en: "Discuss boundaries and expectations together" },
        impact: { affection: 7, chemistry: 5, understanding: 9 },
        reply: {
          zh: "{{loverName}}说：\"和你沟通让我安心。\"",
          en: "{{loverName}} said: \"Talking with you makes me feel secure.\"",
        },
        inner: {
          zh: "这段关系好像真的有未来。",
          en: "This relationship might really have a future.",
        },
      },
      {
        text: { zh: "先答应再说，之后顺其自然", en: "Agree now and improvise later" },
        impact: { affection: 4, chemistry: 6, understanding: -2 },
        reply: {
          zh: "{{loverName}}笑着说好，但看起来仍有顾虑。",
          en: "{{loverName}} agreed with a smile, but still looked unsure.",
        },
        inner: {
          zh: "我担心以后会有误会。",
          en: "I worry this may cause misunderstandings later.",
        },
      },
      {
        text: { zh: "强调自由，不想被关系束缚", en: "Stress freedom and avoid feeling tied down" },
        impact: { affection: -2, chemistry: 1, understanding: -4 },
        reply: {
          zh: "{{loverName}}沉默后说：\"我会尽量不打扰你。\"",
          en: "{{loverName}} fell quiet: \"I'll try not to bother you.\"",
        },
        inner: {
          zh: "我只是想靠近，不是想控制。",
          en: "I wanted closeness, not control.",
        },
      },
      {
        text: { zh: "把话题转成玩闹", en: "Turn the talk into playful banter" },
        impact: { affection: 3, chemistry: 7, understanding: -3 },
        reply: {
          zh: "{{loverName}}被逗笑，却又轻轻叹了口气。",
          en: "{{loverName}} laughed, then sighed softly.",
        },
        inner: {
          zh: "开心归开心，问题还在。",
          en: "Fun aside, the issue remains.",
        },
      },
    ],
  },
  {
    id: "cf3",
    stage: "confession",
    scene: {
      zh: "一个深夜电话里，你们决定用{{nick_name}}作为只属于彼此的称呼。",
      en: "During a late-night call, you choose {{nick_name}} as your private nickname.",
    },
    keyInput: "nick_name",
    choices: [
      {
        text: { zh: "认真记录对方喜欢的称呼细节", en: "Carefully note how they like to be called" },
        impact: { affection: 7, chemistry: 5, understanding: 8 },
        reply: {
          zh: "{{loverName}}说：\"你记这些细节的样子很可爱。\"",
          en: "{{loverName}} said: \"It's adorable how you remember details.\"",
        },
        inner: {
          zh: "被重视的感觉太珍贵了。",
          en: "Feeling cherished is precious.",
        },
      },
      {
        text: { zh: "随便起个外号，气氛轻松", en: "Pick a random nickname to keep it light" },
        impact: { affection: 4, chemistry: 7, understanding: 1 },
        reply: {
          zh: "{{loverName}}笑到停不下来。",
          en: "{{loverName}} couldn't stop laughing.",
        },
        inner: {
          zh: "开心，但我也想被认真对待。",
          en: "It's fun, but I also want to be taken seriously.",
        },
      },
      {
        text: { zh: "不太在意称呼，转移话题", en: "Treat nicknames as unimportant and move on" },
        impact: { affection: -2, chemistry: -1, understanding: -4 },
        reply: {
          zh: "{{loverName}}轻声说：\"好吧，那都可以。\"",
          en: "{{loverName}} said softly: \"Okay, anything works then.\"",
        },
        inner: {
          zh: "这明明是我认真准备的小仪式。",
          en: "This little ritual mattered to me.",
        },
      },
      {
        text: { zh: "让对方一个人决定称呼", en: "Let them decide everything" },
        impact: { affection: 1, chemistry: 0, understanding: 3 },
        reply: {
          zh: "{{loverName}}说：\"那我想叫你{{nick_name}}。\"",
          en: "{{loverName}} said: \"Then I'll call you {{nick_name}}.\"",
        },
        inner: {
          zh: "我很开心，但也想知道你自己的想法。",
          en: "I'm happy, but I also want your own choice.",
        },
      },
    ],
  },
  {
    id: "hm1",
    stage: "honeymoon",
    scene: {
      zh: "热恋期的周末，{{loverName}}希望和你制定固定约会日。",
      en: "During the honeymoon phase, {{loverName}} asks to set a regular date day.",
    },
    choices: [
      {
        text: { zh: "认真安排并留出彼此独处时间", en: "Plan it carefully with room for personal time" },
        impact: { affection: 7, chemistry: 7, understanding: 8 },
        reply: {
          zh: "{{loverName}}说：\"你连我想喘口气都考虑到了。\"",
          en: "{{loverName}} said: \"You even considered when I need space.\"",
        },
        inner: {
          zh: "他让我觉得被看见。",
          en: "I feel seen by them.",
        },
      },
      {
        text: { zh: "答应每周都见，尽量黏在一起", en: "Agree to meet every week and stay very close" },
        impact: { affection: 8, chemistry: 8, understanding: -1 },
        reply: {
          zh: "{{loverName}}开心地抱住你。",
          en: "{{loverName}} hugged you happily.",
        },
        inner: {
          zh: "现在很甜，但以后会不会太累？",
          en: "It's sweet now, but will it become exhausting later?",
        },
      },
      {
        text: { zh: "表示最近太忙，改成不固定", en: "Say you're busy and keep it flexible" },
        impact: { affection: -2, chemistry: -1, understanding: 3 },
        reply: {
          zh: "{{loverName}}说：\"好，我会等你有空。\"",
          en: "{{loverName}} said: \"Okay, I'll wait for your free time.\"",
        },
        inner: {
          zh: "我理解他忙，但也会想念。",
          en: "I understand they're busy, but I still miss them.",
        },
      },
      {
        text: { zh: "把决定全交给对方", en: "Let your partner decide everything" },
        impact: { affection: 2, chemistry: 1, understanding: -2 },
        reply: {
          zh: "{{loverName}}说：\"我想听你的意见，不是独角戏。\"",
          en: "{{loverName}} said: \"I want your input, not a solo show.\"",
        },
        inner: {
          zh: "我想的是两个人一起经营。",
          en: "I want this to be co-created.",
        },
      },
    ],
  },
  {
    id: "hm2",
    stage: "honeymoon",
    scene: {
      zh: "你们准备第一次旅行，目的地定在{{travel_place}}。行前计划出现了分歧。",
      en: "You're planning your first trip to {{travel_place}}. Disagreements appear during planning.",
    },
    keyInput: "travel_place",
    choices: [
      {
        text: { zh: "一起列清单，按偏好分配行程", en: "Build a list together and split itinerary by preference" },
        impact: { affection: 6, chemistry: 7, understanding: 9 },
        reply: {
          zh: "{{loverName}}说：\"和你规划像在一起做项目。\"",
          en: "{{loverName}} said: \"Planning with you feels like a great team project.\"",
        },
        inner: {
          zh: "一起解决问题真的很有安全感。",
          en: "Solving things together feels secure.",
        },
      },
      {
        text: { zh: "先满足对方想去的点", en: "Prioritize what they want first" },
        impact: { affection: 7, chemistry: 5, understanding: 4 },
        reply: {
          zh: "{{loverName}}感动地说：\"你真的很宠我。\"",
          en: "{{loverName}} said warmly: \"You spoil me.\"",
        },
        inner: {
          zh: "我很开心，但也怕他委屈自己。",
          en: "I'm happy, but hope they won't suppress themselves.",
        },
      },
      {
        text: { zh: "坚持自己的方案不让步", en: "Insist on your own plan" },
        impact: { affection: -3, chemistry: -2, understanding: -4 },
        reply: {
          zh: "{{loverName}}沉默后说：\"那就按你说的吧。\"",
          en: "{{loverName}} went quiet: \"Fine, we'll do your way.\"",
        },
        inner: {
          zh: "我其实想一起旅行，不是被带着走。",
          en: "I wanted a shared trip, not being dragged along.",
        },
      },
      {
        text: { zh: "提议先暂停，冷静后再讨论", en: "Suggest a pause and revisit calmly" },
        impact: { affection: 3, chemistry: 2, understanding: 7 },
        reply: {
          zh: "{{loverName}}点头：\"好，我们晚点再看。\"",
          en: "{{loverName}} nodded: \"Okay, let's revisit later.\"",
        },
        inner: {
          zh: "他在努力让冲突不升级。",
          en: "They're trying hard not to escalate conflict.",
        },
      },
    ],
  },
  {
    id: "hm3",
    stage: "honeymoon",
    scene: {
      zh: "朋友聚会时，有人开了关于你们关系的玩笑。{{loverName}}看向你，等待你的反应。",
      en: "At a gathering, someone jokes about your relationship. {{loverName}} looks at you, waiting for your reaction.",
    },
    choices: [
      {
        text: { zh: "自然接梗并公开表达在意对方", en: "Play along and openly show you care" },
        impact: { affection: 8, chemistry: 7, understanding: 3 },
        reply: {
          zh: "{{loverName}}眼里都是笑意。",
          en: "{{loverName}}'s eyes lit up.",
        },
        inner: {
          zh: "原来他愿意在大家面前坚定站在我这边。",
          en: "They stand by me even in front of everyone.",
        },
      },
      {
        text: { zh: "礼貌挡下玩笑，保护边界", en: "Politely stop the joke and protect boundaries" },
        impact: { affection: 5, chemistry: 4, understanding: 8 },
        reply: {
          zh: "{{loverName}}轻声说：\"谢谢你替我说话。\"",
          en: "{{loverName}} whispered: \"Thanks for speaking up for me.\"",
        },
        inner: {
          zh: "他懂得我的不自在。",
          en: "They understood my discomfort.",
        },
      },
      {
        text: { zh: "尴尬沉默，让场面过去", en: "Stay silent and let it pass" },
        impact: { affection: -2, chemistry: -1, understanding: -2 },
        reply: {
          zh: "{{loverName}}也笑了笑，但明显有点僵。",
          en: "{{loverName}} smiled too, but looked stiff.",
        },
        inner: {
          zh: "我希望他能接住我的情绪。",
          en: "I hoped they'd catch my feelings there.",
        },
      },
      {
        text: { zh: "顺着玩笑调侃对方", en: "Tease your partner along with the joke" },
        impact: { affection: -3, chemistry: 2, understanding: -5 },
        reply: {
          zh: "{{loverName}}嘴角还在笑，眼神却暗了下来。",
          en: "{{loverName}} kept smiling, but their eyes dimmed.",
        },
        inner: {
          zh: "我以为你会护着我。",
          en: "I thought you'd protect me.",
        },
      },
    ],
  },
  {
    id: "ad1",
    stage: "adjustment",
    scene: {
      zh: "因为{{conflict_reason}}，你们第一次激烈争吵。空气里全是没说出口的委屈。",
      en: "Your first intense fight starts over {{conflict_reason}}. The room fills with unsaid hurt.",
    },
    keyInput: "conflict_reason",
    choices: [
      {
        text: { zh: "先承认情绪，再表达需求", en: "Acknowledge emotions, then express needs" },
        impact: { affection: 6, chemistry: 5, understanding: 10 },
        reply: {
          zh: "{{loverName}}眼神缓下来：\"我们继续说。\"",
          en: "{{loverName}} softened: \"Let's keep talking.\"",
        },
        inner: {
          zh: "谢谢你没有把我当成对手。",
          en: "Thank you for not treating me like an enemy.",
        },
      },
      {
        text: { zh: "先道歉安抚，之后再谈", en: "Apologize first, discuss details later" },
        impact: { affection: 5, chemistry: 5, understanding: 3 },
        reply: {
          zh: "{{loverName}}也放低声音：\"我也有不对。\"",
          en: "{{loverName}} lowered their voice: \"I was wrong too.\"",
        },
        inner: {
          zh: "先停火是对的，但问题还要解决。",
          en: "Ceasefire helps, but the issue still needs work.",
        },
      },
      {
        text: { zh: "翻旧账证明自己没错", en: "Bring up old issues to prove you're right" },
        impact: { affection: -6, chemistry: -5, understanding: -6 },
        reply: {
          zh: "{{loverName}}沉默了很久：\"你根本没在听我。\"",
          en: "{{loverName}} went silent: \"You're not listening to me at all.\"",
        },
        inner: {
          zh: "这句话真的很伤。",
          en: "That line hurt deeply.",
        },
      },
      {
        text: { zh: "直接冷处理，拒绝沟通", en: "Shut down and refuse to talk" },
        impact: { affection: -8, chemistry: -6, understanding: -4 },
        reply: {
          zh: "{{loverName}}只回了句：\"那先这样吧。\"",
          en: "{{loverName}} replied only: \"Fine, let's stop here.\"",
        },
        inner: {
          zh: "我在等你回头。",
          en: "I kept waiting for you to come back.",
        },
      },
    ],
  },
  {
    id: "ad2",
    stage: "adjustment",
    scene: {
      zh: "争吵后的第2天，{{loverName}}发来一句：\"我们还在同一边吗？\"",
      en: "Two days after the fight, {{loverName}} texts: \"Are we still on the same side?\"",
    },
    choices: [
      {
        text: { zh: "回复：我们一起面对，不回避", en: "Reply: We'll face this together, no avoiding" },
        impact: { affection: 8, chemistry: 6, understanding: 8 },
        reply: {
          zh: "{{loverName}}回：\"谢谢你把我们放在第一位。\"",
          en: "{{loverName}} replied: \"Thank you for putting us first.\"",
        },
        inner: {
          zh: "这句让我又有勇气了。",
          en: "That gave me courage again.",
        },
      },
      {
        text: { zh: "约线下见面，当面沟通", en: "Ask to meet offline and talk face-to-face" },
        impact: { affection: 6, chemistry: 8, understanding: 5 },
        reply: {
          zh: "{{loverName}}说：\"好，我想看着你说。\"",
          en: "{{loverName}} said: \"Okay, I want to say it while seeing you.\"",
        },
        inner: {
          zh: "见面总比猜测好。",
          en: "Meeting is better than guessing.",
        },
      },
      {
        text: { zh: "只回一个表情，保持模糊", en: "Reply with an emoji and stay vague" },
        impact: { affection: -3, chemistry: -2, understanding: -4 },
        reply: {
          zh: "{{loverName}}没有再回。",
          en: "{{loverName}} didn't reply after that.",
        },
        inner: {
          zh: "是不是我不值得一个明确答案。",
          en: "Maybe I don't deserve a clear answer.",
        },
      },
      {
        text: { zh: "表示想一个人冷静一阵", en: "Say you need to cool off alone for a while" },
        impact: { affection: -1, chemistry: -3, understanding: 2 },
        reply: {
          zh: "{{loverName}}回：\"我会等你，但别太久。\"",
          en: "{{loverName}} replied: \"I'll wait, just not forever.\"",
        },
        inner: {
          zh: "我怕等着等着就散了。",
          en: "I'm scared waiting will become drifting apart.",
        },
      },
    ],
  },
  {
    id: "ad3",
    stage: "adjustment",
    scene: {
      zh: "你们尝试制定新的沟通规则。{{loverName}}想知道：发生矛盾时，你最需要什么？",
      en: "You try setting new communication rules. {{loverName}} asks: What do you need most during conflict?",
    },
    choices: [
      {
        text: { zh: "希望彼此先确认感受，再谈对错", en: "Ask to validate feelings first, then discuss right/wrong" },
        impact: { affection: 6, chemistry: 4, understanding: 9 },
        reply: {
          zh: "{{loverName}}点头：\"我会记住这个顺序。\"",
          en: "{{loverName}} nodded: \"I'll remember that order.\"",
        },
        inner: {
          zh: "我们开始像一个团队。",
          en: "We're starting to act like a team.",
        },
      },
      {
        text: { zh: "提出每周一次关系复盘", en: "Propose a weekly relationship check-in" },
        impact: { affection: 5, chemistry: 6, understanding: 7 },
        reply: {
          zh: "{{loverName}}笑说：\"恋爱版周会，我喜欢。\"",
          en: "{{loverName}} grinned: \"A relationship stand-up? I like it.\"",
        },
        inner: {
          zh: "他愿意一起努力，这很难得。",
          en: "Their willingness to work on this matters a lot.",
        },
      },
      {
        text: { zh: "强调别再争吵就好，细节不重要", en: "Say no more fights matter, details don't" },
        impact: { affection: -2, chemistry: -1, understanding: -5 },
        reply: {
          zh: "{{loverName}}说：\"可是不谈细节，问题会回来。\"",
          en: "{{loverName}} said: \"If we skip details, problems return.\"",
        },
        inner: {
          zh: "我怕我们只是把问题压下去。",
          en: "I'm afraid we're just suppressing issues.",
        },
      },
      {
        text: { zh: "把规则定义全部交给对方", en: "Let your partner define all rules" },
        impact: { affection: 0, chemistry: -1, understanding: -2 },
        reply: {
          zh: "{{loverName}}说：\"我不想一个人决定我们的关系。\"",
          en: "{{loverName}} said: \"I don't want to decide our relationship alone.\"",
        },
        inner: {
          zh: "我需要的是并肩，而不是单向输出。",
          en: "I need partnership, not one-way output.",
        },
      },
    ],
  },
  {
    id: "st1",
    stage: "stable",
    scene: {
      zh: "稳定期里，{{loverName}}拿到了异地机会。你们必须做决定。",
      en: "In the stable phase, {{loverName}} gets an opportunity in another city. You must decide together.",
    },
    choices: [
      {
        text: { zh: "支持对方追梦，并设计远距计划", en: "Support their dream and design a long-distance plan" },
        impact: { affection: 8, chemistry: 6, understanding: 8 },
        reply: {
          zh: "{{loverName}}抱住你：\"谢谢你把未来当成我们一起的事。\"",
          en: "{{loverName}} hugged you: \"Thanks for treating the future as ours.\"",
        },
        inner: {
          zh: "他的支持让我更想坚定留下。",
          en: "Their support makes me want to stay committed.",
        },
      },
      {
        text: { zh: "希望对方留下，承诺共同努力", en: "Ask them to stay and promise joint effort" },
        impact: { affection: 6, chemistry: 5, understanding: 5 },
        reply: {
          zh: "{{loverName}}沉思后说：\"我想把你放进我的选择里。\"",
          en: "{{loverName}} thought for a while: \"I want to include you in my choice.\"",
        },
        inner: {
          zh: "我在理想和爱之间拉扯。",
          en: "I'm torn between dreams and love.",
        },
      },
      {
        text: { zh: "觉得太麻烦，建议顺其自然", en: "Say it's too much trouble and let fate decide" },
        impact: { affection: -4, chemistry: -3, understanding: -4 },
        reply: {
          zh: "{{loverName}}回：\"你听起来像已经准备放弃。\"",
          en: "{{loverName}} replied: \"You sound like you've already given up.\"",
        },
        inner: {
          zh: "我希望你能为我们多争取一点。",
          en: "I hoped you'd fight for us a bit more.",
        },
      },
      {
        text: { zh: "要求对方只能二选一：事业或感情", en: "Force a binary choice: career or relationship" },
        impact: { affection: -7, chemistry: -5, understanding: -6 },
        reply: {
          zh: "{{loverName}}低声说：\"我不想被这样逼着选。\"",
          en: "{{loverName}} said quietly: \"I don't want to be forced like this.\"",
        },
        inner: {
          zh: "这不是我想要的爱。",
          en: "This isn't the love I wanted.",
        },
      },
    ],
  },
  {
    id: "st2",
    stage: "stable",
    scene: {
      zh: "关于未来规划，你们第一次认真谈到\"家\"与\"责任\"。",
      en: "You have your first deep conversation about \"home\" and \"responsibility\".",
    },
    choices: [
      {
        text: { zh: "坦诚长期目标，并询问对方节奏", en: "Share long-term goals honestly and ask their pace" },
        impact: { affection: 7, chemistry: 6, understanding: 9 },
        reply: {
          zh: "{{loverName}}说：\"你让我看到可执行的未来。\"",
          en: "{{loverName}} said: \"You make the future feel actionable.\"",
        },
        inner: {
          zh: "原来他是认真考虑一生的人。",
          en: "They're truly thinking long-term.",
        },
      },
      {
        text: { zh: "先给出承诺，再慢慢补细节", en: "Give commitment first and fill details later" },
        impact: { affection: 6, chemistry: 7, understanding: 3 },
        reply: {
          zh: "{{loverName}}握住你的手：\"我愿意信你。\"",
          en: "{{loverName}} held your hand: \"I choose to trust you.\"",
        },
        inner: {
          zh: "我想信，但也想更确定。",
          en: "I want to trust, but I also need clarity.",
        },
      },
      {
        text: { zh: "避免讨论未来，只谈当下", en: "Avoid future talks and stay in the present" },
        impact: { affection: -2, chemistry: 1, understanding: -5 },
        reply: {
          zh: "{{loverName}}说：\"我不是在催你，只是想知道方向。\"",
          en: "{{loverName}} said: \"I'm not rushing you, I just need direction.\"",
        },
        inner: {
          zh: "没有方向感让我很不安。",
          en: "Lack of direction makes me anxious.",
        },
      },
      {
        text: { zh: "把决定全部推迟到以后", en: "Postpone all decisions indefinitely" },
        impact: { affection: -4, chemistry: -2, understanding: -3 },
        reply: {
          zh: "{{loverName}}轻轻点头：\"那先这样吧。\"",
          en: "{{loverName}} nodded quietly: \"Then let's leave it for now.\"",
        },
        inner: {
          zh: "我怕我们会在拖延里失去彼此。",
          en: "I'm afraid delay will cost us each other.",
        },
      },
    ],
  },
  {
    id: "st3",
    stage: "stable",
    scene: {
      zh: "最后的考验来临：一次误会让你们都非常受伤。此刻，你会怎样守护这段关系？",
      en: "The final trial arrives: a misunderstanding hurts both of you deeply. How will you protect this relationship now?",
    },
    choices: [
      {
        text: { zh: "先倾听完整感受，再表达立场", en: "Listen fully first, then share your stance" },
        impact: { affection: 9, chemistry: 7, understanding: 10 },
        reply: {
          zh: "{{loverName}}眼眶湿润：\"谢谢你还愿意和我并肩。\"",
          en: "{{loverName}}'s eyes turned wet: \"Thank you for still standing beside me.\"",
        },
        inner: {
          zh: "这一次，我真的相信我们可以走很远。",
          en: "This time, I truly believe we can go far.",
        },
      },
      {
        text: { zh: "主动拥抱和解，约定改进", en: "Initiate reconciliation and agree on improvements" },
        impact: { affection: 8, chemistry: 9, understanding: 4 },
        reply: {
          zh: "{{loverName}}紧紧抱住你：\"我们一起变更好。\"",
          en: "{{loverName}} held you tight: \"We'll grow better together.\"",
        },
        inner: {
          zh: "他给了我留下来的理由。",
          en: "They gave me a reason to stay.",
        },
      },
      {
        text: { zh: "强调自己没有错，要求对方让步", en: "Insist you're right and demand compromise" },
        impact: { affection: -6, chemistry: -4, understanding: -6 },
        reply: {
          zh: "{{loverName}}声音发抖：\"你是不是从没想懂我。\"",
          en: "{{loverName}}'s voice shook: \"Did you ever try to understand me?\"",
        },
        inner: {
          zh: "也许我们走到这里了。",
          en: "Maybe this is where we end.",
        },
      },
      {
        text: { zh: "直接提出分开，避免再伤害", en: "Suggest ending things to avoid further hurt" },
        impact: { affection: -10, chemistry: -8, understanding: -3 },
        reply: {
          zh: "{{loverName}}轻轻说：\"如果这是你的决定，我尊重。\"",
          en: "{{loverName}} whispered: \"If that's your decision, I respect it.\"",
        },
        inner: {
          zh: "我其实不想这样结束。",
          en: "I never wanted it to end like this.",
        },
      },
    ],
  },
];

