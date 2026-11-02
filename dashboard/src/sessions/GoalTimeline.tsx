import type { GoalTime } from "../api";
import { formatSimTime } from "../format";
import "./GoalTimeline.css";

export function GoalTimeline({ times }: { times: GoalTime[] }) {
  const max = Math.max(...times.map((t) => t.sim_time_s), 1);

  return (
    <div className="goal-timeline" aria-hidden="true">
      <div className="goal-timeline__track">
        {times.map((t, index) => (
          <span
            key={t.goal}
            className="goal-timeline__mark"
            style={{ left: `${(t.sim_time_s / max) * 100}%` }}
            title={`${t.goal} — ${formatSimTime(t.sim_time_s)}`}
          >
            <span className="goal-timeline__dot" />
            <span
              className={`goal-timeline__label ${
                index % 2 === 1 ? "goal-timeline__label--below" : ""
              }`}
            >
              {t.goal}
            </span>
          </span>
        ))}
      </div>
      <div className="goal-timeline__scale">
        <span>0</span>
        <span>{formatSimTime(max)}</span>
      </div>
    </div>
  );
}
