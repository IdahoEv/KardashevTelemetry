import { useEffect, useState } from "react";
import type { DevMode, SessionFilterParams } from "../api";
import { Card } from "../components/Card";
import type { BuildOption } from "./useSessionFilterOptions";
import "./SessionFilterBar.css";

const NAME_DEBOUNCE_MS = 300;

const DEV_OPTIONS: { value: DevMode; label: string }[] = [
  { value: "exclude", label: "Exclude" },
  { value: "include", label: "Include" },
  { value: "only", label: "Only" },
];

interface SessionFilterBarProps {
  filters: SessionFilterParams;
  hasActiveFilters: boolean;
  onDevChange: (dev: DevMode) => void;
  onNameCommit: (name: string) => void;
  onBuildToggle: (build: string) => void;
  onGoalToggle: (goal: string) => void;
  onClear: () => void;
  buildOptions: BuildOption[];
  goalOptions: string[];
}

export function SessionFilterBar({
  filters,
  hasActiveFilters,
  onDevChange,
  onNameCommit,
  onBuildToggle,
  onGoalToggle,
  onClear,
  buildOptions,
  goalOptions,
}: SessionFilterBarProps) {
  const [nameInput, setNameInput] = useState(filters.name);
  const [syncedName, setSyncedName] = useState(filters.name);
  if (filters.name !== syncedName) {
    setSyncedName(filters.name);
    setNameInput(filters.name);
  }

  useEffect(() => {
    const timer = setTimeout(() => onNameCommit(nameInput.trim()), NAME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nameInput, onNameCommit]);

  function handleClear() {
    setNameInput("");
    onClear();
  }

  return (
    <Card
      title="Filters"
      actions={
        hasActiveFilters ? (
          <button type="button" className="filter-clear" onClick={handleClear}>
            Clear filters
          </button>
        ) : undefined
      }
    >
      <div className="filter-bar">
        <fieldset className="filter-bar__group">
          <legend className="filter-bar__legend">Dev builds</legend>
          <div className="filter-bar__options">
            {DEV_OPTIONS.map((option) => (
              <label key={option.value} className="filter-bar__option">
                <input
                  type="radio"
                  name="dev-mode"
                  value={option.value}
                  checked={filters.dev === option.value}
                  onChange={() => onDevChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="filter-bar__group">
          <label className="filter-bar__legend" htmlFor="filter-name">
            Name
          </label>
          <input
            id="filter-name"
            className="filter-bar__search"
            type="search"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
          />
        </div>

        <fieldset className="filter-bar__group">
          <legend className="filter-bar__legend">Build</legend>
          <div className="filter-bar__options">
            {buildOptions.map((option) => (
              <label key={option.value} className="filter-bar__option">
                <input
                  type="checkbox"
                  checked={filters.build.includes(option.value)}
                  onChange={() => onBuildToggle(option.value)}
                />
                {option.title ? <span title={option.title}>{option.label}</span> : option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-bar__group">
          <legend className="filter-bar__legend">Goals completed</legend>
          <div className="filter-bar__options">
            {goalOptions.map((goal) => (
              <label key={goal} className="filter-bar__option">
                <input
                  type="checkbox"
                  checked={filters.reached.includes(goal)}
                  onChange={() => onGoalToggle(goal)}
                />
                {goal}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Card>
  );
}
