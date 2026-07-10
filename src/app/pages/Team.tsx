/**
 * Team.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Datengetriebene Team-Seite.
 *
 * Architektur:
 *  • fetchTeamBlocks()    – lädt Seiten-Blöcke von /pages.php?slug=team
 *  • Team()               – mapped über Blöcke (team-header → Section, team-grid → Section)
 *
 * Exportierte Section-Komponenten (1:1 in BlockPreview verwendet):
 *  • TeamHeaderSection({ data, reduced })   – Desktop-Header + Mobile-Hero
 *  • TeamGridSection({ data })              – ruft api.public.team() intern ab
 *
 * API:
 *  • Seiten-Blöcke:   GET /pages.php?slug=team
 *  • Team-Mitglieder: GET /team.php?visible=1  (via api.public.team())
 *
 * WICHTIG: Alle Tailwind-Klassen, HTML-Strukturen und Framer Motion Animationen
 * sind 1:1 zum ursprünglichen, hartcodierten Stand erhalten.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Instagram, Facebook, Linkedin, X,
  Award, ExternalLink, RefreshCw,
  Users, ChevronRight, ChevronDown, ArrowRight,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { api, BASE_URL } from "../../lib/api-service";
import {
  PAGE_INITIAL_BLOCKS,
  type PageBlock,
  type TeamHeaderBlockData,
  type TeamGridBlockData,
} from "../../data/blocks";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  slug?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  role?: string;
  type: string;
  profile_image?: string;
  detail_image?: string;
  image?: string;
  bio?: string;
  meta_bio?: string;
  specialties: string[];
  certifications: string[];
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  snapchat?: string;
  visible?: boolean;
  sort_order?: number;
}

// ── Page-blocks fetch ─────────────────────────────────────────────────────────
async function fetchTeamBlocks(): Promise<PageBlock[]> {
  // 1. Try PHP API (production)
  try {
    const res = await fetch(`${BASE_URL}/pages.php?slug=team`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.blocks) && json.blocks.length > 0) {
      return json.blocks as PageBlock[];
    }
  } catch { /* fall through */ }
  // 2. Admin edits (localStorage)
  try {
    const saved = localStorage.getItem("nac_blocks_team");
    if (saved) {
      const parsed = JSON.parse(saved) as PageBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // 3. Seed data
  return PAGE_INITIAL_BLOCKS["team"] ?? [];
}

// ── Custom Icons ──────────────────────────────────────────────────────────────
function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function SnapchatIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.29c-.13.32-.57.55-1.32.7-.13.02-.27.04-.42.06-.16.02-.34.04-.55.07-.23.03-.39.15-.5.37-.17.32-.38.58-.73.58h-.04c-.22 0-.47-.1-.75-.21-.35-.14-.79-.31-1.33-.31s-.98.17-1.33.31c-.28.11-.53.21-.75.21h-.04c-.35 0-.56-.26-.73-.58-.11-.22-.27-.34-.5-.37-.21-.03-.39-.05-.55-.07-.15-.02-.29-.04-.42-.06-.75-.15-1.19-.38-1.32-.7-.05-.12-.04-.25.02-.36.25-.47 1.26-.83 1.64-.96.03-.01.06-.02.07-.03.19-.08.23-.18.17-.34-.13-.33-.21-.69-.24-.9-.02-.14.04-.2.09-.23.12-.08.29-.03.41.03-.01-.24 0-.53.04-.83.16-1.11.72-1.76 1.19-2.11.68-.5 1.47-.76 2.35-.76s1.67.26 2.35.76c.47.35 1.03 1 1.19 2.11.04.3.05.59.04.83.12-.06.29-.11.41-.03.05.03.11.09.09.23-.03.21-.11.57-.24.9-.06.16-.02.26.17.34.01 0 .04.02.07.03.38.13 1.39.49 1.64.96.06.11.07.24.02.36z" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDisplayName(m: TeamMember): string {
  if (m.name) return m.name;
  return `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Unbekannt";
}
function getDisplayRole(m: TeamMember): string { return m.position || m.role || ""; }
function getProfileImage(m: TeamMember): string { return m.profile_image || m.image || "/images/team/placeholder.svg"; }
function getDetailImage(m: TeamMember): string { return m.detail_image || m.profile_image || m.image || "/images/team/placeholder.svg"; }

function getSocialDisplay(url: string, platform: string): { url: string; handle: string } {
  if (!url) return { url: "", handle: "" };
  if (url.startsWith("@")) {
    const clean = url.replace(/^@/, "");
    const bases: Record<string, string> = {
      instagram: `https://www.instagram.com/${clean}/`,
      facebook: `https://www.facebook.com/${clean}`,
      linkedin: `https://www.linkedin.com/in/${clean}`,
      tiktok: `https://www.tiktok.com/@${clean}`,
      snapchat: `https://www.snapchat.com/add/${clean}`,
    };
    return { url: bases[platform] || url, handle: `@${clean}` };
  }
  const patterns: Record<string, RegExp> = {
    instagram: /instagram\.com\/([^/?\\s]+)/,
    facebook:  /facebook\.com\/([^/?\\s]+)/,
    linkedin:  /linkedin\.com\/in\/([^/?\\s]+)/,
    tiktok:    /tiktok\.com\/@?([^/?\\s]+)/,
    snapchat:  /snapchat\.com\/add\/([^/?\\s]+)/,
  };
  const match = url.match(patterns[platform] || /\/([^/?\\s]+)\/?$/);
  if (match) return { url: url.startsWith("http") ? url : `https://${url}`, handle: `@${match[1]}` };
  const clean = url.replace(/^@/, "");
  return { url: url.startsWith("http") ? url : `https://www.instagram.com/${clean}/`, handle: `@${clean}` };
}

// ── Reusable Label ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-5"
      style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)" }}
    >
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
      {children}
      <span className="w-6 h-px" style={{ background: "var(--brand)" }} />
    </div>
  );
}

// ── Mobile Carousel Hook ──────────────────────────────────────────────────────
function useCarousel(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || itemCount === 0) return;
    const cardW = el.offsetWidth * 0.72;
    const idx = Math.round(el.scrollLeft / (cardW + 12));
    setActiveIdx(Math.min(Math.max(idx, 0), itemCount - 1));
  }, [itemCount]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * (el.offsetWidth * 0.72 + 12), behavior: "smooth" });
  }, []);

  return { scrollRef, activeIdx, handleScroll, scrollTo };
}

// ── Mobile Dots ───────────────────────────────────────────────────────────────
function MobileDots({ count, active, onDot, label }: { count: number; active: number; onDot: (i: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 mt-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => onDot(i)}
            aria-label={`${label} ${i + 1}`}
            className="transition-all duration-300 cursor-pointer"
            style={{
              width: i === active ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: i === active ? "var(--brand)" : "rgba(255,255,255,0.2)",
              border: "none",
              padding: 0,
              boxShadow: i === active ? "0 0 10px rgba(202,12,133,0.4)" : "none",
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)" }}>
        {active + 1} / {count}
      </span>
    </div>
  );
}

// ── Type Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const isLeadership = type === "leadership";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "3px",
      background: isLeadership ? "rgba(167,139,250,0.12)" : "rgba(96,165,250,0.12)",
      border: `1px solid ${isLeadership ? "rgba(167,139,250,0.3)" : "rgba(96,165,250,0.3)"}`,
      fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase" as const,
      color: isLeadership ? "#A78BFA" : "#60A5FA",
    }}>
      {isLeadership ? "Geschaeftsfuehrung" : "Coach"}
    </span>
  );
}

// ── Social Link Row ───────────────────────────────────────────────────────────
function SocialLinkRow({ url, platform, icon: IconComp }: {
  url: string; platform: string;
  icon: React.ComponentType<{ size?: number }> | null;
}) {
  const display = getSocialDisplay(url, platform);
  return (
    <a
      href={display.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3"
      style={{ padding: "8px 12px", borderRadius: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
    >
      {IconComp ? <IconComp size={14} /> : <span style={{ width: 14, display: "inline-flex", justifyContent: "center" }}>&#9679;</span>}
      <span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{display.handle}</span>
      <ExternalLink size={10} style={{ marginLeft: "auto", opacity: 0.4 }} />
    </a>
  );
}

// ── Trainer Detail Modal ──────────────────────────────────────────────────────
function TrainerModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const name = getDisplayName(member);
  const role = getDisplayRole(member);
  const detailImg = getDetailImage(member);

  const socialLinks = [
    { url: member.instagram, icon: Instagram, platform: "instagram" },
    { url: member.facebook,  icon: Facebook,  platform: "facebook"  },
    { url: member.linkedin,  icon: Linkedin,  platform: "linkedin"  },
    { url: member.tiktok,    icon: TikTokIcon, platform: "tiktok"   },
    { url: member.snapchat,  icon: SnapchatIcon, platform: "snapchat" },
  ].filter((l) => l.url) as { url: string; icon: React.ComponentType<{ size?: number }>; platform: string }[];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 md:p-8"
      style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px 12px 0 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header Image */}
        <div className="relative overflow-hidden" style={{ height: "220px" }}>
          <div className="hidden sm:block absolute inset-0" style={{ borderRadius: "8px 8px 0 0" }} />
          {detailImg ? (
            <img src={detailImg} alt={name} className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.5)" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "4rem", color: "rgba(255,255,255,0.06)" }}>
                {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0d0d0d 0%, transparent 60%)" }} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", width: "44px", height: "44px", borderRadius: "4px" }}
            aria-label="Schliessen"
          >
            <X size={18} />
          </button>

          {/* Bottom Name */}
          <div className="absolute bottom-0 left-0 p-5 sm:p-6">
            <p className="text-brand mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em" }}>
              {role.toUpperCase()}
            </p>
            <h2 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", letterSpacing: "0.02em" }}>
              {name}
            </h2>
            <TypeBadge type={member.type} />
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-6 sm:px-7 sm:pb-7" style={{ paddingTop: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {member.bio && (
              <p className="text-white/60 leading-relaxed" style={{ fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.7 }}>
                {member.bio}
              </p>
            )}
            {member.specialties.length > 0 && (
              <div>
                <h4 className="text-white/30 mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em" }}>SCHWERPUNKTE</h4>
                <div className="flex flex-wrap gap-2">
                  {member.specialties.map((s) => (
                    <span key={s} className="px-3 py-1 text-white/60" style={{ background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", borderRadius: "3px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {member.certifications.length > 0 && (
              <div>
                <h4 className="text-white/30 mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em" }}>ZERTIFIZIERUNGEN</h4>
                <ul className="space-y-2">
                  {member.certifications.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-white/50 text-sm">
                      <Award size={12} style={{ color: "var(--brand)" }} className="shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {socialLinks.length > 0 && (
              <div>
                <h4 className="text-white/30 mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em" }}>SOCIAL MEDIA</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {socialLinks.map((link) => (
                    <SocialLinkRow key={link.platform} url={link.url} platform={link.platform} icon={link.icon} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Desktop Trainer Card ──────────────────────────────────────────────────────
function TrainerCard({ member, index, onClick }: { member: TeamMember; index: number; onClick: () => void }) {
  const name = getDisplayName(member);
  const role = getDisplayRole(member);
  const img  = getProfileImage(member);
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden cursor-pointer"
      style={{ aspectRatio: "3/4" }}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Mehr ueber ${name} erfahren`}
    >
      {img ? (
        <img src={img} alt={name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" style={{ filter: "brightness(0.55)" }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "rgba(255,255,255,0.06)" }}>
            {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #050505 35%, transparent 80%)" }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400" style={{ boxShadow: "inset 0 0 0 1px rgba(202,12,133,0.4)" }} />
      <div className="absolute top-3 left-3"><TypeBadge type={member.type} /></div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-brand mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em" }}>{role.toUpperCase()}</p>
        <h3 className="text-white mb-3" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.02em" }}>{name}</h3>
        <div className="flex flex-wrap gap-1.5">
          {member.specialties.slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 text-white/50" style={{ background: "rgba(255,255,255,0.06)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em" }}>{s}</span>
          ))}
        </div>
        {(() => {
          const icons = [member.instagram ? Instagram : null, member.facebook ? Facebook : null, member.linkedin ? Linkedin : null, member.tiktok ? TikTokIcon : null].filter(Boolean) as React.ComponentType<{ size?: number }>[];
          if (!icons.length) return null;
          return (
            <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {icons.map((Ic, i) => <span key={i} style={{ color: "rgba(255,255,255,0.4)" }}><Ic size={12} /></span>)}
            </div>
          );
        })()}
      </div>
      {member.instagram && (() => {
        const ig = getSocialDisplay(member.instagram, "instagram");
        return (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <a href={ig.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-brand transition-colors" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={(e) => e.stopPropagation()}>
              <Instagram size={13} />
            </a>
          </div>
        );
      })()}
    </motion.article>
  );
}

// ── Mobile Trainer Card ───────────────────────────────────────────────────────
function MobileTrainerCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  const name = getDisplayName(member);
  const role = getDisplayRole(member);
  const img  = getProfileImage(member);
  return (
    <div
      className="relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-200"
      style={{ aspectRatio: "3/4" }}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Mehr ueber ${name} erfahren`}
    >
      {img ? (
        <img src={img} alt={name} className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.5)" }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "rgba(255,255,255,0.06)" }}>
            {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #050505 30%, transparent 75%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.5), transparent)" }} />
      <div className="absolute top-3 left-3"><TypeBadge type={member.type} /></div>
      {member.instagram && (
        <div className="absolute top-3 right-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Instagram size={13} className="text-white/50" />
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-brand mb-1" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em" }}>{role.toUpperCase()}</p>
        <h3 className="text-white mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em", lineHeight: 1.1 }}>{name}</h3>
        <div className="flex flex-wrap gap-1.5">
          {member.specialties.slice(0, 2).map((s) => (
            <span key={s} className="px-2 py-0.5 text-white/50" style={{ background: "rgba(255,255,255,0.06)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em" }}>{s}</span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)" }}>
          PROFIL ANSEHEN <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton / Empty / Error ──────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative overflow-hidden" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)", animation: "shimmer 1.5s infinite" }} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}
function MobileLoadingSkeleton() {
  return (
    <div className="flex gap-3 px-5 overflow-hidden">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="shrink-0 relative overflow-hidden" style={{ width: "72%", aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)", animation: "shimmer 1.5s infinite" }} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}
function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Users size={28} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <p className="text-white/40 mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>NOCH KEINE TEAMMITGLIEDER</p>
      <p className="text-white/25" style={{ fontFamily: "var(--font-body)", fontSize: "13px", maxWidth: "320px", margin: "0 auto" }}>
        Sobald Mitarbeiter im Admin-Bereich fuer das Frontend freigeschaltet werden, erscheinen sie hier.
      </p>
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="mx-auto mb-6 flex items-center justify-center" style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(202,12,133,0.06)", border: "1px solid rgba(202,12,133,0.15)" }}>
        <RefreshCw size={24} style={{ color: "rgba(202,12,133,0.5)" }} />
      </div>
      <p className="text-white/40 mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>TEAM KONNTE NICHT GELADEN WERDEN</p>
      <p className="text-white/25 mb-6" style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>Bitte versuche es erneut.</p>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-5 py-2.5 text-white/70 hover:text-white transition-all cursor-pointer active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>
        <RefreshCw size={13} /> ERNEUT LADEN
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 – TEAM HEADER (Desktop-Header + Mobile-Vollbild-Hero)
// ─────────────────────────────────────────────────────────────────────────────
export function TeamHeaderSection({
  data,
  reduced,
}: {
  data: TeamHeaderBlockData;
  reduced: boolean | null;
}) {
  const quickStats = [
    { val: data.stat1Val, lbl: data.stat1Label },
    { val: data.stat2Val, lbl: data.stat2Label },
    { val: data.stat3Val, lbl: data.stat3Label },
  ];

  return (
    <>
      {/* ── Desktop Header (sm+) ── */}
      <section className="pt-36 pb-16 relative overflow-hidden hidden sm:block" style={{ backgroundColor: "var(--surface-0)" }}>
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[300px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, #CA0C85, transparent 70%)" }}
        />
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-flex items-center gap-2 text-brand mb-4" style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em" }}>
              <span className="w-6 h-px bg-brand" />
              {data.label}
            </span>
            <h1 className="text-white mb-4" style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", fontFamily: "var(--font-display)" }}>
              {data.headlineNormal}{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{data.headlineOutline}</span>
            </h1>
            <p className="text-white/50 max-w-xl leading-relaxed">{data.subtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile Hero (< sm) ── */}
      <section className="relative min-h-screen flex items-end overflow-hidden sm:hidden" style={{ backgroundColor: "#050505" }}>
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] opacity-15 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 w-full h-[40vh] pointer-events-none" style={{ background: "linear-gradient(to top, #050505, transparent)" }} />

        <div className="relative w-full px-5 pb-8 pt-28" style={{ zIndex: 5 }}>
          <motion.div initial={{ opacity: 0, y: reduced ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 mb-4 text-white/40" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em" }}>
              <Link to="/" className="hover:text-white/70 transition-colors py-1">HOME</Link>
              <ChevronRight size={11} />
              <span className="text-white/60">TEAM</span>
            </nav>

            <Label>{data.label}</Label>

            <h1 className="text-white mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.2rem, 15vw, 5rem)", lineHeight: 0.9, letterSpacing: "0.02em" }}>
              {data.headlineNormal}{" "}
              <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{data.headlineOutline}</span>
            </h1>

            <p className="text-white/40 leading-relaxed mb-6 max-w-xs" style={{ fontSize: "0.85rem" }}>
              {data.subtitleMobile}
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {quickStats.map((s) => (
                <div key={s.lbl} className="text-center py-3" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-white block" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1, letterSpacing: "0.02em" }}>{s.val}</span>
                  <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link to={data.ctaUrl} className="flex items-center justify-center gap-3 w-full text-white active:scale-[0.98] transition-all duration-300" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", minHeight: "52px" }}>
              {data.ctaLabel}
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-6">
            <motion.div animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <ChevronDown size={18} className="text-white/20" />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 – TEAM GRID (Desktop 3-col Grid + Mobile Carousel, API-gesteuert)
// ─────────────────────────────────────────────────────────────────────────────
export function TeamGridSection({ data }: { data: TeamGridBlockData }) {
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const leadership = teamMembers.filter((m) => m.type === "leadership");
  const coaches     = teamMembers.filter((m) => m.type !== "leadership");

  const leadershipCarousel = useCarousel(leadership.length);
  const coachCarousel      = useCarousel(coaches.length);

  const loadTeam = () => {
    setLoading(true);
    setError(false);
    // api.public.team() calls GET /team.php?visible=1
    api.public.team()
      .then((raw) => {
        if (Array.isArray(raw)) {
          const mapped: TeamMember[] = (raw as any[])
            .map((m) => ({
              id:            m.slug || m.id || String(Math.random()),
              slug:          m.slug,
              name:          m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim(),
              first_name:    m.first_name,
              last_name:     m.last_name,
              position:      m.position,
              role:          m.position || m.role || "",
              type:          m.type || "coach",
              profile_image: m.profile_image || m.image || "",
              detail_image:  m.detail_image  || m.profile_image || m.image || "",
              image:         m.profile_image || m.image || "",
              bio:           m.bio || "",
              meta_bio:      m.meta_bio || "",
              specialties:   Array.isArray(m.specialties)     ? m.specialties     : [],
              certifications:Array.isArray(m.certifications)  ? m.certifications  : [],
              instagram:     m.instagram  || "",
              facebook:      m.facebook   || "",
              linkedin:      m.linkedin   || "",
              tiktok:        m.tiktok     || "",
              snapchat:      m.snapchat   || "",
              visible:       m.visible !== false,
              sort_order:    typeof m.sort_order === "number" ? m.sort_order : 999,
            }))
            .filter((m) => m.visible)
            .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
          // CMS-controlled selection (optional — undefined = show all in API order)
          let filtered = mapped;
          const cfgList = data.membersConfig;
          if (cfgList && cfgList.length > 0) {
            filtered = cfgList
              .filter((cfg) => !cfg.hidden)
              .map((cfg) => filtered.find((m) => m.id === cfg.id || m.slug === cfg.id))
              .filter(Boolean) as TeamMember[];
          }
          setTeamMembers(filtered);
        } else {
          setTeamMembers([]);
        }
      })
      .catch(() => { setError(true); setTeamMembers([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeam(); }, []);

  // Grid cols class based on data.desktopCols
  const colsClass = data.desktopCols === 2 ? "grid-cols-2" : data.desktopCols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";

  return (
    <>
      {/* ── Desktop Grid (sm+) ── */}
      <section className="pb-16 hidden sm:block" style={{ backgroundColor: "var(--surface-0)" }}>
        <div className="relative max-w-7xl mx-auto px-6">
          {loading  ? <LoadingSkeleton /> :
           error    ? <ErrorState onRetry={loadTeam} /> :
           teamMembers.length === 0 ? <EmptyState /> : (
            <div className={`grid ${colsClass} gap-4`}>
              {teamMembers.map((member, i) => (
                <TrainerCard key={member.id} member={member} index={i} onClick={() => setSelected(member)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Desktop CTA Banner (sm+) ── */}
      <section className="pb-24 hidden sm:block" style={{ backgroundColor: "var(--surface-0)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="py-14 px-10 flex flex-col sm:flex-row items-center justify-between gap-8"
            style={{
              background: "rgba(202,12,133,0.05)",
              border: "1px solid rgba(202,12,133,0.15)",
              borderLeft: "3px solid rgba(202,12,133,0.6)",
            }}
          >
            <div>
              <p
                className="mb-2"
                style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}
              >
                {data.mobileCTABadge || "WERDE TEIL DES TEAMS"}
              </p>
              {data.mobileCTAHeadline && (
                <h3
                  className="text-white"
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "0.02em" }}
                >
                  {data.mobileCTAHeadline}
                </h3>
              )}
              <p className="text-white/40 mt-2 max-w-md" style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Werde Teil des Nice Athletic Club Göppingen und bewirb dich jetzt als Trainer oder in einer anderen Position.
              </p>
            </div>
            <Link
              to={data.mobileCTABtnUrl || "/karriere"}
              className="shrink-0 inline-flex items-center gap-3 text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(202,12,133,0.4)] active:scale-[0.98]"
              style={{
                background: "var(--brand)",
                fontFamily: "var(--font-condensed)",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                padding: "16px 36px",
                whiteSpace: "nowrap",
              }}
            >
              {data.mobileCTABtnLabel || "JETZT BEWERBEN!"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mobile Carousel Content (< sm) ── */}
      <div className="relative sm:hidden" style={{ backgroundColor: "var(--surface-0)" }}>
        {loading  ? <div className="py-10"><MobileLoadingSkeleton /></div> :
         error    ? <ErrorState onRetry={loadTeam} /> :
         teamMembers.length === 0 ? <EmptyState /> : (
          <>
            {/* Leadership Section */}
            {leadership.length > 0 && (
              <section className="relative pt-10 pb-8">
                <div className="px-5 mb-5">
                  <div className="inline-flex items-center gap-2 mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#A78BFA" }}>
                    <span className="w-4 h-px" style={{ background: "#A78BFA" }} />
                    {data.leadershipSectionLabel}
                  </div>
                  <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 6vw, 1.8rem)", letterSpacing: "0.02em" }}>
                    {data.leadershipHeadlineNormal}{" "}
                    <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>{data.leadershipHeadlineOutline}</span>
                  </h2>
                </div>

                {leadership.length === 1 ? (
                  <div className="px-5">
                    <MobileTrainerCard member={leadership[0]} onClick={() => setSelected(leadership[0])} />
                  </div>
                ) : (
                  <>
                    <div ref={leadershipCarousel.scrollRef} onScroll={leadershipCarousel.handleScroll}
                      className="flex gap-3 overflow-x-auto px-5 pb-2 team-scroll"
                      style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                      {leadership.map((m) => (
                        <div key={m.id} className="shrink-0" style={{ width: "72%", scrollSnapAlign: "start" }}>
                          <MobileTrainerCard member={m} onClick={() => setSelected(m)} />
                        </div>
                      ))}
                      <div className="shrink-0 w-4" aria-hidden="true" />
                    </div>
                    <MobileDots count={leadership.length} active={leadershipCarousel.activeIdx} onDot={leadershipCarousel.scrollTo} label="Gründer" />
                  </>
                )}
              </section>
            )}

            {/* Divider */}
            {leadership.length > 0 && coaches.length > 0 && (
              <div className="px-5"><div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} /></div>
            )}

            {/* Coaches Section */}
            {coaches.length > 0 && (
              <section className="relative pt-8 pb-14">
                <div className="px-5 mb-5">
                  <div className="inline-flex items-center gap-2 mb-3" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#60A5FA" }}>
                    <span className="w-4 h-px" style={{ background: "#60A5FA" }} />
                    {data.coachesSectionLabel}
                  </div>
                  <h2 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 6vw, 1.8rem)", letterSpacing: "0.02em" }}>
                    {data.coachesHeadlineNormal}{" "}
                    <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>{data.coachesHeadlineOutline}</span>
                  </h2>
                  <p className="text-white/30 mt-2 max-w-xs" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>{data.coachesSubtitle}</p>
                </div>
                <div ref={coachCarousel.scrollRef} onScroll={coachCarousel.handleScroll}
                  className="flex gap-3 overflow-x-auto px-5 pb-2 team-scroll"
                  style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                  {coaches.map((m) => (
                    <div key={m.id} className="shrink-0" style={{ width: "72%", scrollSnapAlign: "start" }}>
                      <MobileTrainerCard member={m} onClick={() => setSelected(m)} />
                    </div>
                  ))}
                  <div className="shrink-0 w-4" aria-hidden="true" />
                </div>
                <MobileDots count={coaches.length} active={coachCarousel.activeIdx} onDot={coachCarousel.scrollTo} label="Coach" />
              </section>
            )}

            {/* Mobile Bottom CTA */}
            <section className="px-5 pb-14" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="py-8 px-5 text-center" style={{ background: "rgba(202,12,133,0.04)", border: "1px solid rgba(202,12,133,0.12)", borderLeft: "3px solid rgba(202,12,133,0.5)" }}>
                <p className="mb-4" style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)" }}>
                  {data.mobileCTABadge || "WERDE TEIL DES TEAMS"}
                </p>
                {data.mobileCTAHeadline && (
                  <h3 className="text-white mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em" }}>
                    {data.mobileCTAHeadline}
                  </h3>
                )}
                <Link to={data.mobileCTABtnUrl || "/karriere"} className="flex items-center justify-center gap-2 w-full text-white active:scale-[0.98] transition-all" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", minHeight: "48px" }}>
                  {data.mobileCTABtnLabel || "JETZT BEWERBEN!"}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      <style>{`.team-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* Modal */}
      <AnimatePresence>
        {selected && <TrainerModal member={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE – Team (block-driven, /pages.php?slug=team → fallback seed)
// ─────────────────────────────────────────────────────────────────────────────
export default function Team() {
  const reduced = useReducedMotion();
  const [blocks, setBlocks] = useState<PageBlock[]>(() => {
    try {
      const saved = localStorage.getItem("nac_blocks_team");
      if (saved) {
        const parsed = JSON.parse(saved) as PageBlock[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return PAGE_INITIAL_BLOCKS["team"] ?? [];
  });

  useEffect(() => {
    fetchTeamBlocks().then(setBlocks);
  }, []);

  // Live-Sync: Admin speichert im PageEditor → sofort aktualisieren
  useEffect(() => {
    const onAdminSave = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === "team") fetchTeamBlocks().then(setBlocks);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nac_blocks_team" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PageBlock[];
          if (Array.isArray(parsed)) setBlocks(parsed);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("nac-page-updated", onAdminSave);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("nac-page-updated", onAdminSave);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <>
      <PageMeta
        title="Unser Team – Zertifizierte Trainer & Coaches | Nice Athletic Club Göppingen"
        description="Lern das NAC-Team kennen: Zertifizierte Coaches für CrossFit, HYROX, Personal Training & mehr. Echte Athleten, echte Ergebnisse. Gemeinsam stärker in Göppingen."
        canonical="https://nicefitness.de/team"
        ogImage="https://nicefitness.de/images/team/dome.png"
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        {blocks.filter((block) => !block.hidden).map((block) => {
          switch (block.type) {
            case "team-header":
              return (
                <TeamHeaderSection
                  key={block.id}
                  data={block.data as unknown as TeamHeaderBlockData}
                  reduced={reduced}
                />
              );
            case "team-grid":
              return (
                <TeamGridSection
                  key={block.id}
                  data={block.data as unknown as TeamGridBlockData}
                />
              );
            default:
              return null;
          }
        })}
      </motion.div>
    </>
  );
}