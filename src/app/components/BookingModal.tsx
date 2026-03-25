import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, UserPlus, CheckCircle, Loader2, Clock, Dumbbell, ChevronRight, Users, AlertTriangle, Bell } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api-service";
import { useAuth } from "../context/AuthContext";
import type { TimetableEntry } from "../../data/team";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BookingModalProps {
  isOpen: boolean;
  course: TimetableEntry | null;
  onClose: () => void;
  onBooked?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  CrossFit: "#CA0C85",
  Hyrox: "#f97316",
  Functional: "#3b82f6",
  Strength: "#22c55e",
  "Open Gym": "#a855f7",
};

const DAY_LONG: Record<string, string> = {
  Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch",
  Do: "Donnerstag", Fr: "Freitag", Sa: "Samstag", So: "Sonntag",
};

type Tab = "member" | "guest";
type Step = "choose" | "login" | "guest-form" | "confirm" | "success" | "waitlist-confirm" | "waitlist-success";

// ── Component ─────────────────────────────────────────────────────────────────
export function BookingModal({ isOpen, course, onClose, onBooked }: BookingModalProps) {
  const { user, isAuthenticated, login } = useAuth();
  const [tab, setTab] = useState<Tab>("guest");
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // ── Reset state when modal opens/closes or course changes ───────────────────
  const resetState = useCallback(() => {
    setEmail("");
    setPassword("");
    setLoginError("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && course) {
      resetState();
      if (isAuthenticated) {
        setTab("member");
        setStep("confirm");
      } else {
        setTab("guest");
        setStep("choose");
      }
    }
  }, [isOpen, course, isAuthenticated, resetState]);

  if (!isOpen || !course) return null;

  const color = CATEGORY_COLORS[course.category] || "#CA0C85";
  const isLocked = !!course.locked;
  const isFull = course.spotsLeft === 0;
  const isAlmostFull = course.spotsLeft > 0 && course.spotsLeft <= 3;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      await login({ email, password });
      setTab("member");
      setStep(isFull ? "waitlist-confirm" : "confirm");
    } catch (err: any) {
      setLoginError(err?.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberBooking = async () => {
    setLoading(true);
    try {
      await api.member.sessions.book(course.id);
      setStep("success");
      toast.success("Kurs gebucht!", { description: `${course.title} am ${DAY_LONG[course.day]} um ${course.time}` });
      onBooked?.();
    } catch {
      toast.error("Buchung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSignup = async () => {
    setLoading(true);
    try {
      // Simulate waitlist signup – same endpoint, backend handles capacity
      await api.member.sessions.book(course.id);
      setStep("waitlist-success");
      toast.success("Auf Warteliste!", { description: `Du wirst benachrichtigt wenn ein Platz frei wird.` });
      onBooked?.();
    } catch {
      toast.error("Warteliste fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.public.bookAsGuest({
        course_id: course.id,
        name: guestName,
        email: guestEmail,
        phone: guestPhone || undefined,
      });
      setStep("success");
      toast.success("Kurs gebucht!", { description: `${course.title} am ${DAY_LONG[course.day]} um ${course.time}` });
      onBooked?.();
    } catch {
      toast.error("Buchung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.2s",
    minHeight: "48px",
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={handleClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full sm:max-w-lg overflow-hidden"
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.08)",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: "12px 12px 0 0",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            aria-label="Schliessen"
          >
            <X size={16} />
          </button>

          {/* Course header */}
          <div className="p-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: color + "18", border: `1px solid ${color}33` }}>
                <Dumbbell size={16} style={{ color }} />
              </div>
              <div>
                <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.03em", textTransform: "uppercase", lineHeight: 1.1 }}>
                  {course.title}
                </h2>
                <span className="px-2 py-0.5 inline-block mt-1" style={{ background: color + "18", border: `1px solid ${color}33`, color, fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em" }}>
                  {course.category}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-white/50 text-sm">
                <Clock size={13} /> {DAY_LONG[course.day]}, {course.time} · {course.duration}
              </span>
              <span className="text-white/50 text-sm">mit {course.trainer}</span>
            </div>

            {/* ── Capacity indicator ── */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: isLocked ? "#ef4444" : isFull ? "#ef4444" : isAlmostFull ? "#f97316" : "rgba(255,255,255,0.4)" }}>
                    <Users size={11} />
                    {isLocked ? "Gesperrt" : isFull ? "Ausgebucht" : `${course.spotsLeft} von ${course.spots} Plätzen frei`}
                  </span>
                  {isAlmostFull && !isFull && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#f97316" }}>
                      <AlertTriangle size={8} /> FAST VOLL
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((course.spots - course.spotsLeft) / course.spots) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full"
                    style={{ background: isFull ? "#ef4444" : isAlmostFull ? "#f97316" : color }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* ── STEP: Choose ── */}
              {step === "choose" && (
                <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {isLocked ? (
                    <div className="flex items-center gap-3 p-4 mb-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
                      <div>
                        <p className="text-white text-sm" style={{ fontWeight: 600 }}>Kurs gesperrt</p>
                        <p className="text-white/40" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                          Dieser Kurs ist derzeit fuer Anmeldungen gesperrt. Bitte kontaktiere das Studio fuer weitere Informationen.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm mb-5">
                      {isFull ? "Dieser Kurs ist ausgebucht. Du kannst dich auf die Warteliste setzen." : "Wie moechtest du buchen?"}
                    </p>
                  )}
                  <div className={`space-y-3 ${isLocked ? "opacity-40 pointer-events-none" : ""}`}>
                    {/* Member option */}
                    <button
                      onClick={() => { setTab("member"); setStep("login"); }}
                      className="w-full flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 group text-left"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    >
                      <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: "rgba(202,12,133,0.12)", border: "1px solid rgba(202,12,133,0.25)" }}>
                        <User size={20} style={{ color: "var(--brand)" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}>ICH BIN MITGLIED</p>
                        <p className="text-white/35 text-xs mt-0.5">
                          {isFull ? "Einloggen & auf Warteliste setzen" : "Mit deinem Account einloggen & direkt buchen"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-brand transition-colors" />
                    </button>

                    {/* Guest option */}
                    {!isFull && (
                      <button
                        onClick={() => { setTab("guest"); setStep("guest-form"); }}
                        className="w-full flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 group text-left"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      >
                        <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                          <UserPlus size={20} style={{ color: "rgba(255,255,255,0.5)" }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em" }}>OHNE MITGLIEDSCHAFT</p>
                          <p className="text-white/35 text-xs mt-0.5">Als Gast mit Name & E-Mail buchen</p>
                        </div>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
                      </button>
                    )}

                    {isFull && (
                      <div className="p-3 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                        <p className="text-white/40" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                          Gastbuchungen sind bei ausgebuchten Kursen nicht moeglich. Logge dich als Mitglied ein, um auf die Warteliste zu kommen.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Login ── */}
              {step === "login" && (
                <motion.div key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <button onClick={() => setStep("choose")} className="text-white/30 text-xs mb-4 cursor-pointer hover:text-white/50 transition-colors" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", background: "none", border: "none", padding: 0 }}>
                    ← ZURUECK
                  </button>
                  <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "16px" }}>
                    MITGLIED LOGIN
                  </p>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <input
                      type="email" required placeholder="E-Mail" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                    <input
                      type="password" required placeholder="Passwort" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                    {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                    <button
                      type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", border: "none", minHeight: "48px" }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <>EINLOGGEN & {isFull ? "WARTELISTE" : "BUCHEN"}</>}
                    </button>
                  </form>
                  {!isFull && (
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button
                        onClick={() => { setTab("guest"); setStep("guest-form"); }}
                        className="text-white/30 text-xs cursor-pointer hover:text-brand transition-colors"
                        style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.08em", background: "none", border: "none", padding: 0 }}
                      >
                        Kein Account? → Als Gast buchen
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP: Guest Form ── */}
              {step === "guest-form" && (
                <motion.div key="guest-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {!isAuthenticated && (
                    <button onClick={() => setStep("choose")} className="text-white/30 text-xs mb-4 cursor-pointer hover:text-white/50 transition-colors" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em", background: "none", border: "none", padding: 0 }}>
                      ← ZURUECK
                    </button>
                  )}
                  <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "16px" }}>
                    ALS GAST BUCHEN
                  </p>
                  <form onSubmit={handleGuestBooking} className="space-y-3">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>
                        NAME *
                      </label>
                      <input
                        type="text" required placeholder="Vor- und Nachname" value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>
                        E-MAIL *
                      </label>
                      <input
                        type="email" required placeholder="deine@email.de" value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>
                        TELEFON (Optional)
                      </label>
                      <input
                        type="tel" placeholder="+49 176 ..." value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      />
                    </div>
                    <p className="text-white/20 text-xs leading-relaxed" style={{ fontSize: "11px" }}>
                      Du erhaeltst eine Bestaetigungsmail. Vor Ort bitte 10 Min. frueher erscheinen.
                    </p>
                    <button
                      type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", border: "none", minHeight: "48px" }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <>VERBINDLICH BUCHEN</>}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP: Confirm (Member) ── */}
              {step === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 mb-5" style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)" }}>
                    <p className="text-white/60 text-xs mb-1" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>EINGELOGGT ALS</p>
                    <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700 }}>{user?.name || user?.email}</p>
                  </div>
                  <p className="text-white/40 text-sm mb-5">
                    Moechtest du <strong className="text-white">{course.title}</strong> am <strong className="text-white">{DAY_LONG[course.day]}</strong> um <strong className="text-white">{course.time}</strong> verbindlich buchen?
                  </p>
                  {isAlmostFull && (
                    <div className="p-3 mb-4 flex items-center gap-2" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                      <AlertTriangle size={13} style={{ color: "#f97316" }} />
                      <p style={{ fontSize: "12px", color: "#f97316" }}>
                        Nur noch {course.spotsLeft} {course.spotsLeft === 1 ? "Platz" : "Plaetze"} frei – jetzt sichern!
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "48px" }}
                    >
                      ABBRECHEN
                    </button>
                    <button
                      onClick={handleMemberBooking} disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", border: "none", minHeight: "48px" }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <>JETZT BUCHEN</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Waitlist Confirm (Member, course full) ── */}
              {step === "waitlist-confirm" && (
                <motion.div key="waitlist-confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 mb-5" style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)" }}>
                    <p className="text-white/60 text-xs mb-1" style={{ fontFamily: "var(--font-condensed)", letterSpacing: "0.1em" }}>EINGELOGGT ALS</p>
                    <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700 }}>{user?.name || user?.email}</p>
                  </div>

                  <div className="p-4 mb-5 flex items-start gap-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                    <Bell size={16} className="shrink-0 mt-0.5" style={{ color: "#f97316" }} />
                    <div>
                      <p className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>
                        Kurs ist ausgebucht
                      </p>
                      <p className="text-white/40" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                        Moechtest du dich auf die Warteliste fuer <strong className="text-white/60">{course.title}</strong> am <strong className="text-white/60">{DAY_LONG[course.day]}</strong> um <strong className="text-white/60">{course.time}</strong> setzen?
                        Du wirst automatisch benachrichtigt, sobald ein Platz frei wird.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "48px" }}
                    >
                      ABBRECHEN
                    </button>
                    <button
                      onClick={handleWaitlistSignup} disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "#f97316", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", border: "none", minHeight: "48px" }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <><Bell size={13} /> WARTELISTE</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Success ── */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                      style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "50%" }}
                    >
                      <CheckCircle size={28} style={{ color: "#4ade80" }} />
                    </motion.div>
                    <h3 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", textTransform: "uppercase" }}>
                      GEBUCHT!
                    </h3>
                    <p className="text-white/40 text-sm mb-1">
                      {course.title} · {DAY_LONG[course.day]}, {course.time}
                    </p>
                    <p className="text-white/25 text-xs mb-2">
                      {tab === "guest" ? `Bestaetigungsmail an ${guestEmail}` : "Du findest die Buchung in deinem Mitgliederbereich."}
                    </p>
                    {tab === "guest" && (
                      <div className="p-3 mt-3 mb-4 mx-auto max-w-xs" style={{ background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)" }}>
                        <p className="text-white/40" style={{ fontSize: "11px", lineHeight: 1.5 }}>
                          💡 Als Mitglied kannst du unbegrenzt buchen & verwalten.{" "}
                          <a href="/preise" className="underline" style={{ color: "var(--brand)" }}>Tarife ansehen</a>
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      className="px-8 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "48px" }}
                    >
                      SCHLIESSEN
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Waitlist Success ── */}
              {step === "waitlist-success" && (
                <motion.div key="waitlist-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                      style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: "50%" }}
                    >
                      <Bell size={28} style={{ color: "#f97316" }} />
                    </motion.div>
                    <h3 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", textTransform: "uppercase" }}>
                      WARTELISTE!
                    </h3>
                    <p className="text-white/40 text-sm mb-1">
                      {course.title} · {DAY_LONG[course.day]}, {course.time}
                    </p>
                    <p className="text-white/25 text-xs mb-6">
                      Du bekommst eine Benachrichtigung, sobald ein Platz frei wird.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-8 py-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "48px" }}
                    >
                      SCHLIESSEN
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
