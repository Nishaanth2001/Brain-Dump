import { FILE_NAME } from "../constants/appConstants";

async function driveReq(url, method = "GET", body = null, token) {
  const h = { Authorization: "Bearer " + token };
  if (body) h["Content-Type"] = "application/json";
  const r = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : null });
  if (!r.ok) throw new Error("Drive error " + r.status);
  return r.json();
}

async function loadFromDrive(token) {
  const s = await driveReq(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
    "GET", null, token
  );
  if (s.files && s.files.length) {
    const fileId = s.files[0].id;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: "Bearer " + token } });
    const d = await r.json();
    return {
      tasks:    Array.isArray(d.tasks)    ? d.tasks    : (Array.isArray(d) ? d : []),
      sections: Array.isArray(d.sections) ? d.sections : [],
      fileId,
    };
  }
  return { tasks: [], sections: [], fileId: null };
}

async function saveToDrive(token, fileId, tasks, sections) {
  const content = JSON.stringify({ tasks, sections }, null, 2);
  if (fileId) {
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      { method:"PATCH", headers:{ Authorization:"Bearer "+token, "Content-Type":"application/json" }, body:content });
    return fileId;
  } else {
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name:FILE_NAME, parents:["appDataFolder"] })], { type:"application/json" }));
    form.append("file", new Blob([content], { type:"application/json" }));
    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      { method:"POST", headers:{ Authorization:"Bearer "+token }, body:form });
    return (await r.json()).id;
  }
}


export {
  loadFromDrive,
  saveToDrive
};