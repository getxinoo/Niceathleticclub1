/**
 * SkeletonLoaders.tsx
 * Premium skeleton loading states for Admin & Member areas.
 * Uses pulse animation matching the NAC dark design system.
 */

import { cn } from "./utils";

// ── Base Skeleton Block ────────────────────────────────────────────────────────
function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-sm", className)}
      style={{
        background: "rgba(255,255,255,0.04)",
        ...style,
      }}
    />
  );
}

// ── Stat Card Skeleton (4-col grid) ───────────────────────────────────────────
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative flex flex-col justify-between overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "20px",
            minHeight: "140px",
          }}
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-2.5 w-20" />
              <SkeletonBlock className="h-2 w-14" />
            </div>
            <SkeletonBlock className="w-9 h-9 shrink-0" />
          </div>
          {/* Value */}
          <div className="flex items-end gap-3 mt-3">
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-4 w-10 mb-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chart Skeleton ─────────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      className="p-6"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-3.5 w-36" />
          <SkeletonBlock className="h-2.5 w-48" />
        </div>
        <SkeletonBlock className="h-7 w-32" />
      </div>
      {/* Chart area with fake bars */}
      <div
        className="flex items-end gap-3 px-4"
        style={{ height: `${height}px` }}
      >
        {[40, 65, 50, 80, 60, 90, 45].map((h, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1"
            style={{
              height: `${h}%`,
              background: `rgba(202,12,133,${0.04 + i * 0.01})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Table Skeleton ─────────────────────────────────────────────────────────────
export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4"
        style={{
          height: "44px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="h-2.5"
            style={{ width: i === 0 ? "120px" : `${60 + i * 20}px` }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 px-4"
          style={{
            height: "52px",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            opacity: 1 - rowIdx * 0.08,
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              className="h-3"
              style={{
                width:
                  colIdx === 0
                    ? "140px"
                    : colIdx === cols - 1
                    ? "60px"
                    : `${70 + colIdx * 15}px`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Page Header Skeleton ──────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-3 w-40" />
      </div>
      <SkeletonBlock className="h-11 w-36" />
    </div>
  );
}

// ── Full Admin Dashboard Skeleton ─────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeaderSkeleton />
      <StatCardSkeleton />
      <ChartSkeleton />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-52" />
            <SkeletonBlock className="h-2.5 w-28" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>
        <TableSkeleton />
      </div>
    </div>
  );
}

// ── Member Dashboard Skeleton ─────────────────────────────────────────────────
export function MemberDashboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 md:pt-14 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-2.5 w-32" />
          <SkeletonBlock className="h-10 w-48" />
          <SkeletonBlock className="h-10 w-36" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-11 h-11 rounded-full" />
          <SkeletonBlock className="w-11 h-11 rounded-full" />
        </div>
      </div>

      {/* Activity rings card */}
      <div
        className="flex items-center gap-6 p-5"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <SkeletonBlock className="w-[200px] h-[200px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-16" />
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-2.5 w-32" />
          </div>
          <SkeletonBlock className="h-px w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-16" />
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-2.5 w-36" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center py-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <SkeletonBlock className="w-4 h-4 mb-2" />
            <SkeletonBlock className="h-6 w-10 mb-1" />
            <SkeletonBlock className="h-2 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card List Skeleton (for member pages) ─────────────────────────────────────
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            opacity: 1 - i * 0.12,
          }}
        >
          <SkeletonBlock className="w-9 h-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-2.5 w-28" />
          </div>
          <SkeletonBlock className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export { SkeletonBlock };
