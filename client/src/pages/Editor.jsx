import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getScript, updateScript, deleteScript } from "../api/client.js";
import {
  STATUSES,
  estimateRuntime,
  DEFAULT_CHECKLIST,
  checklistProgress,
  CUE_TYPES,
  splitCues,
  stripCues,
} from "../constants.js";
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
  const contentRef = useRef(null);
  const backdropRef = useRef(null);

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

  function checklistItems() {
    return script.notes.checklist?.length
      ? script.notes.checklist
      : DEFAULT_CHECKLIST.map((label) => ({ label, done: false }));
  }

  function toggleChecklistItem(i) {
    const next = checklistItems().map((c, idx) => (idx === i ? { ...c, done: !c.done } : c));
    updateNotes("checklist", next);
  }

  function addChecklistItem() {
    updateNotes("checklist", [...checklistItems(), { label: "", done: false }]);
  }

  function setChecklistLabel(i, value) {
    const next = checklistItems().map((c, idx) => (idx === i ? { ...c, label: value } : c));
    updateNotes("checklist", next);
  }

  function removeChecklistItem(i) {
    updateNotes("checklist", checklistItems().filter((_, idx) => idx !== i));
  }

  function insertCue(cue) {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const content = script.content || "";
    const before = content.slice(0, start);
    const after = content.slice(end);
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const insertText = (needsSpaceBefore ? " " : "") + cue.insert;
    update("content", before + insertText + after);
    const caretOffset = cue.hasPayload ? insertText.length - 1 : insertText.length;
    const pos = before.length + caretOffset;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function syncScroll() {
    if (backdropRef.current && contentRef.current) {
      backdropRef.current.scrollTop = contentRef.current.scrollTop;
      backdropRef.current.scrollLeft = contentRef.current.scrollLeft;
    }
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
    return <div className="p-10 text-paper-faint font-mono text-sm">Loading script…</div>;
  }

  const wordCount = stripCues(script.content).trim().split(/\s+/).filter(Boolean).length;
  const meta = STATUSES.find((s) => s.value === script.status) || STATUSES[0];
  const progress = checklistProgress(script.notes);

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
            <span
              className={`tabular ${progress.total > 0 && progress.done === progress.total ? "text-zest" : ""}`}
              title="Publish checklist progress"
            >
              {progress.done}/{progress.total} ready
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
              className="font-sans text-paper-faint hover:text-flare transition-colors"
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

            <label className="flex items-center gap-1.5 rounded-md border border-hairline bg-panel px-3 py-1.5 text-sm text-paper-dim">
              <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                Publish
              </span>
              <input
                type="date"
                value={script.publishDate ? script.publishDate.slice(0, 10) : ""}
                onChange={(e) => update("publishDate", e.target.value ? e.target.value : null)}
                className="bg-transparent text-paper-dim tabular"
              />
            </label>

            <div className="flex items-center gap-1.5 flex-wrap">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs rounded-full bg-panel px-2 py-1 text-paper-dim font-mono"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="text-paper-faint hover:text-flare">
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

          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint mr-0.5">
              Cues
            </span>
            {CUE_TYPES.map((cue) => (
              <button
                key={cue.key}
                type="button"
                onClick={() => insertCue(cue)}
                title={cue.hint}
                className={`text-xs font-mono px-2 py-1 rounded-full border transition-colors ${cue.chipClass}`}
              >
                {cue.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="no-scrollbar absolute inset-0 overflow-auto whitespace-pre-wrap wrap-break-word font-mono leading-[1.8] text-[15px] tracking-[0.01em] text-paper pb-[50vh]"
            >
              {splitCues(script.content).map((part, i) =>
                part.cue ? (
                  <span
                    key={i}
                    className={`${part.cue.bgClass} ${part.cue.textClass} rounded px-1 font-sans font-semibold`}
                  >
                    {part.raw}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </div>
            <textarea
              ref={contentRef}
              value={script.content}
              onChange={(e) => update("content", e.target.value)}
              onScroll={syncScroll}
              placeholder="Start writing your script…"
              className="no-scrollbar absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-paper font-mono leading-[1.8] text-[15px] tracking-[0.01em] placeholder:text-paper-faint/50 pb-[50vh]"
            />
          </div>
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
                    className="text-paper-faint hover:text-flare text-sm px-1"
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
              Description &amp; chapters
            </h3>
            <textarea
              value={script.notes.description || ""}
              onChange={(e) => updateNotes("description", e.target.value)}
              placeholder={"YouTube description…\n\n0:00 Intro\n0:45 Chapter one"}
              rows={5}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest">
                Publish checklist
              </h3>
              <span className="text-xs font-mono tabular text-paper-faint">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="space-y-1.5">
              {checklistItems().map((c, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={() => toggleChecklistItem(i)}
                    className="accent-zest h-3.5 w-3.5 shrink-0"
                  />
                  <input
                    value={c.label}
                    onChange={(e) => setChecklistLabel(i, e.target.value)}
                    placeholder={`Checklist item ${i + 1}`}
                    className={`flex-1 bg-transparent text-sm px-1 py-1 placeholder:text-paper-faint ${
                      c.done ? "text-paper-faint line-through" : "text-paper-dim"
                    }`}
                  />
                  <button
                    onClick={() => removeChecklistItem(i)}
                    className="text-paper-faint hover:text-flare text-sm px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addChecklistItem}
                className="text-xs text-paper-faint hover:text-tide transition-colors"
              >
                + Add checklist item
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export function SaveIndicator({ state, error }) {
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
      <span className="flex items-center gap-1.5 text-flare" title={error || "Save failed"}>
        <span className={`${dot} bg-flare`} /> Couldn't save
      </span>
    );
  return <span className="text-paper-faint">·</span>;
}
