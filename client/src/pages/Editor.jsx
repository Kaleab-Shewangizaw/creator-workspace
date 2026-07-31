import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getScript, updateScript, deleteScript } from "../api/client.js";
import { STATUSES, estimateRuntime } from "../constants.js";
import { ErrorBanner } from "./Dashboard.jsx";

const SAVE_DELAY = 800;

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [script, setScript] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [tagInput, setTagInput] = useState("");
  const [showNotes, setShowNotes] = useState(true);

  const saveTimer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    setScript(null);
    getScript(id)
      .then((s) => {
        setScript(s);
        latest.current = s;
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const persist = useCallback((data) => {
    setSaveState("saving");
    updateScript(id, data)
      .then((saved) => {
        setSaveState("saved");
        setSaveError(null);
        latest.current = saved;
      })
      .catch((e) => {
        setSaveState("error");
        setSaveError(e.message);
      });
  }, [id]);

  function scheduleSave(next) {
    latest.current = next;
    setScript(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { _id, __v, createdAt, updatedAt, wordCount, ...payload } = latest.current;
      persist(payload);
    }, SAVE_DELAY);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function update(field, value) {
    scheduleSave({ ...script, [field]: value });
  }

  function updateNotes(field, value) {
    scheduleSave({ ...script, notes: { ...script.notes, [field]: value } });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || script.tags.includes(t)) {
      setTagInput("");
      return;
    }
    update("tags", [...script.tags, t]);
    setTagInput("");
  }

  function removeTag(t) {
    update("tags", script.tags.filter((x) => x !== t));
  }

  function addTitleIdea() {
    updateNotes("titleIdeas", [...(script.notes.titleIdeas || []), ""]);
  }

  function setTitleIdea(i, value) {
    const next = [...script.notes.titleIdeas];
    next[i] = value;
    updateNotes("titleIdeas", next);
  }

  function removeTitleIdea(i) {
    updateNotes("titleIdeas", script.notes.titleIdeas.filter((_, idx) => idx !== i));
  }

  async function handleDelete() {
    if (!confirm("Delete this script? This can't be undone.")) return;
    await deleteScript(id);
    navigate("/scripts");
  }

  if (error) {
    return (
      <div className="p-10">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!script) {
    return <div className="p-10 text-gray-500">Loading script…</div>;
  }

  const wordCount = (script.content || "").trim().split(/\s+/).filter(Boolean).length;
  const meta = STATUSES.find((s) => s.value === script.status) || STATUSES[0];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-hairline px-8 py-4 flex items-center justify-between">
          <Link to="/scripts" className="text-sm text-paper-faint hover:text-tide transition-colors">
            ← All scripts
          </Link>
          <div className="flex items-center gap-4 text-xs font-mono text-paper-faint">
            <span className="tabular">
              {wordCount}w · {estimateRuntime(wordCount)}
            </span>
            <SaveIndicator state={saveState} error={saveError} />
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="font-sans text-paper-faint hover:text-paper transition-colors"
            >
              {showNotes ? "Hide notes" : "Show notes"}
            </button>
            <button
              onClick={handleDelete}
              className="font-sans text-paper-faint hover:text-ember transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="px-8 py-6 flex-1 flex flex-col min-h-0 max-w-[760px] w-full mx-auto">
          <input
            value={script.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Untitled script"
            className="text-2xl font-semibold bg-transparent text-paper placeholder:text-paper-faint/50 mb-4 w-full"
          />

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <select
              value={script.status}
              onChange={(e) => update("status", e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm bg-panel"
              style={{ color: meta.color, borderColor: meta.color + "40" }}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value} className="text-paper-dim bg-panel">
                  {s.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 flex-wrap">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs rounded-full bg-panel px-2 py-1 text-paper-dim font-mono"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="text-paper-faint hover:text-ember">
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="+ tag"
                className="text-xs font-mono bg-transparent placeholder:text-paper-faint/60 text-paper-dim w-16 px-1 py-1"
              />
            </div>
          </div>

          <textarea
            value={script.content}
            onChange={(e) => update("content", e.target.value)}
            placeholder="Start writing your script…"
            className="flex-1 w-full resize-none bg-transparent text-paper font-mono leading-[1.8] text-[15px] tracking-[0.01em] placeholder:text-paper-faint/50"
          />
        </div>
      </div>

      {showNotes && (
        <aside className="w-80 shrink-0 border-l border-hairline bg-panel-soft overflow-y-auto p-6 space-y-7">
          <div>
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              Title ideas
            </h3>
            <div className="space-y-2">
              {(script.notes.titleIdeas || []).map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={t}
                    onChange={(e) => setTitleIdea(i, e.target.value)}
                    placeholder={`Title idea ${i + 1}`}
                    className="flex-1 rounded-md border border-hairline bg-panel px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint"
                  />
                  <button
                    onClick={() => removeTitleIdea(i)}
                    className="text-paper-faint hover:text-ember text-sm px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addTitleIdea}
                className="text-xs text-paper-faint hover:text-tide transition-colors"
              >
                + Add title idea
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              Thumbnail notes
            </h3>
            <textarea
              value={script.notes.thumbnailNotes}
              onChange={(e) => updateNotes("thumbnailNotes", e.target.value)}
              placeholder="Text overlay, imagery, colors…"
              rows={3}
              className="w-full rounded-md border border-hairline bg-panel px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint resize-none"
            />
          </div>

          <div>
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              SEO tags
            </h3>
            <textarea
              value={(script.notes.seoTags || []).join(", ")}
              onChange={(e) =>
                updateNotes(
                  "seoTags",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="comma, separated, keywords"
              rows={2}
              className="w-full rounded-md border border-hairline bg-panel px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint resize-none"
            />
          </div>

          <div>
            <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest mb-2">
              Hook / opening notes
            </h3>
            <textarea
              value={script.notes.hooks}
              onChange={(e) => updateNotes("hooks", e.target.value)}
              placeholder="How does the first 10 seconds grab attention?"
              rows={4}
              className="w-full rounded-md border border-hairline bg-panel px-2 py-1.5 text-sm text-paper-dim placeholder:text-paper-faint resize-none"
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function SaveIndicator({ state, error }) {
  const dot = "inline-block h-1.5 w-1.5 rounded-full";
  if (state === "saving")
    return (
      <span className="flex items-center gap-1.5 text-amber-500">
        <span className={`${dot} bg-amber-500 animate-pulse`} /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-tide">
        <span className={`${dot} bg-tide`} /> Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1.5 text-ember" title={error || "Save failed"}>
        <span className={`${dot} bg-ember`} /> Couldn't save
      </span>
    );
  return <span className="text-paper-faint">·</span>;
}
