import { useEffect, useRef, useState } from "react";
import { createScript } from "../api/client.js";

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (!open && !typing && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setOpen(true);
      } else if (open && e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await createScript({
        title: trimmed,
        status: "idea",
        tags: tag.trim() ? [tag.trim()] : [],
      });
      setToast(`Saved "${trimmed}" to Ideas`);
      setTitle("");
      setTag("");
      setOpen(false);
    } catch {
      setToast("Couldn't save — check the server connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quick capture an idea (press C)"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-spark text-paper text-2xl leading-none transition-transform hover:scale-105 hover:bg-spark-dim"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 pt-[18vh]"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-md border border-hairline bg-panel p-5 shadow-2xl"
          >
            <div className="text-xs uppercase tracking-widest text-paper-faint font-mono mb-3">
              Quick capture · lands in Ideas
            </div>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the video idea?"
              className="w-full rounded-md border border-hairline bg-panel-soft px-3 py-2.5 text-sm text-paper placeholder:text-paper-faint mb-2"
            />
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag (optional)"
              className="w-full rounded-md border border-hairline bg-panel-soft px-3 py-2 text-xs font-mono text-paper-dim placeholder:text-paper-faint mb-4"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-paper-faint">Esc to cancel</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-paper-faint hover:text-paper transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="rounded-md bg-spark hover:bg-spark-dim px-4 py-1.5 text-sm font-semibold text-paper disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : "Save idea"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md border border-hairline bg-panel px-4 py-2 text-sm text-paper shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}
