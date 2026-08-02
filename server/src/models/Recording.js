import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required: true,
      index: true,
    },
    label: { type: String, default: "Take" },
    filename: { type: String, required: true },
    mimeType: { type: String, default: "audio/webm" },
    duration: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    source: { type: String, enum: ["human", "tts"], default: "human" },
  },
  { timestamps: true }
);

export default mongoose.model("Recording", recordingSchema);
