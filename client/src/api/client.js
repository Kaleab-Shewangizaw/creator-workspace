import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export const getScripts = (params) => api.get("/scripts", { params }).then((r) => r.data);
export const getTags = () => api.get("/scripts/tags").then((r) => r.data);
export const getStats = () => api.get("/scripts/stats").then((r) => r.data);
export const getScript = (id) => api.get(`/scripts/${id}`).then((r) => r.data);
export const createScript = (data) => api.post("/scripts", data).then((r) => r.data);
export const updateScript = (id, data) => api.put(`/scripts/${id}`, data).then((r) => r.data);
export const deleteScript = (id) => api.delete(`/scripts/${id}`).then((r) => r.data);

export const getChannel = () => api.get("/channel").then((r) => r.data);
export const updateChannel = (data) => api.put("/channel", data).then((r) => r.data);

export const getRecordings = (scriptId) =>
  api.get(`/scripts/${scriptId}/recordings`).then((r) => r.data);
export const uploadRecording = (scriptId, blob, { label, duration, source } = {}) =>
  api
    .post(`/scripts/${scriptId}/recordings`, blob, {
      headers: { "Content-Type": blob.type || "audio/webm" },
      params: { label, duration, mimeType: blob.type, source },
    })
    .then((r) => r.data);
export const updateRecording = (id, data) => api.put(`/recordings/${id}`, data).then((r) => r.data);
export const deleteRecording = (id) => api.delete(`/recordings/${id}`).then((r) => r.data);
export const recordingUrl = (filename) => `/uploads/recordings/${filename}`;

export default api;
