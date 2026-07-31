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
  if (!this.content) return 0;
  return this.content.trim().split(/\s+/).filter(Boolean).length;
});

scriptSchema.set("toJSON", { virtuals: true });
scriptSchema.set("toObject", { virtuals: true });

export const STATUS_VALUES = STATUSES;
export default mongoose.model("Script", scriptSchema);
