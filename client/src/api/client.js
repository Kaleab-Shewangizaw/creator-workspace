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

export default api;
