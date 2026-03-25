import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { NAV_ITEMS } from "../../../data/nav";
import { usePageVisibility } from "../../context/PageVisibilityContext";
import logoImg from "figma:asset/25416d75fab01c06b3ba37880c92088e26112f56.png";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { getVisibleNavItems } = usePageVisibility();

  const visibleItems = getVisibleNavItems(NAV_ITEMS);

  // Frosted glass after 40 px scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Broadcast nav state so sticky buttons (Home) can hide when menu is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("navtoggle", { detail: { open: mobileOpen } }));
  }, [mobileOpen]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 py-3"
            : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
          >
            <img
              src={logoImg}
              alt="Nice Athletic Club"
              className="h-14 w-auto select-none"
              draggable={false}
              style={{ padding: "5px" }}
            />
          </Link>

          {/* ── Desktop Nav ── */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm py-1",
                  isActive(item.href)
                    ? "text-white"
                    : "text-white/55 hover:text-white"
                )}
                style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em" }}
              >
                {item.label}
                {/* Active indicator */}
                {isActive(item.href) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -bottom-0.5 left-0 right-0 h-px bg-brand"
                    transition={{ duration: 0.25 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* ── CTA + Mobile Toggle ── */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center px-5 py-2 text-white transition-all duration-200 cursor-pointer active:scale-[0.98]"
              style={{
                background: "var(--brand)",
                fontFamily: "var(--font-condensed)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "none",
                minHeight: "38px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
            >
              Tagesticket buchen
            </a>

            {/* Hamburger – min 44×44px touch target */}
            <button
              className="md:hidden text-white/70 hover:text-white transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
              style={{ background: "none", border: "none", width: "44px", height: "44px", cursor: "pointer" }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile Full-Screen Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col"
            style={{ backgroundColor: "rgba(5,5,5,0.98)", backdropFilter: "blur(16px)" }}
          >
            {/* Nav links */}
            <motion.nav
              className="flex-1 flex flex-col items-center justify-center gap-2"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
              aria-label="Mobile navigation"
            >
              {visibleItems.map((item) => (
                <motion.div
                  key={item.href}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <Link
                    to={item.href}
                    className={cn(
                      "block py-3 px-6 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm text-center",
                      isActive(item.href) ? "text-brand" : "text-white/80 hover:text-brand"
                    )}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.2rem, 9vw, 3.5rem)",
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              {/* Mobile CTA */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                }}
                className="mt-6"
              >
                <a
                  href="https://www.mysports.com/studio/bmljZS1hdGhsZXRpYy1jbHViOjEyMTAwMTAzMDA%3D/day-tickets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 text-white active:scale-[0.98] transition-transform cursor-pointer inline-flex items-center justify-center"
                  style={{
                    background: "var(--brand)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    border: "none",
                    height: "52px",
                    minWidth: "200px",
                  }}
                >
                  Tagesticket buchen
                </a>
              </motion.div>
            </motion.nav>

            {/* Bottom info */}
            <p
              className="text-center text-white/20 pb-8"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", letterSpacing: "0.15em" }}
            >
              NICE ATHLETIC CLUB · GÖPPINGEN
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}