import type { ReactNode } from "react";

type AssessmentSessionShellProps = {
  metaLeft: string;
  metaRight?: string;
  sectionLabel?: string;
  sectionNum?: string;
  title: string;
  progress?: number;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
  proctored?: boolean;
  hud?: ReactNode;
  backdrop?: ReactNode;
  onMouseLeave?: () => void;
};

export function AssessmentSessionShell({
  metaLeft,
  metaRight,
  sectionLabel,
  sectionNum,
  title,
  progress,
  error,
  children,
  footer,
  proctored = false,
  hud,
  backdrop,
  onMouseLeave,
}: AssessmentSessionShellProps) {
  const proctoredLayout = proctored && hud;

  return (
    <>
      {proctored && backdrop}

      <div
        className={
          proctoredLayout
            ? "assessment-session-layout assessment-session-layout--proctored"
            : undefined
        }
        onMouseLeave={proctored ? onMouseLeave : undefined}
      >
        {proctoredLayout && (
          <aside className="assessment-session-layout__hud">{hud}</aside>
        )}

        <div
          className={`assessment-session${
            proctored ? " assessment-session--proctored" : ""
          }`}
        >
          <header className="assessment-session__header">
            <span className="assessment-session__meta">{metaLeft}</span>
            {metaRight && (
              <span className="assessment-session__meta">{metaRight}</span>
            )}
          </header>

          {(sectionNum || sectionLabel) && (
            <div className="assessment-session__eyebrow">
              {sectionNum && <span className="num">{sectionNum}</span>}
              {sectionLabel}
            </div>
          )}

          <h2 className="assessment-session__title">{title}</h2>

          <div className="assessment-session__body">{children}</div>

          {progress !== undefined && (
            <div
              className="prog assessment-session__progress"
              aria-hidden="true"
            >
              <div
                className="fill"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
          )}

          {error && (
            <div className="assessment-session__error placeholder" role="alert">
              {error}
            </div>
          )}

          <footer className="assessment-session__footer">{footer}</footer>
        </div>
      </div>
    </>
  );
}
