import type { ReactNode } from "react";
import "./StatTile.css";

type Trend = "up" | "down";

interface StatTileProps {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  tone?: "good" | "bad" | "neutral";
  note?: ReactNode;
}

const ARROWS: Record<Trend, string> = { up: "▲", down: "▼" };
const TREND_LABELS: Record<Trend, string> = { up: "Up", down: "Down" };

export function StatTile({ label, value, delta, trend = "up", tone = "neutral", note }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className="stat-tile__value">{value}</div>
      {note && <div className="stat-tile__note">{note}</div>}
      {delta && (
        <div className={`stat-tile__delta stat-tile__delta--${tone}`}>
          <span aria-hidden="true">{ARROWS[trend]}</span>
          <span className="visually-hidden">{TREND_LABELS[trend]}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
