import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getScripts, createScript, updateScript } from "../api/client.js";
import { STATUSES, statusMeta } from "../constants.js";
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
        <h1 className="text-2xl font-semibold text-white">Pipeline</h1>
        <p className="text-gray-500 text-sm mt-1">
          Drag cards across stages as each video moves forward.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
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
                className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col min-h-[60vh]"
              >
                <div className="px-3 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="text-xs font-medium text-gray-300">
                      {col.label}
                    </span>
                    <span className="text-xs text-gray-600">{items.length}</span>
                  </div>
                  <button
                    onClick={() => handleNewScript(col.value)}
                    className="text-gray-500 hover:text-gray-200 text-sm leading-none"
                    title="New script in this stage"
                  >
                    +
                  </button>
                </div>

                <div className="flex-1 p-2 space-y-2">
                  {items.map((s) => (
                    <Link
                      key={s._id}
                      to={`/scripts/${s._id}`}
                      draggable
                      onDragStart={() => setDraggingId(s._id)}
                      className="block rounded-lg border border-white/10 bg-[#15171d] p-3 hover:border-white/25 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-sm text-gray-200 mb-2 line-clamp-2">
                        {s.title || "Untitled script"}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{s.wordCount || 0} words</span>
                        {s.tags?.[0] && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-gray-400">
                            {s.tags[0]}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-xs text-gray-700 text-center py-6">
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
