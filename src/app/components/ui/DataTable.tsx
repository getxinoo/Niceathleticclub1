/**
 * DataTable – generic, type-safe table component for the NAC admin area.
 *
 * Usage:
 * ```tsx
 * <DataTable
 *   columns={[
 *     { key: "name", header: "Name", cell: (row) => row.name },
 *     { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
 *   ]}
 *   data={leads}
 *   keyField="id"
 * />
 * ```
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";

// ── Column definition ─────────────────────────────────────────────────────────
export interface Column<T extends object> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortKey?: keyof T;
  width?: string;
  align?: "left" | "center" | "right";
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Max rows before pagination */
  pageSize?: number;
  className?: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Neu:          { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b", dot: "#f59e0b" },
  Kontaktiert:  { bg: "rgba(59,130,246,0.1)",   text: "#60a5fa", dot: "#60a5fa" },
  Bestätigt:    { bg: "rgba(34,197,94,0.1)",    text: "#4ade80", dot: "#4ade80" },
  Abgesagt:     { bg: "rgba(239,68,68,0.1)",    text: "#f87171", dot: "#f87171" },
  Aktiv:        { bg: "rgba(34,197,94,0.1)",    text: "#4ade80", dot: "#4ade80" },
  Inaktiv:      { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", dot: "#9ca3af" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? {
    bg: "rgba(255,255,255,0.06)",
    text: "rgba(255,255,255,0.5)",
    dot: "rgba(255,255,255,0.3)",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: s.bg,
        fontFamily: "var(--font-condensed)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: s.text,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = "Keine Einträge vorhanden.",
  onRowClick,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  // ── Sorting ──────────────────────────────────────────────────────────────
  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === "string" && typeof bv === "string"
            ? av.localeCompare(bv, "de")
            : av < bv
            ? -1
            : av > bv
            ? 1
            : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortKey) return null;
    if (sortKey !== col.sortKey)
      return <ChevronsUpDown size={12} className="opacity-25" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} style={{ color: "var(--brand)" }} />
    ) : (
      <ChevronDown size={12} style={{ color: "var(--brand)" }} />
    );
  };

  return (
    <div
      className={cn("flex flex-col overflow-hidden", className)}
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* ── Scrollable table ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          {/* Head */}
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align ?? "left",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.015)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    cursor: col.sortKey ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => col.sortKey && handleSort(col.sortKey)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            <AnimatePresence initial={false}>
              {loading ? (
                <motion.tr
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td colSpan={columns.length}>
                    <div className="flex items-center justify-center py-16 gap-3">
                      <Loader2
                        size={18}
                        className="animate-spin"
                        style={{ color: "var(--brand)" }}
                      />
                      <span
                        className="text-white/30"
                        style={{ fontSize: "13px" }}
                      >
                        Lade Daten …
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ) : paged.length === 0 ? (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td colSpan={columns.length}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Inbox size={32} style={{ color: "rgba(255,255,255,0.1)" }} />
                      <span
                        className="text-white/25"
                        style={{ fontSize: "13px" }}
                      >
                        {emptyMessage}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ) : (
                paged.map((row, idx) => (
                  <motion.tr
                    key={String(row[keyField])}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "transition-colors duration-150",
                      onRowClick && "cursor-pointer"
                    )}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "14px 16px",
                          textAlign: col.align ?? "left",
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.7)",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-white/30"
            style={{ fontSize: "12px" }}
          >
            {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sorted.length)} von{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="w-7 h-7 flex items-center justify-center transition-all duration-150 cursor-pointer"
                style={{
                  background:
                    i === page
                      ? "var(--brand)"
                      : "rgba(255,255,255,0.04)",
                  border: "none",
                  color:
                    i === page ? "white" : "rgba(255,255,255,0.4)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}