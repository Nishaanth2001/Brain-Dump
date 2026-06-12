import { useState, useEffect, useRef, useCallback } from "react";
import { loadFromDrive, saveToDrive } from "../utils/driveApi";
import { toSlug } from "../utils/helpers";

const DEBOUNCE_MS = 1500;

export default function useDriveSync(accessToken, showToast) {
  const [tasks,      setTasks]      = useState([]);
  const [sections,   setSections]   = useState([]);
  const [syncStatus, setSyncStatus] = useState("idle");

  const fileIdRef = useRef(null);
  const saveTimer = useRef(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    setSyncStatus("loading");

    loadFromDrive(accessToken)
      .then(({ tasks: t, sections: s, fileId }) => {
        if (cancelled) return;
        fileIdRef.current = fileId;

        // Backfill slug on any section that was saved before slugs were added
        const migratedSections = s.map((sec) =>
          sec.slug ? sec : { ...sec, slug: toSlug(sec.name) }
        );

        setTasks(t);
        setSections(migratedSections);
        setSyncStatus("idle");

        // If we had to backfill slugs, persist the migration immediately
        if (migratedSections.some((sec, i) => sec.slug !== s[i]?.slug)) {
          saveToDrive(accessToken, fileId, t, migratedSections)
            .then((id) => { fileIdRef.current = id; })
            .catch(console.error);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Drive load error:", err);
        setSyncStatus("error");
        showToast?.("Failed to load data from Drive.", "error");
      });

    return () => { cancelled = true; };
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced save ────────────────────────────────────────────────────────
  const scheduleSave = useCallback(
    (latestTasks, latestSections) => {
      if (!accessToken) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncStatus("saving");
        try {
          const newFileId = await saveToDrive(
            accessToken, fileIdRef.current, latestTasks, latestSections
          );
          fileIdRef.current = newFileId;
          setSyncStatus("idle");
        } catch (err) {
          console.error("Drive save error:", err);
          setSyncStatus("error");
          showToast?.("Failed to save to Drive.", "error");
        }
      }, DEBOUNCE_MS);
    },
    [accessToken, showToast]
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  return { tasks, sections, setTasks, setSections, syncStatus, scheduleSave };
}
