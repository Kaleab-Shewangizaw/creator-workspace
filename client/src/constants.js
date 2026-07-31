// One vivid hue per stage of momentum: a spark of an idea, cyan
// clarity once it's outlined, gold heat while drafting, a hot
// tally-light flare while recording, and a lime win once it's live.
export const STATUSES = [
  { value: "idea", label: "Idea", color: "#2f6fed" },
  { value: "outline", label: "Outline", color: "#22d3ee" },
  { value: "draft", label: "Draft", color: "#fbbf24" },
  { value: "recording", label: "Recording", color: "#ff4d6d" },
  { value: "published", label: "Published", color: "#a3e635" },
];

const WORDS_PER_MINUTE = 140;

export function estimateRuntime(words) {
  const totalSeconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || STATUSES[0];

export const DEFAULT_CHECKLIST = [
  "Thumbnail finalized",
  "Title locked",
  "Description written",
  "Tags & SEO set",
  "Captions uploaded",
  "End screen added",
  "Pinned comment drafted",
];

export function checklistProgress(notes) {
  const items = notes?.checklist?.length ? notes.checklist : null;
  if (!items) return { done: 0, total: DEFAULT_CHECKLIST.length };
  return { done: items.filter((c) => c.done).length, total: items.length };
}
