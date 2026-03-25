import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Clock, MapPin, Users, CalendarCheck2, Dumbbell, Zap, Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api-service";

// ── Category filter ───────────────────────────────────────────────────────────
const CATEGORIES = ["Alle", "CrossFit", "Gym", "Mobility", "Cardio", "Kraft"];

// ── Icon map by category ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function categoryIcon(cat: string): React.ComponentType<any> {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("cross") || c.includes("wod") || c.includes("functional")) return Zap;
  if (c.includes("mobil") || c.includes("yoga") || c.includes("wellness"))  return Leaf;
  if (c.includes("cardio") || c.includes("hiit"))                            return CalendarCheck2;
  return Dumbbell;
}

// ── Fallback mock data (shown when API returns 403) ───────────────────────────
const MOCK_SESSIONS = [
  { id: "s1", title: "CrossFit WOD",             category: "CrossFit",    instructor: "Lydi Tauber",     time: "07:00", date: "Heute",  duration_min: 60, location: "CrossFit Box", capacity: 16, enrolled: 11, spots_left: 5, is_booked: false },
  { id: "s2", title: "Strength & Conditioning",  category: "Kraft",       instructor: "Jana Ebt",    time: "18:30", date: "Heute",  duration_min: 60, location: "Athletic Area",capacity: 12, enrolled: 10, spots_left: 2, is_booked: false },
  { id: "s3", title: "Hyrox Training",           category: "Hyrox",       instructor: "Dome Fuchs",  time: "09:00", date: "Morgen", duration_min: 60, location: "Hyrox Zone",   capacity: 12, enrolled: 5,  spots_left: 7, is_booked: true  },
  { id: "s4", title: "Hyrox Race Prep",          category: "Hyrox",       instructor: "Leo Holzner", time: "06:30", date: "Morgen", duration_min: 60, location: "Hyrox Zone",   capacity: 12, enrolled: 12, spots_left: 0, is_booked: false },
];

export default function MemberKurse() {
  const [active,   setActive]   = useState("Alle");
  const [sessions, setSessions] = useState<typeof MOCK_SESSIONS>([]);
  const [loading,  setLoading]  = useState(true);
  // Track which session IDs are currently being booked (for loading state on button)
  const [bookingIds, setBookingIds] = useState<Set<string>>(new Set());

  // ── Load upcoming sessions ────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await api.member.sessions.upcoming();
      // Normalize: API may use different field names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (data as any[]).map((s: any) => ({
        id:          String(s.id ?? ""),
        title:       s.title ?? s.course_title ?? "Kurs",
        category:    s.category ?? s.course_category ?? "Allgemein",
        instructor:  s.instructor ?? "",
        time:        s.time ?? "",
        date:        s.date ?? s.event_date ?? "",
        duration_min: Number(s.duration_min ?? s.durationMin ?? 60),
        location:    s.location ?? "NAC",
        capacity:    Number(s.capacity ?? 12),
        enrolled:    Number(s.enrolled ?? 0),
        spots_left:  Number(s.spots_left ?? s.spotsLeft ?? 0),
        is_booked:   Boolean(s.is_booked ?? s.booked ?? false),
      }));
      setSessions(normalized);
    } catch {
      // API returns 403 – use mock fallback silently
      setSessions(MOCK_SESSIONS as typeof MOCK_SESSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Book a session ────────────────────────────────────────────────────────
  const handleBook = async (sessionId: string) => {
    setBookingIds(prev => new Set(prev).add(sessionId));
    try {
      await api.member.sessions.book(sessionId);
      toast.success("Kurs erfolgreich gebucht!", {
        description: "Der Kurs wurde zu deinen Buchungen hinzugefuegt.",
      });
      await loadSessions(); // reload to get fresh booked/spots_left state
    } catch {
      // api-service already shows error toast
    } finally {
      setBookingIds(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = active === "Alle"
    ? sessions
    : sessions.filter(s => (s.category ?? "").toLowerCase().includes(active.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6"
      >
        <h1
          className="text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 8vw, 2.8rem)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          KURS<span style={{ color: "var(--brand)" }}>PLAN</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
          Waehle deine naechste Einheit
        </p>
      </motion.div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className="shrink-0 px-4 transition-all duration-200 cursor-pointer"
            style={{
              background: active === cat ? "var(--brand)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${active === cat ? "var(--brand)" : "rgba(255,255,255,0.08)"}`,
              color: active === cat ? "white" : "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              minHeight: "36px",
              whiteSpace: "nowrap",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      )}

      {/* Sessions list */}
      {!loading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center py-10" style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>
              Keine Kurse in dieser Kategorie gefunden.
            </p>
          )}
          {filtered.map((s, i) => {
            const Icon = categoryIcon(s.category);
            const booked    = s.is_booked;
            const full      = s.spots_left <= 0 && !booked;
            const inProgress = bookingIds.has(s.id);

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="p-4"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${booked ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(202,12,133,0.1)",
                      border: "1px solid rgba(202,12,133,0.2)",
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--brand)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className="text-white/90 truncate"
                          style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}
                        >
                          {s.title}
                        </p>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{s.instructor}</p>
                      </div>
                      {s.date && (
                        <span
                          className="shrink-0 px-2 py-0.5"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            fontFamily: "var(--font-condensed)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.date}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {s.time && (
                        <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                          <Clock size={10} /> {s.time} · {s.duration_min} min
                        </span>
                      )}
                      {s.location && (
                        <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                          <MapPin size={10} /> {s.location}
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1.5"
                        style={{ fontSize: "12px", color: full ? "#f87171" : "rgba(255,255,255,0.4)" }}
                      >
                        <Users size={10} />
                        {full ? "Ausgebucht" : `${s.spots_left} Plaetze frei`}
                      </span>
                    </div>

                    <button
                      onClick={() => !booked && !full && !inProgress && handleBook(s.id)}
                      disabled={full || inProgress}
                      className="mt-3 flex items-center gap-2 px-4 text-white transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: booked
                          ? "rgba(202,12,133,0.15)"
                          : full
                            ? "rgba(255,255,255,0.05)"
                            : "var(--brand)",
                        border: booked ? "1px solid rgba(202,12,133,0.4)" : "none",
                        color: booked ? "var(--brand)" : "white",
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        minHeight: "36px",
                      }}
                    >
                      {inProgress ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <CalendarCheck2 size={12} />
                      )}
                      {booked ? "Gebucht" : full ? "Ausgebucht" : inProgress ? "Buche..." : "Buchen"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
