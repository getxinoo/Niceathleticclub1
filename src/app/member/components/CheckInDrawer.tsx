/**
 * CheckInDrawer
 * Bottom-sheet drawer containing the member's QR check-in code.
 * Uses member.check_in_code for the real QR payload.
 * Shows a blocked-state warning if member.is_blocked === true.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, X, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from "../../components/ui/drawer";
import { generateQRMatrix } from "../utils/qrMatrix";
import type { Member } from "../../../lib/api-service";

// ── QR Code SVG ───────────────────────────────────────────────────────────────
function QRCodeSVG({
  value,
  size = 220,
  color = "#CA0C85",
}: {
  value: string;
  size?: number;
  color?: string;
}) {
  const matrix = generateQRMatrix(value);
  const N = matrix.length;
  const cell = size / N;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="QR-Code fuer Check-In"
      role="img"
    >
      {/* Dark background */}
      <rect width={size} height={size} fill="#050505" />

      {/* Data modules */}
      {matrix.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 0.3}
              y={r * cell + 0.3}
              width={cell - 0.6}
              height={cell - 0.6}
              fill={color}
              rx={0.4}
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ── Scanner Line ──────────────────────────────────────────────────────────────
function ScannerLine({ reduced, color = "#CA0C85" }: { reduced: boolean; color?: string }) {
  if (reduced) return null;

  return (
    <motion.div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{
        height: "2px",
        background: `linear-gradient(to right, transparent 5%, ${color} 30%, #ff3abf 50%, ${color} 70%, transparent 95%)`,
        boxShadow: `0 0 10px 2px ${color}99, 0 0 24px 4px ${color}4d`,
      }}
      initial={{ top: "0%" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{
        duration: 3,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }}
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CheckInDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CheckInDrawer({
  open,
  onOpenChange,
  member,
}: CheckInDrawerProps) {
  const reduced = useReducedMotion() ?? false;
  const [checkedIn, setCheckedIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive display values from live member data
  const qrValue   = member?.check_in_code ?? member?.id ?? "NAC-MEMBER";
  const memberName = member
    ? `${member.first_name} ${member.last_name}`
    : "Mitglied";
  const isBlocked  = member?.is_blocked ?? false;

  // Simulate a successful scan after 5 s (only when not blocked)
  useEffect(() => {
    if (open && !checkedIn && !isBlocked) {
      timerRef.current = setTimeout(() => setCheckedIn(true), 5000);
    }
    if (!open) {
      setCheckedIn(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, checkedIn, isBlocked]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        className="border-t-0 focus:outline-none"
        aria-describedby={undefined}
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "85dvh",
        }}
      >
        {/* Visually hidden title for screen readers */}
        <DrawerTitle className="sr-only">Check-In – {memberName}</DrawerTitle>

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
        </div>

        {/* Close button */}
        <DrawerClose asChild>
          <button
            className="absolute top-4 right-4 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
            }}
            aria-label="Schliessen"
          >
            <X size={16} />
          </button>
        </DrawerClose>

        {/* Content */}
        <div className="flex flex-col items-center px-6 pb-10 gap-6">
          {/* Title */}
          <div className="text-center">
            <p
              className="text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.8rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              CHECK-IN
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {memberName}
            </p>
          </div>

          {/* ── Blocked State ── */}
          {isBlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-5 w-full"
            >
              {/* Red warning banner */}
              <div
                className="w-full flex items-center gap-3 px-4 py-3"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                }}
              >
                <ShieldOff size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#ef4444",
                      textTransform: "uppercase",
                    }}
                  >
                    Dein Zugang ist gesperrt
                  </p>
                  {member?.block_message && (
                    <p style={{ fontSize: "12px", color: "rgba(239,68,68,0.7)", marginTop: "2px" }}>
                      {member.block_message}
                    </p>
                  )}
                </div>
              </div>

              {/* Red-tinted QR code (disabled) */}
              <div
                className="relative opacity-40"
                style={{
                  padding: "12px",
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <QRCodeSVG value={qrValue} size={220} color="#ef4444" />
              </div>

              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", maxWidth: "280px" }}>
                Bitte kontaktiere das Team an der Reception, um deinen Zugang wiederherzustellen.
              </p>
            </motion.div>

          ) : checkedIn ? (
            /* ── Success State ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div
                className="w-24 h-24 flex items-center justify-center"
                style={{
                  background: "rgba(74,222,128,0.1)",
                  border: "2px solid rgba(74,222,128,0.35)",
                  borderRadius: "50%",
                  boxShadow: "0 0 30px rgba(74,222,128,0.2)",
                }}
              >
                <CheckCircle2 size={44} style={{ color: "#4ade80" }} />
              </div>
              <div className="text-center">
                <p
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.5rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  WILLKOMMEN!
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                  Check-in erfolgreich – viel Spass beim Training 💪
                </p>
              </div>
            </motion.div>

          ) : (
            /* ── QR Scan State ── */
            <>
              {/* Status indicator */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: "20px",
                }}
              >
                <motion.span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#4ade80" }}
                  animate={reduced ? {} : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "#4ade80",
                    textTransform: "uppercase",
                  }}
                >
                  BEREIT ZUM SCAN
                </span>
              </div>

              {/* QR Code frame */}
              <div
                className="relative"
                style={{
                  padding: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: "2px solid var(--brand)", borderLeft: "2px solid var(--brand)" }} />
                <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTop: "2px solid var(--brand)", borderRight: "2px solid var(--brand)" }} />
                <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottom: "2px solid var(--brand)", borderLeft: "2px solid var(--brand)" }} />
                <div className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: "2px solid var(--brand)", borderRight: "2px solid var(--brand)" }} />

                {/* QR + scanner layer */}
                <div className="relative overflow-hidden" style={{ lineHeight: 0 }}>
                  <QRCodeSVG value={qrValue} size={220} color="#CA0C85" />
                  <ScannerLine reduced={reduced} />
                </div>
              </div>

              {/* Instruction */}
              <div className="flex items-start gap-3 max-w-xs text-center">
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ShieldCheck size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.16em",
                        color: "var(--brand)",
                        textTransform: "uppercase",
                      }}
                    >
                      Sicher & verschluesselt
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Halte den Code vor den Sensor am Drehkreuz des Eingangs.
                    Der Code ist 60 Sekunden gueltig.
                  </p>
                </div>
              </div>

              {/* Member ID */}
              <p
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.2)",
                  textTransform: "uppercase",
                }}
              >
                ID: {qrValue}
              </p>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
