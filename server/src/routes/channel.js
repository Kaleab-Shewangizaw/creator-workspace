import { Router } from "express";
import Channel from "../models/Channel.js";

const router = Router();

// GET /api/channel -> the single channel profile, creating a default one on first access
router.get("/", async (req, res) => {
  try {
    let channel = await Channel.findOne();
    if (!channel) channel = await Channel.create({});
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channel -> upsert the single channel profile
router.put("/", async (req, res) => {
  try {
    const channel = await Channel.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    res.json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
