import type { ReactNode } from "react";
import "./Badge.css";

export type BadgeTone = "neutral" | "good" | "warning" | "serious" | "critical";

const ICONS: Record<BadgeTone, string> = {
  neutral: "•",
  good: "✓",
  warning: "!",
  serious: "▲",
  critical: "✕",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`}>
      <span aria-hidden="true">{ICONS[tone]}</span>
      {children}
    </span>
  );
}
