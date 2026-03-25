/**
 * AdminReviews.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-Seite zum Verwalten von Google-Rezensionen.
 * - Übersicht aller Reviews mit Stats
 * - Google-Sync-Button (simuliert API-Aufruf)
 * - Sichtbarkeit togglen, Reviews löschen
 */

import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion } from "motion/react";
import {
  Star,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Search,
  ExternalLink,
  TrendingUp,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { MOCK_REVIEWS, MOCK_REVIEW_STATS, type GoogleReview, type ReviewStats } from "../../../data/reviews";

// ── Admin Reviews Page ────────────────────────────────────────────────────────
export default function AdminReviews() {
  const location = useLocation();
  const [reviews, setReviews] = useState<GoogleReview[]>([...MOCK_REVIEWS]);
  const [stats, setStats] = useState<ReviewStats>(MOCK_REVIEW_STATS);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<"all" | "visible" | "hidden">("all");

  // Simulated sync from Google
  const handleSync = async () => {
    setSyncing(true);
    try {
      // Simulate API call delay
      await new Promise((r) => setTimeout(r, 2500));
      toast.success("Google-Rezensionen synchronisiert", {
        description: `${reviews.length} Bewertungen aktualisiert. Durchschnitt: ${stats.averageRating}/5`,
      });
      setStats((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch {
      toast.error("Sync fehlgeschlagen", {
        description: "Google Places API nicht erreichbar. Bitte später erneut versuchen.",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Toggle visibility
  const toggleVisibility = (id: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, visible: !r.visible } : r
      )
    );
    const review = reviews.find((r) => r.id === id);
    if (review) {
      toast.success(
        review.visible ? "Bewertung ausgeblendet" : "Bewertung eingeblendet",
        { description: `${review.author} – ${review.visible ? "nicht mehr" : "jetzt"} auf der Website sichtbar.` }
      );
    }
  };

  // Delete review
  const deleteReview = (id: string) => {
    const review = reviews.find((r) => r.id === id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    if (review) {
      toast.success("Bewertung entfernt", {
        description: `Bewertung von ${review.author} wurde aus der lokalen Datenbank entfernt.`,
      });
    }
  };

  // Filtered reviews
  const filtered = reviews.filter((r) => {
    if (searchQuery && !r.author.toLowerCase().includes(searchQuery.toLowerCase()) && !r.text.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterRating !== null && r.rating !== filterRating) return false;
    if (filterVisibility === "visible" && !r.visible) return false;
    if (filterVisibility === "hidden" && r.visible) return false;
    return true;
  });

  const visibleCount = reviews.filter((r) => r.visible).length;
  const hiddenCount = reviews.filter((r) => !r.visible).length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-white mb-1"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              letterSpacing: "0.04em",
            }}
          >
            GOOGLE BEWERTUNGEN
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
            Verwalte die Google-Rezensionen und steuere, welche auf der Website angezeigt werden.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2.5 px-6 py-3 text-white transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--brand)",
            fontFamily: "var(--font-condensed)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            minHeight: "48px",
            minWidth: "44px",
          }}
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "SYNCHRONISIERE..." : "VON GOOGLE SYNCHRONISIEREN"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Star,
            label: "Durchschnitt",
            value: `${stats.averageRating}/5`,
            color: "#FBBC05",
          },
          {
            icon: MessageSquare,
            label: "Gesamt",
            value: String(stats.totalReviews),
            color: "rgba(255,255,255,0.5)",
          },
          {
            icon: Eye,
            label: "Sichtbar",
            value: String(visibleCount),
            color: "#34A853",
          },
          {
            icon: Clock,
            label: "Letzter Sync",
            value: stats.lastSyncedAt
              ? new Date(stats.lastSyncedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : "Noch nie",
            color: "rgba(202,12,133,0.8)",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 flex flex-col gap-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: stat.color }} />
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  {stat.label.toUpperCase()}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.8rem",
                  color: "white",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rating Distribution */}
      <div
        className="p-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3
          className="mb-4"
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          BEWERTUNGS-VERTEILUNG
        </h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16 shrink-0">
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontFamily: "var(--font-condensed)", fontWeight: 700 }}>
                    {rating}
                  </span>
                  <Star size={11} style={{ color: "#FBBC05", fill: "#FBBC05" }} />
                </div>
                <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      background: rating >= 4 ? "#FBBC05" : rating === 3 ? "rgba(255,255,255,0.3)" : "#EA4335",
                    }}
                  />
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", width: "40px", textAlign: "right" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(255,255,255,0.25)" }}
          />
          <input
            type="text"
            placeholder="Bewertungen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "13px",
            }}
          />
        </div>

        {/* Rating filter */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterRating(null)}
            className="px-3 py-2 transition-all duration-200 cursor-pointer"
            style={{
              background: filterRating === null ? "var(--brand)" : "rgba(255,255,255,0.04)",
              border: filterRating === null ? "1px solid rgba(202,12,133,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: filterRating === null ? "white" : "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            ALLE
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRating(filterRating === r ? null : r)}
              className="flex items-center gap-1 px-3 py-2 transition-all duration-200 cursor-pointer"
              style={{
                background: filterRating === r ? "rgba(251,188,5,0.15)" : "rgba(255,255,255,0.04)",
                border: filterRating === r ? "1px solid rgba(251,188,5,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: filterRating === r ? "#FBBC05" : "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-condensed)",
                fontSize: "11px",
                fontWeight: 700,
                minWidth: "44px",
                minHeight: "44px",
              }}
            >
              {r}
              <Star size={10} style={{ fill: filterRating === r ? "#FBBC05" : "none", color: filterRating === r ? "#FBBC05" : "rgba(255,255,255,0.3)" }} />
            </button>
          ))}
        </div>

        {/* Visibility filter */}
        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value as "all" | "visible" | "hidden")}
          className="px-4 py-3 text-white cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: "13px",
            fontFamily: "var(--font-condensed)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            minHeight: "44px",
          }}
        >
          <option value="all">Alle ({reviews.length})</option>
          <option value="visible">Sichtbar ({visibleCount})</option>
          <option value="hidden">Ausgeblendet ({hiddenCount})</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div
            className="text-center py-16"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <MessageSquare size={32} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
              Keine Bewertungen gefunden.
            </p>
          </div>
        )}

        {filtered.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-start gap-4 p-5"
            style={{
              background: review.visible
                ? "rgba(255,255,255,0.025)"
                : "rgba(255,255,255,0.01)",
              border: review.visible
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid rgba(255,255,255,0.04)",
              opacity: review.visible ? 1 : 0.6,
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                background: "rgba(202,12,133,0.12)",
                border: "1px solid rgba(202,12,133,0.2)",
                borderRadius: "50%",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--brand)",
                }}
              >
                {review.author.charAt(0)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "white",
                  }}
                >
                  {review.author}
                </span>
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} size={10} style={{ color: "#FBBC05", fill: "#FBBC05" }} />
                  ))}
                  {[...Array(5 - review.rating)].map((_, j) => (
                    <Star key={`e-${j}`} size={10} style={{ color: "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
                {!review.visible && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5"
                    style={{
                      background: "rgba(234,67,53,0.1)",
                      border: "1px solid rgba(234,67,53,0.2)",
                      fontFamily: "var(--font-condensed)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#EA4335",
                    }}
                  >
                    <EyeOff size={9} /> AUSGEBLENDET
                  </span>
                )}
              </div>
              <p
                className="leading-relaxed mb-2"
                style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}
              >
                „{review.text}"
              </p>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
                {formatDate(review.publishedAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleVisibility(review.id)}
                title={review.visible ? "Ausblenden" : "Einblenden"}
                className="flex items-center justify-center transition-all duration-200 cursor-pointer hover:opacity-80"
                style={{
                  width: "40px",
                  height: "40px",
                  background: review.visible ? "rgba(52,168,83,0.1)" : "rgba(255,255,255,0.05)",
                  border: review.visible ? "1px solid rgba(52,168,83,0.2)" : "1px solid rgba(255,255,255,0.08)",
                  color: review.visible ? "#34A853" : "rgba(255,255,255,0.3)",
                  minWidth: "44px",
                  minHeight: "44px",
                }}
              >
                {review.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                onClick={() => deleteReview(review.id)}
                title="Löschen"
                className="flex items-center justify-center transition-all duration-200 cursor-pointer hover:opacity-80"
                style={{
                  width: "40px",
                  height: "40px",
                  background: "rgba(234,67,53,0.08)",
                  border: "1px solid rgba(234,67,53,0.15)",
                  color: "#EA4335",
                  minWidth: "44px",
                  minHeight: "44px",
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* API Info Card */}
      <div
        className="p-6 mt-8"
        style={{
          background: "rgba(202,12,133,0.04)",
          border: "1px solid rgba(202,12,133,0.15)",
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={16} style={{ color: "var(--brand)", marginTop: "2px" }} />
          <div>
            <h3
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "white",
                marginBottom: "6px",
              }}
            >
              PHP-API ANBINDUNG
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", lineHeight: 1.7 }}>
              Für die automatische Synchronisation muss die PHP-API unter{" "}
              <code
                className="px-1.5 py-0.5"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  fontSize: "12px",
                  color: "var(--brand)",
                }}
              >
                /api/reviews.php
              </code>{" "}
              deployed werden. Diese nutzt die Google Places API (Place ID + API-Key nötig)
              um Bewertungen abzurufen und in der MySQL-Datenbank zu speichern.
              Aktuell werden lokale Demo-Daten verwendet.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "GET /api/reviews.php", desc: "Öffentliche Reviews laden" },
            { label: "GET /api/reviews.php?all=1", desc: "Alle Reviews + Stats" },
            { label: "POST /api/reviews.php?action=sync", desc: "Google-Sync starten" },
            { label: "PATCH /api/reviews.php?id=X", desc: "Sichtbarkeit togglen" },
            { label: "DELETE /api/reviews.php?id=X", desc: "Review entfernen" },
          ].map((ep) => (
            <div
              key={ep.label}
              className="px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: "11px",
              }}
            >
              <code style={{ color: "var(--brand)", fontWeight: 700 }}>{ep.label}</code>
              <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: "8px" }}>
                – {ep.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}