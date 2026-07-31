import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getStats, createScript } from "../api/client.js";
import { statusMeta, STATUSES } from "../constants.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleNewScript() {
    const script = await createScript({ title: "Untitled script" });
    navigate(`/scripts/${script._id}`);
  }

  if (error) {
    return (
      <div className="p-10">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (loading || !stats) {
    return <div className="p-10 text-gray-500">Loading dashboard…</div>;
  }

  const inProgress =
    (stats.byStatus.outline || 0) +
    (stats.byStatus.draft || 0) +
    (stats.byStatus.recording || 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your channel's writing room, at a glance.
          </p>
        </div>
        <button
          onClick={handleNewScript}
          className="rounded-lg bg-rose-500 hover:bg-rose-400 transition-colors px-4 py-2 text-sm font-medium text-white"
        >
          + New script
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total scripts" value={stats.totalScripts} />
        <StatCard label="Total words written" value={stats.totalWords.toLocaleString()} />
        <StatCard label="In progress" value={inProgress} />
      </div>

      <div className="grid grid-cols-5 gap-3 mb-8">
        {STATUSES.map((s) => (
          <div
            key={s.value}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className="text-xl font-semibold text-white">
              {stats.byStatus[s.value] || 0}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-medium text-white text-sm">Recently updated</h2>
          <Link to="/scripts" className="text-xs text-gray-500 hover:text-gray-300">
            View all →
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No scripts yet. Create your first one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {stats.recent.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <li key={s._id}>
                  <Link
                    to={`/scripts/${s._id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm text-gray-200">{s.title}</span>
                    <span className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          color: meta.color,
                          background: meta.color + "22",
                        }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function ErrorBanner({ error }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm">
      <div className="font-medium mb-1">Couldn't reach the server</div>
      <div className="text-rose-400/80">
        Make sure the backend is running on port 5000 and MongoDB is connected. ({error})
      </div>
    </div>
  );
}
