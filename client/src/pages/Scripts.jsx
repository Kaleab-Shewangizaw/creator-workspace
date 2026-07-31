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
          <h1 className="text-2xl font-semibold text-white">Scripts</h1>
          <p className="text-gray-500 text-sm mt-1">Every script, searchable in one place.</p>
        </div>
        <button
          onClick={handleNewScript}
          className="rounded-lg bg-rose-500 hover:bg-rose-400 transition-colors px-4 py-2 text-sm font-medium text-white"
        >
          + New script
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, content, tags…"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300"
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
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300"
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

      {!error && loading && <div className="text-gray-500 text-sm">Loading…</div>}

      {!error && !loading && scripts.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center text-gray-500 text-sm">
          No scripts match. Try clearing filters or create a new one.
        </div>
      )}

      {!error && !loading && scripts.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <ul className="divide-y divide-white/10">
            {scripts.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <li key={s._id}>
                  <Link
                    to={`/scripts/${s._id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        {s.title || "Untitled script"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {(s.tags || []).slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-xs rounded-full bg-white/5 px-2 py-0.5 text-gray-500"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-gray-600">{s.wordCount || 0} words</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ color: meta.color, background: meta.color + "22" }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-600 w-20 text-right">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, s._id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-400 text-xs transition-opacity"
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
