import { useState, useEffect, useRef, useCallback } from "react";
import { loadUserData, saveUserData } from "../utils/apiClient";
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

// idToken: Firebase ID token (string) used to authenticate with the local
// Express/MongoDB server. Replaces the old Google Drive access token.
export default function useDataSync(idToken, showToast) {
  const cached = readCache();

  const [tasks,      setTasks]      = useState(() => cached?.tasks    ?? []);
  const [sections,   setSections]   = useState(() => cached?.sections ?? []);
  // If we have cached data, start as idle — user sees content instantly.
  // If no cache, show loading until the server responds.
  const [syncStatus, setSyncStatus] = useState(() => cached ? "idle" : "loading");

  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  // ── Load from server once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!idToken || loadedRef.current) return;
    loadedRef.current = true;

    // If cache exists, sync quietly in the background without showing spinner
    if (!cached) setSyncStatus("loading");

    let cancelled = false;

    loadUserData(idToken)
      .then(({ tasks: t, sections: s }) => {
        if (cancelled) return;

        const migratedSections = s.map((sec) =>
          sec.slug ? sec : { ...sec, slug: toSlug(sec.name) }
        );

        // Server is always the source of truth — update state and cache
        setTasks(t);
        setSections(migratedSections);
        writeCache(t, migratedSections);
        setSyncStatus("idle");

        const needsMigration = migratedSections.some((sec, i) => sec.slug !== s[i]?.slug);
        if (needsMigration) {
          saveUserData(idToken, { tasks: t, sections: migratedSections }).catch(console.error);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        loadedRef.current = false;
        console.error("Data load error:", err);
        setSyncStatus("error");
        showToast?.("Failed to load data from server.", "error");
      });

    return () => { cancelled = true; };
  }, [idToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced save ────────────────────────────────────────────────────────
  const scheduleSave = useCallback(
    (latestTasks, latestSections) => {
      if (!idToken) return;

      // Write to cache immediately so next reload is instant
      writeCache(latestTasks, latestSections);

      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncStatus("saving");
        try {
          await saveUserData(idToken, { tasks: latestTasks, sections: latestSections });
          setSyncStatus("idle");
        } catch (err) {
          console.error("Data save error:", err);
          setSyncStatus("error");
          showToast?.("Failed to save to server.", "error");
        }
      }, DEBOUNCE_MS);
    },
    [idToken, showToast]
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Clear cache and reset on sign-out
  useEffect(() => {
    if (!idToken) {
      clearCache();
      setTasks([]);
      setSections([]);
      loadedRef.current = false;
      setSyncStatus("idle");
    }
  }, [idToken]);

  return { tasks, sections, setTasks, setSections, syncStatus, scheduleSave };
}
