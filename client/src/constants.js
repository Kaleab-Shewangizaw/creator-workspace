export const STATUSES = [
  { value: "idea", label: "Idea", color: "#818cf8" },
  { value: "outline", label: "Outline", color: "#38bdf8" },
  { value: "draft", label: "Draft", color: "#fbbf24" },
  { value: "recording", label: "Recording", color: "#fb923c" },
  { value: "published", label: "Published", color: "#4ade80" },
];

export const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || STATUSES[0];
