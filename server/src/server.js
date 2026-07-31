import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import scriptsRouter from "./routes/scripts.js";
import channelRouter from "./routes/channel.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/creator_workspace";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mongoConnected: mongoose.connection.readyState === 1 });
});

app.use("/api/scripts", scriptsRouter);
app.use("/api/channel", channelRouter);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB at", MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Creator Workspace API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error("Make sure MongoDB is running locally (see README.md).");
    process.exit(1);
  });
