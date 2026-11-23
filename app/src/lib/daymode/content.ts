// ============================================================
// DAY MODE — editable content block (wording, colors, sources)
// ============================================================

export type Phase = "Menstrual" | "Follicular" | "Ovulatory" | "Early luteal" | "Late luteal";
export type Mode = "Peak" | "Steady" | "Wind-down" | "Restore";

export const PHASE_TEXT: Record<Phase, { hormones: string; adhd: string }> = {
  Menstrual: {
    hormones: "Estrogen and progesterone are both at their lowest.",
    adhd: "Low estrogen means less support for dopamine, so focus, memory and getting started can feel harder, especially the first couple of days. It eases as estrogen starts to climb.",
  },
  Follicular: {
    hormones: "Estrogen is rising.",
    adhd: "Often the easiest stretch for focus, motivation and starting things. If you take a stimulant, it tends to work its strongest now.",
  },
  Ovulatory: {
    hormones: "Estrogen peaks, with a brief rise in testosterone.",
    adhd: "Often sharp, social, high-energy days. Some studies also see restlessness and impulsivity tick up around now, so watch for saying yes to too much.",
  },
  "Early luteal": {
    hormones: "Progesterone is rising; estrogen dips, then rises again.",
    adhd: "Some women notice more impulsivity and wandering attention after ovulation. Rising progesterone may also blunt stimulant medication a little.",
  },
  "Late luteal": {
    hormones: "Estrogen and progesterone are both falling fast.",
    adhd: "The most consistently reported hard stretch: scattered attention, irritability, low energy and mood dips, and medication can feel weaker. It's hormones, not you slipping. Plan lighter.",
  },
};

export const PHASE_SOURCES: { label: string; url: string }[] = [
  {
    label: "ADHD and the menstrual cycle: theory and evidence (Hormones and Behavior, 2024)",
    url: "https://pubmed.ncbi.nlm.nih.gov/38039899/",
  },
  {
    label: "ADHD and sex hormones in females: a systematic review (J. Attention Disorders, 2025)",
    url: "https://journals.sagepub.com/doi/10.1177/10870547251332319",
  },
  {
    label:
      "Menstrual cycle hormones and cognition in ADHD: narrative review (J. Clinical Medicine, 2025)",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12786913/",
  },
  {
    label: "Premenstrual adjustment of stimulant dosage (Frontiers in Psychiatry, 2023)",
    url: "https://www.frontiersin.org/articles/10.3389/fpsyt.2023.1306194",
  },
];

export const LIFESTAGE_SOURCES: { label: string; url: string }[] = [
  {
    label: "Perimenopausal symptoms in women with and without ADHD (population cohort, 2025)",
    url: "https://pubmed.ncbi.nlm.nih.gov/40903825/",
  },
  {
    label: "Menstrual cycle changes approaching the final period: STRAW+10 criteria (2018 review)",
    url: "https://pubmed.ncbi.nlm.nih.gov/30401545/",
  },
  {
    label: "Perimenopause overview (Mayo Clinic)",
    url: "https://mayoclinic.org/diseases-conditions/perimenopause",
  },
];

export const MODES: Record<Mode, { color: string; darkText: boolean; advice: string }> = {
  Peak: {
    color: "#1baf7a",
    darkText: true,
    advice:
      "Your best brain is here. Write the hard thing first, then the calls, pitches and big asks.",
  },
  Steady: {
    color: "#2a78d6",
    darkText: false,
    advice: "A good, ordinary day. Morning writing as usual, then work the business list.",
  },
  "Wind-down": {
    color: "#eda100",
    darkText: true,
    advice: "Lighter lift. Editing, admin and replies. Stop early on purpose.",
  },
  Restore: {
    color: "#6250d6",
    darkText: false,
    advice: "Rest is the work today. One small thing, then step away.",
  },
};

export const PHASE_TINT: Record<Phase, string> = {
  Menstrual: "#F3D9D7",
  Follicular: "#DCEFE6",
  Ovulatory: "#FBEFC9",
  "Early luteal": "#E3E6F5",
  "Late luteal": "#EDE0F0",
};

export const PHASE_ABBR: Record<Phase, string> = {
  Menstrual: "M",
  Follicular: "F",
  Ovulatory: "O",
  "Early luteal": "EL",
  "Late luteal": "LL",
};

export const PERIOD_RED = "#C9332A";

// Writing lines (WLINES) — pick one per day so it doesn't flicker.
export const WLINES = {
  rest: [
    "Rest counts. Ideas keep composting while you're away.",
    "A day off the page is part of the practice.",
    "Refilling the well is writing work too.",
  ],
  restEasyMode: [
    "Your body asked for an easier day, and you listened. That's wisdom, not slacking.",
  ],
  little: [
    "A little is how books actually get written.",
    "You touched the work. That keeps it alive.",
    "Small pages add up to whole chapters.",
  ],
  some: [
    "That's real time with the work. Nice.",
    "Steady pages. That's the craft.",
    "You made progress you can build on.",
  ],
  stretch: [
    "A good stretch. The book is closer.",
    "That's a satisfying session. Savor it.",
    "Look at you, in the flow.",
  ],
  deep: [
    "Deep work. Remember what that felt like.",
    "A big writing day. Enjoy it.",
    "That's the good stuff. Well done.",
  ],
};

export const RATING_WORDS: Record<number, string> = {
  5: "Great",
  4: "Good",
  3: "OK",
  2: "Meh",
  1: "Rough",
};

export const WRITING_OPTIONS: { label: string; minutes: number }[] = [
  { label: "Rest day · 0", minutes: 0 },
  { label: "A little · 15", minutes: 15 },
  { label: "Some · 30–60m", minutes: 45 },
  { label: "A good stretch · 60–90m", minutes: 75 },
  { label: "Deep · 90m+", minutes: 100 },
];

export function writingLabel(minutes?: number | null): string {
  if (minutes === null) return "Skipped";
  if (minutes === undefined) return "–";
  if (minutes <= 0) return "Rest";
  if (minutes <= 15) return "A little";
  if (minutes <= 45) return "Some";
  if (minutes <= 75) return "Good stretch";
  return "Deep";
}

// Pick one kind line per day, deterministically from the date so it doesn't flicker.
export function kindLine(dateISO: string, minutes: number, mode?: Mode | null): string {
  let bucket: readonly string[];
  if (minutes <= 0) {
    bucket = mode === "Restore" || mode === "Wind-down" ? WLINES.restEasyMode : WLINES.rest;
  } else if (minutes <= 15) bucket = WLINES.little;
  else if (minutes <= 45) bucket = WLINES.some;
  else if (minutes <= 75) bucket = WLINES.stretch;
  else bucket = WLINES.deep;
  let h = 0;
  for (const c of dateISO) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return bucket[h % bucket.length] ?? bucket[0]!;
}
