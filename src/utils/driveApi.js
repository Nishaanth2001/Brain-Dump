import { FILE_NAME } from "../constants/appConstants";

// Called by the app to register a token-refresh callback.
// driveApi itself stays framework-free — it just calls this when it gets a 401.
let _refreshToken = null;
export const registerTokenRefresher = (fn) => { _refreshToken = fn; };

async function driveReq(url, method = "GET", body = null, token, retry = true) {
  const headers = { Authorization: "Bearer " + token };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  // Token expired — try to silently refresh once, then retry
  if (res.status === 401 && retry && _refreshToken) {
    const newToken = await _refreshToken();
    if (newToken) return driveReq(url, method, body, newToken, false);
    // Refresh failed — throw so the UI shows sync error instead of hanging
    throw new Error("Drive request failed: 401 (token refresh failed)");
  }

  if (!res.ok) throw new Error(`Drive request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function loadFromDrive(token) {
  const search = await driveReq(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
    "GET", null, token
  );

  if (search.files && search.files.length > 0) {
    const fileId = search.files[0].id;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: "Bearer " + token } }
    );
    if (res.status === 401 && _refreshToken) {
      const newToken = await _refreshToken();
      if (newToken) return loadFromDrive(newToken);
    }
    if (!res.ok) throw new Error(`Failed to fetch file content: ${res.status}`);
    const data = await res.json();
    return {
      tasks:    Array.isArray(data.tasks)    ? data.tasks    : Array.isArray(data) ? data : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      fileId,
    };
  }

  return { tasks: [], sections: [], fileId: null };
}

export async function saveToDrive(token, fileId, tasks, sections) {
  const content = JSON.stringify({ tasks, sections }, null, 2);

  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: content,
      }
    );
    if (res.status === 401 && _refreshToken) {
      const newToken = await _refreshToken();
      if (newToken) return saveToDrive(newToken, fileId, tasks, sections);
    }
    if (!res.ok) throw new Error(`Failed to update Drive file: ${res.status}`);
    return fileId;
  } else {
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] })], { type: "application/json" }));
    form.append("file", new Blob([content], { type: "application/json" }));
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      { method: "POST", headers: { Authorization: "Bearer " + token }, body: form }
    );
    if (res.status === 401 && _refreshToken) {
      const newToken = await _refreshToken();
      if (newToken) return saveToDrive(newToken, null, tasks, sections);
    }
    if (!res.ok) throw new Error(`Failed to create Drive file: ${res.status}`);
    return (await res.json()).id;
  }
}
