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

// Delivery cues you can drop inline while writing: [LOUD], [PAUSE],
// [SPEAKER: name], [SFX: sound] — highlighted in the editor so the script
// doubles as a recording guide.
export const CUE_TYPES = [
  {
    key: "LOUD",
    label: "Louder",
    hint: "Raise your voice here",
    insert: "[LOUD]",
    hasPayload: false,
    textClass: "text-flare",
    bgClass: "bg-flare-soft",
    chipClass: "border-flare-dim/40 text-flare hover:bg-flare-soft",
  },
  {
    key: "PAUSE",
    label: "Pause",
    hint: "Beat — take a breath",
    insert: "[PAUSE]",
    hasPayload: false,
    textClass: "text-tide",
    bgClass: "bg-tide-soft",
    chipClass: "border-tide-dim/40 text-tide hover:bg-tide-soft",
  },
  {
    key: "SPEAKER",
    label: "Speaker",
    hint: "Hand off to someone else",
    insert: "[SPEAKER: ]",
    hasPayload: true,
    textClass: "text-spark",
    bgClass: "bg-spark-soft",
    chipClass: "border-spark-dim/40 text-spark hover:bg-spark-soft",
  },
  {
    key: "SFX",
    label: "Sound",
    hint: "Cue a sound effect or music",
    insert: "[SFX: ]",
    hasPayload: true,
    textClass: "text-zest",
    bgClass: "bg-zest/15",
    chipClass: "border-zest-dim/40 text-zest hover:bg-zest/15",
  },
];

const CUE_PATTERN = /\[(LOUD|PAUSE|SPEAKER:[^\]]*|SFX:[^\]]*)\]/gi;

export function cueTypeFor(raw) {
  const upper = raw.toUpperCase();
  if (upper.startsWith("SPEAKER")) return CUE_TYPES[2];
  if (upper.startsWith("SFX")) return CUE_TYPES[3];
  if (upper.startsWith("PAUSE")) return CUE_TYPES[1];
  return CUE_TYPES[0];
}

export function splitCues(content) {
  const parts = [];
  let lastIndex = 0;
  let match;
  CUE_PATTERN.lastIndex = 0;
  while ((match = CUE_PATTERN.exec(content || ""))) {
    if (match.index > lastIndex) parts.push({ text: content.slice(lastIndex, match.index) });
    parts.push({ cue: cueTypeFor(match[1]), raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < (content || "").length) parts.push({ text: content.slice(lastIndex) });
  return parts;
}

export function stripCues(content) {
  return (content || "").replace(CUE_PATTERN, " ");
}
