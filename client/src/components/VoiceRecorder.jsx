import { useEffect, useRef, useState } from "react";
import { voices as fetchTtsVoices, predict as predictTts } from "@diffusionstudio/vits-web";
import {
  getRecordings,
  uploadRecording,
  updateRecording,
  deleteRecording,
  recordingUrl,
} from "../api/client.js";
import { stripCues } from "../constants.js";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const DEFAULT_VOICE_ID = "en_US-lessac-medium";

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Hand-rolled 16-bit PCM WAV encoder — avoids pulling in an encoding library
// just to turn a rendered AudioBuffer into a file every editor can import.
function encodeWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const blockAlign = numChannels * 2;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(audioBuffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// The Hugging Face-hosted voice files occasionally hiccup mid-fetch — retry
// a couple of times before surfacing an error, since it's usually transient.
async function withRetry(fn, attempts = 3, delayMs = 1200) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

// vits-web doesn't always check response status before parsing, so a flaky
// Hugging Face request surfaces as a raw "X is not valid JSON" SyntaxError.
function friendlyTtsError(e, fallback) {
  const msg = e?.message || "";
  if (e instanceof SyntaxError || /is not valid JSON/.test(msg)) {
    return "Couldn't reach the voice service (Hugging Face) after a few tries — this is usually temporary, try again in a moment.";
  }
  return msg || fallback;
}

async function getBlobDuration(blob) {
  const AudioContextCls = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextCls();
  try {
    const audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    return audioBuffer.duration;
  } finally {
    ctx.close();
  }
}

export default function VoiceRecorder({ scriptId, scriptTitle, scriptContent }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [combining, setCombining] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recError, setRecError] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const [aiVoices, setAiVoices] = useState([]);
  const [aiVoicesLoading, setAiVoicesLoading] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [savingAi, setSavingAi] = useState(false);
  const [aiError, setAiError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const elapsedRef = useRef(0);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getRecordings(scriptId)
      .then(setRecordings)
      .catch((e) => setRecError(e.message))
      .finally(() => setLoading(false));
  }, [scriptId]);

  useEffect(() => {
    let cancelled = false;
    setAiVoicesLoading(true);
    withRetry(fetchTtsVoices)
      .then((all) => {
        if (cancelled) return;
        const english = all
          .filter((v) => v.language.code === "en_US" || v.language.code === "en_GB")
          .sort((a, b) => a.language.code.localeCompare(b.language.code) || a.name.localeCompare(b.name));
        setAiVoices(english);
        const preferred = english.find((v) => v.key === DEFAULT_VOICE_ID);
        if (preferred) setSelectedVoiceId(preferred.key);
        else if (english.length) setSelectedVoiceId(english[0].key);
      })
      .catch((e) => {
        if (!cancelled) setAiError(friendlyTtsError(e, "Couldn't load the voice list — check your internet connection."));
      })
      .finally(() => {
        if (!cancelled) setAiVoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function handleStopped(mimeType) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const duration = Math.round(elapsedRef.current / 1000);
    setUploading(true);
    try {
      const recording = await uploadRecording(scriptId, blob, { duration });
      setRecordings((prev) => [...prev, recording]);
    } catch (e) {
      setRecError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setRecError(null);
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setRecError("Voice recording isn't supported in this browser.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecError("Microphone access was denied — check your browser's site permissions.");
      return;
    }
    const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => handleStopped(mr.mimeType || "audio/webm");
    mediaRecorderRef.current = mr;
    streamRef.current = stream;
    mr.start();
    setIsRecording(true);
    elapsedRef.current = 0;
    setElapsedMs(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      elapsedRef.current = Date.now() - startedAt;
      setElapsedMs(elapsedRef.current);
    }, 250);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  async function handleGenerate() {
    if (!selectedVoiceId || generating) return;
    const text = stripCues(scriptContent).trim();
    if (!text) {
      setAiError("Write some script content first.");
      return;
    }
    setAiError(null);
    setGenerating(true);
    setGenProgress(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
    try {
      const blob = await withRetry(() =>
        predictTts({ text, voiceId: selectedVoiceId }, (progress) => {
          setGenProgress(progress.total ? Math.round((progress.loaded * 100) / progress.total) : null);
        })
      );
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      setAiError(friendlyTtsError(e, "Couldn't generate speech"));
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  async function handleSaveAiTake() {
    if (!previewBlob || savingAi) return;
    setSavingAi(true);
    setAiError(null);
    try {
      const duration = await getBlobDuration(previewBlob).catch(() => 0);
      const voice = aiVoices.find((v) => v.key === selectedVoiceId);
      const recording = await uploadRecording(scriptId, previewBlob, {
        label: `AI — ${voice?.name || selectedVoiceId}`,
        duration,
        source: "tts",
      });
      setRecordings((prev) => [...prev, recording]);
      URL.revokeObjectURL(previewUrl);
      setPreviewBlob(null);
      setPreviewUrl(null);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setSavingAi(false);
    }
  }

  function setLabel(id, value) {
    setRecordings((prev) => prev.map((r) => (r._id === id ? { ...r, label: value } : r)));
  }

  function persistLabel(id, value) {
    updateRecording(id, { label: value }).catch((e) => setRecError(e.message));
  }

  async function handleDelete(id) {
    try {
      await deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      setRecError(e.message);
    }
  }

  function reorder(sourceId, targetId) {
    setRecordings((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r._id === sourceId);
      const to = arr.findIndex((r) => r._id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      arr.forEach((r, i) => {
        if (r.order !== i) updateRecording(r._id, { order: i }).catch(() => {});
        r.order = i;
      });
      return arr;
    });
  }

  async function handleCombine() {
    if (recordings.length === 0) return;
    setCombining(true);
    setRecError(null);
    let ctx;
    try {
      const AudioContextCls = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCls) throw new Error("Web Audio isn't supported in this browser.");
      ctx = new AudioContextCls();
      const targetRate = 44100;
      const targetChannels = 1;

      const decoded = [];
      for (const r of recordings) {
        const buf = await fetch(recordingUrl(r.filename)).then((res) => res.arrayBuffer());
        decoded.push(await ctx.decodeAudioData(buf));
      }

      const totalLength = decoded.reduce((sum, b) => sum + Math.ceil(b.duration * targetRate), 0);
      const offlineCtx = new OfflineAudioContext(targetChannels, totalLength, targetRate);
      let offset = 0;
      for (const buf of decoded) {
        const source = offlineCtx.createBufferSource();
        source.buffer = buf;
        source.connect(offlineCtx.destination);
        source.start(offset / targetRate);
        offset += Math.ceil(buf.duration * targetRate);
      }
      const rendered = await offlineCtx.startRendering();
      const wavBlob = encodeWav(rendered);

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(scriptTitle || "script").trim().replace(/[^\w-]+/g, "_") || "script"}-combined.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setRecError(e.message || "Couldn't combine recordings");
    } finally {
      ctx?.close();
      setCombining(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] font-medium text-paper-faint uppercase tracking-widest">
          Voice takes
        </h3>
        {recordings.length > 0 && (
          <span className="text-xs font-mono tabular text-paper-faint">{recordings.length}</span>
        )}
      </div>

      <div className="rounded-md border border-hairline bg-panel-soft p-2.5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
            AI voiceover
          </span>
          {genProgress != null && (
            <span className="text-[11px] font-mono tabular text-paper-faint">
              Downloading voice… {genProgress}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            disabled={aiVoicesLoading || aiVoices.length === 0}
            className="flex-1 min-w-0 rounded-md border border-hairline bg-panel px-2 py-1.5 text-xs text-paper-dim disabled:opacity-50"
          >
            {aiVoicesLoading && <option>Loading voices…</option>}
            {!aiVoicesLoading && aiVoices.length === 0 && <option>No voices available</option>}
            {["en_US", "en_GB"].map((code) => {
              const group = aiVoices.filter((v) => v.language.code === code);
              if (!group.length) return null;
              return (
                <optgroup key={code} label={code === "en_US" ? "US English" : "British English"}>
                  {group.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.name} ({v.quality})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || aiVoicesLoading || !selectedVoiceId}
            className="shrink-0 rounded-md border border-tide-dim/40 bg-tide-soft px-2.5 py-1.5 text-xs font-medium text-tide transition-colors hover:bg-tide-soft/70 disabled:opacity-50"
          >
            {generating ? (genProgress != null ? "Downloading…" : "Synthesizing…") : "Generate"}
          </button>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-2">
            <audio controls autoPlay src={previewUrl} className="flex-1 min-w-0 h-8" />
            <button
              type="button"
              onClick={handleSaveAiTake}
              disabled={savingAi}
              className="shrink-0 rounded-md bg-tide px-2.5 py-1.5 text-xs font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {savingAi ? "Saving…" : "Save as take"}
            </button>
          </div>
        )}

        {aiError && <div className="text-xs text-flare mt-2">{aiError}</div>}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={uploading}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            isRecording
              ? "bg-flare-soft text-flare border border-flare-dim/40"
              : "bg-panel border border-hairline text-paper-dim hover:border-flare-dim/40 hover:text-flare"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isRecording && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-flare opacity-60 animate-ping" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isRecording ? "bg-flare" : "bg-paper-faint"}`} />
          </span>
          {isRecording ? "Stop" : uploading ? "Saving…" : "Record"}
        </button>
        {isRecording && (
          <span className="text-xs font-mono tabular text-paper-faint">
            {formatDuration(elapsedMs / 1000)}
          </span>
        )}
      </div>

      {recError && <div className="text-xs text-flare mb-3">{recError}</div>}

      {!loading && recordings.length === 0 && !isRecording && (
        <div className="text-xs text-paper-faint/70 mb-3">
          No takes yet — hit record to capture your first one.
        </div>
      )}

      {recordings.length > 0 && (
        <div className="space-y-2 mb-3">
          {recordings.map((r) => (
            <div
              key={r._id}
              draggable
              onDragStart={() => setDraggingId(r._id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId && draggingId !== r._id) reorder(draggingId, r._id);
                setDraggingId(null);
              }}
              className="rounded-md border border-hairline bg-panel p-2 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {r.source === "tts" && (
                  <span className="shrink-0 rounded-full bg-tide-soft px-1.5 py-0.5 text-[10px] font-mono text-tide">
                    AI
                  </span>
                )}
                <input
                  value={r.label}
                  onChange={(e) => setLabel(r._id, e.target.value)}
                  onBlur={(e) => persistLabel(r._id, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs font-mono text-paper-dim px-1 py-0.5"
                />
                <span className="text-[11px] font-mono tabular text-paper-faint shrink-0">
                  {formatDuration(r.duration)}
                </span>
                <a
                  href={recordingUrl(r.filename)}
                  download
                  title="Download this take"
                  className="text-paper-faint hover:text-tide text-xs shrink-0"
                >
                  ↓
                </a>
                <button
                  onClick={() => handleDelete(r._id)}
                  className="text-paper-faint hover:text-flare text-sm px-0.5 shrink-0"
                >
                  ×
                </button>
              </div>
              <audio controls src={recordingUrl(r.filename)} className="w-full h-8" />
            </div>
          ))}
        </div>
      )}

      {recordings.length > 1 && (
        <button
          type="button"
          onClick={handleCombine}
          disabled={combining}
          className="text-xs text-paper-faint hover:text-tide transition-colors disabled:opacity-50"
        >
          {combining ? "Combining…" : "↧ Combine & download all"}
        </button>
      )}
    </div>
  );
}
