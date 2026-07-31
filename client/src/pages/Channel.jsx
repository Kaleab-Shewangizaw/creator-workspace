import { useEffect, useRef, useState, useCallback } from "react";
import { getChannel, updateChannel } from "../api/client.js";
import { ErrorBanner } from "./Dashboard.jsx";
import { SaveIndicator } from "./Editor.jsx";

const SAVE_DELAY = 800;

export default function Channel() {
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [pillarInput, setPillarInput] = useState("");

  const saveTimer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    getChannel()
      .then((c) => {
        setChannel(c);
        latest.current = c;
      })
      .catch((e) => setError(e.message));
  }, []);

  const persist = useCallback((data) => {
    setSaveState("saving");
    updateChannel(data)
      .then((saved) => {
        setSaveState("saved");
        setSaveError(null);
        latest.current = saved;
      })
      .catch((e) => {
        setSaveState("error");
        setSaveError(e.message);
      });
  }, []);

  function scheduleSave(next) {
    latest.current = next;
    setChannel(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { _id, __v, createdAt, updatedAt, ...payload } = latest.current;
      persist(payload);
    }, SAVE_DELAY);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function update(field, value) {
    scheduleSave({ ...channel, [field]: value });
  }

  function addPillar() {
    const p = pillarInput.trim();
    if (!p || channel.contentPillars.includes(p)) {
      setPillarInput("");
      return;
    }
    update("contentPillars", [...channel.contentPillars, p]);
    setPillarInput("");
  }

  function removePillar(p) {
    update("contentPillars", channel.contentPillars.filter((x) => x !== p));
  }

  function addLink() {
    update("links", [...(channel.links || []), { label: "", url: "" }]);
  }

  function setLink(i, field, value) {
    const next = channel.links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l));
    update("links", next);
  }

  function removeLink(i) {
    update("links", channel.links.filter((_, idx) => idx !== i));
  }

  if (error) {
    return (
      <div className="p-10">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!channel) {
    return <div className="p-10 text-paper-faint font-mono text-sm">Loading channel…</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-paper tracking-tight">Channel</h1>
        <SaveIndicator state={saveState} error={saveError} />
      </div>
      <p className="text-paper-faint text-sm mb-8">
        Your channel's identity, in one place — so every video stays on-brand.
      </p>

      <div className="space-y-6">
        <div className="rounded-md border border-hairline bg-panel p-5">
          <input
            value={channel.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Channel name"
            className="text-xl font-semibold bg-transparent text-paper placeholder:text-paper-faint/50 w-full mb-2"
          />
          <input
            value={channel.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            placeholder="One-line tagline — what you make and for whom"
            className="text-sm bg-transparent text-paper-dim placeholder:text-paper-faint w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border border-hairline bg-panel p-5">
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              Niche
            </h3>
            <textarea
              value={channel.niche}
              onChange={(e) => update("niche", e.target.value)}
              placeholder="What corner of YouTube is this?"
              rows={3}
              className="w-full rounded-md border border-hairline bg-panel-soft px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint resize-none"
            />
          </div>

          <div className="rounded-md border border-hairline bg-panel p-5">
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              Upload cadence
            </h3>
            <input
              value={channel.uploadCadence}
              onChange={(e) => update("uploadCadence", e.target.value)}
              placeholder="e.g. Every Tuesday & Friday"
              className="w-full rounded-md border border-hairline bg-panel-soft px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint"
            />
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-panel p-5">
          <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
            Content pillars
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {channel.contentPillars.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 text-xs rounded-full bg-panel-soft px-2 py-1 text-paper-dim font-mono"
              >
                {p}
                <button onClick={() => removePillar(p)} className="text-paper-faint hover:text-flare">
                  ×
                </button>
              </span>
            ))}
            <input
              value={pillarInput}
              onChange={(e) => setPillarInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPillar();
                }
              }}
              onBlur={addPillar}
              placeholder="+ pillar (e.g. Tutorials)"
              className="text-xs font-mono bg-transparent placeholder:text-paper-faint/60 text-paper-dim w-40 px-1 py-1"
            />
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-panel p-5">
          <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
            Target audience
          </h3>
          <textarea
            value={channel.targetAudience}
            onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="Who are you making this for?"
            rows={3}
            className="w-full rounded-md border border-hairline bg-panel-soft px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint resize-none"
          />
        </div>

        <div className="rounded-md border border-hairline bg-panel p-5">
          <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-3">
            Social links
          </h3>
          <div className="space-y-2">
            {(channel.links || []).map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) => setLink(i, "label", e.target.value)}
                  placeholder="Label (e.g. Instagram)"
                  className="w-36 rounded-md border border-hairline bg-panel-soft px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint"
                />
                <input
                  value={l.url}
                  onChange={(e) => setLink(i, "url", e.target.value)}
                  placeholder="https://…"
                  className="flex-1 rounded-md border border-hairline bg-panel-soft px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint"
                />
                <button
                  onClick={() => removeLink(i)}
                  className="text-paper-faint hover:text-flare text-sm px-1"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addLink}
              className="text-xs text-paper-faint hover:text-tide transition-colors"
            >
              + Add link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
