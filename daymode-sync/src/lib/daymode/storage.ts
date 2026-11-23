// ============================================================
// DAY MODE — local storage (all data stays in this browser)
// ============================================================
import { DEFAULT_SETTINGS, makeSampleData, todayISO, type Entry, type Settings } from "./logic";

const K_ENTRIES = "daymode.entries";
const K_PERIODS = "daymode.periods";
const K_SETTINGS = "daymode.settings";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  entries: () => read<Entry[]>(K_ENTRIES, []),
  saveEntries: (e: Entry[]) => write(K_ENTRIES, e),
  periods: () => read<string[]>(K_PERIODS, []),
  savePeriods: (p: string[]) => write(K_PERIODS, p),
  settings: () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K_SETTINGS, {}) }),
  saveSettings: (s: Settings) => write(K_SETTINGS, s),
};

export function upsertEntry(entry: Entry, keepRating = true): Entry[] {
  const all = store.entries();
  const prev = all.find((e) => e.date === entry.date);
  const merged: Entry = prev
    ? {
        ...prev,
        ...entry,
        rating: keepRating ? (entry.rating ?? prev.rating ?? null) : (entry.rating ?? null),
      }
    : entry;
  const out = [...all.filter((e) => e.date !== entry.date), merged].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  store.saveEntries(out);
  return out;
}

export function getEntry(date: string): Entry | undefined {
  return store.entries().find((e) => e.date === date);
}

// ---------- CSV ----------
const CSV_COLS = [
  "date",
  "sleep_hours",
  "sleep_quality",
  "drinks",
  "energy",
  "moved_day_before",
  "writing_minutes",
  "cycle_day",
  "phase",
  "score",
  "mode",
  "rating",
];

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(entries: Entry[], periods: string[]): string {
  const rows = entries.map((e) =>
    [
      e.date,
      e.sleepHours,
      e.sleepQuality,
      e.drinks,
      e.energy,
      e.moved === undefined ? "" : e.moved ? "yes" : "no",
      e.writing === undefined ? "" : e.writing === null ? "skipped" : e.writing,
      e.cycleDay ?? "",
      e.phase ?? "",
      e.score ?? "",
      e.mode ?? "",
      e.rating ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const periodRows = periods.map((p) => csvCell(p));
  return [CSV_COLS.join(","), ...rows, "", "period_starts", "date", ...periodRows].join("\n");
}

export function parseCSV(text: string): { entries: Entry[]; periods: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const entries: Entry[] = [];
  const periods: string[] = [];
  let section: "entries" | "periods" = "entries";
  let header: string[] = [];
  for (const line of lines) {
    if (line === "period_starts") {
      section = "periods";
      continue;
    }
    const cells = line.split(",").map((c) => c.replace(/^"|"$/g, ""));
    const first = cells[0] ?? "";
    if (section === "entries") {
      if (first === "date") {
        header = cells;
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) continue;
      const get = (name: string): string | undefined => cells[header.indexOf(name)];
      const num = (name: string): number | undefined => {
        const v = get(name);
        return v === undefined || v === "" ? undefined : Number(v);
      };
      const wRaw = get("writing_minutes");
      entries.push({
        date: first,
        sleepHours: num("sleep_hours") ?? 0,
        sleepQuality: num("sleep_quality") ?? 3,
        drinks: num("drinks") ?? 0,
        energy: num("energy") ?? 3,
        moved:
          get("moved_day_before") === "yes"
            ? true
            : get("moved_day_before") === "no"
              ? false
              : undefined,
        writing:
          wRaw === "skipped" ? null : wRaw === undefined || wRaw === "" ? undefined : Number(wRaw),
        cycleDay: num("cycle_day") ?? null,
        phase: (get("phase") || null) as Entry["phase"],
        score: num("score"),
        mode: (get("mode") || null) as Entry["mode"],
        rating: num("rating") ?? null,
      });
    } else {
      if (first === "date") continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(first)) periods.push(first);
    }
  }
  return { entries, periods };
}

export function loadSample(): void {
  const { entries, periods } = makeSampleData();
  const existing = store.entries().filter((e) => !e.sample);
  store.saveEntries([...existing, ...entries]);
  store.savePeriods([...new Set([...store.periods(), ...periods])].sort());
}

export function clearSample(): void {
  store.saveEntries(store.entries().filter((e) => !e.sample));
}

export function deleteAll(): void {
  store.saveEntries([]);
  store.savePeriods([]);
  const { aiAnswer: _a, aiDate: _d, ...rest } = store.settings();
  store.saveSettings(rest);
}

export function downloadCSV(): void {
  const csv = toCSV(store.entries(), store.periods());
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `daymode-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- calendar reminder ----------
function reminderTimes(time: string): { h: number; m: number } {
  const [h = 8, m = 0] = time.split(":").map(Number);
  return { h, m };
}
function tomorrowAt(time: string): Date {
  const { h, m } = reminderTimes(time);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d;
}

export function googleCalendarUrl(time: string, appUrl: string): string {
  const start = tomorrowAt(time);
  const end = new Date(start.getTime() + 5 * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0]! + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Day Mode check-in",
    dates: `${fmt(start)}/${fmt(end)}`,
    recur: "RRULE:FREQ=DAILY",
    details: `${appUrl}\nYour daily Day Mode check-in.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsFile(time: string, appUrl: string): string {
  const start = tomorrowAt(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(start.getHours())}${pad(start.getMinutes())}00`;
  const endMin = new Date(start.getTime() + 5 * 60000);
  const end = `${endMin.getFullYear()}${pad(endMin.getMonth() + 1)}${pad(endMin.getDate())}T${pad(endMin.getHours())}${pad(endMin.getMinutes())}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Day Mode//EN",
    "BEGIN:VEVENT",
    `DTSTART:${stamp}`,
    `DTEND:${end}`,
    "RRULE:FREQ=DAILY",
    "SUMMARY:Day Mode check-in",
    `DESCRIPTION:${appUrl}`,
    `URL:${appUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Day Mode check-in",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(time: string, appUrl: string): void {
  const blob = new Blob([icsFile(time, appUrl)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "daymode-checkin.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}
