import mongoose from "mongoose";

const STATUSES = ["idea", "outline", "draft", "recording", "published"];

export const DEFAULT_CHECKLIST = [
  "Thumbnail finalized",
  "Title locked",
  "Description written",
  "Tags & SEO set",
  "Captions uploaded",
  "End screen added",
  "Pinned comment drafted",
];

// Delivery cues writers drop inline (e.g. [LOUD], [SPEAKER: name]) — these
// are directions, not spoken words, so word/runtime counts exclude them.
const CUE_PATTERN = /\[(LOUD|PAUSE|SPEAKER:[^\]]*|SFX:[^\]]*)\]/gi;

export function countWords(content) {
  if (!content) return 0;
  return content.replace(CUE_PATTERN, " ").trim().split(/\s+/).filter(Boolean).length;
}

const scriptSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Untitled script",
      set: (v) => (v && v.trim() ? v : "Untitled script"),
    },
    content: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "idea",
    },
    tags: {
      type: [String],
      default: [],
    },
    publishDate: {
      type: Date,
      default: null,
    },
    notes: {
      titleIdeas: { type: [String], default: [] },
      thumbnailNotes: { type: String, default: "" },
      seoTags: { type: [String], default: [] },
      hooks: { type: String, default: "" },
      description: { type: String, default: "" },
      checklist: {
        type: [{ label: String, done: { type: Boolean, default: false } }],
        default: () => DEFAULT_CHECKLIST.map((label) => ({ label, done: false })),
      },
    },
  },
  { timestamps: true }
);

scriptSchema.virtual("wordCount").get(function () {
  return countWords(this.content);
});

scriptSchema.set("toJSON", { virtuals: true });
scriptSchema.set("toObject", { virtuals: true });

export const STATUS_VALUES = STATUSES;
export default mongoose.model("Script", scriptSchema);
