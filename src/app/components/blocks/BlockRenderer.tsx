/**
 * BlockRenderer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Einzige Source of Truth für das Rendering aller PageBlöcke.
 *
 * Wird verwendet von:
 *   • Admin → BlockPreview.tsx (skaliert auf Preview-Größe)
 *   • Frontend → alle Seiten (full-size)
 *
 * Für Studio- und Team-Blöcke werden die ECHTEN exportierten Section-
 * Komponenten aus Studio.tsx / Team.tsx importiert (1:1 identisch).
 * Alle anderen Blöcke werden hier canonical implementiert.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowRight, MapPin, Phone, Mail, Clock, Users, Star,
  Dumbbell, Award, TrendingUp, Heart, Zap, Target, Shield,
  ChevronRight, ChevronLeft, CheckCircle2, Briefcase,
  ChevronDown, List, X,
} from "lucide-react";

// ── Studio + Team – echte Seiten-Komponenten (1:1 Preview) ───────────────────
import {
  StudioHeroSection,
  StudioZonesSection,
  StudioInfoSection,
} from "../../pages/Studio";
import { TeamHeaderSection, TeamGridSection } from "../../pages/Team";

// ── Pillar / Hero Bilder (Figma assets) ──────────────────────────────────────
import pillarStrengthImg from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";
import pillarCrossfitImg from "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png";
import pillarHyroxImg    from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import pillarThekeImg    from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";

// ── Pricing-Komponenten ───────────────────────────────────────────────────────
import { PricingSection } from "../pricing/PricingSection";
import { PricingAddonsSection } from "../pricing/PricingAddonsSection";
import { PricingComparisonSection } from "../pricing/PricingComparisonSection";
import { MEMBERSHIP_PLANS } from "../../../data/classes";
import type { PublicPlan } from "../../../lib/pricing-types";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  StudioHeroBlockData,
  StudioZonesBlockData,
  StudioInfoBlockData,
  TeamHeaderBlockData,
  TeamGridBlockData,
} from "../../../data/blocks";

// ── Figma Asset Map ───────────────────────────────────────────────────────────
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

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "8px",
      color: "var(--brand)", fontFamily: "var(--font-condensed)",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase", marginBottom: "20px",
    }}>
      <span style={{ width: "24px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
      {children}
      <span style={{ width: "24px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
    </div>
  );
}

function BrandBtn({ label, to, style = "primary" }: { label: string; to: string; style?: "primary" | "ghost" }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "12px 28px", fontFamily: "var(--font-condensed)",
    fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em",
    textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s",
    border: "none", cursor: "pointer",
  };
  if (style === "primary") {
    return (
      <Link to={to} style={{ ...base, background: "var(--brand)", color: "white" }}>
        {label} <ArrowRight size={13} />
      </Link>
    );
  }
  return (
    <Link to={to} style={{ ...base, background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
      {label} <ArrowRight size={13} />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Block Renderers ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroBlock({ data }: { data: HeroBlockData }) {
  const [muted, setMuted] = useState(data.videoMuted);

  return (
    <section style={{ position: "relative", width: "100%", minHeight: "100svh", overflow: "hidden", display: "flex", alignItems: "flex-end", background: "#050505" }}>
      {/* Media */}
      {data.mediaType === "video" ? (
        <video
          key={data.mediaUrl}
          src={data.mediaUrl}
          autoPlay loop={data.videoLoop} muted={muted} playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
        />
      ) : (
        <img src={resolveImg(data.mediaUrl)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      )}
      {/* Gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.3) 50%, rgba(5,5,5,0.1) 100%)" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "0 24px 80px" }}>
        {data.label && (
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", color: "var(--brand)", marginBottom: "24px", textTransform: "uppercase" }}>
            — {data.label}
          </p>
        )}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,10vw,8rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase", margin: 0 }}>
          <span style={{ color: "white" }}>{data.headlineLine1Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{data.headlineLine1Outline}</span>
          <br />
          <span style={{ color: "white" }}>{data.headlineLine2Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{data.headlineLine2Outline}</span>
        </h1>
        {data.subtitle && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7, maxWidth: "560px", margin: "24px 0" }}>{data.subtitle}</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {data.btn1Label && <BrandBtn label={data.btn1Label} to={data.btn1Url} style={data.btn1Style} />}
          {data.btn2Label && <BrandBtn label={data.btn2Label} to={data.btn2Url} style={data.btn2Style} />}
        </div>
      </div>

      {/* Mute toggle (video only) */}
      {data.mediaType === "video" && (
        <button
          onClick={() => setMuted(!muted)}
          style={{ position: "absolute", bottom: "24px", right: "24px", zIndex: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}
    </section>
  );
}

// ── Pillars (Trainingsangebot) ────────────────────────────────────────────────
function PillarsBlock({ data }: { data: PillarsBlockData }) {
  const pillars = [
    { img: resolveImg(data.pillar1Image), tag: data.pillar1Tag, hl: data.pillar1Headline, desc: data.pillar1Desc, cta: data.pillar1Cta, link: data.pillar1Link },
    { img: resolveImg(data.pillar2Image), tag: data.pillar2Tag, hl: data.pillar2Headline, desc: data.pillar2Desc, cta: data.pillar2Cta, link: data.pillar2Link },
    { img: resolveImg(data.pillar3Image), tag: data.pillar3Tag, hl: data.pillar3Headline, desc: data.pillar3Desc, cta: data.pillar3Cta, link: data.pillar3Link },
    { img: resolveImg(data.pillar4Image), tag: data.pillar4Tag, hl: data.pillar4Headline, desc: data.pillar4Desc, cta: data.pillar4Cta, link: data.pillar4Link },
  ];

  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <SectionLabel>{data.label}</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: 0 }}>
            {data.headlineNormal}{" "}
            <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{data.headlineOutline}</span>
          </h2>
          {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: "640px", margin: "20px auto 0", lineHeight: 1.7 }}>{data.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2px" }}>
          {pillars.map((p) => (
            <div key={p.hl} style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", cursor: "pointer" }}>
              <img src={p.img} alt={p.hl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.1) 60%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px" }}>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)", textTransform: "uppercase" }}>{p.tag}</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "white", margin: "8px 0", letterSpacing: "0.03em", textTransform: "uppercase" }}>{p.hl}</h3>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "16px" }}>{p.desc}</p>
                {p.link && (
                  <Link to={p.link} style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "var(--brand)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", textTransform: "uppercase" }}>
                    {p.cta} <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsBlock({ data }: { data: StatsBlockData }) {
  const items = Array.from({ length: data.count }, (_, i) => {
    const n = i + 1;
    return {
      icon: (data as Record<string, unknown>)[`item${n}Icon`] as string,
      value: (data as Record<string, unknown>)[`item${n}Value`] as string,
      label: (data as Record<string, unknown>)[`item${n}Label`] as string,
    };
  }).filter((x) => x.value);

  return (
    <section style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] ?? Zap;
          return (
            <div key={i} style={{ padding: "48px 24px", textAlign: "center", borderRight: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <Icon size={20} style={{ color: "var(--brand)", marginBottom: "12px" }} />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", margin: "0 0 6px", letterSpacing: "0.02em" }}>{item.value}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{item.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CtaBlock({ data }: { data: CtaBlockData }) {
  return (
    <section style={{ background: "#0a0a0a", padding: "96px 24px", textAlign: "center" }}>
      <SectionLabel>{data.label}</SectionLabel>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem,7vw,6rem)", lineHeight: 0.9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: "0 auto 24px", maxWidth: "800px" }}>
        {data.headlineNormal}{" "}
        <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{data.headlineOutline}</span>
      </h2>
      {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", maxWidth: "600px", margin: "0 auto 40px", lineHeight: 1.7 }}>{data.subtitle}</p>}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px" }}>
        {data.btn1Label && <BrandBtn label={data.btn1Label} to={data.btn1Url} style="primary" />}
        {data.btn2Label && <BrandBtn label={data.btn2Label} to={data.btn2Url} style="ghost" />}
      </div>
    </section>
  );
}

// ── Rich Text ─────────────────────────────────────────────────────────────────
function RichTextBlock({ data }: { data: RichTextBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "72px 24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: data.centered ? "center" : "left" }}>
        {data.heading && (
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "white", marginBottom: "24px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>
        )}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{data.content}</div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingBlock({ data }: { data: PricingBlockData }) {
  const plans = MEMBERSHIP_PLANS.filter((p) => data.visiblePlans.includes(p.id as "starter" | "performance" | "elite"));
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subheading && <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "14px", marginBottom: "56px" }}>{data.subheading}</p>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${plans.length},1fr)`, gap: "16px" }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "32px" }}>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", marginBottom: "8px" }}>{plan.badge || plan.name}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", margin: "0 0 24px" }}>{plan.price}<span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>/Mo</span></p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {plan.features?.slice(0, 5).map((f: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

// ── Reviews ───────────────────────────────────────────────────────────────────
function ReviewsBlock({ data }: { data: ReviewsBlockData }) {
  const [reviews, setReviews] = useState<Array<{ author_name: string; rating: number; text: string; relative_time_description: string }>>([]);

  useEffect(() => {
    import("../../../data/reviews").then(({ MOCK_REVIEWS }) => {
      setReviews(MOCK_REVIEWS.filter((r: { visible?: boolean }) => r.visible !== false).slice(0, data.limit));
    }).catch(() => {});
  }, [data.limit]);

  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {reviews.slice(0, 6).map((r, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "24px" }}>
              <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={13} style={{ color: "#FBBC05", fill: "#FBBC05" }} />)}
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.7, marginBottom: "16px" }}>"{r.text}"</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{r.author_name} · {r.relative_time_description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Team (einfach) ────────────────────────────────────────────────────────────
function TeamBlock({ data }: { data: TeamBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", fontSize: "13px" }}>Team wird aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────
function ContactFormBlock({ data }: { data: ContactFormBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.5rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "40px", lineHeight: 1.7 }}>{data.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {["Vorname", "Nachname", "E-Mail", "Nachricht"].map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>{label}</label>
              {label === "Nachricht" ? (
                <textarea rows={4} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }} />
              ) : (
                <input type={label === "E-Mail" ? "email" : "text"} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }} />
              )}
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", marginTop: "8px" }}>
            {data.buttonText || "Nachricht senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Trial Form ────────────────────────────────────────────────────────────────
function TrialFormBlock({ data }: { data: TrialFormBlockData }) {
  const goals = (data.goalOptions || "").split(",").map((g) => g.trim()).filter(Boolean);
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.5rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "40px", lineHeight: 1.7 }}>{data.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {goals.length > 0 && (
            <div>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Dein Ziel</label>
              <select style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }}>
                {goals.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
          {["Vorname", "E-Mail", "Wunsch-Datum"].map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>{label}</label>
              <input type={label === "E-Mail" ? "email" : label === "Wunsch-Datum" ? "date" : "text"} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "12px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
            {data.buttonText || "Senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ────────────────────────────────────────────────────────────────────────
function FaqBlock({ data }: { data: FaqBlockData }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {(data.questions || []).map((q, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", color: "white", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{q.question}</span>
                <ChevronDown size={16} style={{ color: "var(--brand)", transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </button>
              {open === i && (
                <div style={{ padding: "0 24px 20px", color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.7 }}>{q.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Values Grid ───────────────────────────────────────────────────────────────
function ValuesGridBlock({ data }: { data: ValuesGridBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
          {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: "560px", margin: "0 auto" }}>{data.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((data.values || []).length, 3)},1fr)`, gap: "16px" }}>
          {(data.values || []).map((v, i) => {
            const Icon = ICON_MAP[v.icon] ?? Heart;
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "32px" }}>
                <div style={{ width: "40px", height: "40px", background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <Icon size={17} style={{ color: "var(--brand)" }} />
                </div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: "8px" }}>{v.title}</p>
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
function FeaturesListBlock({ data }: { data: FeaturesListBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
          {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", maxWidth: "560px", margin: "0 auto" }}>{data.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: data.layout === "grid" ? "repeat(3,1fr)" : "1fr", gap: "16px" }}>
          {(data.features || []).map((f, i) => {
            const Icon = ICON_MAP[f.icon] ?? CheckCircle2;
            return (
              <div key={i} style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "24px" }}>
                <div style={{ width: "36px", height: "36px", background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: "6px" }}>{f.title}</p>
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
function TrustBadgesBlock({ data }: { data: TrustBadgesBlockData }) {
  return (
    <section style={{ background: "#070707", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "40px" }}>
        {(data.badges || []).map((b, i) => {
          const Icon = ICON_MAP[b.icon] ?? Shield;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
function ImageGalleryBlock({ data }: { data: ImageGalleryBlockData }) {
  const images = (data.imageUrls || "").split(",").map((u) => u.trim()).filter(Boolean);
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.columns || 3},1fr)`, gap: "8px" }}>
          {images.map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Location Map ──────────────────────────────────────────────────────────────
function LocationMapBlock({ data }: { data: LocationMapBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
          <div>
            {[{ icon: MapPin, text: data.address }, { icon: Phone, text: data.phone }, { icon: Mail, text: data.email }].filter(x => x.text).map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <Icon size={16} style={{ color: "var(--brand)", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>{text}</span>
              </div>
            ))}
          </div>
          {data.googleMapsEmbedUrl && (
            <iframe src={data.googleMapsEmbedUrl} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" title="Google Maps" />
          )}
        </div>
      </div>
    </section>
  );
}

// ── Opening Hours ─────────────────────────────────────────────────────────────
function OpeningHoursBlock({ data }: { data: OpeningHoursBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", marginBottom: "32px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.note && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "24px" }}>{data.note}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {(data.rows || []).map((row, i) => (
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
function JobsBoardBlock({ data }: { data: JobsBoardBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "48px" }}>{data.subtitle}</p>}
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>Offene Stellen werden aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Pros & Cons ───────────────────────────────────────────────────────────────
function ProsConsBlock({ data }: { data: ProsConsBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          {[{ label: "Vorteile", items: data.pros, color: "#4ade80" }, { label: "Nachteile", items: data.cons, color: "#f87171" }].map(({ label, items, color }) => (
            <div key={label}>
              <h3 style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: color, textTransform: "uppercase", marginBottom: "20px" }}>{label}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(items || []).map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "6px", height: "6px", background: color, borderRadius: "50%", flexShrink: 0 }} />
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
function LegalContentBlock({ data }: { data: LegalContentBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", marginBottom: "40px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{data.content}</div>
      </div>
    </section>
  );
}

// ── Timetable ─────────────────────────────────────────────────────────────────
function TimetableBlock({ data }: { data: TimetableBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "48px" }}>{data.subtitle}</p>}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Kursplan wird aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Zone Grid ─────────────────────────────────────────────────────────────────
function ZoneGridBlock({ data }: { data: ZoneGridBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "48px" }}>{data.subtitle}</p>}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Zonen werden aus der API geladen…</p>
      </div>
    </section>
  );
}

// ── Pricing Cards ─────────────────────────────────────────────────────────────
function PricingCardsBlock({ data }: { data: import("../../../data/blocks").PricingCardsBlockData }) {
  // Lazy-Import für use-pricing hook
  const [plans, setPlans] = useState<import("../../../lib/pricing-types").PublicPlan[]>([]);
  useEffect(() => {
    import("../../../data/classes").then(({ DEFAULT_BASE_PLANS }) => {
      // Konvertiere BasePlan → PublicPlan (minimale Kompatibilitätssicherung)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPlans(DEFAULT_BASE_PLANS as any);
    }).catch(() => {});
  }, []);

  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {plans.length > 0 && <PricingSection plans={plans} compact />}
        {plans.length === 0 && <p style={{ color: "rgba(255,255,255,0.25)", textAlign: "center", fontSize: "13px" }}>Tarife werden geladen…</p>}
      </div>
    </section>
  );
}

// ── Pricing Addons ────────────────────────────────────────────────────────────
function PricingAddonsBlock({ data }: { data: import("../../../data/blocks").PricingAddonsBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "12px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        {data.subtitle && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", textAlign: "center", marginBottom: "48px" }}>{data.subtitle}</p>}
        <PricingAddonsSection />
      </div>
    </section>
  );
}

// ── Pricing Compare ───────────────────────────────────────────────────────────
function PricingCompareBlock({ data }: { data: import("../../../data/blocks").PricingCompareBlockData }) {
  return (
    <section style={{ background: "#050505", padding: "96px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {data.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", textAlign: "center", marginBottom: "48px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{data.heading}</h2>}
        <PricingComparisonSection />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MASTER RENDERER ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface BlockRendererProps {
  block: PageBlock;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const d = block.data as Record<string, unknown>;

  switch (block.type) {
    case "hero":            return <HeroBlock data={d as HeroBlockData} />;
    case "pillars":         return <PillarsBlock data={d as PillarsBlockData} />;
    case "stats":           return <StatsBlock data={d as StatsBlockData} />;
    case "cta":             return <CtaBlock data={d as CtaBlockData} />;
    case "rich-text":       return <RichTextBlock data={d as RichTextBlockData} />;
    case "pricing":         return <PricingBlock data={d as PricingBlockData} />;
    case "pricing-cards":   return <PricingCardsBlock data={d as import("../../../data/blocks").PricingCardsBlockData} />;
    case "pricing-addons":  return <PricingAddonsBlock data={d as import("../../../data/blocks").PricingAddonsBlockData} />;
    case "pricing-compare": return <PricingCompareBlock data={d as import("../../../data/blocks").PricingCompareBlockData} />;
    case "reviews":         return <ReviewsBlock data={d as ReviewsBlockData} />;
    case "team":            return <TeamBlock data={d as TeamBlockData} />;
    case "contact-form":    return <ContactFormBlock data={d as ContactFormBlockData} />;
    case "trial-form":      return <TrialFormBlock data={d as TrialFormBlockData} />;
    case "faq":             return <FaqBlock data={d as FaqBlockData} />;
    case "values-grid":     return <ValuesGridBlock data={d as ValuesGridBlockData} />;
    case "features-list":   return <FeaturesListBlock data={d as FeaturesListBlockData} />;
    case "trust-badges":    return <TrustBadgesBlock data={d as TrustBadgesBlockData} />;
    case "image-gallery":   return <ImageGalleryBlock data={d as ImageGalleryBlockData} />;
    case "location-map":    return <LocationMapBlock data={d as LocationMapBlockData} />;
    case "opening-hours":   return <OpeningHoursBlock data={d as OpeningHoursBlockData} />;
    case "jobs-board":      return <JobsBoardBlock data={d as JobsBoardBlockData} />;
    case "pros-cons":       return <ProsConsBlock data={d as ProsConsBlockData} />;
    case "legal-content":   return <LegalContentBlock data={d as LegalContentBlockData} />;
    case "timetable":       return <TimetableBlock data={d as TimetableBlockData} />;
    case "zone-grid":       return <ZoneGridBlock data={d as ZoneGridBlockData} />;
    // ── Studio (echte Komponenten 1:1) ────────────────────────────────────────
    case "studio-hero":     return <StudioHeroSection data={d as StudioHeroBlockData} />;
    case "studio-zones":    return <StudioZonesSection data={d as StudioZonesBlockData} />;
    case "studio-info":     return <StudioInfoSection data={d as StudioInfoBlockData} />;
    // ── Team (echte Komponenten 1:1) ──────────────────────────────────────────
    case "team-header":     return <TeamHeaderSection data={d as TeamHeaderBlockData} reduced={false} />;
    case "team-grid":       return <TeamGridSection data={d as TeamGridBlockData} />;
    default:
      return (
        <section style={{ background: "#050505", padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Unbekannter Block: {block.type}
          </p>
        </section>
      );
  }
}

// ── Page-Level Renderer (gesamte Seite) ───────────────────────────────────────
export function PageBlocksRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  );
}
