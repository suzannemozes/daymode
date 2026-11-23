import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PERIOD_RED } from "@/lib/daymode/content";
import { cycleInfo, prettyDate, todayISO, type Entry, type Settings } from "@/lib/daymode/logic";
import { store } from "@/lib/daymode/storage";
import { TodayTab } from "@/lib/daymode/TodayTab";
import { HistoryTab } from "@/lib/daymode/HistoryTab";
import { PatternsTab } from "@/lib/daymode/PatternsTab";
import { SetupTab } from "@/lib/daymode/SetupTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Day Mode — your private daily check-in" },
      {
        name: "description",
        content:
          "A private daily check-in that names your day's mode — Peak, Steady, Wind-down or Restore — from sleep, drinks, energy and your cycle.",
      },
      { property: "og:title", content: "Day Mode — your private daily check-in" },
      {
        property: "og:description",
        content:
          "Sleep, drinks, energy and cycle-aware daily modes, with gentle writing tracking and patterns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TABS = ["Today", "History", "Patterns", "Setup"] as const;
type Tab = (typeof TABS)[number];

function Index() {
  const [tab, setTab] = useState<Tab>("Today");
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [periods, setPeriodsState] = useState<string[]>([]);
  const [settings, setSettingsState] = useState<Settings | null>(null);

  useEffect(() => {
    setEntriesState(store.entries());
    setPeriodsState(store.periods());
    setSettingsState(store.settings());
  }, []);

  if (!settings) return <div className="min-h-screen bg-white" />;

  const setEntries = (e: Entry[]) => {
    setEntriesState(e);
    store.saveEntries(e);
  };
  const setPeriods = (p: string[]) => {
    setPeriodsState(p);
    store.savePeriods(p);
  };
  const setSettings = (s: Settings) => {
    setSettingsState(s);
    store.saveSettings(s);
  };

  const today = todayISO();
  const info = cycleInfo(today, periods, settings);
  const periodLoggedToday = periods.includes(today);

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-white px-4 pb-24 pt-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Day Mode</h1>
          <p className="text-sm text-neutral-500">{prettyDate(today)}</p>
        </div>
        {settings.cycleOn && (
          <button
            type="button"
            onClick={() =>
              setPeriods(
                periodLoggedToday ? periods.filter((p) => p !== today) : [...periods, today].sort(),
              )
            }
            className={`shrink-0 rounded-md border px-3 py-1.5 text-center text-xs font-medium transition-colors ${
              periodLoggedToday ? "border-current bg-white" : "text-white"
            }`}
            style={
              periodLoggedToday
                ? { borderColor: PERIOD_RED, color: PERIOD_RED }
                : { backgroundColor: PERIOD_RED }
            }
          >
            {periodLoggedToday ? (
              <>
                Logged ✓<br />
                <span className="text-[10px] font-normal opacity-80">Tap to undo</span>
              </>
            ) : (
              "Period started"
            )}
          </button>
        )}
      </header>

      <nav className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-neutral-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-white shadow-sm" : "text-neutral-600"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Today" && (
        <TodayTab
          entries={entries}
          periods={periods}
          settings={settings}
          setEntries={setEntries}
          setPeriods={setPeriods}
        />
      )}
      {tab === "History" && <HistoryTab entries={entries} setEntries={setEntries} />}
      {tab === "Patterns" && (
        <PatternsTab entries={entries} periods={periods} settings={settings} />
      )}
      {tab === "Setup" && (
        <SetupTab
          settings={settings}
          setSettings={setSettings}
          periods={periods}
          setPeriods={setPeriods}
        />
      )}

      <footer className="mt-8 text-center text-xs text-neutral-400">
        All data stays in this browser.{" "}
        <Link to="/" className="underline">
          Day Mode
        </Link>{" "}
        is a reminder tool, not medical advice.
      </footer>
    </div>
  );
}
