// Ordered cool → hot → resolved: an idea starts quiet, heats up
// through drafting, peaks at the tally-red of recording, then
// settles into the calm green of a published video.
export const STATUSES = [
  { value: "idea", label: "Idea", color: "#6f95a3" },
  { value: "outline", label: "Outline", color: "#4fa8a0" },
  { value: "draft", label: "Draft", color: "#d9a441" },
  { value: "recording", label: "Recording", color: "#ff5a36" },
  { value: "published", label: "Published", color: "#8fb37a" },
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
