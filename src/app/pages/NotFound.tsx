import { useReducedMotion } from "motion/react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Dumbbell } from "lucide-react";

// ── Glitch keyframe animation injected once ───────────────────────────────────
const GLITCH_STYLE = `
@keyframes nacGlitch1 {
  0%   { clip-path: inset(60% 0 10% 0); transform: translate(-4px, 0); }
  10%  { clip-path: inset(10% 0 75% 0); transform: translate(4px, 0);  }
  20%  { clip-path: inset(40% 0 40% 0); transform: translate(-2px, 0); }
  30%  { clip-path: inset(80% 0 5%  0); transform: translate(3px, 0);  }
  40%  { clip-path: inset(20% 0 60% 0); transform: translate(-3px, 0); }
  50%  { clip-path: inset(70% 0 20% 0); transform: translate(0px, 0);  }
  60%  { clip-path: inset(5%  0 85% 0); transform: translate(4px, 0);  }
  70%  { clip-path: inset(50% 0 30% 0); transform: translate(-4px, 0); }
  80%  { clip-path: inset(30% 0 50% 0); transform: translate(2px, 0);  }
  90%  { clip-path: inset(15% 0 70% 0); transform: translate(-2px, 0); }
  100% { clip-path: inset(60% 0 10% 0); transform: translate(-4px, 0); }
}
@keyframes nacGlitch2 {
  0%   { clip-path: inset(20% 0 65% 0); transform: translate(3px, 0);  }
  15%  { clip-path: inset(75% 0 10% 0); transform: translate(-3px, 0); }
  30%  { clip-path: inset(5%  0 80% 0); transform: translate(4px, 0);  }
  45%  { clip-path: inset(55% 0 25% 0); transform: translate(-4px, 0); }
  60%  { clip-path: inset(35% 0 45% 0); transform: translate(2px, 0);  }
  75%  { clip-path: inset(85% 0 5%  0); transform: translate(-2px, 0); }
  90%  { clip-path: inset(45% 0 35% 0); transform: translate(3px, 0);  }
  100% { clip-path: inset(20% 0 65% 0); transform: translate(3px, 0);  }
}
@keyframes nacPulse {
  0%, 100% { text-shadow: 0 0 40px rgba(202,12,133,0.15), 0 0 80px rgba(202,12,133,0.05); }
  50%       { text-shadow: 0 0 60px rgba(202,12,133,0.35), 0 0 120px rgba(202,12,133,0.15); }
}
.nac-glitch-base {
  animation: nacPulse 3s ease-in-out infinite;
}
.nac-glitch-base::before,
.nac-glitch-base::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  pointer-events: none;
}
.nac-glitch-base::before {
  color: rgba(202,12,133,0.7);
  animation: nacGlitch1 2.8s infinite steps(1);
}
.nac-glitch-base::after {
  color: rgba(0,200,255,0.5);
  animation: nacGlitch2 3.2s infinite steps(1);
}
@media (prefers-reduced-motion: reduce) {
  .nac-glitch-base { animation: none; }
  .nac-glitch-base::before,
  .nac-glitch-base::after { display: none; }
}
`;

export default function NotFound() {
  const shouldReduce = useReducedMotion();

  return (
    <>
      {/* Inject glitch keyframes once */}
      <style>{GLITCH_STYLE}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
        style={{ background: "#050505", position: "relative" }}
      >
        {/* Ambient background glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(202,12,133,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle grid overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduce ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}
        >
          {/* NAC label */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduce ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 mb-8"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.28em",
              color: "rgba(202,12,133,0.7)",
              textTransform: "uppercase",
            }}
          >
            <Dumbbell size={12} style={{ color: "rgba(202,12,133,0.7)" }} />
            Nice Athletic Club
          </motion.div>

          {/* Glitch 404 */}
          <div style={{ position: "relative", lineHeight: 0.85, marginBottom: "32px" }}>
            <span
              className="nac-glitch-base"
              data-text="404"
              style={{
                display: "block",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(8rem, 28vw, 18rem)",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.08)",
                position: "relative",
                userSelect: "none",
              }}
            >
              404
            </span>
          </div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 6vw, 3.2rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              lineHeight: 1.05,
              marginBottom: "16px",
            }}
          >
            Weg vom{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>Pfad?</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: shouldReduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "rgba(255,255,255,0.35)",
              maxWidth: "380px",
              lineHeight: 1.65,
              marginBottom: "40px",
            }}
          >
            Diese Seite existiert nicht oder wurde verschoben.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            whileHover={shouldReduce ? {} : { y: -2, boxShadow: "0 0 28px rgba(202,12,133,0.45)" }}
            whileTap={{ scale: 0.98 }}
            style={{ display: "inline-block" }}
          >
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "16px 32px",
                background: "var(--brand)",
                color: "white",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "background 0.2s",
                minHeight: "52px",
              }}
            >
              <Dumbbell size={16} />
              ZURÜCK ZUM TRAINING (HOME)
            </Link>
          </motion.div>

          {/* Bottom hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              color: "rgba(255,255,255,0.15)",
              marginTop: "32px",
              letterSpacing: "0.06em",
            }}
          >
            Error 404 · Nice Athletic Club
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}