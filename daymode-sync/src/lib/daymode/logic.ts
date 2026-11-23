// ============================================================
// DAY MODE — cycle math, mode rules and life-stage logic
// ============================================================
import type { Mode, Phase } from "./content";

export type Entry = {
  date: string; // YYYY-MM-DD
  sleepHours: number;
  sleepQuality: number; // 1–5
  drinks: number; // 0–6 (6 = 6+)
  energy: number; // 1–5
  moved?: boolean | undefined;
  writing?: number | null | undefined; // minutes; null = skipped; undefined = not asked
  cycleDay?: number | null | undefined;
  phase?: Phase | null | undefined;
  score?: number | undefined;
  mode?: Mode | null | undefined;
  rating?: number | null | undefined;
  sample?: boolean | undefined;
};

export type Settings = {
  dob?: string | undefined;
  cycleOn: boolean;
  usualLength: number;
  notion: { Peak: string; Steady: string; "Wind-down": string; Restore: string };
  reminderTime: string; // HH:MM
  aiAnswer?: string | undefined;
  aiDate?: string | undefined;
};

export const DEFAULT_SETTINGS: Settings = {
  cycleOn: true,
  usualLength: 28,
  notion: { Peak: "", Steady: "", "Wind-down": "", Restore: "" },
  reminderTime: "08:00",
};

// ---------- date helpers ----------
export function todayISO(): string {
  return isoOf(new Date());
}
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseISO(s: string): Date {
  const [y = 2000, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
export function prettyDate(s: string): string {
  return parseISO(s).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
export function ageFrom(dob?: string): number | null {
  if (!dob) return null;
  const d = parseISO(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// ============================================================
// THE MODE RULES (edit here) — scoring and thresholds
// ============================================================
export function dayScore(e: {
  sleepHours: number;
  sleepQuality: number;
  drinks: number;
  energy: number;
  phase?: Phase | null;
}): number {
  const sh = e.sleepHours >= 8 ? 2 : e.sleepHours >= 7 ? 1 : e.sleepHours >= 6 ? 0 : -2;
  const q = (v: number) => (v >= 5 ? 2 : v === 4 ? 1 : v === 3 ? 0 : v === 2 ? -1 : -2);
  const sq = q(e.sleepQuality);
  const en = q(e.energy);
  const dr = -Math.min(e.drinks, 5);
  const ph = e.phase
    ? e.phase === "Menstrual"
      ? -1
      : e.phase === "Follicular"
        ? 1
        : e.phase === "Ovulatory"
          ? 1
          : e.phase === "Early luteal"
            ? 0
            : -1
    : 0;
  return sh + sq + en + dr + ph;
}

export function modeFor(score: number, energy: number): Mode {
  if (energy === 1) return "Restore";
  if (score >= 4) return "Peak";
  if (score >= 1) return "Steady";
  if (score >= -2) return "Wind-down";
  return "Restore";
}

// ---------- period log & cycle ----------
export function sortedPeriods(periods: string[]): string[] {
  return [...new Set(periods)].sort();
}

export function cycleLengths(periods: string[]): number[] {
  const p = sortedPeriods(periods);
  const out: number[] = [];
  for (let i = 1; i < p.length; i++) out.push(daysBetween(p[i - 1]!, p[i]!));
  return out;
}

export function usedCycleLength(
  periods: string[],
  usualLength: number,
): { len: number; fromLog: boolean } {
  const valid = cycleLengths(periods)
    .filter((l) => l >= 15 && l <= 90)
    .slice(-3);
  if (valid.length >= 2) {
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return { len: Math.min(45, Math.max(21, Math.round(avg))), fromLog: true };
  }
  return { len: Math.min(45, Math.max(21, usualLength || 28)), fromLog: false };
}

export function phaseForDay(day: number, len: number): Phase {
  const ov = len - 14;
  if (day <= 5) return "Menstrual";
  if (day <= ov - 2) return "Follicular";
  if (day <= ov + 1) return "Ovulatory";
  if (day <= len - 5) return "Early luteal";
  return "Late luteal";
}

export type CycleInfo = {
  onLog: boolean; // tracking on AND at least one period logged
  cycleDay: number;
  len: number;
  fromLog: boolean;
  phase: Phase | null;
  overdue: boolean;
  periodDay: number | null;
  menopause: boolean;
  lifeNotes: string[];
  periSignal: boolean; // early or late perimenopause signal on
};

export function cycleInfo(dateISO: string, periods: string[], settings: Settings): CycleInfo {
  const p = sortedPeriods(periods);
  const age = ageFrom(settings.dob);
  const notes: string[] = [];
  let menopause = false;
  let periSignal = false;

  if (p.length) {
    const last = p[p.length - 1]!;
    const since = daysBetween(last, dateISO);
    const lens = cycleLengths(p);
    if (since >= 365) {
      menopause = true;
      notes.push(
        "It's been 12 months or more since your last logged period, which is how menopause is defined. Phases no longer apply, so the app leaves them out. Log a period if one comes.",
      );
    } else if (since >= 60 || lens.slice(-3).some((l) => l >= 60)) {
      periSignal = true;
      notes.push(
        "You've had a stretch of 60+ days between periods. Doctors use that as the marker of late perimenopause. Phase guesses are rough now; worth raising with your doctor.",
      );
    } else {
      const last4 = lens.slice(-4);
      let pairs = 0;
      for (let i = 1; i < last4.length; i++) if (Math.abs(last4[i]! - last4[i - 1]!) >= 7) pairs++;
      if (pairs >= 2) {
        periSignal = true;
        notes.push(
          "Your recent cycles differ from each other by 7+ days. That's the standard marker of early perimenopause, so treat the phase as a rougher guess, and mention it to your doctor.",
        );
      }
    }
    if (age !== null && age >= 40 && !menopause) {
      notes.push(
        "In your 40s, estrogen swings more widely before it declines. Many women with ADHD find symptoms get harder in perimenopause, and it may start earlier for women with ADHD than for others.",
      );
    }
  } else if (age !== null && age >= 40) {
    notes.push(
      "In your 40s, estrogen swings more widely before it declines. Many women with ADHD find symptoms get harder in perimenopause, and it may start earlier for women with ADHD than for others.",
    );
  }

  if (!settings.cycleOn || !p.length) {
    return {
      onLog: false,
      cycleDay: 0,
      len: 0,
      fromLog: false,
      phase: null,
      overdue: false,
      periodDay: null,
      menopause,
      lifeNotes: notes,
      periSignal,
    };
  }

  const last = p[p.length - 1]!;
  const { len, fromLog } = usedCycleLength(p, settings.usualLength);
  const cycleDay = daysBetween(last, dateISO) + 1;
  const overdue = !menopause && cycleDay > len + 6;
  const phase = menopause || overdue ? null : phaseForDay(cycleDay, len);
  const periodDay = cycleDay <= 5 ? cycleDay : null;
  return {
    onLog: true,
    cycleDay,
    len,
    fromLog,
    phase,
    overdue,
    periodDay,
    menopause,
    lifeNotes: notes,
    periSignal,
  };
}

// ---------- two-week look-ahead ----------
export type LookDay = {
  date: string;
  phase: Phase | null;
  isNextPeriod: boolean;
  tone: "strong" | "lighter" | "steady";
};

export function lookAhead(
  entries: Entry[],
  info: CycleInfo,
  periods: string[],
  settings: Settings,
  from: string,
): { days: LookDay[]; ownPattern: boolean } | null {
  if (!info.onLog || info.menopause || info.overdue) return null;
  const sp = sortedPeriods(periods);
  const last = sp[sp.length - 1]!;
  const { len } = usedCycleLength(sp, settings.usualLength);

  // own pattern? at least 3 phases each with 3+ rated days
  const byPhase = new Map<string, number[]>();
  for (const e of entries) {
    if (e.rating && e.phase) {
      const arr = byPhase.get(e.phase) ?? [];
      arr.push(e.rating);
      byPhase.set(e.phase, arr);
    }
  }
  const qualified = [...byPhase.values()].filter((a) => a.length >= 3);
  const ownPattern = qualified.length >= 3;
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

  const days: LookDay[] = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(from, i);
    const cycleDay = daysBetween(last, date) + 1;
    const dayInCycle = ((cycleDay - 1) % len) + 1;
    const phase = phaseForDay(dayInCycle, len);
    const isNextPeriod = daysBetween(last, date) === len;
    let tone: LookDay["tone"] = "steady";
    if (ownPattern) {
      const a = avg(byPhase.get(phase) ?? []);
      if (a >= 3.8) tone = "strong";
      else if (a <= 2.8) tone = "lighter";
    } else {
      if (phase === "Follicular" || phase === "Ovulatory") tone = "strong";
      else if (phase === "Late luteal" || (phase === "Menstrual" && dayInCycle <= 2))
        tone = "lighter";
    }
    days.push({ date, phase, isNextPeriod, tone });
  }
  return { days, ownPattern };
}

// ---------- sample data (6 weeks) ----------
export function makeSampleData(): { entries: Entry[]; periods: string[] } {
  const entries: Entry[] = [];
  const periods: string[] = [];
  const start = addDays(todayISO(), -42);
  periods.push(addDays(start, 2), addDays(start, 29));
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;
  for (let i = 0; i < 42; i++) {
    const date = addDays(start, i);
    const hours = pick([5.5, 6.5, 7.5, 7.5, 8.5, 9.5]);
    const quality = 1 + Math.floor(rnd() * 5);
    const drinks = Math.floor(rnd() * 4);
    const energy = Math.max(1, Math.min(5, quality + (rnd() > 0.7 ? 1 : 0) - (drinks > 1 ? 1 : 0)));
    const info = cycleInfo(
      date,
      periods.filter((p) => p <= date),
      { ...DEFAULT_SETTINGS, cycleOn: true },
    );
    const score = dayScore({
      sleepHours: hours,
      sleepQuality: quality,
      drinks,
      energy,
      phase: info.phase,
    });
    const mode = modeFor(score, energy);
    entries.push({
      date,
      sleepHours: hours,
      sleepQuality: quality,
      drinks,
      energy,
      moved: rnd() > 0.4,
      writing: pick([0, 0, 15, 45, 45, 75, 100]),
      cycleDay: info.onLog ? info.cycleDay : null,
      phase: info.phase,
      score,
      mode,
      rating: Math.max(1, Math.min(5, Math.round(2.5 + score / 3 + (rnd() - 0.5)))),
      sample: true,
    });
  }
  return { entries, periods };
}
