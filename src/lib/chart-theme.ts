import { useTheme } from "@/lib/theme";

const dark = {
  indigo: "#818cf8",
  violet: "#c084fc",
  pink: "#f0abfc",
  mint: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.4)",
};

const light = {
  indigo: "#4f46e5",
  violet: "#7c3aed",
  pink: "#db2777",
  mint: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  grid: "rgba(15,23,42,0.06)",
  axis: "#64748b",
};

const tooltipDark = {
  backgroundColor: "rgba(10, 10, 26, 0.95)",
  border: "1px solid rgba(129, 140, 248, 0.3)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "12px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 0 40px -10px rgba(124, 58, 237, 0.5)",
};

const tooltipLight = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(79,70,229,0.25)",
  borderRadius: "12px",
  color: "#0f172a",
  fontSize: "12px",
  boxShadow: "0 10px 30px -10px rgba(15,23,42,0.18)",
};

// Static (dark) defaults kept for backwards compatibility.
export const chartColors = dark;
export const chartTooltipStyle = tooltipDark;
export const chartLabelStyle = { color: "rgba(255,255,255,0.5)", fontSize: 11 };

export function useChartTheme() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    chartColors: isLight ? light : dark,
    chartTooltipStyle: isLight ? tooltipLight : tooltipDark,
    chartLabelStyle: {
      color: isLight ? "#64748b" : "rgba(255,255,255,0.5)",
      fontSize: 11,
    },
    isLight,
  };
}