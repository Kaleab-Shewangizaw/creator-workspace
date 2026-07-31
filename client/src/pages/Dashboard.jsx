import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getStats, createScript } from "../api/client.js";
import { statusMeta, STATUSES, estimateRuntime } from "../constants.js";

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
    return <div className="p-10 text-paper-faint font-mono text-sm">Loading dashboard…</div>;
  }

  const total = stats.totalScripts || 1;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-paper tracking-tight">Dashboard</h1>
          <p className="text-paper-faint text-sm mt-1">
            Your channel's writing room, at a glance.
          </p>
        </div>
        <button
          onClick={handleNewScript}
          className="rounded-md bg-ember hover:bg-ember-dim transition-colors px-4 py-2 text-sm font-medium text-ink"
        >
          + New script
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-md border border-hairline bg-panel p-5 col-span-1">
          <div className="text-xs uppercase tracking-widest text-paper-faint font-mono mb-2">
            Est. runtime
          </div>
          <div className="text-3xl font-mono tabular text-ember">
            {estimateRuntime(stats.totalWords)}
          </div>
          <div className="text-xs text-paper-faint mt-1">across all scripts, at ~140 wpm</div>
        </div>
        <StatCard label="Total scripts" value={stats.totalScripts} />
        <StatCard label="Total words written" value={stats.totalWords.toLocaleString()} />
      </div>

      <div className="rounded-md border border-hairline bg-panel p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-paper-faint font-mono">
            Pipeline
          </span>
          <span className="text-xs text-paper-faint font-mono">
            {stats.totalScripts} script{stats.totalScripts === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-panel-soft mb-4">
          {STATUSES.map((s) => {
            const count = stats.byStatus[s.value] || 0;
            if (!count) return null;
            return (
              <div
                key={s.value}
                style={{ width: `${(count / total) * 100}%`, background: s.color }}
                title={`${s.label}: ${count}`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map((s) => (
            <div key={s.value} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-paper-dim truncate">{s.label}</span>
              <span className="text-xs font-mono tabular text-paper-faint ml-auto">
                {stats.byStatus[s.value] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-hairline bg-panel">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h2 className="font-medium text-paper text-sm">Recently updated</h2>
          <Link to="/scripts" className="text-xs text-paper-faint hover:text-tide transition-colors">
            View all →
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="p-8 text-center text-paper-faint text-sm">
            No scripts yet. Create your first one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {stats.recent.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <li key={s._id}>
                  <Link
                    to={`/scripts/${s._id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-panel-soft transition-colors"
                  >
                    <span className="text-sm text-paper">{s.title}</span>
                    <span className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-mono"
                        style={{
                          color: meta.color,
                          background: meta.color + "1a",
                        }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-paper-faint font-mono tabular">
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
    <div className="rounded-md border border-hairline bg-panel p-5">
      <div className="text-xs uppercase tracking-widest text-paper-faint font-mono mb-2">
        {label}
      </div>
      <div className="text-3xl font-mono tabular text-paper">{value}</div>
    </div>
  );
}

export function ErrorBanner({ error }) {
  return (
    <div className="rounded-md border border-ember-dim/40 bg-ember-soft p-4 text-sm">
      <div className="font-medium mb-1 text-ember">Couldn't reach the server</div>
      <div className="text-paper-dim">
        Make sure the backend is running on port 5000 and MongoDB is connected. ({error})
      </div>
    </div>
  );
}
