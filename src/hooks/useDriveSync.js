import { useState, useEffect, useRef, useCallback } from "react";
import { loadFromDrive, saveToDrive } from "../utils/driveApi";
import { toSlug } from "../utils/helpers";

const DEBOUNCE_MS = 1500;
const CACHE_KEY   = "flow_cache";

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeCache = (tasks, sections) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ tasks, sections }));
  } catch { /* storage full — ignore */ }
};

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
};

export default function useDriveSync(accessToken, showToast) {
  const cached = readCache();

  const [tasks,      setTasks]      = useState(() => cached?.tasks    ?? []);
  const [sections,   setSections]   = useState(() => cached?.sections ?? []);
  // If we have cached data, start as idle — user sees content instantly.
  // If no cache, show loading until Drive responds.
  const [syncStatus, setSyncStatus] = useState(() => cached ? "idle" : "loading");

  const fileIdRef = useRef(null);
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  // ── Load from Drive once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken || loadedRef.current) return;
    loadedRef.current = true;

    // If cache exists, sync quietly in the background without showing spinner
    if (!cached) setSyncStatus("loading");

    let cancelled = false;

    loadFromDrive(accessToken)
      .then(({ tasks: t, sections: s, fileId }) => {
        if (cancelled) return;
        fileIdRef.current = fileId;

        const migratedSections = s.map((sec) =>
          sec.slug ? sec : { ...sec, slug: toSlug(sec.name) }
        );

        // Drive is always the source of truth — update state and cache
        setTasks(t);
        setSections(migratedSections);
        writeCache(t, migratedSections);
        setSyncStatus("idle");

        const needsMigration = migratedSections.some((sec, i) => sec.slug !== s[i]?.slug);
        if (needsMigration) {
          saveToDrive(accessToken, fileId, t, migratedSections)
            .then((id) => { fileIdRef.current = id; })
            .catch(console.error);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        loadedRef.current = false;
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

      // Write to cache immediately so next reload is instant
      writeCache(latestTasks, latestSections);

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

  // Clear cache and reset on sign-out
  useEffect(() => {
    if (!accessToken) {
      clearCache();
      setTasks([]);
      setSections([]);
      loadedRef.current = false;
      setSyncStatus("idle");
    }
  }, [accessToken]);

  return { tasks, sections, setTasks, setSections, syncStatus, scheduleSave };
}
