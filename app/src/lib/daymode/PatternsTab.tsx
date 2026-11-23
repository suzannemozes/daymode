import { useMemo, useState } from "react";
import {
  MODES,
  PHASE_TINT,
  PHASE_ABBR,
  RATING_WORDS,
  type Mode,
  type Phase,
} from "@/lib/daymode/content";
import type { Entry, Settings } from "./logic";
import { cycleLengths, prettyDate, sortedPeriods } from "./logic";
import { store } from "./storage";
import { askAI } from "./ai.functions";

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function Bar({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 truncate">{label}</span>
      <div className="h-5 flex-1 rounded bg-neutral-100">
        <div
          className="h-5 rounded"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-neutral-600">{note}</span>
    </div>
  );
}

function Card({
  title,
  expl,
  children,
}: {
  title: string;
  expl: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <p className="mb-3 text-xs italic text-neutral-500">{expl}</p>
      {children}
    </div>
  );
}

export function PatternsTab({
  entries,
  periods,
  settings,
}: {
  entries: Entry[];
  periods: string[];
  settings: Settings;
}) {
  const rated = entries.filter((e) => e.rating);
  const [aiBusy, setAiBusy] = useState(false);

  // ---- rating comparisons ----
  const comparisons = useMemo(() => {
    const mk = (label: string, yes: Entry[], no: Entry[]) => ({ label, yes, no });
    const cands = [
      mk(
        "No drinks",
        rated.filter((e) => e.drinks === 0),
        rated.filter((e) => e.drinks > 0),
      ),
      mk(
        "8+ hours sleep",
        rated.filter((e) => e.sleepHours >= 8),
        rated.filter((e) => e.sleepHours < 8),
      ),
      mk(
        "Sleep quality 4–5",
        rated.filter((e) => e.sleepQuality >= 4),
        rated.filter((e) => e.sleepQuality < 4),
      ),
      mk(
        "Energy 4–5",
        rated.filter((e) => e.energy >= 4),
        rated.filter((e) => e.energy < 4),
      ),
      mk(
        "Moved the day before",
        rated.filter((e) => e.moved === true),
        rated.filter((e) => e.moved === false),
      ),
    ];
    return cands
      .filter((c) => c.yes.length >= 2 && c.no.length >= 2)
      .map((c) => ({
        ...c,
        diff: avg(c.yes.map((e) => e.rating!)) - avg(c.no.map((e) => e.rating!)),
      }))
      .sort((a, b) => b.diff - a.diff);
  }, [rated]);

  const phaseAvgs = useMemo(() => {
    const m = new Map<Phase, number[]>();
    for (const e of rated)
      if (e.phase) {
        const arr = m.get(e.phase) ?? [];
        arr.push(e.rating!);
        m.set(e.phase, arr);
      }
    return [...m.entries()]
      .filter(([, a]) => a.length >= 2)
      .map(([p, a]) => ({ phase: p, avg: avg(a), n: a.length }));
  }, [rated]);

  const recipe = useMemo(() => {
    const fives = rated.filter((e) => e.rating === 5);
    if (!fives.length) return null;
    const phases = new Map<Phase, number>();
    for (const e of fives) if (e.phase) phases.set(e.phase, (phases.get(e.phase) ?? 0) + 1);
    const topPhase = [...phases.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      n: fives.length,
      sleep: avg(fives.map((e) => e.sleepHours)),
      quality: avg(fives.map((e) => e.sleepQuality)),
      drinks: avg(fives.map((e) => e.drinks)),
      phase: topPhase,
    };
  }, [rated]);

  // ---- writing flow ----
  const withWriting = entries.filter((e) => e.writing !== undefined && e.writing !== null);
  const writingFlow = useMemo(() => {
    if (withWriting.length < 5) return null;
    const conds: { label: string; sentence: string; with: Entry[]; without: Entry[] }[] = [
      {
        label: "moving your body the day before",
        sentence: "After moving your body the day before",
        with: withWriting.filter((e) => e.moved === true),
        without: withWriting.filter((e) => e.moved === false),
      },
      {
        label: "no drinks",
        sentence: "After a night with no drinks",
        with: withWriting.filter((e) => e.drinks === 0),
        without: withWriting.filter((e) => e.drinks > 0),
      },
      {
        label: "8+ hours sleep",
        sentence: "After 8 or more hours of sleep",
        with: withWriting.filter((e) => e.sleepHours >= 8),
        without: withWriting.filter((e) => e.sleepHours < 8),
      },
      {
        label: "sleep quality 4–5",
        sentence: "After good sleep quality",
        with: withWriting.filter((e) => e.sleepQuality >= 4),
        without: withWriting.filter((e) => e.sleepQuality < 4),
      },
      {
        label: "morning energy 4–5",
        sentence: "After waking with good energy",
        with: withWriting.filter((e) => e.energy >= 4),
        without: withWriting.filter((e) => e.energy < 4),
      },
    ];
    return conds
      .map((c) => ({
        ...c,
        w: avg(c.with.map((e) => e.writing!)),
        wo: avg(c.without.map((e) => e.writing!)),
        n: c.with.length,
      }))
      .filter((c) => c.with.length >= 2 && c.without.length >= 2 && c.w - c.wo >= 10)
      .sort((a, b) => b.w - b.wo - (a.w - a.wo))
      .slice(0, 3);
  }, [withWriting]);

  // ---- chart data ----
  const writingByMode = useMemo(() => {
    const m = new Map<Mode, number[]>();
    for (const e of withWriting)
      if (e.mode) {
        const arr = m.get(e.mode) ?? [];
        arr.push(e.writing!);
        m.set(e.mode, arr);
      }
    return (["Peak", "Steady", "Wind-down", "Restore"] as Mode[]).map((mode) => ({
      mode,
      avg: avg(m.get(mode) ?? []),
      n: (m.get(mode) ?? []).length,
    }));
  }, [withWriting]);

  const len = useMemo(() => {
    const valid = cycleLengths(sortedPeriods(periods))
      .filter((l) => l >= 15 && l <= 90)
      .slice(-3);
    return valid.length >= 2 ? Math.round(avg(valid)) : settings.usualLength;
  }, [periods, settings.usualLength]);

  const phaseBands = useMemo(() => {
    const ov = len - 14;
    const defs: { phase: Phase; from: number; to: number }[] = [
      { phase: "Menstrual", from: 1, to: Math.min(5, len) },
      { phase: "Follicular", from: 6, to: Math.max(6, ov - 2) },
      { phase: "Ovulatory", from: ov - 1, to: ov + 1 },
      { phase: "Early luteal", from: ov + 2, to: len - 5 },
      { phase: "Late luteal", from: len - 4, to: len },
    ];
    return defs.filter((d) => d.to >= d.from);
  }, [len]);

  const phaseAvgFor = (p: Phase) => phaseAvgs.find((x) => x.phase === p)?.avg;

  const last42 = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-42),
    [entries],
  );

  const drinksRows = useMemo(() => {
    const buckets: { label: string; min: number; max: number }[] = [
      { label: "None", min: 0, max: 0 },
      { label: "1", min: 1, max: 1 },
      { label: "2", min: 2, max: 2 },
      { label: "3", min: 3, max: 3 },
      { label: "4 or more", min: 4, max: 6 },
    ];
    return buckets.map((b) => {
      const days = rated.filter((e) => e.drinks >= b.min && e.drinks <= b.max);
      return { label: b.label, avg: avg(days.map((e) => e.rating!)), n: days.length };
    });
  }, [rated]);

  const modeRows = useMemo(() => {
    const m = new Map<Mode, number[]>();
    for (const e of rated)
      if (e.mode) {
        const arr = m.get(e.mode) ?? [];
        arr.push(e.rating!);
        m.set(e.mode, arr);
      }
    return (["Peak", "Steady", "Wind-down", "Restore"] as Mode[]).map((mode) => ({
      mode,
      avg: avg(m.get(mode) ?? []),
      n: (m.get(mode) ?? []).length,
    }));
  }, [rated]);

  const ask = async () => {
    setAiBusy(true);
    try {
      await askAI(entries, periods, settings);
    } finally {
      setAiBusy(false);
    }
  };

  if (rated.length < 5) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        Rate {5 - rated.length} more days and patterns appear.
      </p>
    );
  }

  const maxRatingAvg = 5;
  const maxWriting = Math.max(100, ...writingByMode.map((w) => w.avg));

  return (
    <div className="space-y-4">
      {rated.length >= 10 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <button
            type="button"
            onClick={ask}
            disabled={aiBusy}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {aiBusy ? "Thinking…" : "Ask AI what leads to my best days"}
          </button>
          {store.settings().aiAnswer && (
            <div className="mt-3">
              <p className="text-xs text-neutral-500">Answer from {store.settings().aiDate}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {store.settings().aiAnswer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* What helps your writing flow */}
      <Card
        title="What helps your writing flow"
        expl="What tends to come before your easier writing days."
      >
        {!writingFlow ? (
          <p className="text-sm text-neutral-700">
            After {5 - withWriting.length} more days with writing time logged, this shows what tends
            to come before your easier writing days.
          </p>
        ) : writingFlow.length === 0 ? (
          <p className="text-sm text-neutral-700">
            Nothing stands out yet across {withWriting.length} days, which is useful too: your
            writing isn't hostage to any one thing. Check back in a week or two.
          </p>
        ) : (
          <>
            <ul className="space-y-2 text-sm text-neutral-700">
              {writingFlow.map((c) => (
                <li key={c.label}>
                  {c.sentence}, your writing time averages about {Math.round(c.w)} minutes, compared
                  with about {Math.round(c.wo)} otherwise ({c.n} days).
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs italic text-neutral-500">
              These are levers, not report cards. Pick one to lean on this week.
            </p>
          </>
        )}
      </Card>

      {/* Rating comparisons */}
      <Card
        title="What makes a good day"
        expl="Average day rating for each pair, biggest difference first."
      >
        <div className="space-y-2">
          {comparisons.map((c) => {
            const ay = avg(c.yes.map((e) => e.rating!));
            const an = avg(c.no.map((e) => e.rating!));
            return (
              <div key={c.label} className="space-y-1">
                <Bar
                  label={c.label}
                  value={ay}
                  max={maxRatingAvg}
                  color="#2a78d6"
                  note={`${ay.toFixed(1)} · ${c.yes.length}d`}
                />
                <Bar
                  label="Otherwise"
                  value={an}
                  max={maxRatingAvg}
                  color="#c9c9c9"
                  note={`${an.toFixed(1)} · ${c.no.length}d`}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rating by phase */}
      <Card
        title="Rating by cycle phase"
        expl="Average day rating in each phase (phases with 2+ days)."
      >
        <div className="space-y-2">
          {phaseAvgs.map((p) => (
            <Bar
              key={p.phase}
              label={p.phase}
              value={p.avg}
              max={maxRatingAvg}
              color="#2a78d6"
              note={`${p.avg.toFixed(1)} · ${p.n}d`}
            />
          ))}
        </div>
      </Card>

      {recipe && (
        <Card title="Great day recipe" expl={`Across ${recipe.n} days rated Great.`}>
          <p className="text-sm text-neutral-700">
            About {recipe.sleep.toFixed(1)} hours of sleep, sleep quality{" "}
            {recipe.quality.toFixed(1)}/5, {recipe.drinks.toFixed(1)} drinks on average
            {recipe.phase ? `, most often in the ${recipe.phase.toLowerCase()} phase` : ""}.
          </p>
        </Card>
      )}

      {/* 1) Writing time by mode */}
      {withWriting.length >= 5 && (
        <Card
          title="Writing time by mode"
          expl="Average minutes on days you logged, rest days included. This shows how much each kind of day tends to hold, so you can plan kindly."
        >
          <div className="space-y-2">
            {writingByMode
              .filter((w) => w.n > 0)
              .map((w) => (
                <Bar
                  key={w.mode}
                  label={w.mode}
                  value={w.avg}
                  max={maxWriting}
                  color={MODES[w.mode].color}
                  note={w.avg < 8 ? `mostly rest · ${w.n}d` : `~${Math.round(w.avg)} min · ${w.n}d`}
                />
              ))}
          </div>
        </Card>
      )}

      {/* 2) Cycle scatter */}
      <Card
        title="Where good and rough days fall in your cycle"
        expl="Each dot is a rated day, placed by cycle day. Dashed line = that phase's average. M menstrual · F follicular · O ovulatory · EL early luteal · LL late luteal."
      >
        <svg
          viewBox={`0 0 320 140`}
          className="w-full"
          role="img"
          aria-label="Ratings by cycle day"
        >
          {phaseBands.map((b) => {
            const x = ((b.from - 1) / len) * 300 + 10;
            const w = ((b.to - b.from + 1) / len) * 300;
            return (
              <g key={b.phase}>
                <rect x={x} y={10} width={w} height={110} fill={PHASE_TINT[b.phase]} />
                <text x={x + w / 2} y={22} textAnchor="middle" fontSize="11" fill="#555">
                  {PHASE_ABBR[b.phase]}
                </text>
                {phaseAvgFor(b.phase) !== undefined && (
                  <line
                    x1={x}
                    x2={x + w}
                    y1={120 - ((phaseAvgFor(b.phase)! - 1) / 4) * 100}
                    y2={120 - ((phaseAvgFor(b.phase)! - 1) / 4) * 100}
                    stroke="#333"
                    strokeDasharray="4 3"
                  />
                )}
              </g>
            );
          })}
          {rated
            .filter((e) => e.cycleDay && e.cycleDay <= len)
            .map((e) => (
              <circle
                key={e.date}
                cx={((e.cycleDay! - 0.5) / len) * 300 + 10}
                cy={120 - ((e.rating! - 1) / 4) * 100}
                r={3.5}
                fill="#2a78d6"
                stroke="#fff"
              >
                <title>{`${prettyDate(e.date)}: ${RATING_WORDS[e.rating!]} (cycle day ${e.cycleDay})`}</title>
              </circle>
            ))}
          <text x={10} y={136} fontSize="11" fill="#777">
            Day 1
          </text>
          <text x={310} y={136} fontSize="11" textAnchor="end" fill="#777">
            {len}
          </text>
        </svg>
      </Card>

      {/* 3) Last six weeks */}
      <Card
        title="The last six weeks, lined up"
        expl="Read down a column: the night before, your writing, and how the day went. Tap or hover a day for details."
      >
        <svg viewBox="0 0 360 190" className="w-full" role="img" aria-label="Last six weeks">
          {last42.map((e, i) => {
            const x = (i / Math.max(41, last42.length - 1)) * 340 + 10;
            const w = Math.max(3, 340 / Math.max(42, last42.length) - 1);
            return (
              <g key={e.date}>
                <title>{`${prettyDate(e.date)} · ${e.mode ?? "–"} · sleep ${e.sleepHours}h · ${e.drinks === 6 ? "6+" : e.drinks} drinks · ${e.rating ? RATING_WORDS[e.rating] : "not rated"}`}</title>
                <rect
                  x={x}
                  y={10}
                  width={w}
                  height={8}
                  fill={e.phase ? PHASE_TINT[e.phase] : "#eee"}
                >
                  <title>{`${prettyDate(e.date)} · ${e.phase ?? "no phase"}`}</title>
                </rect>
                {e.rating && (
                  <circle cx={x + w / 2} cy={38 - ((e.rating - 1) / 4) * 20} r={2.5} fill="#222">
                    <title>{`${prettyDate(e.date)} · ${RATING_WORDS[e.rating]}`}</title>
                  </circle>
                )}
                {e.writing !== undefined &&
                  e.writing !== null &&
                  (e.writing > 0 ? (
                    <rect
                      x={x}
                      y={70 - (e.writing / 100) * 25}
                      width={w}
                      height={(e.writing / 100) * 25}
                      fill="#6250d6"
                    >
                      <title>{`${prettyDate(e.date)} · ${e.writing} min writing`}</title>
                    </rect>
                  ) : (
                    <circle cx={x + w / 2} cy={68} r={2.5} fill="none" stroke="#6250d6">
                      <title>{`${prettyDate(e.date)} · rest day`}</title>
                    </circle>
                  ))}
                <rect
                  x={x}
                  y={95 - (e.sleepHours / 10) * 22}
                  width={w}
                  height={(e.sleepHours / 10) * 22}
                  fill="#2a78d6"
                >
                  <title>{`${prettyDate(e.date)} · ${e.sleepHours}h sleep`}</title>
                </rect>
                <rect
                  x={x}
                  y={130 - (Math.min(e.drinks, 6) / 6) * 22}
                  width={w}
                  height={(Math.min(e.drinks, 6) / 6) * 22}
                  fill="#eb6834"
                >
                  <title>{`${prettyDate(e.date)} · ${e.drinks === 6 ? "6+" : e.drinks} drinks`}</title>
                </rect>
                {e.moved && (
                  <circle cx={x + w / 2} cy={150} r={2.5} fill="#222">
                    <title>{`${prettyDate(e.date)} · moved`}</title>
                  </circle>
                )}
              </g>
            );
          })}
          <line
            x1={10}
            x2={350}
            y1={95 - (8 / 10) * 22}
            y2={95 - (8 / 10) * 22}
            stroke="#999"
            strokeDasharray="3 3"
          />
          <text x={10} y={168} fontSize="11" fill="#777">
            WRITING TIME · ○ = REST DAY
          </text>
          <text x={10} y={184} fontSize="11" fill="#777">
            {last42.length ? prettyDate(last42[0]!.date) : ""}
          </text>
          <text x={350} y={184} fontSize="11" textAnchor="end" fill="#777">
            {last42.length ? prettyDate(last42[last42.length - 1]!.date) : ""}
          </text>
        </svg>
      </Card>

      {/* 4) Drinks */}
      <Card
        title="Drinks the night before → how the day went"
        expl="Average day rating (1 rough to 5 great) and number of days."
      >
        <div className="space-y-2">
          {drinksRows.map((r) => (
            <Bar
              key={r.label}
              label={r.label}
              value={r.avg}
              max={5}
              color="#eb6834"
              note={r.n ? `${r.avg.toFixed(1)} · ${r.n}d` : "no days yet"}
            />
          ))}
        </div>
      </Card>

      {/* 5) Was the mode right */}
      <Card
        title="Was the mode right?"
        expl="If the rules work, Peak days rate highest and Restore days lowest. If not, the scoring needs adjusting."
      >
        <div className="space-y-2">
          {modeRows
            .filter((m) => m.n > 0)
            .map((m) => (
              <Bar
                key={m.mode}
                label={m.mode}
                value={m.avg}
                max={5}
                color={MODES[m.mode].color}
                note={`${m.avg.toFixed(1)} · ${m.n}d`}
              />
            ))}
        </div>
      </Card>
    </div>
  );
}
