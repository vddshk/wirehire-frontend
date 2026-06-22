import type { ReactNode } from "react";

type WithChildren = { children: ReactNode };

/* === Page header === */
type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  // wideTitle = снимает max-width: 28ch с h-display, чтобы длинные русские
  // заголовки (например «Управление вакансиями» / «Сохраненные запросы»)
  // помещались в одну строку на широких экранах и переносились естественно
  // на узких.
  wideTitle?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  wideTitle,
}: PageHeaderProps) {
  return (
    <header className="page-h">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1
          className={`h-display${wideTitle ? " is-wide" : ""}`}
        >
          {title}
        </h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

/* === Editorial section (two-column) === */
type SectionProps = WithChildren & {
  num?: string;
  label: ReactNode;
  id?: string;
};

export function Section({ num, label, children, id }: SectionProps) {
  return (
    <section className="sec" id={id}>
      <header className="label">
        {num && <span className="num">{num}</span>}
        {label}
      </header>
      <div className="body">{children}</div>
    </section>
  );
}

/* === Stats === */
type StatProps = {
  value: ReactNode;
  label: ReactNode;
};

export function Stat({ value, label }: StatProps) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

type StatGridProps = WithChildren & {
  cols?: number;
};

export function StatGrid({ children, cols }: StatGridProps) {
  // По умолчанию .statgrid использует flex со space-between (CSS). Если
  // вызывающая страница задала cols явно — переключаемся на grid с указанным
  // числом колонок (1fr-распределение, как до перехода на flex).
  const style =
    typeof cols === "number" && cols !== 4
      ? {
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }
      : undefined;

  return (
    <div className="statgrid" style={style}>
      {children}
    </div>
  );
}

/* === Status === */
export type StatusTone = "good" | "warn" | "risk" | "muted";

type StatusProps = WithChildren & {
  tone?: StatusTone;
  dot?: boolean;
};

export function Status({ tone = "muted", dot, children }: StatusProps) {
  return (
    <span className={`status ${tone}${dot ? " with-dot" : ""}`}>
      {children}
    </span>
  );
}

/* === Crumb (breadcrumb navigation) === */
export function Crumb({ children }: WithChildren) {
  return (
    <nav className="crumb" aria-label="breadcrumb">
      {children}
    </nav>
  );
}

/* === Steps (numbered list) === */
type StepProps = {
  marker: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function Step({ marker, title, description, action }: StepProps) {
  return (
    <div className="step">
      <div>{marker}</div>
      <div>
        <div className="t">{title}</div>
        {description && <div className="d">{description}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Steps({ children }: WithChildren) {
  return <div className="steps">{children}</div>;
}

/* === Editorial table === */
export function EditorialTable({
  children,
  stack = false,
}: WithChildren & { stack?: boolean }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl" data-stack={stack ? "true" : undefined}>
        {children}
      </table>
    </div>
  );
}

/* === Placeholder (empty state) === */
export function Placeholder({ children }: WithChildren) {
  return <div className="placeholder">{children}</div>;
}

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
