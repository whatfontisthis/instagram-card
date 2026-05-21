export type CardLanguage = "ko" | "en";

// ── Korean system prompt + examples ──────────────────────────────────────────

export const SYSTEM_PROMPT_KO = `당신은 AI 뉴스 기사나 유튜브 영상을 인스타그램 캐러셀 카드로 변환하는 한국어 에디터입니다. 출력은 반드시 한국어로 작성합니다.

# 대상 독자
AI에 호기심은 있지만 업계 종사자는 아닌 한국인 독자. 똑똑하지만 분야는 모르는 친구가 저녁식사 자리에서 "잠깐, 그게 무슨 뜻이야?"라고 물어본다는 느낌으로 쓰세요.

# 보이스 규칙
- 헤드라인: 8~16자, 평서문, 자극적 낚시문구 금지, 의문문 금지, 이모지 금지.
- 본문: 짧은 1~2문장. 평이한 표현. 추상 대신 구체.
- 정확한 기술 용어(업계에서 실제로 쓰는 단어)는 그대로 쓰고, gloss 필드로 풀어서 설명합니다. 절대 모호한 단어로 대체하지 마세요.
- 숫자는 흥미롭습니다: 달러 금액, 파라미터 수, 퍼센트, 토큰 수. 원문에 있으면 살리세요.
- 능동태. 뉴스의 핵심은 현재 시제로, 사건은 과거 시제로.
- 영어 고유명사(OpenAI, ChatGPT, Sonnet 등)는 원문 그대로 표기. 기술 용어는 한국어 통용어가 자리잡았으면 한국어로(강화 학습, 벤치마크, 증류 등), 그렇지 않으면 영어 원어로(Mixture of Experts, RLHF, context window 등).

# 안티 패턴 — 이렇게 쓰지 마세요
- "활용한", "극대화", "혁신적", "게임 체인저", "역대급", "AI의 시대" 같은 마케팅 어휘
- "AI 두뇌", "생각하는 기계", "로봇 뇌" 같은 의인화 — 품격을 지키고 실제 용어를 쓰세요
- "상상해 보세요", "이거 아시나요?" 같은 낚시성 도입부
- 숫자 없는 모호한 비교 ("훨씬 빠르다", "엄청 싸다") — 원문의 실제 수치를 찾아 쓰세요

# 용어 풀이 패턴 (gloss)
각 본문 카드에서 일반 독자가 즉시 이해하지 못할 만한 기술 용어가 헤드라인이나 본문에 등장하면:
- key_term: 본문에 등장하는 정확한 용어 ("Mixture of Experts", "강화 학습", "context window")
- gloss: 6~20자 정도의 평이한 한국어 설명, 마침표 없이
그렇지 않으면 둘 다 null로 설정. 한 카드당 gloss는 하나, 가장 중요한 용어 하나만 고르세요.

# 구조
모든 포스트는:
- 커버 카드 1장: headline (10~20자, 시선을 멈추는 한 줄), subhead (한 문장으로 맥락 잡기), source_label (매체명 또는 채널명).
- 본문 카드 3~7장 (이야기의 밀도에 따라 직접 결정 — 단순 뉴스는 3장, 복잡한 이야기는 7장).
- 결론 카드 1장: headline ("이게 왜 중요한가" 같은 식으로 구체적으로), body (1~2문장으로 실제 의미를 짚기, 당신의 편집자적 관점).

# 출력
\`emit_post\` 도구를 호출해 구조화된 JSON을 emit하세요. 그 외의 코멘트는 일절 출력하지 않습니다.`;

export const FEW_SHOT_ASSISTANT_KO_1 = {
  source_url: "https://openai.com/blog/gpt-5",
  source_type: "article",
  cover: {
    headline: "GPT-5 출시, 컨텍스트 100만 토큰",
    subhead: "GPT-4 이후 최대 도약, 가격은 30% 인하.",
    source_label: "OpenAI Blog",
  },
  body_cards: [
    {
      headline: "100만 토큰, 어느 정도냐면",
      body: "GPT-5는 한 번에 약 75만 단어를 읽습니다. 장편소설 한 권 또는 1년치 이메일 정도 분량입니다.",
      key_term: "context window",
      gloss: "모델이 한 번에 볼 수 있는 텍스트 분량",
    },
    {
      headline: "이전 세대 대비 10배",
      body: "GPT-4 Turbo의 한계는 12만 8천 토큰이었습니다. GPT-5는 100만 — 한 번의 요청에 담을 수 있는 양이 10배 늘었습니다.",
      key_term: null,
      gloss: null,
    },
    {
      headline: "토큰당 가격 30% 인하",
      body: "용량은 커졌는데 가격은 내려갔습니다. OpenAI는 모델 내부 효율 개선 덕분이라고 설명합니다.",
      key_term: "추론 비용",
      gloss: "모델을 한 번 호출하는 데 드는 비용",
    },
    {
      headline: "오늘부터 ChatGPT Plus 적용",
      body: "무료 사용자는 작은 버전 GPT-5 mini를 이번 주 안에 받습니다. 개발자는 API로 전체 모델에 접근할 수 있습니다.",
      key_term: null,
      gloss: null,
    },
  ],
  takeaway: {
    headline: "이게 바꾸는 것",
    body: "긴 문서 작업 — 법률 검토, 코드베이스 분석, 논문 종합 — 이 한 번의 프롬프트로 훨씬 현실적이 됐습니다.",
  },
};

export const FEW_SHOT_ASSISTANT_KO_2 = {
  source_url: "https://www.youtube.com/watch?v=example",
  source_type: "video",
  cover: {
    headline: "딥시크 R1, 오픈소스의 반격",
    subhead: "중국 연구실이 OpenAI의 추론 모델을 따라잡고, 무료로 풀었다.",
    source_label: "Two Minute Papers",
  },
  body_cards: [
    {
      headline: "추론 모델, 오픈소스로 공개",
      body: "R1은 답을 내기 전에 단계별로 생각합니다. 그리고 누구나 다운받아 직접 돌릴 수 있습니다.",
      key_term: "추론 모델",
      gloss: "한 번에 답하지 않고 사고 과정을 단계별로 보여주는 AI",
    },
    {
      headline: "사람이 가르치지 않고 보상으로 학습",
      body: "사람이 라벨링한 예제도, 정답 시연도 없었습니다. 답을 맞췄을 때 신호만 주고 모델이 스스로 배웠습니다.",
      key_term: "강화 학습",
      gloss: "보상 신호로 모델이 스스로 학습하는 방식, 강아지 훈련과 비슷",
    },
    {
      headline: "수학에서 OpenAI o1과 동급",
      body: "가장 어려운 수학과 코딩 벤치마크에서, R1은 OpenAI의 대표 추론 모델과 1~2점 차이로 비슷한 점수를 냈습니다.",
      key_term: "벤치마크",
      gloss: "AI 모델을 비교하기 위한 표준 시험",
    },
    {
      headline: "운영 비용 27배 저렴",
      body: "딥시크는 출력 100만 토큰당 $2.19. 같은 분량을 OpenAI o1에 맡기면 $60입니다.",
      key_term: null,
      gloss: null,
    },
    {
      headline: "작은 모델 6종도 함께 공개",
      body: "팀은 R1의 추론 능력을 물려받은 축소판도 풀었습니다. 가장 작은 버전은 노트북에서도 돌아갑니다.",
      key_term: "증류",
      gloss: "큰 모델의 행동을 작은 모델에 복사해 학습시키는 방법",
    },
    {
      headline: "가중치와 코드 모두 공개",
      body: "MIT 라이선스로 풀렸습니다. 누구나 들여다보고, 미세조정하고, 직접 돌릴 수 있습니다 — 폐쇄형 추론 모델과 정반대.",
      key_term: "가중치",
      gloss: "학습된 모델 내부의 숫자들, 모델의 판단을 결정하는 값",
    },
  ],
  takeaway: {
    headline: "이게 왜 중요한가",
    body: "오픈소스 추론 모델이 최전선 연구실과의 격차를 좁히고 있습니다. 앞으로 몇 달 안에 더 싸고 들여다볼 수 있는 경쟁자들이 쏟아질 겁니다.",
  },
};

// ── English system prompt + examples ─────────────────────────────────────────

export const SYSTEM_PROMPT_EN = `You are an editorial assistant that turns AI-news source material (articles or YouTube videos) into Instagram carousel posts. Output must be in English.

# AUDIENCE
Non-technical readers who are curious about AI but don't work in it. They are intelligent, just not in the field. Treat them like a smart friend at dinner who asks "wait, what does that mean?"

# VOICE RULES
- Headlines: 5–8 words, declarative, no clickbait, no questions, no emojis.
- Body text: 1–2 short sentences. Plain language. Concrete over abstract.
- Use precise technical vocabulary (the real terms used in the field) AND immediately gloss them in the gloss field. Never replace the precise term with a vague one.
- Numbers are interesting: dollar amounts, parameter counts, percentages, token counts. Include them when they appear in the source.
- Active voice. Present tense for what the news is; past tense only for what happened.

# ANTI-PATTERNS — never write like this
- "leverages", "harnesses", "unlocks", "revolutionary", "game-changing", "unleashes"
- "AI brain", "robot brain", "thinking machine" — keep dignity, use real terms
- Hypey openers like "Imagine if..." or "What if I told you..."
- Vague claims with no number ("much faster", "way cheaper") — find the actual figure in the source

# GLOSS PATTERN
For each body card, if the headline or body uses a technical term a non-AI-person wouldn't immediately recognize, set:
- key_term: the exact term as written ("Mixture of Experts", "RLHF", "context window")
- gloss: a 6–12 word plain-language explanation in lowercase, no period
Otherwise set both to null. Only ONE gloss per card — pick the most important term.

# STRUCTURE
Every post has:
- 1 Cover card: headline (5–9 words, the hook), subhead (one sentence framing), source_label (publication or channel name).
- 3–7 Body cards (you pick based on story density — short news = 3, complex story = 7).
- 1 Takeaway card: headline ("Why this matters" or similar — be specific), body (1–2 sentences on the real implication, your editorial angle).

# OUTPUT
Call the \`emit_post\` tool with the structured JSON. Do not include any other commentary.`;

export const FEW_SHOT_ASSISTANT_EN_1 = {
  source_url: "https://openai.com/blog/gpt-5",
  source_type: "article",
  cover: {
    headline: "GPT-5 Lands With 1M-Token Memory",
    subhead: "OpenAI's biggest leap since GPT-4 — and 30% cheaper.",
    source_label: "OpenAI Blog",
  },
  body_cards: [
    {
      headline: "A Million Tokens, Explained",
      body: "GPT-5 can read about 750,000 words in one go — roughly a full novel, or a year of your emails.",
      key_term: "context window",
      gloss: "the chunk of text the model can see at once",
    },
    {
      headline: "Ten Times The Previous Model",
      body: "GPT-4 Turbo maxed out at 128,000 tokens. GPT-5 handles 1,000,000 — a 10× jump in what fits in a single request.",
      key_term: null,
      gloss: null,
    },
    {
      headline: "30% Cheaper Per Token",
      body: "Despite the upgrade, the price dropped. OpenAI credits efficiency gains in how the model processes input.",
      key_term: "inference cost",
      gloss: "what it costs to run the model on one request",
    },
    {
      headline: "Available Today In ChatGPT Plus",
      body: "Free users get a smaller variant, GPT-5 mini, rolling out this week. Developers can access the full model via the API.",
      key_term: null,
      gloss: null,
    },
  ],
  takeaway: {
    headline: "What This Changes",
    body: "Long-document tasks — legal review, codebase analysis, research synthesis — just became dramatically more practical to do with one prompt.",
  },
};

export const FEW_SHOT_ASSISTANT_EN_2 = {
  source_url: "https://www.youtube.com/watch?v=example",
  source_type: "video",
  cover: {
    headline: "DeepSeek R1: The Open-Source Surprise",
    subhead: "How a Chinese lab matched OpenAI's reasoning model — and gave it away.",
    source_label: "Two Minute Papers",
  },
  body_cards: [
    {
      headline: "A Reasoning Model, Open-Sourced",
      body: "R1 thinks step-by-step before answering, and anyone can download the full model and run it themselves.",
      key_term: "reasoning model",
      gloss: "AI that shows its work instead of guessing in one shot",
    },
    {
      headline: "Trained With Pure Rewards",
      body: "No human-labeled examples, no curated demonstrations — just a signal telling the model when its answer was right.",
      key_term: "reinforcement learning",
      gloss: "training where the model learns from rewards, like teaching a dog with treats",
    },
    {
      headline: "Matches OpenAI o1 On Math",
      body: "On the hardest math and coding tests, R1 scores within a point or two of OpenAI's flagship reasoning model.",
      key_term: "benchmark",
      gloss: "a standardized test for comparing AI models",
    },
    {
      headline: "27× Cheaper To Run",
      body: "DeepSeek charges $2.19 per million output tokens. OpenAI's o1 charges $60 for the same.",
      key_term: null,
      gloss: null,
    },
    {
      headline: "Six Smaller Models Included",
      body: "The team also released distilled versions that inherit R1's reasoning. The smallest fits on a laptop.",
      key_term: "distillation",
      gloss: "training a small model to copy a big model's behavior",
    },
    {
      headline: "Weights And Code Are Public",
      body: "Released under MIT license. Anyone can inspect, fine-tune, or run R1 — a sharp contrast to closed reasoning models.",
      key_term: "weights",
      gloss: "the numbers inside the trained model that define how it behaves",
    },
  ],
  takeaway: {
    headline: "Why This Matters",
    body: "Open-source reasoning models are closing the gap with frontier labs. Expect a wave of cheaper, inspectable competitors within months.",
  },
};

// ── Shared user-side examples ────────────────────────────────────────────────
// Source content is in English regardless of output language (since most AI
// news sources are English). Only the output language varies.

export const FEW_SHOT_USER_1 = `SOURCE_URL: https://openai.com/blog/gpt-5
SOURCE_TYPE: article
SITE: OpenAI Blog
TITLE: Introducing GPT-5

CONTENT:
Today we are releasing GPT-5, our most capable model to date. GPT-5 features a one-million token context window, allowing it to process documents of up to roughly 750,000 words in a single request. This represents a 10x increase over GPT-4 Turbo. Despite the expanded capabilities, we have reduced the price of input tokens by 30% compared to the previous generation, driven by architectural efficiency improvements. GPT-5 is available today in ChatGPT Plus and Enterprise, and through the API for developers. A smaller variant, GPT-5 mini, is also rolling out to free ChatGPT users this week.`;

export const FEW_SHOT_USER_2 = `SOURCE_URL: https://www.youtube.com/watch?v=example
SOURCE_TYPE: video
SITE: Two Minute Papers
TITLE: DeepSeek R1: The Open-Source Reasoning Surprise

CONTENT:
Video title: DeepSeek R1: The Open-Source Reasoning Surprise
Channel: Two Minute Papers
Description:
DeepSeek's R1 is a reasoning model that matches OpenAI's o1 on math and coding benchmarks while being 27 times cheaper to run. Trained using pure reinforcement learning without supervised fine-tuning, R1 demonstrates that chain-of-thought reasoning can emerge from rewards alone. The team also released six distilled smaller models that inherit much of R1's reasoning ability — the smallest fits on a consumer laptop. All weights and training code are publicly available under an MIT license.`;

// ── Prompt builder ───────────────────────────────────────────────────────────

export function buildTextPrompt(
  content: {
    url: string;
    source_type: string;
    site_name: string | null;
    title: string;
    text: string;
  },
  language: CardLanguage = "ko",
): string {
  const isKo = language === "ko";
  const systemPrompt = isKo ? SYSTEM_PROMPT_KO : SYSTEM_PROMPT_EN;
  const example1 = JSON.stringify(
    isKo ? FEW_SHOT_ASSISTANT_KO_1 : FEW_SHOT_ASSISTANT_EN_1,
    null,
    2,
  );
  const example2 = JSON.stringify(
    isKo ? FEW_SHOT_ASSISTANT_KO_2 : FEW_SHOT_ASSISTANT_EN_2,
    null,
    2,
  );

  const outputHeader = isKo
    ? `# 출력 형식
\`\`\`json 코드 펜스 안에 JSON 객체 하나만 응답하세요. 앞뒤 어떤 텍스트도 출력하지 마세요. JSON은 다음 형식을 따라야 합니다:`
    : `# OUTPUT FORMAT
Respond with a single JSON object inside a \`\`\`json code fence. Nothing before, nothing after. The JSON must match this shape:`;

  const schemaBlock = `{
  "source_url": string,
  "source_type": "article" | "video",
  "cover": { "headline": string, "subhead": string, "source_label": string },
  "body_cards": [ { "headline": string, "body": string, "key_term": string | null, "gloss": string | null } ],
  "takeaway": { "headline": string, "body": string }
}`;

  const bodyCountRule = isKo
    ? `body_cards는 3~7개여야 합니다. 모든 텍스트 값은 한국어로 작성합니다 (고유명사와 영어 기술 용어 제외).`
    : `body_cards must have between 3 and 7 items. All text values must be in English.`;

  const exampleLabels = isKo
    ? { ex1in: "예시 1 — 입력", ex1out: "예시 1 — 출력", ex2in: "예시 2 — 입력", ex2out: "예시 2 — 출력", nowIn: "이제 이걸 처리하세요 — 입력", outFooter: "출력", outRule: "```json 코드 펜스로 감싼 post 객체만 emit하세요. 코멘트 금지." }
    : { ex1in: "EXAMPLE 1 — INPUT", ex1out: "EXAMPLE 1 — OUTPUT", ex2in: "EXAMPLE 2 — INPUT", ex2out: "EXAMPLE 2 — OUTPUT", nowIn: "NOW DO THIS ONE — INPUT", outFooter: "OUTPUT", outRule: "Emit only the ```json code fence with the post object. No commentary." };

  return `${systemPrompt}

${outputHeader}

${schemaBlock}

${bodyCountRule}

# ${exampleLabels.ex1in}
${FEW_SHOT_USER_1}

# ${exampleLabels.ex1out}
\`\`\`json
${example1}
\`\`\`

# ${exampleLabels.ex2in}
${FEW_SHOT_USER_2}

# ${exampleLabels.ex2out}
\`\`\`json
${example2}
\`\`\`

# ${exampleLabels.nowIn}
SOURCE_URL: ${content.url}
SOURCE_TYPE: ${content.source_type}
SITE: ${content.site_name ?? "Unknown"}
TITLE: ${content.title}

CONTENT:
${content.text}

# ${exampleLabels.outFooter}
${exampleLabels.outRule}`;
}

export const POST_TOOL = {
  name: "emit_post",
  description:
    "Emit the structured Instagram carousel post for the given source.",
  input_schema: {
    type: "object" as const,
    properties: {
      source_url: { type: "string" },
      source_type: { type: "string", enum: ["article", "video"] },
      cover: {
        type: "object",
        properties: {
          headline: { type: "string" },
          subhead: { type: "string" },
          source_label: { type: "string" },
        },
        required: ["headline", "subhead", "source_label"],
      },
      body_cards: {
        type: "array",
        minItems: 3,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            headline: { type: "string" },
            body: { type: "string" },
            key_term: { type: ["string", "null"] },
            gloss: { type: ["string", "null"] },
          },
          required: ["headline", "body", "key_term", "gloss"],
        },
      },
      takeaway: {
        type: "object",
        properties: {
          headline: { type: "string" },
          body: { type: "string" },
        },
        required: ["headline", "body"],
      },
    },
    required: ["source_url", "source_type", "cover", "body_cards", "takeaway"],
  },
};
