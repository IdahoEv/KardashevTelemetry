import { THEME_MODES, useTheme, type ThemeMode } from "./themeContext";
import "./ThemeToggle.css";

const LABELS: Record<ThemeMode, string> = { system: "System", light: "Light", dark: "Dark" };

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <fieldset className="theme-toggle">
      <legend className="visually-hidden">Theme</legend>
      {THEME_MODES.map((option) => (
        <label key={option} className="theme-toggle__option">
          <input
            type="radio"
            name="theme"
            checked={mode === option}
            onChange={() => setMode(option)}
          />
          <span>{LABELS[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}
