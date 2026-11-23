import { useState } from "react";
import { Fragment } from "react";
import { RATING_WORDS, writingLabel } from "@/lib/daymode/content";
import type { Entry } from "./logic";
import { prettyDate } from "./logic";
import { upsertEntry } from "./storage";
import { DayReview } from "./review";

export function HistoryTab({
  entries,
  setEntries,
}: {
  entries: Entry[];
  setEntries: (e: Entry[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const save = (date: string, patch: Partial<Entry>) => {
    const e = entries.find((x) => x.date === date);
    if (e) setEntries(upsertEntry({ ...e, ...patch }));
  };

  return (
    <div>
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-2">Date</th>
              <th className="pr-2">Mode</th>
              <th className="pr-2">Sleep</th>
              <th className="pr-2">Drinks</th>
              <th className="pr-2">Cycle</th>
              <th className="pr-2">Moved</th>
              <th className="pr-2">Writing</th>
              <th className="pr-2">Day went</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <Fragment key={e.date}>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 pr-2 whitespace-nowrap">{prettyDate(e.date)}</td>
                  <td className="pr-2">{e.mode ?? "–"}</td>
                  <td className="pr-2 whitespace-nowrap">
                    {e.sleepHours}h · {e.sleepQuality}/5
                  </td>
                  <td className="pr-2">{e.drinks >= 6 ? "6+" : e.drinks}</td>
                  <td className="pr-2">{e.cycleDay ? `D${e.cycleDay}` : "–"}</td>
                  <td className="pr-2">{e.moved === undefined ? "–" : e.moved ? "Yes" : "–"}</td>
                  <td className="pr-2">{e.writing != null ? writingLabel(e.writing) : ""}</td>
                  <td className="pr-2">
                    <button
                      type="button"
                      onClick={() => setOpen(open === e.date ? null : e.date)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        e.rating
                          ? "border-black bg-black text-white"
                          : "border-neutral-300 text-neutral-600"
                      }`}
                    >
                      {e.rating ? RATING_WORDS[e.rating] : "Rate"}
                    </button>
                  </td>
                </tr>
                {open === e.date && (
                  <tr>
                    <td colSpan={8} className="bg-neutral-50 px-4 pb-4 pt-2">
                      <h3 className="mb-2 font-semibold">How did {prettyDate(e.date)} go?</h3>
                      <DayReview
                        dateISO={e.date}
                        rating={e.rating}
                        writing={e.writing}
                        mode={e.mode}
                        onRating={(v) => save(e.date, { rating: v })}
                        onWriting={(m) => save(e.date, { writing: m })}
                      />
                      <button
                        type="button"
                        className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                        onClick={() => setOpen(null)}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Tap a day's rating to add or change it, and its writing time.
      </p>
    </div>
  );
}
