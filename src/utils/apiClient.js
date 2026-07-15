// ─────────────────────────────────────────────────────────────────────────────
// API client for the local Flow server (Express + MongoDB).
// Replaces the old Google-Drive based storage. Auth is done via Firebase
// ID tokens (short-lived, auto-refreshed by the Firebase SDK).
// ─────────────────────────────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function apiReq(path, method = "GET", body, idToken) {
  const headers = { Authorization: "Bearer " + idToken };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function loadUserData(idToken) {
  const data = await apiReq("/api/data", "GET", undefined, idToken);
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    sections: Array.isArray(data.sections) ? data.sections : [],
    blockedTimes: Array.isArray(data.blockedTimes) ? data.blockedTimes : null,
    workHours: data.workHours || null,
  };
}

export async function saveUserData(idToken, { tasks, sections, blockedTimes, workHours }) {
  return apiReq("/api/data", "PUT", { tasks, sections, blockedTimes, workHours }, idToken);
}

export async function loadGeminiKey(idToken) {
  const data = await apiReq("/api/settings/gemini-key", "GET", undefined, idToken);
  return data.apiKey || null;
}

export async function saveGeminiKey(idToken, apiKey) {
  await apiReq("/api/settings/gemini-key", "PUT", { apiKey }, idToken);
  return true;
}

export async function deleteGeminiKey(idToken) {
  await apiReq("/api/settings/gemini-key", "DELETE", undefined, idToken);
  return true;
}
