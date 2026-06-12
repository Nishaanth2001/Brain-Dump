import { useState, useEffect, useRef, useCallback } from "react";
import { loadFromDrive, saveToDrive } from "../utils/driveApi";
import { toSlug } from "../utils/helpers";

const DEBOUNCE_MS = 1500;
const CACHE_KEY   = "flow_cache";

const readCache  = () => {
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
  // Seed state from cache so the UI is instant on reload
  const cached = readCache();
  const [tasks,      setTasks]      = useState(cached?.tasks    ?? []);
  const [sections,   setSections]   = useState(cached?.sections ?? []);
  const [syncStatus, setSyncStatus] = useState(cached ? "idle" : "loading");

  const fileIdRef = useRef(null);
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  // ── Wrap setters so every mutation also updates the cache ─────────────────
  const setTasksAndCache = useCallback((t) => {
    setTasks(t);
    setSections((s) => { writeCache(t, s); return s; });
  }, []);

  const setSectionsAndCache = useCallback((s) => {
    setSections(s);
    setTasks((t) => { writeCache(t, s); return t; });
  }, []);

  // ── Load from Drive once — runs in background if cache already populated ──
  useEffect(() => {
    if (!accessToken || loadedRef.current) return;
    loadedRef.current = true;

    // Only show the loading indicator if there's nothing cached yet
    if (!readCache()) setSyncStatus("loading");

    let cancelled = false;

    loadFromDrive(accessToken)
      .then(({ tasks: t, sections: s, fileId }) => {
        if (cancelled) return;
        fileIdRef.current = fileId;

        const migratedSections = s.map((sec) =>
          sec.slug ? sec : { ...sec, slug: toSlug(sec.name) }
        );

        setTasks(migratedSections ? t : t);  // always update from Drive (source of truth)
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

  // ── Debounced save — also updates cache immediately on every mutation ─────
  const scheduleSave = useCallback(
    (latestTasks, latestSections) => {
      if (!accessToken) return;

      // Update cache immediately so next reload is instant
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

  // Clear cache on sign-out (accessToken becomes null)
  useEffect(() => {
    if (!accessToken) {
      clearCache();
      setTasks([]);
      setSections([]);
      loadedRef.current = false;
    }
  }, [accessToken]);

  return {
    tasks, sections,
    setTasks: setTasksAndCache,
    setSections: setSectionsAndCache,
    syncStatus, scheduleSave,
  };
}
