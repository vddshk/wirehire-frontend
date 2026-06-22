type PageSkeletonProps = {
  variant?: "default" | "compact" | "landing";
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  if (variant === "landing") {
    return (
      <div className="page-skeleton page-skeleton--landing" aria-busy="true">
        <SkeletonBlock className="skeleton-title skeleton-title--lg" />
        <SkeletonBlock className="skeleton-lead skeleton-lead--wide" />
        <div className="page-skeleton__landing-grid">
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
          <SkeletonBlock className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="page-skeleton page-skeleton--compact" aria-busy="true">
        <SkeletonBlock className="skeleton-eyebrow" />
        <SkeletonBlock className="skeleton-title" />
        <SkeletonBlock className="skeleton-lead" />
        <SkeletonBlock className="skeleton-panel" />
      </div>
    );
  }

  return (
    <div className="page-skeleton" aria-busy="true">
      <SkeletonBlock className="skeleton-eyebrow" />
      <SkeletonBlock className="skeleton-title" />
      <SkeletonBlock className="skeleton-lead" />
      <div className="page-skeleton__stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="page-skeleton__stat" key={index}>
            <SkeletonBlock className="skeleton-stat-value" />
            <SkeletonBlock className="skeleton-stat-label" />
          </div>
        ))}
      </div>
      <div className="page-skeleton__blocks">
        <SkeletonBlock className="skeleton-panel" />
        <SkeletonBlock className="skeleton-panel skeleton-panel--short" />
      </div>
    </div>
  );
}

export function PageLoading(props: PageSkeletonProps) {
  return <PageSkeleton {...props} />;
}

export function AppShellSkeleton() {
  return (
    <div className="app app--loading">
      <header className="modebar modebar--skeleton" aria-hidden="true">
        <div className="modebar-left">
          <div className="skeleton skeleton-brand" />
        </div>
        <div className="skeleton skeleton-avatar" />
      </header>
      <div className="workspace">
        <nav className="sidenav sidenav--skeleton" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton skeleton-nav" key={index} />
          ))}
        </nav>
        <main className="main main--enter">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
