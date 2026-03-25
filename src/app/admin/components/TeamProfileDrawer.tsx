/**
 * TeamProfileDrawer.tsx
 * Detail-Drawer fuer Team-Mitglieder – zeigt alle Frontend-Daten an
 * wie sie auf der /team Seite erscheinen.
 */
import { motion } from "motion/react";
import {
  X, Eye, EyeOff, Pencil, Instagram, Facebook, Linkedin,
  Award, ExternalLink, Globe,
} from "lucide-react";
import type { TeamProfile } from "./TeamProfileEditor";

// TikTok / Snapchat icons
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

/** Extract display @handle from a URL or @handle string */
function getSocialDisplay(url: string, platform: string): { url: string; handle: string } {
  if (!url) return { url: "", handle: "" };
  // Already a @handle
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
  // Full URL – extract handle
  const patterns: Record<string, RegExp> = {
    instagram: /instagram\.com\/([^/?\s]+)/,
    facebook: /facebook\.com\/([^/?\s]+)/,
    linkedin: /linkedin\.com\/in\/([^/?\s]+)/,
    tiktok: /tiktok\.com\/@?([^/?\s]+)/,
    snapchat: /snapchat\.com\/add\/([^/?\s]+)/,
  };
  const match = url.match(patterns[platform] || /\/([^/?\s]+)\/?$/);
  if (match) return { url: url.startsWith("http") ? url : `https://${url}`, handle: `@${match[1]}` };
  return { url: url.startsWith("http") ? url : `https://${url}`, handle: url };
}

interface TeamProfileDrawerProps {
  profile: TeamProfile | null;
  onClose: () => void;
  onEdit: (profile: TeamProfile) => void;
}

export function TeamProfileDrawer({ profile, onClose, onEdit }: TeamProfileDrawerProps) {
  if (!profile) return null;

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const heroImage = profile.detail_image || profile.profile_image;

  const socialLinks = [
    { key: "instagram", icon: Instagram, value: profile.instagram, platform: "instagram" },
    { key: "facebook", icon: Facebook, value: profile.facebook, platform: "facebook" },
    { key: "linkedin", icon: Linkedin, value: profile.linkedin, platform: "linkedin" },
    { key: "tiktok", icon: ({ size, ...p }: any) => <TikTokIcon size={size} />, value: profile.tiktok, platform: "tiktok" },
    { key: "snapchat", icon: ({ size, ...p }: any) => <SnapchatIcon size={size} />, value: profile.snapchat, platform: "snapchat" },
  ].filter((s) => s.value);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image */}
        <div className="relative" style={{ height: "260px", overflow: "hidden", borderRadius: "8px 8px 0 0" }}>
          {heroImage ? (
            <img
              src={heroImage}
              alt={fullName}
              className="w-full h-full object-cover object-top"
              style={{ filter: "brightness(0.5)" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Globe size={48} style={{ color: "rgba(255,255,255,0.08)" }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0d0d0d 0%, transparent 60%)" }} />

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => onEdit(profile)}
              className="flex items-center gap-2"
              style={{
                padding: "8px 14px", borderRadius: "4px",
                background: "rgba(0,0,0,0.6)", border: "1px solid rgba(202,12,133,0.4)",
                backdropFilter: "blur(8px)", color: "#fff", cursor: "pointer",
                fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}
            >
              <Pencil size={12} /> Bearbeiten
            </button>
            <button
              onClick={onClose}
              style={{
                width: "36px", height: "36px", borderRadius: "4px",
                background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.7)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Schliessen"
            >
              <X size={16} />
            </button>
          </div>

          {/* Visibility badge */}
          <div className="absolute top-4 left-4">
            <span
              className="flex items-center gap-1.5"
              style={{
                padding: "4px 10px", borderRadius: "3px",
                background: profile.visible ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                border: `1px solid ${profile.visible ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"}`,
                fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: profile.visible ? "#34D399" : "#F87171",
              }}
            >
              {profile.visible ? <Eye size={10} /> : <EyeOff size={10} />}
              {profile.visible ? "Sichtbar" : "Versteckt"}
            </span>
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 p-6">
            <p style={{
              fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.2em", color: "var(--brand)", marginBottom: "4px",
            }}>
              {profile.position.toUpperCase()}
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.02em", color: "#fff" }}>
              {fullName}
            </h2>
            <span style={{
              display: "inline-block", marginTop: "6px", padding: "2px 8px", borderRadius: "3px",
              background: profile.type === "leadership" ? "rgba(167,139,250,0.12)" : "rgba(96,165,250,0.12)",
              border: `1px solid ${profile.type === "leadership" ? "rgba(167,139,250,0.3)" : "rgba(96,165,250,0.3)"}`,
              fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: profile.type === "leadership" ? "#A78BFA" : "#60A5FA",
            }}>
              {profile.type === "leadership" ? "Geschaeftsfuehrung" : "Coach"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Profile + Detail Image Preview Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { label: "Profilbild", src: profile.profile_image },
                { label: "Detail-Foto", src: profile.detail_image },
              ].map((img) => (
                <div key={img.label}>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "6px" }}>
                    {img.label}
                  </p>
                  <div style={{ width: "100%", height: "90px", borderRadius: "4px", overflow: "hidden", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {img.src ? (
                      <img src={img.src} alt={img.label} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)" }}>Kein Bild</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
                  Biografie
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7, fontFamily: "var(--font-body)" }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Meta Bio (SEO) */}
            {profile.meta_bio && (
              <div style={{ padding: "12px", background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)", borderRadius: "4px" }}>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(96,165,250,0.5)", marginBottom: "6px" }}>
                  Meta Biografie (SEO – nur fuer Google)
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", lineHeight: 1.5, fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                  {profile.meta_bio}
                </p>
              </div>
            )}

            {/* Specialties */}
            {profile.specialties.length > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
                  Schwerpunkte
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "4px 12px", borderRadius: "3px",
                        background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)",
                        fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600,
                        letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {profile.certifications.length > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>
                  Zertifizierungen
                </p>
                <ul style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {profile.certifications.map((c) => (
                    <li key={c} className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                      <Award size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "10px" }}>
                  Social Media
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {socialLinks.map((s) => {
                    const display = getSocialDisplay(s.value, s.platform);
                    return (
                      <a
                        key={s.key}
                        href={display.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3"
                        style={{
                          padding: "8px 12px", borderRadius: "4px",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.3)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                      >
                        <s.icon size={14} />
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{display.handle}</span>
                        <ExternalLink size={10} style={{ marginLeft: "auto", opacity: 0.4 }} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
