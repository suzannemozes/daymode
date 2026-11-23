import { useState } from "react";
import { MODES, type Mode } from "@/lib/daymode/content";
import { ageFrom, sortedPeriods, usedCycleLength, type Settings } from "./logic";
import {
  store,
  downloadCSV,
  downloadICS,
  googleCalendarUrl,
  loadSample,
  clearSample,
  deleteAll,
  parseCSV,
} from "./storage";

function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
}

const inputCls = "w-full rounded border border-neutral-300 px-3 py-2 text-sm";

export function SetupTab({
  settings,
  setSettings,
  periods,
  setPeriods,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  periods: string[];
  setPeriods: (p: string[]) => void;
}) {
  const [newPeriod, setNewPeriod] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const age = ageFrom(settings.dob);
  const { len, fromLog } = usedCycleLength(sortedPeriods(periods), settings.usualLength);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const addPeriod = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newPeriod)) return;
    setPeriods([...new Set([...periods, newPeriod])].sort());
    setNewPeriod("");
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const { entries, periods: p } = parseCSV(text);
    const existing = store.entries();
    const byDate = new Map(existing.map((e) => [e.date, e]));
    for (const e of entries) byDate.set(e.date, e);
    store.saveEntries([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
    setPeriods([...new Set([...periods, ...p])].sort());
    setImportMsg(`Imported ${entries.length} check-ins and ${p.length} period starts.`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">About you</h3>
        <Field label="Date of birth">
          <input
            type="date"
            className={inputCls}
            value={settings.dob ?? ""}
            onChange={(e) => setSettings({ ...settings, dob: e.target.value })}
          />
        </Field>
        {age !== null && (
          <p className="text-xs text-neutral-500">
            You're {age}. Your age turns on life-stage notes at the top (from 40). The period log
            below does the real adjusting, by noticing when your cycles change.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Cycle</h3>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.cycleOn}
            onChange={(e) => setSettings({ ...settings, cycleOn: e.target.checked })}
          />
          Include my cycle
        </label>
        <Field
          label="Add a period start date"
          note='Add your last two or three if you know them; after that, the red "Period started" button at the top keeps the log going.'
        >
          <div className="flex gap-2">
            <input
              type="date"
              className={inputCls}
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
            />
            <button
              type="button"
              onClick={addPeriod}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
        </Field>
        {periods.length > 0 && (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-neutral-500">
                <th className="py-1">Start</th>
                <th>Cycle length before</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...periods]
                .sort((a, b) => b.localeCompare(a))
                .slice(0, 8)
                .map((p, i, arr) => {
                  const prev = arr[i + 1];
                  const lenBefore = prev
                    ? Math.round((+new Date(p) - +new Date(prev)) / 86400000)
                    : null;
                  return (
                    <tr key={p} className="border-t border-neutral-100">
                      <td className="py-1.5">{p}</td>
                      <td>{lenBefore ? `${lenBefore} days` : "–"}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="text-xs text-neutral-500 underline"
                          onClick={() => setPeriods(periods.filter((x) => x !== p))}
                        >
                          × Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
        <Field label="Usual cycle length (days)">
          <input
            type="number"
            min={21}
            max={45}
            className={inputCls}
            value={settings.usualLength}
            onChange={(e) =>
              setSettings({ ...settings, usualLength: Number(e.target.value) || 28 })
            }
          />
        </Field>
        <p className="text-xs text-neutral-500">
          {fromLog
            ? `Now using ${len} days, the average of your last cycles. This number is only a fallback.`
            : "Used until you've logged three period starts; then the app uses your real recent average and keeps updating it."}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Notion</h3>
        {(["Peak", "Steady", "Wind-down", "Restore"] as Mode[]).map((m) => (
          <Field key={m} label={`${m} view URL`}>
            <input
              type="url"
              placeholder="https://notion.so/…"
              className={inputCls}
              value={settings.notion[m]}
              onChange={(e) =>
                setSettings({ ...settings, notion: { ...settings.notion, [m]: e.target.value } })
              }
            />
          </Field>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Daily reminder</h3>
        <Field label="Check-in time">
          <input
            type="time"
            className={inputCls}
            value={settings.reminderTime}
            onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <a
            href={googleCalendarUrl(settings.reminderTime, appUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Add to Google Calendar
          </a>
          <button
            type="button"
            onClick={() => downloadICS(settings.reminderTime, appUrl)}
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Download for Apple Calendar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">My data</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadCSV}
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Download history (CSV)
          </button>
          <label className="cursor-pointer rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              loadSample();
              window.location.reload();
            }}
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Load 6 weeks of sample data
          </button>
          <button
            type="button"
            onClick={() => {
              clearSample();
              window.location.reload();
            }}
            className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Clear sample data
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  deleteAll();
                  window.location.reload();
                }}
                className="rounded bg-red-700 px-3 py-2 text-sm text-white"
              >
                Really delete everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-sm underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Delete all data
            </button>
          )}
        </div>
        {importMsg && <p className="mt-2 text-xs text-neutral-600">{importMsg}</p>}
        <p className="mt-2 text-xs text-neutral-500">
          Your data stays in this browser on this device. Download the CSV now and then — clearing
          browser data wipes it.
        </p>
      </div>
    </div>
  );
}
