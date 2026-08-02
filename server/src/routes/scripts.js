import { Router } from "express";
import Script, { STATUS_VALUES, countWords } from "../models/Script.js";

const router = Router();

// GET /api/scripts?search=&status=&tag=
router.get("/", async (req, res) => {
  try {
    const { search, status, tag } = req.query;
    const query = {};

    if (status) query.status = status;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const scripts = await Script.find(query).sort({ updatedAt: -1 });
    res.json(scripts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts/tags  -> distinct tag list
router.get("/tags", async (req, res) => {
  try {
    const tags = await Script.distinct("tags");
    res.json(tags.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts/stats -> dashboard aggregates
router.get("/stats", async (req, res) => {
  try {
    const scripts = await Script.find();
    const totalScripts = scripts.length;
    const totalWords = scripts.reduce((sum, s) => sum + countWords(s.content), 0);

    const byStatus = STATUS_VALUES.reduce((acc, status) => {
      acc[status] = scripts.filter((s) => s.status === status).length;
      return acc;
    }, {});

    const recent = [...scripts]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map((s) => ({
        _id: s._id,
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
      }));

    const now = new Date();
    const upcoming = scripts
      .filter((s) => s.publishDate && new Date(s.publishDate) >= now)
      .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate))
      .slice(0, 5)
      .map((s) => ({
        _id: s._id,
        title: s.title,
        status: s.status,
        publishDate: s.publishDate,
      }));

    const readyToPublish = scripts.filter((s) => {
      const checklist = s.notes?.checklist || [];
      return s.status !== "published" && checklist.length > 0 && checklist.every((c) => c.done);
    }).length;

    res.json({ totalScripts, totalWords, byStatus, recent, upcoming, readyToPublish });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts/:id
router.get("/:id", async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ error: "Script not found" });
    res.json(script);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scripts
router.post("/", async (req, res) => {
  try {
    const script = await Script.create(req.body);
    res.status(201).json(script);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/scripts/:id
router.put("/:id", async (req, res) => {
  try {
    const script = await Script.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!script) return res.status(404).json({ error: "Script not found" });
    res.json(script);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/scripts/:id
router.delete("/:id", async (req, res) => {
  try {
    const script = await Script.findByIdAndDelete(req.params.id);
    if (!script) return res.status(404).json({ error: "Script not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
