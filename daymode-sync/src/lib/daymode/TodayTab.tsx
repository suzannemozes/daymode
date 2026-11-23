import { useMemo, useState } from "react";
import {
  PHASE_TEXT,
  PHASE_SOURCES,
  LIFESTAGE_SOURCES,
  MODES,
  PHASE_TINT,
  PHASE_ABBR,
  type Mode,
} from "@/lib/daymode/content";
import {
  addDays,
  ageFrom,
  cycleInfo,
  lookAhead,
  modeFor,
  dayScore,
  prettyDate,
  todayISO,
  type CycleInfo,
  type Entry,
  type Settings,
} from "./logic";
import { upsertEntry } from "./storage";
import { DayReview } from "./review";

const SLEEP_HOURS = [
  { label: "Under 6", v: 5 },
  { label: "6–7", v: 6.5 },
  { label: "7–8", v: 7.5 },
  { label: "8–9", v: 8.5 },
  { label: "9+", v: 9.5 },
];
const SLEEP_QUALITY = ["Awful", "Poor", "OK", "Good", "Great"];
const DRINKS = ["None", "1", "2", "3", "4", "5", "6+"];
const ENERGY = ["Empty", "Low", "Medium", "Good", "Buzzing"];

function Chips({
  options,
  value,
  onChange,
}: {
  options: { label: string; v: number }[];
  value?: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === o.v
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white hover:bg-neutral-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BodyCard({
  info,
  age,
  settings,
}: {
  info: CycleInfo;
  age: number | null;
  settings: Settings;
}) {
  const [showSources, setShowSources] = useState(false);
  const phase = info.phase;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Your body today{age !== null ? ` · age ${age}` : ""}
      </p>
      {info.menopause ? (
        <p className="mt-1 text-sm text-neutral-700">Phases aren't shown right now.</p>
      ) : info.overdue ? (
        <>
          <h2 className="mt-1 text-lg font-semibold">Day {info.cycleDay} since your last period</h2>
          <p className="mt-1 text-sm text-neutral-700">
            That's later than your usual cycle, so the app won't guess a phase. Tap the red "Period
            started" button at the top when it comes.
          </p>
        </>
      ) : !info.onLog ? (
        <p className="mt-1 text-sm text-neutral-700">
          Add the first day of your last period in Setup to see where you are.
        </p>
      ) : (
        phase && (
          <>
            <h2 className="mt-1 text-lg font-semibold">
              Day {info.cycleDay} of {info.len} · likely {phase}
              {info.periodDay ? ` · Period day ${info.periodDay}` : ""}
            </h2>
            <p className="mt-2 text-sm text-neutral-700">{PHASE_TEXT[phase].hormones}</p>
            <p className="mt-1 text-sm text-neutral-700">{PHASE_TEXT[phase].adhd}</p>
          </>
        )
      )}
      {info.lifeNotes.map((n, i) => (
        <p key={i} className="mt-2 border-t border-neutral-200 pt-2 text-sm text-neutral-700">
          {n}
        </p>
      ))}
      <button
        type="button"
        onClick={() => setShowSources((s) => !s)}
        className="mt-2 text-xs text-neutral-500 underline"
      >
        {showSources ? "Hide sources" : "Sources"}
      </button>
      {showSources && (
        <div className="mt-2 space-y-2 text-xs text-neutral-600">
          <p>
            {info.fromLog
              ? `Cycle length (${info.len} days) is the average of your last logged cycles.`
              : "Cycle length comes from Setup until you've logged a few periods."}
          </p>
          <p>
            The research is early, mostly small studies, and women vary a lot, so treat this as a
            reminder, not a rule, and not medical advice.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {PHASE_SOURCES.map((s) => (
              <li key={s.url}>
                <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
            {info.lifeNotes.length > 0 &&
              LIFESTAGE_SOURCES.map((s) => (
                <li key={s.url}>
                  <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}
      {settings.cycleOn && !info.onLog && !info.menopause && (
        <p className="mt-2 text-xs text-neutral-500">
          Cycle tracking is on but no period is logged yet.
        </p>
      )}
    </div>
  );
}

export function TodayTab({
  entries,
  periods,
  settings,
  setEntries,
  setPeriods,
}: {
  entries: Entry[];
  periods: string[];
  settings: Settings;
  setEntries: (e: Entry[]) => void;
  setPeriods: (p: string[]) => void;
}) {
  const today = todayISO();
  const info = useMemo(() => cycleInfo(today, periods, settings), [today, periods, settings]);
  const existing = entries.find((e) => e.date === today);
  const [sleepHours, setSleepHours] = useState<number | undefined>(existing?.sleepHours);
  const [sleepQuality, setSleepQuality] = useState<number | undefined>(existing?.sleepQuality);
  const [drinks, setDrinks] = useState<number | undefined>(existing?.drinks);
  const [energy, setEnergy] = useState<number | undefined>(existing?.energy);
  const [moved, setMoved] = useState<boolean | undefined>(existing?.moved);
  const [result, setResult] = useState<Mode | null>(existing?.mode ?? null);

  const periodLoggedToday = periods.includes(today);
  const togglePeriod = () => {
    const next = periodLoggedToday ? periods.filter((p) => p !== today) : [...periods, today];
    setPeriods([...new Set(next)].sort());
  };

  // Morning look-back: a day in the last 3 (before today) lacking rating or writing answer
  const lookback = [1, 2, 3]
    .map((i) => addDays(today, -i))
    .map((d) => ({ date: d, entry: entries.find((e) => e.date === d) }))
    .find((x) => x.entry && (x.entry.rating == null || x.entry.writing === undefined));

  const canName =
    sleepHours !== undefined &&
    sleepQuality !== undefined &&
    drinks !== undefined &&
    energy !== undefined &&
    moved !== undefined;

  const nameMode = () => {
    if (!canName) return;
    const score = dayScore({
      sleepHours: sleepHours!,
      sleepQuality: sleepQuality!,
      drinks: drinks!,
      energy: energy!,
      phase: info.phase,
    });
    const mode = modeFor(score, energy!);
    const entry: Entry = {
      date: today,
      sleepHours: sleepHours!,
      sleepQuality: sleepQuality!,
      drinks: drinks!,
      energy: energy!,
      moved: moved!,
      writing: existing?.writing,
      cycleDay: info.onLog ? info.cycleDay : null,
      phase: info.phase,
      score,
      mode,
      rating: existing?.rating ?? null,
      sample: existing?.sample,
    };
    setEntries(upsertEntry(entry));
    setResult(mode);
  };

  const isEvening = new Date().getHours() >= 17;

  const saveLookback = (date: string, patch: Partial<Entry>) => {
    const e = entries.find((x) => x.date === date);
    if (!e) return;
    setEntries(upsertEntry({ ...e, ...patch }));
  };

  return (
    <div className="space-y-4">
      {settings.cycleOn && <BodyCard info={info} age={null} settings={settings} />}

      {lookback && lookback.entry && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="font-semibold">
            Looking back: How did{" "}
            {lookback.date === addDays(today, -1) ? "yesterday" : prettyDate(lookback.date)} go?
          </h3>
          <p className="mb-2 text-xs text-neutral-500">
            {lookback.entry.rating == null ? "Tap how the day went to save." : ""}
          </p>
          <DayReview
            dateISO={lookback.date}
            rating={lookback.entry.rating}
            writing={lookback.entry.writing}
            mode={lookback.entry.mode}
            onRating={(v) => saveLookback(lookback.date, { rating: v })}
            onWriting={(m) => saveLookback(lookback.date, { writing: m })}
          />
          {lookback.entry.rating != null && (
            <button
              type="button"
              className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
              onClick={() => {
                if (lookback.entry!.writing === undefined)
                  saveLookback(lookback.date, { writing: null });
                else saveLookback(lookback.date, {});
              }}
            >
              Done
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">This morning</h3>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">Hours of sleep</p>
            <Chips options={SLEEP_HOURS} value={sleepHours} onChange={setSleepHours} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Sleep quality</p>
            <Chips
              options={SLEEP_QUALITY.map((l, i) => ({ label: l, v: i + 1 }))}
              value={sleepQuality}
              onChange={setSleepQuality}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Drinks last night</p>
            <Chips
              options={DRINKS.map((l, i) => ({ label: l, v: i }))}
              value={drinks}
              onChange={setDrinks}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Energy right now</p>
            <Chips
              options={ENERGY.map((l, i) => ({ label: l, v: i + 1 }))}
              value={energy}
              onChange={setEnergy}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Did you move your body yesterday?</p>
            <Chips
              options={[
                { label: "Yes", v: 1 },
                { label: "Not yesterday", v: 0 },
              ]}
              value={moved === undefined ? undefined : moved ? 1 : 0}
              onChange={(v) => setMoved(v === 1)}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!canName}
          onClick={nameMode}
          className="mt-4 w-full rounded-md bg-black px-4 py-2.5 font-medium text-white disabled:opacity-40"
        >
          Name my mode
        </button>
      </div>

      {result && (
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: MODES[result].color,
            color: MODES[result].darkText ? "#111" : "#fff",
          }}
        >
          <h3 className="text-xl font-bold">Today you're in {result}</h3>
          <p className="mt-1 text-sm">{MODES[result].advice}</p>
          {settings.notion[result] ? (
            <a
              href={settings.notion[result]}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-md bg-black/15 px-3 py-2 text-sm font-medium underline"
            >
              Open my {result} list in Notion
            </a>
          ) : (
            <p className="mt-3 text-sm italic opacity-80">
              Paste your Notion link for this mode in Setup.
            </p>
          )}
        </div>
      )}

      {isEvening && existing && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="font-semibold">How did today go?</h3>
          <p className="mb-2 text-xs text-neutral-500">
            {existing.rating
              ? "Saved. Tap another to change it."
              : "Rate it now while it's fresh, and tomorrow won't ask."}
          </p>
          <DayReview
            dateISO={today}
            rating={existing.rating}
            writing={existing.writing}
            mode={existing.mode}
            onRating={(v) => saveLookback(today, { rating: v })}
            onWriting={(m) => saveLookback(today, { writing: m })}
          />
        </div>
      )}

      {settings.cycleOn &&
        (() => {
          const la = lookAhead(entries, info, periods, settings, today);
          if (!la) return null;
          const strong = la.days.filter((d) => d.tone === "strong");
          const lighter = la.days.filter((d) => d.tone === "lighter");
          const nextPeriod = la.days.find((d) => d.isNextPeriod);
          const range = (ds: typeof la.days) =>
            ds.length ? `${prettyDate(ds[0]!.date)} – ${prettyDate(ds[ds.length - 1]!.date)}` : "";
          return (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                The next two weeks
              </p>
              <h3 className="font-semibold">Plan the big asks for your strong days</h3>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
                {la.days.map((d) => (
                  <div
                    key={d.date}
                    className="rounded border p-1.5"
                    style={{
                      backgroundColor: d.phase ? PHASE_TINT[d.phase] : undefined,
                      outline: d.tone === "strong" ? "2px solid #1baf7a" : undefined,
                      opacity: d.tone === "lighter" ? 0.6 : 1,
                    }}
                  >
                    <div className="font-medium">{prettyDate(d.date).split(",")[0]}</div>
                    <div>{Number(d.date.split("-")[2])}</div>
                    <div>{d.phase ? PHASE_ABBR[d.phase] : ""}</div>
                    {d.isNextPeriod && <div className="font-bold">● P</div>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                Legend: {strong.length > 0 && "green outline = likely strong · "}
                {lighter.length > 0 && "faded = likely lighter · "}● P = expected period
              </p>
              {strong.length > 0 && (
                <p className="mt-2 text-sm">
                  Likely strong: {range(strong)}. Good for pitches, client calls, interviews and big
                  asks.
                </p>
              )}
              {lighter.length > 0 && (
                <p className="mt-1 text-sm">
                  Likely lighter: {range(lighter)}. Keep these roomy: editing, admin, replies, rest.
                </p>
              )}
              {nextPeriod && (
                <p className="mt-1 text-sm">
                  Next period expected around {prettyDate(nextPeriod.date)}.
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-500">
                {la.ownPattern
                  ? "Based on how your own days have gone in each phase."
                  : "Based on general research for now; once you've rated a few weeks, it switches to your own pattern."}
                {info.periSignal
                  ? " Your cycles have been varying lately, so treat this as a loose sketch."
                  : ""}{" "}
                Sleep and drinks still decide each actual day.
              </p>
            </div>
          );
        })()}
    </div>
  );
}
