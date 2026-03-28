/**
 * BlockRenderer.tsx – Zentrale Block-Render-Engine (Single Source of Truth)
 * ─────────────────────────────────────────────────────────────────────────────
 * WICHTIG: Kein Import von Studio.tsx / Team.tsx (erzeugt zirkuläre Imports
 * und bringt die App zum Absturz). Studio/Team-Blöcke haben hier eigene,
 * vollständige Inline-Renderer.
 *
 * Die echten Seiten (Studio.tsx, Team.tsx) rendern ihre Sections direkt –
 * das Live-Frontend bleibt davon komplett unberührt.
 */

import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, MapPin, Phone, Mail, Star,
  Heart, Zap, Target, Shield,
  CheckCircle2, Briefcase, ChevronDown, List,
  Users, Dumbbell, Award, Clock, TrendingUp,
} from "lucide-react";

// ── Statische Daten-Imports (synchron) ───────────────────────────────────────
import { MEMBERSHIP_PLANS } from "../../../data/classes";
import { MOCK_REVIEWS } from "../../../data/reviews";

// ── Figma-Assets ──────────────────────────────────────────────────────────────
import pillarStrengthImg from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";
import pillarCrossfitImg from "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png";
import pillarHyroxImg    from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import pillarThekeImg    from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";
import athleticAreaImg   from "figma:asset/12f0eb425f227fc6169c67d1390da3067ec74f70.png";
import crossfitZoneImg   from "figma:asset/074311f22e30fb140e6274c625d4f86c2eb55278.png";

const FIGMA_MAP: Record<string, string> = {
  "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png": pillarStrengthImg,
  "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png": pillarCrossfitImg,
  "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png": pillarHyroxImg,
  "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png": pillarThekeImg,
  "figma:asset/12f0eb425f227fc6169c67d1390da3067ec74f70.png": athleticAreaImg,
  "figma:asset/074311f22e30fb140e6274c625d4f86c2eb55278.png": crossfitZoneImg,
};
const img = (src: string) => FIGMA_MAP[src] ?? src;

// ── Icon-Map ──────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Users, Star, Dumbbell, Award, Clock, TrendingUp, Heart, Zap, Target, Shield,
  MapPin, Phone, Mail, Briefcase, List, CheckCircle2,
};

// ── Typen ─────────────────────────────────────────────────────────────────────
import type {
  PageBlock,
  HeroBlockData, PillarsBlockData, StatsBlockData, CtaBlockData,
  RichTextBlockData, PricingBlockData, ReviewsBlockData, TeamBlockData,
  ContactFormBlockData, FeaturesListBlockData, ValuesGridBlockData,
  ImageGalleryBlockData, LocationMapBlockData, OpeningHoursBlockData,
  TrustBadgesBlockData, JobsBoardBlockData, ProsConsBlockData,
  LegalContentBlockData, TrialFormBlockData, FaqBlockData,
  TimetableBlockData, ZoneGridBlockData,
  PricingCardsBlockData, PricingAddonsBlockData, PricingCompareBlockData,
  StudioHeroBlockData, StudioZonesBlockData, StudioInfoBlockData,
  TeamHeaderBlockData, TeamGridBlockData,
} from "../../../data/blocks";

// ─────────────────────────────────────────────────────────────────────────────
// ── Shared UI ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const S = "#050505";
const P96 = "96px 24px";
const W1280: React.CSSProperties = { maxWidth: 1280, margin: "0 auto" };
const W1100: React.CSSProperties = { maxWidth: 1100, margin: "0 auto" };
const W800: React.CSSProperties  = { maxWidth: 800,  margin: "0 auto" };
const W640: React.CSSProperties  = { maxWidth: 640,  margin: "0 auto" };

function SLabel({ t }: { t: string }) {
  if (!t) return null;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 20 }}>
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
      {t}
      <span style={{ width: 24, height: 1, background: "var(--brand)", display: "inline-block" }} />
    </div>
  );
}

function PBtn({ label, to }: { label: string; to: string }) {
  return <Link to={to} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "var(--brand)", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", textDecoration: "none" }}>{label} <ArrowRight size={13} /></Link>;
}

function GBtn({ label, to }: { label: string; to: string }) {
  return <Link to={to} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "transparent", color: "white", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>{label} <ArrowRight size={13} /></Link>;
}

function CBtn({ label, to, s = "primary" }: { label: string; to: string; s?: "primary" | "ghost" }) {
  return s === "primary" ? <PBtn label={label} to={to} /> : <GBtn label={label} to={to} />;
}

function ApiBox({ label }: { label: string }) {
  return <div style={{ padding: "40px 24px", background: "rgba(202,12,133,0.04)", border: "1px dashed rgba(202,12,133,0.2)", textAlign: "center" }}><p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(202,12,133,0.5)", textTransform: "uppercase" }}>{label} · wird aus der API geladen</p></div>;
}

function H2({ t, mb = 48 }: { t: string; mb?: number }) {
  return <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: mb, letterSpacing: "0.03em", textTransform: "uppercase" }}>{t}</h2>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Block-Implementierungen ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function HeroBlock({ d }: { d: HeroBlockData }) {
  const [muted, setMuted] = useState(d.videoMuted ?? true);
  return (
    <section style={{ position: "relative", width: "100%", minHeight: "100svh", overflow: "hidden", display: "flex", alignItems: "flex-end", background: S }}>
      {d.mediaType === "video"
        ? <video key={d.mediaUrl} src={d.mediaUrl} autoPlay loop={d.videoLoop} muted={muted} playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
        : <img src={img(d.mediaUrl)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      }
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,5,5,.92) 0%,rgba(5,5,5,.3) 50%,transparent 100%)" }} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        {d.label && <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em", color: "var(--brand)", marginBottom: 24, textTransform: "uppercase" }}>— {d.label}</p>}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,10vw,8rem)", lineHeight: 0.92, letterSpacing: "0.02em", textTransform: "uppercase", margin: 0 }}>
          <span style={{ color: "white" }}>{d.headlineLine1Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineLine1Outline}</span>
          <br />
          <span style={{ color: "white" }}>{d.headlineLine2Normal} </span>
          <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineLine2Outline}</span>
        </h1>
        {d.subtitle && <p style={{ color: "rgba(255,255,255,.6)", fontSize: "14px", lineHeight: 1.7, maxWidth: 560, margin: "24px 0" }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {d.btn1Label && <CBtn label={d.btn1Label} to={d.btn1Url} s={d.btn1Style} />}
          {d.btn2Label && <CBtn label={d.btn2Label} to={d.btn2Url} s={d.btn2Style} />}
        </div>
      </div>
      {d.mediaType === "video" && (
        <button onClick={() => setMuted(!muted)} style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.15)", color: "white", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%", fontSize: 16 }}>
          {muted ? "🔇" : "🔊"}
        </button>
      )}
    </section>
  );
}

function PillarsBlock({ d }: { d: PillarsBlockData }) {
  const p = [
    { i: img(d.pillar1Image), tag: d.pillar1Tag, hl: d.pillar1Headline, desc: d.pillar1Desc, cta: d.pillar1Cta, link: d.pillar1Link },
    { i: img(d.pillar2Image), tag: d.pillar2Tag, hl: d.pillar2Headline, desc: d.pillar2Desc, cta: d.pillar2Cta, link: d.pillar2Link },
    { i: img(d.pillar3Image), tag: d.pillar3Tag, hl: d.pillar3Headline, desc: d.pillar3Desc, cta: d.pillar3Cta, link: d.pillar3Link },
    { i: img(d.pillar4Image), tag: d.pillar4Tag, hl: d.pillar4Headline, desc: d.pillar4Desc, cta: d.pillar4Cta, link: d.pillar4Link },
  ];
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <SLabel t={d.label} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: .9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: 0 }}>
            {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
          </h2>
          {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "14px", maxWidth: 640, margin: "20px auto 0", lineHeight: 1.7 }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
          {p.map((x) => (
            <div key={x.hl} style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
              <img src={x.i} alt={x.hl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,5,5,.95) 0%,rgba(5,5,5,.1) 60%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24 }}>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)", textTransform: "uppercase" }}>{x.tag}</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "white", margin: "8px 0", letterSpacing: "0.03em", textTransform: "uppercase" }}>{x.hl}</h3>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 16 }}>{x.desc}</p>
                {x.link && <Link to={x.link} style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "var(--brand)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>{x.cta} <ArrowRight size={10} /></Link>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBlock({ d }: { d: StatsBlockData }) {
  const items = Array.from({ length: d.count }, (_, i) => {
    const n = i + 1;
    const dd = d as Record<string, unknown>;
    return { icon: dd[`item${n}Icon`] as string, value: dd[`item${n}Value`] as string, label: dd[`item${n}Label`] as string };
  }).filter((x) => x.value);
  return (
    <section style={{ background: S, borderTop: "1px solid rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <div style={{ ...W1280, display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map((it, i) => {
          const Icon = ICONS[it.icon] ?? Zap;
          return (
            <div key={i} style={{ padding: "48px 24px", textAlign: "center", borderRight: i < items.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
              <Icon size={20} style={{ color: "var(--brand)", marginBottom: 12 }} />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", margin: "0 0 6px", letterSpacing: "0.02em" }}>{it.value}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>{it.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CtaBlock({ d }: { d: CtaBlockData }) {
  return (
    <section style={{ background: S, padding: P96, textAlign: "center" }}>
      <SLabel t={d.label} />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem,7vw,6rem)", lineHeight: .9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: "0 auto 24px", maxWidth: 800 }}>
        {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
      </h2>
      {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "15px", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>{d.subtitle}</p>}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16 }}>
        {d.btn1Label && <PBtn label={d.btn1Label} to={d.btn1Url} />}
        {d.btn2Label && <GBtn label={d.btn2Label} to={d.btn2Url} />}
      </div>
    </section>
  );
}

function RichTextBlock({ d }: { d: RichTextBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={{ ...W800, textAlign: d.centered ? "center" : "left" }}>
        {d.heading && <H2 t={d.heading} mb={24} />}
        <div style={{ color: "rgba(255,255,255,.6)", fontSize: "15px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{d.content}</div>
      </div>
    </section>
  );
}

function PricingBlock({ d }: { d: PricingBlockData }) {
  const plans = (MEMBERSHIP_PLANS as Array<{ id: string; name: string; price: number; features?: string[]; badge?: string }>)
    .filter((p) => d.visiblePlans.includes(p.id as never));
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1100}>
        {d.heading && <H2 t={d.heading} mb={d.subheading ? 12 : 56} />}
        {d.subheading && <p style={{ color: "rgba(255,255,255,.4)", textAlign: "center", fontSize: "14px", marginBottom: 56 }}>{d.subheading}</p>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(plans.length, 1)},1fr)`, gap: 16 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", padding: 32 }}>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", marginBottom: 8 }}>{plan.badge || plan.name}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", margin: "0 0 24px" }}>{plan.price}<span style={{ fontSize: "1rem", color: "rgba(255,255,255,.4)" }}>/Mo</span></p>
              {(plan.features || []).slice(0, 5).map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <CheckCircle2 size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,.7)" }}>{f}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCardsBlock({ d }: { d: PricingCardsBlockData }) {
  return <section style={{ background: S, padding: P96 }}><div style={{ ...W1100, textAlign: "center" }}>{d.heading && <H2 t={d.heading} mb={48} />}<ApiBox label="Preis-Karten" /></div></section>;
}
function PricingAddonsBlock({ d }: { d: PricingAddonsBlockData }) {
  return <section style={{ background: S, padding: P96 }}><div style={{ ...W1100, textAlign: "center" }}>{d.heading && <H2 t={d.heading} mb={d.subtitle ? 12 : 48} />}{d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "14px", marginBottom: 32 }}>{d.subtitle}</p>}<ApiBox label="Addons" /></div></section>;
}
function PricingCompareBlock({ d }: { d: PricingCompareBlockData }) {
  return <section style={{ background: S, padding: P96 }}><div style={{ ...W1100, textAlign: "center" }}>{d.heading && <H2 t={d.heading} mb={48} />}<ApiBox label="Tarifvergleich" /></div></section>;
}

function ReviewsBlock({ d }: { d: ReviewsBlockData }) {
  const items = (MOCK_REVIEWS as Array<{ author_name: string; rating: number; text: string; relative_time_description: string; visible?: boolean }>)
    .filter((r) => r.visible !== false).slice(0, d.limit);
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        {d.heading && <H2 t={d.heading} mb={48} />}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {items.slice(0, 6).map((r, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 24 }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={13} style={{ color: "#FBBC05", fill: "#FBBC05" }} />)}
              </div>
              <p style={{ color: "rgba(255,255,255,.7)", fontSize: "13px", lineHeight: 1.7, marginBottom: 16 }}>"{r.text}"</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>{r.author_name} · {r.relative_time_description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamBlock({ d }: { d: TeamBlockData }) {
  return <section style={{ background: S, padding: P96 }}><div style={{ ...W1280, textAlign: "center" }}>{d.heading && <H2 t={d.heading} mb={48} />}<ApiBox label="Team" /></div></section>;
}

function ContactFormBlock({ d }: { d: ContactFormBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W640}>
        {d.heading && <H2 t={d.heading} mb={12} />}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "14px", marginBottom: 40, lineHeight: 1.7 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {["Vorname", "Nachname", "E-Mail", "Nachricht"].map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
              {label === "Nachricht"
                ? <textarea rows={4} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "white", padding: 12, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                : <input type={label === "E-Mail" ? "email" : "text"} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "white", padding: 12, fontSize: 14, boxSizing: "border-box" }} />
              }
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
            {d.buttonText || "Senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

function TrialFormBlock({ d }: { d: TrialFormBlockData }) {
  const goals = (d.goalOptions || "").split(",").map((g) => g.trim()).filter(Boolean);
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W640}>
        {d.heading && <H2 t={d.heading} mb={12} />}
        {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "14px", marginBottom: 40, lineHeight: 1.7 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.length > 0 && (
            <div>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Dein Ziel</label>
              <select style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "white", padding: 12, fontSize: 14, boxSizing: "border-box" }}>
                {goals.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          )}
          {["Vorname", "E-Mail", "Wunsch-Datum"].map((label) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
              <input type={label === "E-Mail" ? "email" : label.includes("Datum") ? "date" : "text"} style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "white", padding: 12, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          ))}
          <button style={{ background: "var(--brand)", color: "white", border: "none", padding: "14px 32px", fontFamily: "var(--font-condensed)", fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
            {d.buttonText || "Senden"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

function FaqBlock({ d }: { d: FaqBlockData }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W800}>
        {d.heading && <H2 t={d.heading} mb={48} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(d.questions || []).map((q, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", color: "white", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{q.question}</span>
                <ChevronDown size={16} style={{ color: "var(--brand)", transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
              </button>
              {open === i && <div style={{ padding: "0 24px 20px", color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.7 }}>{q.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuesGridBlock({ d }: { d: ValuesGridBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {d.heading && <H2 t={d.heading} mb={12} />}
          {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: "14px", maxWidth: 560, margin: "0 auto" }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min((d.values || []).length, 3)},1fr)`, gap: 16 }}>
          {(d.values || []).map((v, i) => {
            const Icon = ICONS[v.icon] ?? Heart;
            return (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 32 }}>
                <div style={{ width: 40, height: 40, background: "rgba(202,12,133,.1)", border: "1px solid rgba(202,12,133,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={17} style={{ color: "var(--brand)" }} />
                </div>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: 8 }}>{v.title}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{v.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesListBlock({ d }: { d: FeaturesListBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {d.heading && <H2 t={d.heading} mb={12} />}
          {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, maxWidth: 560, margin: "0 auto" }}>{d.subtitle}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: d.layout === "grid" ? "repeat(3,1fr)" : "1fr", gap: 16 }}>
          {(d.features || []).map((f, i) => {
            const Icon = ICONS[f.icon] ?? CheckCircle2;
            return (
              <div key={i} style={{ display: "flex", gap: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 24 }}>
                <div style={{ width: 36, height: 36, background: "rgba(202,12,133,.1)", border: "1px solid rgba(202,12,133,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: "var(--brand)" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-condensed)", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white", textTransform: "uppercase", marginBottom: 6 }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustBadgesBlock({ d }: { d: TrustBadgesBlockData }) {
  return (
    <section style={{ background: "#070707", borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "32px 24px" }}>
      <div style={{ ...W1280, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 40 }}>
        {(d.badges || []).map((b, i) => {
          const Icon = ICONS[b.icon] ?? Shield;
          return <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={16} style={{ color: "var(--brand)" }} /><span style={{ fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,.6)", textTransform: "uppercase" }}>{b.text}</span></div>;
        })}
      </div>
    </section>
  );
}

function ImageGalleryBlock({ d }: { d: ImageGalleryBlockData }) {
  const images = (d.imageUrls || "").split(",").map((u) => u.trim()).filter(Boolean);
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        {d.heading && <H2 t={d.heading} mb={48} />}
        {images.length > 0
          ? <div style={{ display: "grid", gridTemplateColumns: `repeat(${d.columns || 3},1fr)`, gap: 8 }}>{images.map((url, i) => <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />)}</div>
          : <ApiBox label="Galerie – Bild-URLs eintragen" />
        }
      </div>
    </section>
  );
}

function LocationMapBlock({ d }: { d: LocationMapBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        {d.heading && <H2 t={d.heading} mb={48} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div>
            {([{ Icon: MapPin, t: d.address }, { Icon: Phone, t: d.phone }, { Icon: Mail, t: d.email }] as const).filter(x => x.t).map(({ Icon, t }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Icon size={16} style={{ color: "var(--brand)", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,.7)", fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
          {d.googleMapsEmbedUrl
            ? <iframe src={d.googleMapsEmbedUrl} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" title="Google Maps" />
            : <div style={{ height: 300, background: "rgba(255,255,255,.03)", border: "1px dashed rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ fontFamily: "var(--font-condensed)", fontSize: 10, color: "rgba(255,255,255,.2)", textTransform: "uppercase", letterSpacing: "0.16em" }}>Karte – Embed-URL eintragen</p></div>
          }
        </div>
      </div>
    </section>
  );
}

function OpeningHoursBlock({ d }: { d: OpeningHoursBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {d.heading && <H2 t={d.heading} mb={32} />}
        {d.note && <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 24 }}>{d.note}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(d.rows || []).map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: row.highlight ? "rgba(202,12,133,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${row.highlight ? "rgba(202,12,133,.2)" : "rgba(255,255,255,.05)"}` }}>
              <span style={{ fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: row.highlight ? "var(--brand)" : "rgba(255,255,255,.6)", textTransform: "uppercase" }}>{row.days}</span>
              <span style={{ fontSize: 13, color: row.highlight ? "white" : "rgba(255,255,255,.5)" }}>{row.hours}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function JobsBoardBlock({ d }: { d: JobsBoardBlockData }) {
  return <section style={{ background: S, padding: P96, textAlign: "center" }}><div style={{ maxWidth: 900, margin: "0 auto" }}>{d.heading && <H2 t={d.heading} mb={12} />}{d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, marginBottom: 48 }}>{d.subtitle}</p>}<ApiBox label="Stellenangebote" /></div></section>;
}

function ProsConsBlock({ d }: { d: ProsConsBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {d.heading && <H2 t={d.heading} mb={48} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {[{ label: "Vorteile", items: d.pros, c: "#4ade80" }, { label: "Nachteile", items: d.cons, c: "#f87171" }].map(({ label, items, c }) => (
            <div key={label}>
              <h3 style={{ fontFamily: "var(--font-condensed)", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", color: c, textTransform: "uppercase", marginBottom: 20 }}>{label}</h3>
              {(items || []).map((it, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 6, height: 6, background: c, borderRadius: "50%", flexShrink: 0 }} /><span style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>{it.text}</span></div>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LegalContentBlock({ d }: { d: LegalContentBlockData }) {
  return <section style={{ background: S, padding: P96 }}><div style={{ maxWidth: 860, margin: "0 auto" }}>{d.heading && <h2 style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", marginBottom: 40, letterSpacing: "0.03em", textTransform: "uppercase" }}>{d.heading}</h2>}<div style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{d.content}</div></div></section>;
}

function TimetableBlock({ d }: { d: TimetableBlockData }) {
  return <section style={{ background: S, padding: P96, textAlign: "center" }}><div style={W1280}>{d.heading && <H2 t={d.heading} mb={d.subtitle ? 12 : 48} />}{d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, marginBottom: 48 }}>{d.subtitle}</p>}<ApiBox label="Kursplan" /></div></section>;
}

function ZoneGridBlock({ d }: { d: ZoneGridBlockData }) {
  return <section style={{ background: S, padding: P96, textAlign: "center" }}><div style={W1280}>{d.heading && <H2 t={d.heading} mb={d.subtitle ? 12 : 48} />}{d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, marginBottom: 48 }}>{d.subtitle}</p>}<ApiBox label="Zonen-Raster" /></div></section>;
}

// ── Studio-Blöcke (Inline, KEIN Import aus Studio.tsx) ────────────────────────
function StudioHeroBlock({ d }: { d: StudioHeroBlockData }) {
  return (
    <section style={{ position: "relative", minHeight: "80vh", display: "flex", alignItems: "flex-end", background: S, overflow: "hidden" }}>
      <img src={img(d.heroImage)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .5 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,5,5,.95) 0%,rgba(5,5,5,.2) 70%,transparent 100%)" }} />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px", width: "100%" }}>
        {d.label && <p style={{ fontFamily: "var(--font-condensed)", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", color: "var(--brand)", marginBottom: 24, textTransform: "uppercase" }}>— {d.label}</p>}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,10vw,8rem)", lineHeight: .92, letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 24px" }}>
          <span style={{ color: "white" }}>{d.headlineNormal} </span><span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
        </h1>
        {d.subtitle && <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, maxWidth: 560, lineHeight: 1.7, marginBottom: 32 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", gap: 32, marginBottom: 40, flexWrap: "wrap" }}>
          {[{ v: d.quickStat1Val, l: d.quickStat1Label }, { v: d.quickStat2Val, l: d.quickStat2Label }, { v: d.quickStat3Val, l: d.quickStat3Label }].filter(s => s.v).map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "white", margin: 0 }}>{s.v}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>{s.l}</p>
            </div>
          ))}
        </div>
        {d.ctaLabel && <PBtn label={d.ctaLabel} to={d.ctaUrl} />}
      </div>
    </section>
  );
}

function StudioZonesBlock({ d }: { d: StudioZonesBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SLabel t={d.sectionLabel} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: .9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: 0 }}>
            {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {(d.zones || []).map((zone, i) => (
            <div key={zone.key || i} style={{ position: "relative", overflow: "hidden", minHeight: zone.large ? 400 : 200, gridRow: zone.large ? "span 2" : undefined }}>
              <img src={img(zone.image)} alt={zone.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .6 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(5,5,5,.9) 0%,rgba(5,5,5,.1) 60%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)", textTransform: "uppercase" }}>{zone.tag}</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "white", margin: "6px 0", letterSpacing: "0.03em", textTransform: "uppercase" }}>{zone.label}</h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{zone.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudioInfoBlock({ d }: { d: StudioInfoBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <div style={{ marginBottom: 48 }}>
          <SLabel t={d.sectionLabel} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,5rem)", lineHeight: .9, letterSpacing: "0.02em", textTransform: "uppercase", color: "white" }}>
            {d.headlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 32 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 24 }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", marginBottom: 16 }}>{d.studioHoursHeading}</p>
            {(d.hours || []).map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,.6)", textTransform: "uppercase" }}>{row.day}</span>
                <span style={{ fontSize: 13, color: "white" }}>{row.time}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: 24 }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--brand)", textTransform: "uppercase", marginBottom: 16 }}>{d.addressHeading}</p>
            <p style={{ color: "white", fontSize: 14, marginBottom: 4 }}>{d.addressLine1}</p>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 2 }}>{d.addressLine2}</p>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 20 }}>{d.addressLine3}</p>
            {d.contactEmail && <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginBottom: 20 }}>{d.contactEmail}</p>}
            {d.ctaLabel && <PBtn label={d.ctaLabel} to={d.ctaUrl} />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Team-Blöcke (Inline, KEIN Import aus Team.tsx) ────────────────────────────
function TeamHeaderBlock({ d }: { d: TeamHeaderBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        <SLabel t={d.label} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,10vw,8rem)", lineHeight: .92, letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 24px" }}>
          <span style={{ color: "white" }}>{d.headlineNormal} </span><span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.headlineOutline}</span>
        </h1>
        {d.subtitle && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15, maxWidth: 600, lineHeight: 1.7, marginBottom: 40 }}>{d.subtitle}</p>}
        <div style={{ display: "flex", gap: 40, marginBottom: 40, flexWrap: "wrap" }}>
          {[{ v: d.stat1Val, l: d.stat1Label }, { v: d.stat2Val, l: d.stat2Label }, { v: d.stat3Val, l: d.stat3Label }].filter(s => s.v).map((s, i) => (
            <div key={i}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", color: "white", margin: 0 }}>{s.v}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>{s.l}</p>
            </div>
          ))}
        </div>
        {d.ctaLabel && <PBtn label={d.ctaLabel} to={d.ctaUrl} />}
      </div>
    </section>
  );
}

function TeamGridBlock({ d }: { d: TeamGridBlockData }) {
  return (
    <section style={{ background: S, padding: P96 }}>
      <div style={W1280}>
        {d.leadershipSectionLabel && <SLabel t={d.leadershipSectionLabel} />}
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,4rem)", color: "white", marginBottom: 48, letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {d.leadershipHeadlineNormal} <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>{d.leadershipHeadlineOutline}</span>
        </h2>
        <ApiBox label="Team-Grid" />
      </div>
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
    case "studio-hero":     return <StudioHeroBlock d={d as StudioHeroBlockData} />;
    case "studio-zones":    return <StudioZonesBlock d={d as StudioZonesBlockData} />;
    case "studio-info":     return <StudioInfoBlock d={d as StudioInfoBlockData} />;
    case "team-header":     return <TeamHeaderBlock d={d as TeamHeaderBlockData} />;
    case "team-grid":       return <TeamGridBlock d={d as TeamGridBlockData} />;
    default:
      return (
        <section style={{ background: S, padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,.15)", fontSize: 12, fontFamily: "var(--font-condensed)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Block: {block.type}</p>
        </section>
      );
  }
}

export function PageBlocksRenderer({ blocks }: { blocks: PageBlock[] }) {
  return <>{blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}</>;
}
