import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    tagline: { type: String, default: "" },
    niche: { type: String, default: "" },
    contentPillars: { type: [String], default: [] },
    targetAudience: { type: String, default: "" },
    uploadCadence: { type: String, default: "" },
    links: {
      type: [{ label: String, url: String }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Channel", channelSchema);
