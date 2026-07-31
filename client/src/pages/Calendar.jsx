import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getScripts, updateScript } from "../api/client.js";
import { statusMeta } from "../constants.js";
import { ErrorBanner } from "./Dashboard.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendar() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getScripts()
      .then(setScripts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function schedule(id, value) {
    setScripts((prev) => prev.map((s) => (s._id === id ? { ...s, publishDate: value || null } : s)));
    await updateScript(id, { publishDate: value || null });
  }

  const byDay = useMemo(() => {
    const map = new Map();
    for (const s of scripts) {
      if (!s.publishDate) continue;
      const key = toDateKey(new Date(s.publishDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [scripts]);

  const unscheduled = scripts.filter((s) => !s.publishDate);

  const weeks = useMemo(() => {
    const firstOfMonth = cursor;
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(start.getTime() + i * DAY_MS));
    }
    const rows = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = toDateKey(new Date());

  if (error) {
    return (
      <div className="p-10">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-paper tracking-tight">Calendar</h1>
          <p className="text-paper-faint text-sm mt-1">Plan a steady upload cadence, one publish date at a time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="rounded-md border border-hairline px-2.5 py-1.5 text-paper-faint hover:text-paper hover:border-tide-dim transition-colors"
          >
            ←
          </button>
          <span className="font-mono text-sm text-paper-dim w-36 text-center tabular">{monthLabel}</span>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="rounded-md border border-hairline px-2.5 py-1.5 text-paper-faint hover:text-paper hover:border-tide-dim transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-paper-faint font-mono text-sm">Loading…</div>
      ) : (
        <>
          <div className="rounded-md border border-hairline bg-panel overflow-hidden mb-8">
            <div className="grid grid-cols-7 border-b border-hairline">
              {WEEKDAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-mono uppercase tracking-widest text-paper-faint"
                >
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-hairline last:border-b-0">
                {week.map((day) => {
                  const key = toDateKey(day);
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const items = byDay.get(key) || [];
                  return (
                    <div
                      key={key}
                      className={`min-h-[92px] border-r border-hairline last:border-r-0 p-1.5 ${
                        inMonth ? "" : "opacity-30"
                      }`}
                    >
                      <div
                        className={`text-xs font-mono tabular mb-1 ${
                          key === todayKey ? "text-tide" : "text-paper-faint"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {items.map((s) => {
                          const meta = statusMeta(s.status);
                          return (
                            <Link
                              key={s._id}
                              to={`/scripts/${s._id}`}
                              title={s.title}
                              className="block truncate rounded px-1.5 py-0.5 text-[11px] hover:opacity-80 transition-opacity"
                              style={{ color: meta.color, background: meta.color + "1a" }}
                            >
                              {s.title || "Untitled"}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="rounded-md border border-hairline bg-panel">
            <div className="px-5 py-4 border-b border-hairline">
              <h2 className="font-medium text-paper text-sm">Unscheduled</h2>
              <p className="text-xs text-paper-faint mt-0.5">
                Scripts without a publish date yet — set one to drop them on the calendar.
              </p>
            </div>
            {unscheduled.length === 0 ? (
              <div className="p-6 text-center text-paper-faint text-sm">Everything's on the calendar.</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {unscheduled.map((s) => {
                  const meta = statusMeta(s.status);
                  return (
                    <li key={s._id} className="flex items-center justify-between px-5 py-3">
                      <Link to={`/scripts/${s._id}`} className="text-sm text-paper hover:text-tide transition-colors truncate">
                        {s.title || "Untitled script"}
                      </Link>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-mono"
                          style={{ color: meta.color, background: meta.color + "1a" }}
                        >
                          {meta.label}
                        </span>
                        <input
                          type="date"
                          onChange={(e) => schedule(s._id, e.target.value)}
                          className="rounded-md border border-hairline bg-panel-soft px-2 py-1 text-xs text-paper-dim tabular"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
