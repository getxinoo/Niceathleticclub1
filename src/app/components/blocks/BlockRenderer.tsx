/**
 * BlockRenderer.tsx – Zentrale Block-Render-Engine (Single Source of Truth)
 * ─────────────────────────────────────────────────────────────────────────────
 * Wird verwendet von:
 *   • Admin PageEditor → BlockPreview.tsx (Admin-Vorschau)
 *   • Frontend → alle CMS-Seiten via PageBlocksRenderer
 *
 * Für Studio + Team werden die echten exportierten Section-Komponenten
 * aus Studio.tsx / Team.tsx importiert (1:1 identisch mit dem Frontend).
 * Alle anderen Blöcke sind hier inline implementiert – kein Duplikat.
 *
 * Regel: KEIN eigenes State außer für interaktive UI-Elemente (Accordion, Video).
 *        ALLE Inhalte kommen ausschließlich aus `block.data`.
 */

import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, MapPin, Phone, Mail, Clock, Users, Star,
  Dumbbell, Award, TrendingUp, Heart, Zap, Target, Shield,
  CheckCircle2, Briefcase, ChevronDown, List,
} from "lucide-react";

// ── Studio + Team – echte Seiten-Komponenten (1:1 identisch mit Frontend) ────
import {
  StudioHeroSection,
  StudioZonesSection,
  StudioInfoSection,
} from "../../pages/Studio";
import { TeamHeaderSection, TeamGridSection } from "../../pages/Team";

// ── Statische Daten-Imports (synchron, kein API-Call nötig) ──────────────────
// MEMBERSHIP_PLANS → für den Pricing-Block (Preisdarstellung)
// MOCK_REVIEWS     → für den Reviews-Block (Offline-Fallback & Preview)
import { MEMBERSHIP_PLANS } from "../../../data/classes";
import { MOCK_REVIEWS } from "../../../data/reviews";

// ── Figma-Asset-Auflösung ─────────────────────────────────────────────────────
import pillarStrengthImg from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";
import pillarCrossfitImg from "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png";
import pillarHyroxImg    from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import pillarThekeImg    from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";

const FIGMA_ASSET_MAP: Record<string, string> = {
  "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png": pillarStrengthImg,
  "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png": pillarCrossfitImg,
  "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png": pillarHyroxImg,
  "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png": pillarThekeImg,
};
function resolveImg(src: string): string {
  return FIGMA_ASSET_MAP[src] ?? src;
}

// ── Shared Icon Map ───────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Users, Star, Dumbbell, Award, Clock, TrendingUp, Heart, Zap, Target, Shield,
  MapPin, Phone, Mail, Briefcase, List, CheckCircle2,
};

// ── Typen-Imports ─────────────────────────────────────────────────────────────
import type {
  PageBlock,
  HeroBlockData,
  PillarsBlockData,
  StatsBlockData,
  CtaBlockData,
  RichTextBlockData,
  PricingBlockData,
  ReviewsBlockData,
  TeamBlockData,
  ContactFormBlockData,
  FeaturesListBlockData,
  ValuesGridBlockData,
  ImageGalleryBlockData,
  LocationMapBlockData,
  OpeningHoursBlockData,
  TrustBadgesBlockData,
  JobsBoardBlockData,
  ProsConsBlockData,
  LegalContentBlockData,
  TrialFormBlockData,
  FaqBlockData,
  TimetableBlockData,
  ZoneGridBlockData,
  PricingCardsBlockData,
  PricingAddonsBlockData,
  PricingCompareBlockData,
  StudioHeroBlockData,
  StudioZonesBlockData,
  StudioInfoBlockData,
  TeamHeaderBlockData,
  TeamGridBlockData,
} from "../../../data/blocks";

// ─────────────────────────────────────────────────────────────────────────────
// ── Shared UI Primitives ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "8px",
      color: "var(--brand)", fontFamily: "var(--font-condensed)",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase", marginBottom: "20px",
    }}>
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
      {children}
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
    </div>
  );
}

function PrimaryBtn({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "12px 28px", background: "var(--brand)", color: "white",
      fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase", textDecoration: "none",
      border: "none",
    }}>
      {label} <ArrowRight size={13} />
    </Link>
  );
}

function GhostBtn({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "12px 28px", background: "transparent", color: "white",
      fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase", textDecoration: "none",
      border: "1px solid rgba(255,255,255,0.2)",
    }}>
      {label} <ArrowRight size={13} />
    </Link>
  );
}

function CmsBtn({ label, to, style = "primary" }: { label: string; to: string; style?: "primary" | "ghost" }) {
  return style === "primary" ? <PrimaryBtn label={label} to={to} /> : <GhostBtn label={label} to={to} />;
}

const SEC: React.CSSProperties = { background: "#050505", padding: "96px 24px" };
const INNER: React.CSSProperties = { maxWidth: "1280px", margin: "0 auto" };
const INNER_MD: React.CSSProperties = { maxWidth: "800px", margin: "0 auto" };
const INNER_XL: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto" };

// ─────────────────────────────────────────────────────────────────────────────
// ── Blöcke ───────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroBlock({ d }: { d: HeroBlockData }) {
  const [muted, setMuted] = useState(d.videoMuted);
  return (
    <section style={{ position: "relative", width: "100%", minHeight: "100svh", overflow: "hidden", display: "flex", alignItems: "flex-end", background: "#050505" }}>
      {d.mediaType === "video" ? (
        <video key={d.mediaUrl} src={d.mediaUrl} autoPlay loop={d.videoLoop} muted={muted} playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      ) : (
        <img src={resolveImg(d.mediaUrl)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.3) 50%, transparent 100%)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "0 24px 80px" }}>
        {d.label && (
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", color: "var(--brand)", marginBottom: "24px", textTransform: "uppercase" }}>
            — {d.label}
          </p>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,10vw,8rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase", margin: 0 }}>
          <span style={{ color: "white" }}>{d.headlineLine1Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineLine1Outline}</span>
          <br />
          <span style={{ color: "white" }}>{d.headlineLine2Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineLine2Outline}</span>
        </h1>
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7, maxWidth: "560px", margin: "24px 0" }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {d.btn1Label && <CmsBtn label={d.btn1Label} to={d.btn1Url} style={d.btn1Style} />}
          {d.btn2Label && <CmsBtn label={d.btn2Label} to={d.btn2Url} style={d.btn2Style} />}
        </div>
      </div>
      {d.mediaType === "video" && (
        <button onClick={() => setMuted(!muted)}
          style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}>
          {muted ? "🔇" : "🔊"}
        </button>
      )}
    </section>
  );
}

// ── Pillars ───────────────────────────────────────────────────────────────────
function PillarsBlock({ d }: { d: PillarsBlockData }) {
  const pillars = [
    { img: resolveImg(d.pillar1Image), tag: d.pillar1Tag, hl: d.pillar1Headline, desc: d.pillar1Desc, cta: d.pillar1Cta, link: d.pillar1Link },
    { img: resolveImg(d.pillar2Image), tag: d.pillar2Tag, hl: d.pillar2Headline, desc: d.pillar2Desc, cta: d.pillar2Cta, link: d.pillar2Link },
    { img: resolveImg(d.pillar3Image), tag: d.pillar3Tag, hl: d.pillar3Headline, desc: d.pillar3Desc, cta: d.pillar3Cta, link: d.pillar3Link },
    { img: resolveImg(d.pillar4Image), tag: d.pillar4Tag, hl: d.pillar4Headline, desc: d.pillar4Desc, cta: d.pillar4Cta, link: d.pillar4Link },
  ];
  return (
    <section style={SEC}>
      <div style={INNER}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SLabel>{d.label}</SLabel>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: 0 }}>
            {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
          </h2>
          {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: 640, margin: "20px auto 0", lineHeight: 1.7 }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
          {pillars.map((p) => (
            <div key={p.hl} style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
              <img src={p.img} alt={p.hl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.1) 60%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24 }}>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)", textTransform: "uppercase" }}>{p.tag}</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "white", margin: "8px 0", letterSpacing: "0.03em", textTransform: "uppercase" }}>{p.hl}</h3>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 }}>{p.desc}</p>
                {p.link && <Link to={p.link} style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "var(--brand)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>{p.cta} <ArrowRight size={10} /></Link>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsBlock({ d }: { d: StatsBlockData }) {
  const items = Array.from({ length: d.count }, (_, i) => {
    const n = i + 1;
    return { icon: (d as Record<string, unknown>)[`item${n}Icon`] as string, value: (d as Record<string, unknown>)[`item${n}Value`] as string, label: (d as Record<string, unknown>)[`item${n}Label`] as string };
  }).filter((x) => x.value);
  return (
    <section style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ ...INNER, display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] ?? Zap;
          return (
            <div key={i} style={{ padding: "48px 24px", textAlign: "center", borderRight: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <Icon size={20} style={{ color: "var(--brand)", marginBottom: 12 }} />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", margin: "0 0 6px", letterSpacing: "0.02em" }}>{item.value}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{item.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CtaBlock({ d }: { d: CtaBlockData }) {
  return (
    <section style={{ ...SEC, textAlign: "center" }}>
      <SLabel>{d.label}</SLabel>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem,7vw,6rem)", lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: "0 auto 24px", maxWidth: 800 }}>
        {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
      </h2>
      {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>{d.subtitle}</p>}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16 }}>
        {d.btn1Label && <PrimaryBtn label={d.btn1Label} to={d.btn1Url} />}
        {d.btn2Label && <GhostBtn label={d.btn2Label} to={d.btn2Url} />}
      </div>
    </section>
  );
}

// ── Rich Text ─────────────────────────────────────────────────────────────────
function RichTextBlock({ d }: { d: RichTextBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ ...INNER_MD, textAlign: d.centered ? "center" : "left" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "white", marginBottom: 24, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{d.content}</div>
      </div>
    </section>
  );
}

// ── Pricing (einfache Variante – Daten direkt aus MEMBERSHIP_PLANS) ───────────
function PricingBlock({ d }: { d: PricingBlockData }) {
  const plans = (MEMBERSHIP_PLANS as Array<{ id: string; name: string; price: number; features?: string[]; badge?: string }>)
    .filter((p) => d.visiblePlans.includes(p.id as "starter" | "performance" | "elite"));
  return (
    <section style={SEC}>
      <div style={INNER_XL}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subheading && <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "14px", marginBottom: 56 }}>{d.subheading}</p>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(plans.length,1)},1fr)`, gap: 16 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: 32 }}>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", marginBottom: 8 }}>{plan.badge || plan.name}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", margin: "0 0 24px" }}>{plan.price}<span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>/Mo</span></p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(plan.features || []).slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing Cards, Addons, Compare – Platzhalter (API-driven auf der Preisseite)
function PricingCardsBlock({ d }: { d: PricingCardsBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ ...INNER_XL, textAlign: "center" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ padding: "48px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Preis-Karten · werden aus der API geladen</p>
        </div>
      </div>
    </section>
  );
}

function PricingAddonsBlock({ d }: { d: PricingAddonsBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ ...INNER_XL, textAlign: "center" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 48 }}>{d.subtitle}</p>}
        <div style={{ padding: "32px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Addons · werden aus der API geladen</p>
        </div>
      </div>
    </section>
  );
}

function PricingCompareBlock({ d }: { d: PricingCompareBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ ...INNER_XL, textAlign: "center" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ padding: "32px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Tarifvergleich · wird aus der API geladen</p>
        </div>
      </div>
    </section>
  );
}

// ── Reviews ───────────────────────────────────────────────────────────────────
function ReviewsBlock({ d }: { d: ReviewsBlockData }) {
  const visible = (MOCK_REVIEWS as Array<{ author_name: string; rating: number; text: string; relative_time_description: string; visible?: boolean }>)
    .filter((r) => r.visible !== false).slice(0, d.limit);
  return (
    <section style={SEC}>
      <div style={INNER}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {visible.slice(0, 6).map((r, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: 24 }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={13} style={{ color: "#FBBC05", fill: "#FBBC05" }} />)}
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.7, marginBottom: 16 }}>"{r.text}"</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{r.author_name} · {r.relative_time_description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Team (einfach) ────────────────────────────────────────────────────────────
function TeamBlock({ d }: { d: TeamBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ ...INNER, textAlign: "center" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Team wird aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────
function ContactFormBlock({ d }: { d: ContactFormBlockData }) {
  const fields = ["Vorname", "Nachname", "E-Mail", "Telefon", "Nachricht"];
  return (
    <section style={SEC}>
      <div style={{ ...INNER_MD }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.5rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 40, lineHeight: 1.7 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {fields.map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
              {label === "Nachricht"
                ? <textarea rows={4} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }} />
                : <input type={label === "E-Mail" ? "email" : "text"} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }} />
              }
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
            {d.buttonText || "Senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Trial Form ────────────────────────────────────────────────────────────────
function TrialFormBlock({ d }: { d: TrialFormBlockData }) {
  const goals = (d.goalOptions || "").split(",").map((g) => g.trim()).filter(Boolean);
  return (
    <section style={SEC}>
      <div style={INNER_MD}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.5rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 40, lineHeight: 1.7 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.length > 0 && (
            <div>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Dein Ziel</label>
              <select style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }}>
                {goals.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
          {["Vorname", "E-Mail", "Wunsch-Datum"].map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
              <input type={label === "E-Mail" ? "email" : label.includes("Datum") ? "date" : "text"} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
            {d.buttonText || "Senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqBlock({ d }: { d: FaqBlockData }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={SEC}>
      <div style={INNER_MD}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(d.questions || []).map((q, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", color: "white", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{q.question}</span>
                <ChevronDown size={16} style={{ color: "var(--brand)", transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </button>
              {open === i && <div style={{ padding: "0 24px 20px", color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7 }}>{q.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Values Grid ───────────────────────────────────────────────────────────────
function ValuesGridBlock({ d }: { d: ValuesGridBlockData }) {
  return (
    <section style={SEC}>
      <div style={INNER}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
          {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: 560, margin: "0 auto" }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((d.values || []).length, 3)},1fr)`, gap: 16 }}>
          {(d.values || []).map((v, i) => {
            const Icon = ICON_MAP[v.icon] ?? Heart;
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: 32 }}>
                <div style={{ width: 40, height: 40, background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={17} style={{ color: "var(--brand)" }} />
                </div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: 8 }}>{v.title}</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{v.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Features List ─────────────────────────────────────────────────────────────
function FeaturesListBlock({ d }: { d: FeaturesListBlockData }) {
  return (
    <section style={SEC}>
      <div style={INNER}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
          {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: 560, margin: "0 auto" }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: d.layout === "grid" ? "repeat(3,1fr)" : "1fr", gap: 16 }}>
          {(d.features || []).map((f, i) => {
            const Icon = ICON_MAP[f.icon] ?? CheckCircle2;
            return (
              <div key={i} style={{ display: "flex", gap: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: 24 }}>
                <div style={{ width: 36, height: 36, background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: 6 }}>{f.title}</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Trust Badges ──────────────────────────────────────────────────────────────
function TrustBadgesBlock({ d }: { d: TrustBadgesBlockData }) {
  return (
    <section style={{ background: "#070707", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "32px 24px" }}>
      <div style={{ ...INNER, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 40 }}>
        {(d.badges || []).map((b, i) => {
          const Icon = ICON_MAP[b.icon] ?? Shield;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={16} style={{ color: "var(--brand)" }} />
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>{b.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGalleryBlock({ d }: { d: ImageGalleryBlockData }) {
  const images = (d.imageUrls || "").split(",").map((u) => u.trim()).filter(Boolean);
  return (
    <section style={SEC}>
      <div style={INNER}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {images.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${d.columns || 3},1fr)`, gap: 8 }}>
            {images.map((url, i) => <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />)}
          </div>
        ) : (
          <div style={{ padding: "48px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Galerie – Bild-URLs im Einstellungs-Panel eingeben</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Location Map ──────────────────────────────────────────────────────────────
function LocationMapBlock({ d }: { d: LocationMapBlockData }) {
  return (
    <section style={SEC}>
      <div style={INNER}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
          <div>
            {([{ icon: MapPin, text: d.address }, { icon: Phone, text: d.phone }, { icon: Mail, text: d.email }] as const).filter((x) => x.text).map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Icon size={16} style={{ color: "var(--brand)", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>{text}</span>
              </div>
            ))}
          </div>
          {d.googleMapsEmbedUrl
            ? <iframe src={d.googleMapsEmbedUrl} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" title="Google Maps" />
            : <div style={{ height: 300, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.16em" }}>Karte – Embed-URL eintragen</p>
              </div>
          }
        </div>
      </div>
    </section>
  );
}

// ── Opening Hours ─────────────────────────────────────────────────────────────
function OpeningHoursBlock({ d }: { d: OpeningHoursBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", marginBottom: 32, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.note && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: 24 }}>{d.note}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(d.rows || []).map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: row.highlight ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${row.highlight ? "rgba(202,12,133,0.2)" : "rgba(255,255,255,0.05)"}` }}>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: row.highlight ? "var(--brand)" : "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>{row.days}</span>
              <span style={{ fontSize: "13px", color: row.highlight ? "white" : "rgba(255,255,255,0.5)" }}>{row.hours}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Jobs Board ────────────────────────────────────────────────────────────────
function JobsBoardBlock({ d }: { d: JobsBoardBlockData }) {
  return (
    <section style={{ ...SEC, textAlign: "center" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 48 }}>{d.subtitle}</p>}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Stellen werden aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Pros & Cons ───────────────────────────────────────────────────────────────
function ProsConsBlock({ d }: { d: ProsConsBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {[{ label: "Vorteile", items: d.pros, color: "#4ade80" }, { label: "Nachteile", items: d.cons, color: "#f87171" }].map(({ label, items, color }) => (
            <div key={label}>
              <h3 style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color, textTransform: "uppercase", marginBottom: 20 }}>{label}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(items || []).map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, background: color, borderRadius: "50%", flexShrink: 0 }} />
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{it.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Legal Content ─────────────────────────────────────────────────────────────
function LegalContentBlock({ d }: { d: LegalContentBlockData }) {
  return (
    <section style={SEC}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", marginBottom: 40, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{d.content}</div>
      </div>
    </section>
  );
}

// ── Timetable ─────────────────────────────────────────────────────────────────
function TimetableBlock({ d }: { d: TimetableBlockData }) {
  return (
    <section style={{ ...SEC, textAlign: "center" }}>
      <div style={{ ...INNER }}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 48 }}>{d.subtitle}</p>}
        <div style={{ padding: "48px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Kursplan · wird aus der API geladen</p>
        </div>
      </div>
    </section>
  );
}

// ── Zone Grid ─────────────────────────────────────────────────────────────────
function ZoneGridBlock({ d }: { d: ZoneGridBlockData }) {
  return (
    <section style={{ ...SEC, textAlign: "center" }}>
      <div style={INNER}>
        {d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 12, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: 48 }}>{d.subtitle}</p>}
        <div style={{ padding: "48px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>Zonen · werden aus der API geladen</p>
        </div>
      </div>
    </section>
  );
}

// ── Unbekannter Block ─────────────────────────────────────────────────────────
function UnknownBlock({ type }: { type: string }) {
  return (
    <section style={{ background: "#050505", padding: "32px 24px", textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px", fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Block: {type}
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MASTER RENDERER ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export function BlockRenderer({ block }: { block: PageBlock }) {
  const d = block.data as Record<string, unknown>;

  switch (block.type) {
    case "hero":            return <HeroBlock d={d as HeroBlockData} />;
    case "pillars":         return <PillarsBlock d={d as PillarsBlockData} />;
    case "stats":           return <StatsBlock d={d as StatsBlockData} />;
    case "cta":             return <CtaBlock d={d as CtaBlockData} />;
    case "rich-text":       return <RichTextBlock d={d as RichTextBlockData} />;
    case "pricing":         return <PricingBlock d={d as PricingBlockData} />;
    case "pricing-cards":   return <PricingCardsBlock d={d as PricingCardsBlockData} />;
    case "pricing-addons":  return <PricingAddonsBlock d={d as PricingAddonsBlockData} />;
    case "pricing-compare": return <PricingCompareBlock d={d as PricingCompareBlockData} />;
    case "reviews":         return <ReviewsBlock d={d as ReviewsBlockData} />;
    case "team":            return <TeamBlock d={d as TeamBlockData} />;
    case "contact-form":    return <ContactFormBlock d={d as ContactFormBlockData} />;
    case "trial-form":      return <TrialFormBlock d={d as TrialFormBlockData} />;
    case "faq":             return <FaqBlock d={d as FaqBlockData} />;
    case "values-grid":     return <ValuesGridBlock d={d as ValuesGridBlockData} />;
    case "features-list":   return <FeaturesListBlock d={d as FeaturesListBlockData} />;
    case "trust-badges":    return <TrustBadgesBlock d={d as TrustBadgesBlockData} />;
    case "image-gallery":   return <ImageGalleryBlock d={d as ImageGalleryBlockData} />;
    case "location-map":    return <LocationMapBlock d={d as LocationMapBlockData} />;
    case "opening-hours":   return <OpeningHoursBlock d={d as OpeningHoursBlockData} />;
    case "jobs-board":      return <JobsBoardBlock d={d as JobsBoardBlockData} />;
    case "pros-cons":       return <ProsConsBlock d={d as ProsConsBlockData} />;
    case "legal-content":   return <LegalContentBlock d={d as LegalContentBlockData} />;
    case "timetable":       return <TimetableBlock d={d as TimetableBlockData} />;
    case "zone-grid":       return <ZoneGridBlock d={d as ZoneGridBlockData} />;
    // ── Studio-Blöcke: echte Komponenten (1:1 identisch mit Frontend) ──────
    case "studio-hero":     return <StudioHeroSection data={d as StudioHeroBlockData} />;
    case "studio-zones":    return <StudioZonesSection data={d as StudioZonesBlockData} />;
    case "studio-info":     return <StudioInfoSection data={d as StudioInfoBlockData} />;
    // ── Team-Blöcke: echte Komponenten (1:1 identisch mit Frontend) ────────
    case "team-header":     return <TeamHeaderSection data={d as TeamHeaderBlockData} reduced={false} />;
    case "team-grid":       return <TeamGridSection data={d as TeamGridBlockData} />;
    default:                return <UnknownBlock type={block.type} />;
  }
}

/** Rendert alle Blöcke einer Seite (für Frontend-Seiten) */
export function PageBlocksRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}
