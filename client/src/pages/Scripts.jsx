import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getScripts, getTags, createScript, deleteScript } from "../api/client.js";
import { STATUSES, statusMeta } from "../constants.js";
import { ErrorBanner } from "./Dashboard.jsx";

export default function Scripts() {
  const [scripts, setScripts] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      getScripts({ search: search || undefined, status: status || undefined, tag: tag || undefined })
        .then(setScripts)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [search, status, tag]);

  async function handleNewScript() {
    const script = await createScript({ title: "Untitled script" });
    navigate(`/scripts/${script._id}`);
  }

  async function handleDelete(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this script? This can't be undone.")) return;
    await deleteScript(id);
    setScripts((prev) => prev.filter((s) => s._id !== id));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-paper tracking-tight">Scripts</h1>
          <p className="text-paper-faint text-sm mt-1">Every script, searchable in one place.</p>
        </div>
        <button
          onClick={handleNewScript}
          className="rounded-md bg-ember hover:bg-ember-dim transition-colors px-4 py-2 text-sm font-medium text-ink"
        >
          + New script
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, content, tags…"
          className="flex-1 rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-paper placeholder:text-paper-faint focus:border-tide-dim transition-colors"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-paper-dim"
        >
          <option value="">All stages</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-paper-dim"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner error={error} />}

      {!error && loading && <div className="text-paper-faint font-mono text-sm">Loading…</div>}

      {!error && !loading && scripts.length === 0 && (
        <div className="rounded-md border border-hairline bg-panel-soft p-10 text-center text-paper-faint text-sm">
          No scripts match. Try clearing filters or create a new one.
        </div>
      )}

      {!error && !loading && scripts.length > 0 && (
        <div className="rounded-md border border-hairline bg-panel overflow-hidden">
          <ul className="divide-y divide-hairline">
            {scripts.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <li key={s._id}>
                  <Link
                    to={`/scripts/${s._id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-panel-soft transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-paper truncate">
                        {s.title || "Untitled script"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(s.tags || []).slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-xs rounded-full bg-panel-soft px-2 py-0.5 text-paper-faint"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-paper-faint font-mono tabular">
                        {s.wordCount || 0} words
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-mono"
                        style={{ color: meta.color, background: meta.color + "1a" }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-paper-faint font-mono tabular w-20 text-right">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, s._id)}
                        className="opacity-0 group-hover:opacity-100 text-paper-faint hover:text-ember text-xs transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
