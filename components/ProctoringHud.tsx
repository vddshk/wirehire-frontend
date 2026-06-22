"use client";

import { Status } from "@/components/ui/editorial";
import type {
  ProctoringMediaStatus,
  ProctoringViolationCounts,
} from "@/types/proctoring";

type ProctoringHudProps = {
  counts: ProctoringViolationCounts;
  totalViolations: number;
  riskLabel: string;
  riskTone: "good" | "warn" | "risk" | "muted";
  mediaStatus: ProctoringMediaStatus;
};

const EVENT_LABELS: Record<keyof ProctoringViolationCounts, string> = {
  pointer_leave_window: "курсор за окно",
  pointer_leave_zone: "выход из зоны",
  window_blur: "потеря фокуса",
  visibility_hidden: "смена вкладки",
};

export function ProctoringHud({
  counts,
  totalViolations,
  riskLabel,
  riskTone,
  mediaStatus,
}: ProctoringHudProps) {
  return (
    <aside className="proctoring-hud" aria-live="polite">
      <div className="proctoring-hud__head">
        <span className="proctoring-hud__dot" aria-hidden="true" />
        <span className="proctoring-hud__title">Прокторинг активен</span>
      </div>

      <div className="proctoring-hud__metrics">
        <div className="proctoring-hud__metric">
          <span className="proctoring-hud__metric-label">Нарушений</span>
          <strong className="proctoring-hud__metric-value">{totalViolations}</strong>
        </div>
        <div className="proctoring-hud__metric">
          <span className="proctoring-hud__metric-label">Риск</span>
          <Status tone={riskTone}>{riskLabel}</Status>
        </div>
      </div>

      <ul className="proctoring-hud__events">
        {(Object.keys(EVENT_LABELS) as Array<keyof ProctoringViolationCounts>).map(
          (key) => (
            <li key={key} className="proctoring-hud__event">
              <span>{EVENT_LABELS[key]}</span>
              <strong>{counts[key]}</strong>
            </li>
          )
        )}
      </ul>

      <div className="proctoring-hud__media">
        <span className={mediaStatus.camera ? "is-on" : ""}>камера</span>
        <span className={mediaStatus.microphone ? "is-on" : ""}>микрофон</span>
        <span className={mediaStatus.screen ? "is-on" : ""}>экран</span>
      </div>
    </aside>
  );
}
