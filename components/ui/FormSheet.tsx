"use client";

import type { ReactNode } from "react";

type FormSheetSize = "sm" | "md" | "lg";

const SIZE_MAX: Record<FormSheetSize, number> = {
  sm: 520,
  md: 720,
  lg: 800,
};

type FormSheetProps = {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  error?: string;
  children: ReactNode;
  footer: ReactNode;
  footerClassName?: string;
  size?: FormSheetSize;
};

export function FormSheet({
  open,
  onClose,
  eyebrow,
  title,
  lead,
  error,
  children,
  footer,
  footerClassName,
  size = "md",
}: FormSheetProps) {
  if (!open) return null;

  return (
    <div
      className="form-sheet-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="form-sheet overlay-sheet"
        style={{ maxWidth: SIZE_MAX[size] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-title"
      >
        <div className="form-sheet__head between">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="h-section" id="form-sheet-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="btn-link mono form-sheet__close"
            onClick={onClose}
          >
            закрыть ×
          </button>
        </div>

        {lead ? <div className="form-sheet__lead">{lead}</div> : null}

        {error ? (
          <div className="form-sheet__error placeholder">{error}</div>
        ) : null}

        <div className="form-sheet__body">{children}</div>

        <div
          className={
            footerClassName
              ? `form-sheet__footer ${footerClassName}`
              : "form-sheet__footer"
          }
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
