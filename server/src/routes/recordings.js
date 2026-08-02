import { Router } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Recording from "../models/Recording.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, "../../uploads/recordings");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/vnd.wave": "wav",
};

const router = Router();

// GET /api/scripts/:scriptId/recordings
router.get("/scripts/:scriptId/recordings", async (req, res) => {
  try {
    const recordings = await Recording.find({ script: req.params.scriptId }).sort({
      order: 1,
      createdAt: 1,
    });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scripts/:scriptId/recordings?label=&mimeType=&duration=  (raw audio body)
router.post(
  "/scripts/:scriptId/recordings",
  express.raw({ type: () => true, limit: "50mb" }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "No audio data received" });
      }
      const mimeType = (req.query.mimeType || "audio/webm").split(";")[0];
      const ext = EXT_BY_MIME[mimeType] || "webm";
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.body);

      const count = await Recording.countDocuments({ script: req.params.scriptId });
      const recording = await Recording.create({
        script: req.params.scriptId,
        label: req.query.label || `Take ${count + 1}`,
        filename,
        mimeType,
        duration: Number(req.query.duration) || 0,
        order: count,
        source: req.query.source === "tts" ? "tts" : "human",
      });
      res.status(201).json(recording);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PUT /api/recordings/:id
router.put("/recordings/:id", async (req, res) => {
  try {
    const recording = await Recording.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!recording) return res.status(404).json({ error: "Recording not found" });
    res.json(recording);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/recordings/:id
router.delete("/recordings/:id", async (req, res) => {
  try {
    const recording = await Recording.findByIdAndDelete(req.params.id);
    if (!recording) return res.status(404).json({ error: "Recording not found" });
    fs.unlink(path.join(UPLOAD_DIR, recording.filename), () => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
