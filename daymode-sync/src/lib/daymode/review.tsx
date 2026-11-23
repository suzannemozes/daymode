import { RATING_WORDS, WRITING_OPTIONS, kindLine, type Mode } from "./content";

export function RatingButtons({
  value,
  onChange,
}: {
  value?: number | null | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[5, 4, 3, 2, 1].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === v
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          {RATING_WORDS[v]}
        </button>
      ))}
    </div>
  );
}

export function WritingButtons({
  value,
  onChange,
}: {
  value?: number | null | undefined;
  onChange: (m: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">Any writing time?</p>
      <p className="mb-1.5 text-xs italic text-neutral-500">Every answer counts, rest included.</p>
      <div className="flex flex-wrap gap-1.5">
        {WRITING_OPTIONS.map((o) => (
          <button
            key={o.minutes}
            type="button"
            onClick={() => onChange(o.minutes)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              value === o.minutes
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Shared "day review" block: rating + writing + kind line.
export function DayReview({
  dateISO,
  rating,
  writing,
  mode,
  onRating,
  onWriting,
}: {
  dateISO: string;
  rating?: number | null | undefined;
  writing?: number | null | undefined;
  mode?: Mode | null | undefined;
  onRating: (v: number) => void;
  onWriting: (m: number) => void;
}) {
  return (
    <div className="space-y-3">
      <RatingButtons value={rating} onChange={onRating} />
      <WritingButtons value={writing} onChange={onWriting} />
      {writing !== undefined && writing !== null && (
        <p className="text-sm italic text-neutral-600">{kindLine(dateISO, writing, mode)}</p>
      )}
    </div>
  );
}
