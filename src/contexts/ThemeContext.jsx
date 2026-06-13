import { createContext, useContext, useState, useEffect, useCallback } from "react";

const THEME_KEY = "flow_theme";

const DARK = {
  mode: "dark",
  bg:             "#080E18",
  bgCard:         "linear-gradient(145deg,#0E1826,#0A1220)",
  bgCardSolid:    "#0E1826",
  bgInput:        "rgba(255,255,255,0.04)",
  bgHover:        "rgba(255,255,255,0.06)",
  bgModal:        "linear-gradient(145deg,#0E1826,#0A1220)",
  bgTopBar:       "rgba(8,14,24,0.9)",
  border:         "rgba(255,255,255,0.06)",
  borderInput:    "rgba(255,255,255,0.08)",
  borderModal:    "rgba(255,255,255,0.07)",
  text:           "#E2E8F0",
  textMuted:      "#4A5568",
  textDim:        "#3A4A5C",
  textFaint:      "#2D3748",
  textInverse:    "#080E18",
  red:            "#E84545",
  redDim:         "rgba(232,69,69,0.08)",
  redBorder:      "rgba(232,69,69,0.2)",
  redGlow:        "rgba(232,69,69,0.3)",
  orange:         "#F5A623",
  orangeDim:      "rgba(245,166,35,0.1)",
  blue:           "#4A9EE8",
  blueDim:        "rgba(74,158,232,0.1)",
  green:          "#3DD68C",
  greenDim:       "rgba(61,214,140,0.1)",
  scrollbar:      "rgba(255,255,255,0.08)",
  scrollbarHover: "rgba(255,255,255,0.14)",
  dateFilter:     "invert(0.5)",
  shadow:         "0 32px 80px rgba(0,0,0,0.6)",
  shadowCard:     "0 8px 24px rgba(0,0,0,0.3)",
};

const LIGHT = {
  mode: "light",
  bg:             "#F0F2F5",
  bgCard:         "linear-gradient(145deg,#FFFFFF,#F8FAFC)",
  bgCardSolid:    "#FFFFFF",
  bgInput:        "rgba(0,0,0,0.04)",
  bgHover:        "rgba(0,0,0,0.05)",
  bgModal:        "linear-gradient(145deg,#FFFFFF,#F8FAFC)",
  bgTopBar:       "rgba(240,242,245,0.92)",
  border:         "rgba(0,0,0,0.08)",
  borderInput:    "rgba(0,0,0,0.12)",
  borderModal:    "rgba(0,0,0,0.08)",
  text:           "#0F172A",
  textMuted:      "#64748B",
  textDim:        "#94A3B8",
  textFaint:      "#CBD5E1",
  textInverse:    "#FFFFFF",
  red:            "#E84545",
  redDim:         "rgba(232,69,69,0.08)",
  redBorder:      "rgba(232,69,69,0.2)",
  redGlow:        "rgba(232,69,69,0.25)",
  orange:         "#D97706",
  orangeDim:      "rgba(217,119,6,0.1)",
  blue:           "#2563EB",
  blueDim:        "rgba(37,99,235,0.1)",
  green:          "#16A34A",
  greenDim:       "rgba(22,163,74,0.1)",
  scrollbar:      "rgba(0,0,0,0.12)",
  scrollbarHover: "rgba(0,0,0,0.2)",
  dateFilter:     "none",
  shadow:         "0 32px 80px rgba(0,0,0,0.12)",
  shadowCard:     "0 4px 16px rgba(0,0,0,0.08)",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "light" ? LIGHT : DARK;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? LIGHT : DARK;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.mode);
    document.body.style.background = theme.bg;
    document.body.style.color      = theme.text;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t.mode === "dark" ? LIGHT : DARK;
      localStorage.setItem(THEME_KEY, next.mode);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
