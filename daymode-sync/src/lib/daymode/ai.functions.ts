import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Entry, Settings } from "./logic";

const Payload = z.object({
  entries: z.array(
    z.object({
      date: z.string(),
      sleepHours: z.number(),
      sleepQuality: z.number(),
      drinks: z.number(),
      energy: z.number(),
      moved: z.boolean().optional(),
      writing: z.number().nullable().optional(),
      cycleDay: z.number().nullable().optional(),
      phase: z.string().nullable().optional(),
      mode: z.string().nullable().optional(),
      rating: z.number().nullable().optional(),
    }),
  ),
  cycleLengths: z.array(z.number()),
  age: z.number().nullable(),
});

const INSTRUCTION = `You are looking at one person's daily check-ins. 'rating' is how the day went (1 rough to 5 great). 'writing' is minutes of writing (0 means a rest day, which is a valid choice, never a failure). In plain, warm, short sentences: 1) the two or three things most linked to her best days and her easiest writing days, with the numbers behind each; 2) anything linked to her rough days; 3) whether her mode was usually right (did Peak days go well, did Restore days go badly?); 4) how her ratings move across cycle phases, compared with the general pattern that the premenstrual (late luteal) days are often hardest for women with ADHD; 5) given her age and cycle lengths, whether her cycles look steady or are changing, without diagnosing anything; 6) one small, kind experiment to try next week. Never count or list days without writing, never use words like 'missed', 'failed' or 'only', and frame writing findings as what helps rather than what went wrong. Say how many days each finding rests on, call anything under 5 days a hint, and never claim cause. No medical advice.`;

export const askAIServer = createServerFn({ method: "POST" })
  .validator((d) => Payload.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      return {
        ok: false as const,
        error: "No Gemini API key is set. Add GEMINI_API_KEY in the app's secrets.",
      };
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${INSTRUCTION}\n\nDATA:\n${JSON.stringify(data)}` }] }],
        }),
      },
    );
    if (!res.ok) {
      return { ok: false as const, error: `Gemini request failed (${res.status}).` };
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    if (!text) return { ok: false as const, error: "Gemini returned an empty answer." };
    return { ok: true as const, text };
  });

export async function askAI(
  entries: Entry[],
  periods: string[],
  settings: Settings,
): Promise<void> {
  const cycleLengths: number[] = [];
  const sp = [...periods].sort();
  for (let i = 1; i < sp.length; i++)
    cycleLengths.push(Math.round((+new Date(sp[i]!) - +new Date(sp[i - 1]!)) / 86400000));
  const age = settings.dob
    ? Math.floor((Date.now() - +new Date(settings.dob)) / (365.25 * 86400000))
    : null;
  const res = await askAIServer({
    data: {
      entries: entries.map((e) => ({
        date: e.date,
        sleepHours: e.sleepHours,
        sleepQuality: e.sleepQuality,
        drinks: e.drinks,
        energy: e.energy,
        moved: e.moved,
        writing: e.writing ?? null,
        cycleDay: e.cycleDay ?? null,
        phase: e.phase ?? null,
        mode: e.mode ?? null,
        rating: e.rating ?? null,
      })),
      cycleLengths,
      age,
    },
  });
  const s = { ...settings };
  if (res.ok) {
    s.aiAnswer = res.text;
    s.aiDate = new Date().toLocaleDateString();
  } else {
    s.aiAnswer = res.error;
    s.aiDate = new Date().toLocaleDateString();
  }
  const { store } = await import("./storage");
  store.saveSettings(s);
}
