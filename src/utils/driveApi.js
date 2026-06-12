import { FILE_NAME } from "../constants/appConstants";

async function driveReq(url, method = "GET", body = null, token) {
  const headers = { Authorization: "Bearer " + token };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`Drive request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function loadFromDrive(token) {
  const search = await driveReq(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
    "GET",
    null,
    token
  );

  if (search.files && search.files.length > 0) {
    const fileId = search.files[0].id;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: "Bearer " + token } }
    );
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
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: content,
      }
    );
    if (!res.ok) throw new Error(`Failed to update Drive file: ${res.status}`);
    return fileId;
  } else {
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] })],
        { type: "application/json" }
      )
    );
    form.append("file", new Blob([content], { type: "application/json" }));
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: form,
      }
    );
    if (!res.ok) throw new Error(`Failed to create Drive file: ${res.status}`);
    const json = await res.json();
    return json.id;
  }
}
