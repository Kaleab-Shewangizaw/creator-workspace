import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getScript, updateScript, deleteScript } from "../api/client.js";
import { STATUSES } from "../constants.js";
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

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
          <Link to="/scripts" className="text-sm text-gray-500 hover:text-gray-300">
            ← All scripts
          </Link>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>{wordCount} words</span>
            <SaveIndicator state={saveState} error={saveError} />
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="text-gray-500 hover:text-gray-200"
            >
              {showNotes ? "Hide notes" : "Show notes"}
            </button>
            <button onClick={handleDelete} className="text-gray-600 hover:text-rose-400">
              Delete
            </button>
          </div>
        </div>

        <div className="px-8 py-6 flex-1 flex flex-col min-h-0">
          <input
            value={script.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Untitled script"
            className="text-2xl font-semibold bg-transparent text-white placeholder:text-gray-700 mb-4 w-full"
          />

          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select
              value={script.status}
              onChange={(e) => update("status", e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-gray-300"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 flex-wrap">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs rounded-full bg-white/5 px-2 py-1 text-gray-400"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="text-gray-600 hover:text-rose-400">
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
                className="text-xs bg-transparent placeholder:text-gray-700 text-gray-300 w-16 px-1 py-1"
              />
            </div>
          </div>

          <textarea
            value={script.content}
            onChange={(e) => update("content", e.target.value)}
            placeholder="Start writing your script…"
            className="flex-1 w-full resize-none bg-transparent text-gray-200 leading-relaxed text-[15px] placeholder:text-gray-700"
          />
        </div>
      </div>

      {showNotes && (
        <aside className="w-80 shrink-0 border-l border-white/10 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Title ideas
            </h3>
            <div className="space-y-2">
              {(script.notes.titleIdeas || []).map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={t}
                    onChange={(e) => setTitleIdea(i, e.target.value)}
                    placeholder={`Title idea ${i + 1}`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-700"
                  />
                  <button
                    onClick={() => removeTitleIdea(i)}
                    className="text-gray-600 hover:text-rose-400 text-sm px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addTitleIdea}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                + Add title idea
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Thumbnail notes
            </h3>
            <textarea
              value={script.notes.thumbnailNotes}
              onChange={(e) => updateNotes("thumbnailNotes", e.target.value)}
              placeholder="Text overlay, imagery, colors…"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-700 resize-none"
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
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
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-700 resize-none"
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Hook / opening notes
            </h3>
            <textarea
              value={script.notes.hooks}
              onChange={(e) => updateNotes("hooks", e.target.value)}
              placeholder="How does the first 10 seconds grab attention?"
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-700 resize-none"
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function SaveIndicator({ state, error }) {
  if (state === "saving") return <span className="text-amber-500">Saving…</span>;
  if (state === "saved") return <span className="text-emerald-500">Saved</span>;
  if (state === "error")
    return (
      <span className="text-rose-400" title={error || "Save failed"}>
        Couldn't save
      </span>
    );
  return <span className="text-gray-700">·</span>;
}
