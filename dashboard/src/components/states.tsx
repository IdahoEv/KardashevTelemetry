import type { ReactNode } from "react";
import "./states.css";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="state__spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="state">
      <strong className="state__title">{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  detail?: string;
  action?: ReactNode;
}

export function ErrorState({ title, detail, action }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <strong className="state__title">
        <span aria-hidden="true">✕ </span>
        {title}
      </strong>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  );
}
