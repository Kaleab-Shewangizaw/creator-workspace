import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getScripts, createScript, updateScript } from "../api/client.js";
import { STATUSES, statusMeta, checklistProgress } from "../constants.js";
import { ErrorBanner } from "./Dashboard.jsx";

export default function Board() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const navigate = useNavigate();

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

  async function handleNewScript(status) {
    const script = await createScript({ title: "Untitled script", status });
    navigate(`/scripts/${script._id}`);
  }

  async function moveScript(id, status) {
    setScripts((prev) =>
      prev.map((s) => (s._id === id ? { ...s, status } : s))
    );
    await updateScript(id, { status });
  }

  if (error) {
    return (
      <div className="p-10">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-paper tracking-tight">Pipeline</h1>
        <p className="text-paper-faint text-sm mt-1">
          Drag cards across stages as each video moves forward.
        </p>
      </div>

      {loading ? (
        <div className="text-paper-faint font-mono text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {STATUSES.map((col) => {
            const items = scripts.filter((s) => s.status === col.value);
            return (
              <div
                key={col.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) moveScript(draggingId, col.value);
                  setDraggingId(null);
                }}
                className="rounded-md border border-hairline bg-panel-soft flex flex-col min-h-[60vh]"
              >
                <div className="h-0.5 rounded-t-md" style={{ background: col.color }} />
                <div className="px-3 py-3 border-b border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: col.color }}
                    />
                    <span className="text-xs font-medium text-paper-dim">
                      {col.label}
                    </span>
                    <span className="text-xs font-mono tabular text-paper-faint">
                      {items.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleNewScript(col.value)}
                    className="text-paper-faint hover:text-flare text-sm leading-none transition-colors"
                    title="New script in this stage"
                  >
                    +
                  </button>
                </div>

                <div className="flex-1 p-2 space-y-2">
                  {items.map((s) => {
                    const progress = checklistProgress(s.notes);
                    return (
                      <Link
                        key={s._id}
                        to={`/scripts/${s._id}`}
                        draggable
                        onDragStart={() => setDraggingId(s._id)}
                        className="block rounded-md border border-hairline bg-panel p-3 hover:border-tide-dim transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm text-paper mb-2 line-clamp-2">
                          {s.title || "Untitled script"}
                        </div>
                        <div className="flex items-center justify-between text-xs text-paper-faint font-mono tabular mb-1.5">
                          <span>{s.wordCount || 0}w</span>
                          {s.tags?.[0] && (
                            <span className="rounded-full bg-panel-soft px-2 py-0.5 text-paper-dim font-sans">
                              {s.tags[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono tabular">
                          <span
                            className={progress.done === progress.total ? "text-zest" : "text-paper-faint"}
                          >
                            {progress.done}/{progress.total} ready
                          </span>
                          {s.publishDate && (
                            <span className="text-tide">
                              {new Date(s.publishDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="text-xs text-paper-faint/60 text-center py-6">
                      Nothing here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
