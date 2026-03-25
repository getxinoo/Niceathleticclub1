/**
 * BlockPreview – faithful visual preview of a PageBlock inside the PageEditor.
 *
 * Accepts `previewMode: "desktop" | "mobile"` and renders each block
 * exactly as the public frontend does — including mobile-specific layouts
 * (stack / grid-2 / swipe carousel with dots + "SWIPE →" indicator).
 */

import { useState } from "react";

// ── Pillar background images (Figma assets) ───────────────────────────────────
import pillarStrengthImg from "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png";
import pillarCrossfitImg from "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png";
import pillarHyroxImg    from "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png";
import pillarThekeImg    from "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png";

import {
  Users, Star, Dumbbell, Award, Clock,
  TrendingUp, Heart, Zap, Target, Shield,
  ArrowRight, ChevronLeft, ChevronRight,
  MapPin, Phone, Mail, Clock as ClockIcon,
  Briefcase, List, CheckCircle2,
} from "lucide-react";

// ── Studio section components (re-used 1:1 in preview) ───────────────────────
import {
  StudioHeroSection,
  StudioZonesSection,
  StudioInfoSection,
} from "../../pages/Studio";



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
  // Studio
  StudioHeroBlockData,
  StudioZonesBlockData,
  StudioInfoBlockData,
  // Team
  TeamHeaderBlockData,
  TeamGridBlockData,
} from "../../../data/blocks";
import { MEMBERSHIP_PLANS, DEFAULT_BASE_PLANS } from "../../../data/classes";

// ── Studio zone images (needed here for BlockPreview FIGMA_ASSET_MAP) ────────
import crossfitZonePreviewImg  from "figma:asset/074311f22e30fb140e6274c625d4f86c2eb55278.png";
import athleticAreaPreviewImg  from "figma:asset/12f0eb425f227fc6169c67d1390da3067ec74f70.png";
import duschenPreviewImg       from "figma:asset/f06118a1042cae64d2462baf0c816cd2aa82d64a.png";
import legDayPreviewImg        from "figma:asset/a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png";

// ── Asset resolver ─────────────────────────────────────────────────────────────
const FIGMA_ASSET_MAP: Record<string, string> = {
  "figma:asset/4d0137fe5cbc4aed779b344b68c6ae4a170d2668.png": pillarStrengthImg,
  "figma:asset/0056420c6523fcaf0bc63febb2b162354bc9a245.png": pillarCrossfitImg,
  "figma:asset/4365f816dcc86a67f27557eee60c8f4cf8a11b3d.png": pillarHyroxImg,
  "figma:asset/340d3320565627752ba7f105637cdbc8dc4d4584.png": pillarThekeImg,
  // Studio zones
  "figma:asset/074311f22e30fb140e6274c625d4f86c2eb55278.png": crossfitZonePreviewImg,
  "figma:asset/12f0eb425f227fc6169c67d1390da3067ec74f70.png":  athleticAreaPreviewImg,
  "figma:asset/f06118a1042cae64d2462baf0c816cd2aa82d64a.png":  duschenPreviewImg,
  "figma:asset/a75ed35fb9db584ac8784f61a27d15e2e55f72e9.png":  legDayPreviewImg,
};
function resolveImg(src: string): string {
  return FIGMA_ASSET_MAP[src] ?? src;
}

// ── Stat / feature icon map ────────────────────────────────────────────────────
const STAT_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Users, Star, Dumbbell, Award, Clock, TrendingUp, Heart, Zap, Target, Shield,
  MapPin, Phone, Mail, Briefcase, List, CheckCircle2,
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Shared UI helpers ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

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

function PreviewButton({
  label,
  btnStyle,
  isMobile = false,
}: {
  label: string;
  btnStyle?: string;
  isMobile?: boolean;
}) {
  if (btnStyle === "primary") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center",
        gap: isMobile ? "10px" : "8px",
        padding: isMobile ? "13px 24px" : "10px 22px",
        background: "var(--brand)", color: "white",
        fontFamily: "var(--font-condensed)",
        fontSize: isMobile ? "12px" : "11px",
        fontWeight: 700,
        letterSpacing: isMobile ? "0.18em" : "0.14em",
        textTransform: "uppercase",
      }}>
        {label} <ArrowRight size={isMobile ? 13 : 12} />
      </span>
    );
  }
  // Ghost — matches the real mobile frontend exactly:
  // transparent bg, clear white border, uppercase, arrow on right
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      gap: isMobile ? "10px" : "8px",
      padding: isMobile ? "13px 24px" : "10px 22px",
      background: "transparent",
      border: `1px solid ${isMobile ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)"}`,
      color: "white",
      fontFamily: "var(--font-condensed)",
      fontSize: isMobile ? "12px" : "11px",
      fontWeight: 700,
      letterSpacing: isMobile ? "0.18em" : "0.14em",
      textTransform: "uppercase",
    }}>
      {label} <ArrowRight size={isMobile ? 13 : 12} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SwipeCarousel ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Mobile swipe carousel preview.
 * Click dots or arrow buttons to navigate.
 * Renders the exact "SWIPE →" indicator from the real mobile frontend.
 */
function SwipeCarousel({
  items,
  renderItem,
  label,
}: {
  items: unknown[];
  renderItem: (item: unknown, idx: number) => React.ReactNode;
  label?: string;
}) {
  const [active, setActive] = useState(0);
  const total = items.length;

  if (total === 0) return null;

  const prev = () => setActive((a) => Math.max(0, a - 1));
  const next = () => setActive((a) => Math.min(total - 1, a + 1));

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      {/* ── Card container with peek effect ── */}
      <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
        <div
          style={{
            display: "flex",
            transform: `translateX(calc(-${active * 88}% - ${active * 8}px))`,
            transition: "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
            gap: "8px",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                flexShrink: 0,
                width: "88%",
                opacity: idx === active ? 1 : 0.45,
                transform: idx === active ? "scale(1)" : "scale(0.97)",
                transition: "opacity 0.3s, transform 0.3s",
              }}
            >
              {renderItem(item, idx)}
            </div>
          ))}
        </div>

        {/* Prev / Next invisible tap zones */}
        {active > 0 && (
          <button
            onClick={prev}
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "20%",
              background: "transparent", border: "none", cursor: "pointer", zIndex: 5,
            }}
          />
        )}
        {active < total - 1 && (
          <button
            onClick={next}
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: "20%",
              background: "transparent", border: "none", cursor: "pointer", zIndex: 5,
            }}
          />
        )}
      </div>

      {/* ── Dots + SWIPE indicator ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "10px", paddingTop: "18px", paddingBottom: "4px",
      }}>
        {/* Dots row */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              style={{
                width: idx === active ? "22px" : "7px",
                height: "7px",
                borderRadius: "4px",
                background: idx === active ? "var(--brand)" : "rgba(255,255,255,0.18)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.28s",
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* SWIPE → label */}
        <p style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.2)",
        }}>
          {active < total - 1 ? "SWIPE →" : label ?? "SWIPE →"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Block Previews ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroPreview({ data, isMobile }: { data: HeroBlockData; isMobile: boolean }) {
  const hasVideo = data.mediaType === "video" && !!data.mediaUrl?.trim();
  const hasImage = data.mediaType === "image" && !!data.mediaUrl?.trim();

  return (
    <div style={{
      position: "relative",
      minHeight: isMobile ? "480px" : "380px",
      overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      background: "#050505",
    }}>
      {/* Media */}
      {hasVideo && (
        <video src={data.mediaUrl} autoPlay loop={data.videoLoop} muted={data.videoMuted}
          playsInline aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: "brightness(0.42) saturate(1.15)", pointerEvents: "none" }}
        />
      )}
      {hasImage && (
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: `url(${data.mediaUrl})`, backgroundSize: "cover", backgroundPosition: "center",
          filter: "brightness(0.42) saturate(1.15)", pointerEvents: "none" }}
        />
      )}
      {!hasVideo && !hasImage && (
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(145deg, #050505 0%, #1a0810 60%, #0f0f0f 100%)" }}
        />
      )}

      {/* Gradient overlays */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(5,5,5,0.28) 0%, rgba(5,5,5,0.15) 40%, rgba(5,5,5,0.72) 80%, #050505 100%)" }}
      />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 80% at 0% 100%, rgba(202,12,133,0.20) 0%, transparent 60%)" }}
      />

      {/* Content */}
      {/* Center layout when no media (matches Preise page centered hero) */}
      <div style={{
        position: "relative", zIndex: 3, pointerEvents: "none",
        padding: isMobile ? "32px 20px 36px" : "48px 40px 44px",
        maxWidth: isMobile ? "100%" : (!hasVideo && !hasImage ? "100%" : "600px"),
        textAlign: !hasVideo && !hasImage && !isMobile ? "center" : "left",
        margin: !hasVideo && !hasImage && !isMobile ? "0 auto" : undefined,
      }}>
        {data.label && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px",
            color: "var(--brand)", fontFamily: "var(--font-condensed)",
            fontSize: isMobile ? "9px" : "10px", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
          }}>
            <span style={{ width: "20px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
            {data.label}
            <span style={{ width: "20px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
          </div>
        )}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(2.6rem, 12vw, 3.8rem)" : "clamp(2.2rem, 6vw, 4.5rem)",
          lineHeight: 0.92, letterSpacing: "0.02em",
          textTransform: "uppercase", margin: "0 0 14px", color: "white",
        }}>
          {(data.headlineLine1Normal || data.headlineLine1Outline) && (
            <span style={{ display: "block" }}>
              {data.headlineLine1Normal && <span>{data.headlineLine1Normal} </span>}
              {data.headlineLine1Outline && (
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                  {data.headlineLine1Outline}
                </span>
              )}
            </span>
          )}
          {(data.headlineLine2Normal || data.headlineLine2Outline) && (
            <span style={{ display: "block" }}>
              {data.headlineLine2Normal && <span>{data.headlineLine2Normal} </span>}
              {data.headlineLine2Outline && (
                <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
                  {data.headlineLine2Outline}
                </span>
              )}
            </span>
          )}
        </h1>
        {data.subtitle && (
          <p style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: isMobile ? "0.82rem" : "0.88rem",
            lineHeight: 1.65, maxWidth: isMobile ? "100%" : "420px",
            fontFamily: "var(--font-sans)", margin: "0 0 22px",
          }}>
            {data.subtitle}
          </p>
        )}
        {(data.btn1Label || data.btn2Label) && (
          /* ─────────────────────────────────────────────────────────────
             Mobile: vertically stacked · left-aligned · content-width
             Matches real mobile frontend (screenshot) 1:1
             Desktop: horizontal row
          ───────────────────────────────────────────────────────────── */
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "flex-start",
            gap: isMobile ? "12px" : "10px",
            flexWrap: "wrap",
          }}>
            {data.btn1Label && (
              <PreviewButton
                label={data.btn1Label}
                btnStyle={data.btn1Style ?? "ghost"}
                isMobile={isMobile}
              />
            )}
            {data.btn2Label && (
              <PreviewButton
                label={data.btn2Label}
                btnStyle={data.btn2Style ?? "ghost"}
                isMobile={isMobile}
              />
            )}
          </div>
        )}
      </div>

      {/* Media-type chip */}
      <div style={{
        position: "absolute", top: "14px", right: "14px", zIndex: 4,
        padding: "4px 10px", background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
        letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
        pointerEvents: "none",
      }}>
        {hasVideo ? "📹 VIDEO" : hasImage ? "🖼 IMAGE" : "NO MEDIA"}
      </div>
    </div>
  );
}

// ── Pillars ───────────────────────────────────────────────────────────────────
function PillarsPreview({ data, isMobile }: { data: PillarsBlockData; isMobile: boolean }) {
  const pillars = [
    { image: resolveImg(data.pillar1Image), tag: data.pillar1Tag, headline: data.pillar1Headline, desc: data.pillar1Desc, cta: data.pillar1Cta },
    { image: resolveImg(data.pillar2Image), tag: data.pillar2Tag, headline: data.pillar2Headline, desc: data.pillar2Desc, cta: data.pillar2Cta },
    { image: resolveImg(data.pillar3Image), tag: data.pillar3Tag, headline: data.pillar3Headline, desc: data.pillar3Desc, cta: data.pillar3Cta },
    { image: resolveImg(data.pillar4Image), tag: data.pillar4Tag, headline: data.pillar4Headline, desc: data.pillar4Desc, cta: data.pillar4Cta },
  ];

  const PillarCard = ({ p }: { p: typeof pillars[0] }) => (
    <div style={{
      position: "relative", height: isMobile ? "340px" : "380px", overflow: "hidden",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {p.image && (
        <img src={p.image} alt={p.headline}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: "brightness(0.7) saturate(0.9)", pointerEvents: "none" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(5,5,5,0.92) 20%, rgba(5,5,5,0.2) 60%, transparent 100%)" }}
      />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: "inset 0 0 0 1px rgba(202,12,133,0.2)" }}
      />
      <div style={{ position: "relative", zIndex: 1, padding: "16px" }}>
        <div style={{ width: "36px", height: "36px", display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(202,12,133,0.15)",
          border: "1px solid rgba(202,12,133,0.25)" }}>
          <Dumbbell size={14} style={{ color: "var(--brand)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1, padding: "16px" }}>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 6px" }}>
          {p.tag}
        </p>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem",
          letterSpacing: "0.03em", textTransform: "uppercase", color: "white",
          margin: "0 0 8px", fontWeight: 400, lineHeight: 1.1 }}>
          {p.headline}
        </h3>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
          color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: "0 0 12px",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.desc}
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--brand)" }}>
          {p.cta} <ArrowRight size={10} />
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "40px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SectionLabel>{data.label || "Trainingsangebot"}</SectionLabel>
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(2rem, 10vw, 2.6rem)" : "clamp(2rem, 5vw, 3.5rem)",
          letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: "0 0 12px",
        }}>
          {data.headlineNormal}{" "}
          <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
            {data.headlineOutline}
          </span>
        </h2>
        {data.subtitle && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: isMobile ? "0.82rem" : "0.9rem",
            fontFamily: "var(--font-sans)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.65 }}>
            {data.subtitle}
          </p>
        )}
      </div>

      {/* Cards */}
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {pillars.map((p, i) => <PillarCard key={i} p={p} />)}
        </div>
      ) : data.mobileLayout === "stack" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pillars.map((p, i) => <PillarCard key={i} p={p} />)}
        </div>
      ) : (
        /* swipe (default mobile) */
        <SwipeCarousel
          items={pillars}
          renderItem={(item) => <PillarCard p={item as typeof pillars[0]} />}
        />
      )}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsPreview({ data, isMobile }: { data: StatsBlockData; isMobile: boolean }) {
  const count = Math.min(Math.max(data.count || 2, 2), 6);
  const items = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const d = data as unknown as Record<string, string>;
    return {
      iconName: d[`item${n}Icon`] || "Star",
      value:    d[`item${n}Value`] || "",
      label:    d[`item${n}Label`] || "",
    };
  }).filter((item) => item.value);

  const StatItem = ({ item }: { item: typeof items[0] }) => {
    const Icon = STAT_ICONS[item.iconName] ?? Star;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
        <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(202,12,133,0.10)", border: "1px solid rgba(202,12,133,0.20)", marginBottom: "4px" }}>
          <Icon size={16} style={{ color: "var(--brand)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", color: "white", lineHeight: 1, letterSpacing: "0.02em" }}>
          {item.value}
        </span>
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
          {item.label}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      background: "#050505", padding: "64px 32px",
      backgroundImage: "radial-gradient(ellipse at top right, rgba(202,12,133,0.12), transparent 65%)",
    }}>
      {items.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", fontSize: "11px",
          letterSpacing: "0.12em", textAlign: "center" }}>Keine Werte konfiguriert</p>
      ) : !isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: "24px",
          maxWidth: items.length <= 3 ? "480px" : "720px", margin: "0 auto" }}>
          {items.map((item, i) => <StatItem key={i} item={item} />)}
        </div>
      ) : data.mobileLayout === "swipe" ? (
        <SwipeCarousel
          items={items}
          renderItem={(item) => (
            <div style={{ padding: "24px 0" }}>
              <StatItem item={item as typeof items[0]} />
            </div>
          )}
        />
      ) : (
        /* grid-2 (default mobile) */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 16px", maxWidth: "320px", margin: "0 auto" }}>
          {items.map((item, i) => <StatItem key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Reviews ───────────────────────────────────────────────────────────────────
function ReviewsPreview({ data, isMobile }: { data: ReviewsBlockData; isMobile: boolean }) {
  const mockReviews = [
    { name: "Max M.", rating: 5, text: "Absolut top Gym! Beste Ausstattung und super Team." },
    { name: "Sarah K.", rating: 5, text: "Die Community hier ist unglaublich. Seit 2 Jahren dabei." },
    { name: "Tom B.", rating: 5, text: "Nice Athletic Club ist das beste Gym in Göppingen." },
  ];

  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SectionLabel>{data.heading || "Google Bewertungen"}</SectionLabel>
        </div>
        {/* Stars row */}
        <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginBottom: "8px" }}>
          {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBC05", fontSize: "18px" }}>★</span>)}
        </div>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          4,9/5 · {data.limit ?? 9} Rezensionen · Live via Google API
        </p>
      </div>

      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", maxWidth: "860px", margin: "0 auto" }}>
          {mockReviews.map((r, i) => (
            <div key={i} style={{ padding: "20px", background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", gap: "3px", marginBottom: "10px" }}>
                {[...Array(r.rating)].map((_, j) => <span key={j} style={{ color: "#FBBC05", fontSize: "12px" }}>★</span>)}
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "rgba(255,255,255,0.65)",
                lineHeight: 1.6, margin: "0 0 12px" }}>"{r.text}"</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{r.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <SwipeCarousel
          items={mockReviews}
          renderItem={(item) => {
            const r = item as typeof mockReviews[0];
            return (
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", gap: "3px", marginBottom: "10px" }}>
                  {[...Array(r.rating)].map((_, j) => <span key={j} style={{ color: "#FBBC05", fontSize: "14px" }}>★</span>)}
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.7, margin: "0 0 14px" }}>"{r.text}"</p>
                <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{r.name}</p>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CtaPreview({ data, isMobile }: { data: CtaBlockData; isMobile: boolean }) {
  return (
    <div style={{ background: "#050505", padding: isMobile ? "32px 16px" : "48px 32px" }}>
      <div style={{
        position: "relative", textAlign: "center",
        padding: isMobile ? "36px 24px" : "56px 64px",
        background: "linear-gradient(135deg, rgba(202,12,133,0.10) 0%, rgba(202,12,133,0.03) 100%)",
        border: "1px solid rgba(202,12,133,0.20)",
        maxWidth: isMobile ? "100%" : "860px", margin: "0 auto", overflow: "hidden",
      }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
          backgroundImage: "linear-gradient(rgba(202,12,133,1) 1px, transparent 1px), linear-gradient(90deg, rgba(202,12,133,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px" }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "28px", height: "28px",
          borderTop: "2px solid var(--brand)", borderLeft: "2px solid var(--brand)" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "28px", height: "28px",
          borderBottom: "2px solid var(--brand)", borderRight: "2px solid var(--brand)" }} />
        {data.label && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <SectionLabel>{data.label}</SectionLabel>
          </div>
        )}
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(2.2rem, 10vw, 3rem)" : "clamp(2.2rem, 5vw, 3.8rem)",
          letterSpacing: "0.02em", textTransform: "uppercase", color: "white", margin: "0 0 20px", lineHeight: 1,
        }}>
          {data.headlineNormal}{" "}
          <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>
            {data.headlineOutline}
          </span>
        </h2>
        {data.subtitle && (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: isMobile ? "0.84rem" : "0.9rem",
            lineHeight: 1.7, fontFamily: "var(--font-sans)", maxWidth: "480px", margin: "0 auto 32px" }}>
            {data.subtitle}
          </p>
        )}
        <div style={{
          display: "flex",
          gap: isMobile ? "12px" : "16px",
          justifyContent: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
        }}>
          {data.btn1Label && (
            <PreviewButton label={data.btn1Label} btnStyle="primary" isMobile={isMobile} />
          )}
          {data.btn2Label && (
            <PreviewButton label={data.btn2Label} btnStyle="ghost" isMobile={isMobile} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rich Text ─────────────────────────────────────────────────────────────────
function RichTextPreview({ data, isMobile }: { data: RichTextBlockData; isMobile: boolean }) {
  return (
    <div style={{
      background: "#0a0a0a",
      padding: isMobile ? "40px 20px" : "64px 48px",
      textAlign: data.centered ? "center" : "left",
    }}>
      {data.heading && (
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.6rem, 8vw, 2.2rem)" : "clamp(1.8rem, 4vw, 3rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 20px",
        }}>
          {data.heading}
        </h2>
      )}
      <p style={{
        color: "rgba(255,255,255,0.55)", fontSize: isMobile ? "0.9rem" : "1rem",
        lineHeight: 1.75, fontFamily: "var(--font-sans)", whiteSpace: "pre-wrap",
        maxWidth: data.centered ? "640px" : "720px",
        margin: data.centered ? "0 auto" : "0",
      }}>
        {data.content || "Text erscheint hier…"}
      </p>
    </div>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingPreview({ data, isMobile }: { data: PricingBlockData; isMobile: boolean }) {
  // Use DEFAULT_BASE_PLANS (4 echte Tarife) für eine 1:1 Preview des Frontend
  const plans = DEFAULT_BASE_PLANS.slice(0, 4);

  const PlanCard = ({ plan }: { plan: typeof plans[0] }) => (
    <div style={{
      padding: "20px", position: "relative",
      background: plan.highlight ? "rgba(202,12,133,0.06)" : "rgba(255,255,255,0.025)",
      border: `1px solid ${plan.highlight ? "rgba(202,12,133,0.35)" : "rgba(255,255,255,0.08)"}`,
      boxShadow: plan.highlight ? "0 0 28px rgba(202,12,133,0.10)" : "none",
    }}>
      {plan.highlight && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, var(--brand), transparent)" }} />
      )}
      {plan.badge && (
        <div style={{
          position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)",
          padding: "3px 10px", background: "var(--brand)", whiteSpace: "nowrap",
          fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.15em", textTransform: "uppercase", color: "white",
        }}>
          {plan.badge.toUpperCase()}
        </div>
      )}
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", margin: "0 0 8px", textTransform: "uppercase", fontWeight: 700 }}>
        {plan.name.toUpperCase()}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "12px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "2.2rem" : "1.9rem", color: plan.highlight ? "var(--brand)" : "white", lineHeight: 1 }}>
          {plan.price}€
        </span>
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>{plan.period}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
        {plan.features.slice(0, isMobile ? 3 : 4).map((f) => (
          <li key={f} style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.45)", padding: "3px 0 3px 14px", position: "relative", lineHeight: 1.5 }}>
            <span style={{ position: "absolute", left: 0, color: "var(--brand)", fontSize: "10px" }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      {plan.blaulichtDiscount && (
        <div style={{ padding: "4px 8px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: "10px" }}>
          <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(96,165,250,0.8)", textTransform: "uppercase" }}>
            🚒 Blaulicht −{plan.blaulichtDiscount} €
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", background: plan.highlight ? "var(--brand)" : "transparent", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.12)", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: plan.highlight ? "white" : "rgba(255,255,255,0.5)" }}>
        {plan.cta || "Jetzt starten"} <ArrowRight size={10} />
      </div>
    </div>
  );

  return (
    <div style={{ background: "var(--surface-0)", padding: isMobile ? "32px 16px 24px" : "48px 32px 32px" }}>
      {/* Label + Heading */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)" }}>
          <span style={{ width: "20px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
          Unsere Tarife
          <span style={{ width: "20px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "clamp(1.6rem, 8vw, 2rem)" : "clamp(1.7rem, 3.5vw, 2.6rem)", color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 6px", lineHeight: 0.95 }}>
          BASIS{" "}
          <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>TARIFE</span>
        </h2>
        <p style={{ color: "rgba(255,165,0,0.65)", fontSize: "0.8rem", fontFamily: "var(--font-condensed)", letterSpacing: "0.06em", marginTop: "4px" }}>
          Dein Grundpreis – ohne versteckte Kosten
        </p>
        {data.subheading && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginTop: "4px" }}>{data.subheading}</p>
        )}
      </div>
      {/* Plan cards */}
      {isMobile ? (
        <SwipeCarousel items={plans} renderItem={(item) => <PlanCard plan={item as typeof plans[0]} />} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${plans.length}, 1fr)`, gap: "12px", maxWidth: "960px", margin: "0 auto" }}>
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      )}
      {/* Add-ons hint */}
      <div style={{ textAlign: "center", marginTop: "18px", padding: "10px 16px", background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
          + Add-ons: CrossFit / HYROX · Sauna · u.v.m. — Live aus Pricing-Datenbank
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TeamHeaderPreview – exakte 1:1 Kopie des Desktop-Headers und Mobile-Heros
//    Nutzt isMobile-Prop statt Tailwind-Breakpoints → korrekte Preview.
// ─────────────────────────────────────────────────────────────────────────────
function TeamHeaderPreview({ data, isMobile }: { data: TeamHeaderBlockData; isMobile: boolean }) {
  const quickStats = [
    { val: data.stat1Val ?? "10+",   lbl: data.stat1Label ?? "Trainer" },
    { val: data.stat2Val ?? "100%",  lbl: data.stat2Label ?? "Zertifiziert" },
    { val: data.stat3Val ?? "∞",     lbl: data.stat3Label ?? "Leidenschaft" },
  ];

  if (isMobile) {
    // ── Mobile Hero: radial-glow, Breadcrumb, Label, H1, Subtext, Quickstats, CTA
    return (
      <div style={{ position: "relative", background: "#050505", minHeight: "560px", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        {/* Radial top glow */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "60%", opacity: 0.15, pointerEvents: "none", background: "radial-gradient(ellipse 80% 70% at 50% 10%, #CA0C85, transparent 70%)" }} />
        {/* Bottom gradient */}
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%", pointerEvents: "none", background: "linear-gradient(to top, #050505, transparent)" }} />

        <div style={{ position: "relative", width: "100%", padding: "120px 20px 32px", zIndex: 5 }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}>
            <span>HOME</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>TEAM</span>
          </div>

          {/* Label */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brand)" }}>
            <span style={{ width: "24px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
            {data.label || "Die Köpfe dahinter"}
            <span style={{ width: "24px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
          </div>

          {/* H1 */}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.2rem, 15vw, 5rem)", lineHeight: 0.9, letterSpacing: "0.02em", color: "white", margin: "0 0 16px", textTransform: "uppercase" }}>
            {data.headlineNormal || "UNSER"}{" "}
            <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{data.headlineOutline || "TEAM"}</span>
          </h1>

          {/* Subtitle */}
          <p style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "24px", maxWidth: "300px", fontSize: "0.85rem" }}>
            {data.subtitleMobile || data.subtitle || "Zertifiziert, erfahren, besessen von Ergebnissen."}
          </p>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "24px" }}>
            {quickStats.map((s) => (
              <div key={s.lbl} style={{ textAlign: "center", padding: "12px 4px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1, letterSpacing: "0.02em", color: "white", display: "block" }}>{s.val}</span>
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{s.lbl}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.14em", color: "white", minHeight: "52px" }}>
            {data.ctaLabel || "PROBETRAINING VEREINBAREN"}
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop Header
  return (
    <div style={{ position: "relative", background: "var(--surface-0)", padding: "96px 48px 64px", overflow: "hidden" }}>
      {/* Bottom-left radial glow */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "400px", height: "300px", opacity: 0.1, pointerEvents: "none", background: "radial-gradient(ellipse at bottom left, #CA0C85, transparent 70%)" }} />
      <div style={{ position: "relative", maxWidth: "860px" }}>
        {/* Label */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: "var(--brand)", marginBottom: "16px" }}>
          <span style={{ width: "24px", height: "1px", background: "var(--brand)", display: "inline-block" }} />
          {data.label || "Die Köpfe dahinter"}
        </div>
        {/* H1 */}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 8vw, 5.5rem)", color: "white", margin: "0 0 16px", textTransform: "uppercase" }}>
          {data.headlineNormal || "UNSER"}{" "}
          <span style={{ WebkitTextStroke: "2px rgba(240,240,240,0.7)", color: "transparent" }}>{data.headlineOutline || "TEAM"}</span>
        </h1>
        {/* Subtitle */}
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "480px", lineHeight: 1.7, fontSize: "0.95rem" }}>
          {data.subtitle || "Zertifiziert, erfahren, besessen von Ergebnissen."}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TeamGridPreview – Desktop: 3-Spalten-Grid · Mobile: Leadership + Coaches
//    Carousel + CTA-Banner. Nutzt isMobile-Prop, keine Tailwind-Breakpoints.
// ─────────────────────────────────────────────────────────────────────────────
function TeamGridPreview({ data, isMobile }: { data: TeamGridBlockData; isMobile: boolean }) {
  // Mock trainer data (mirrors real API structure)
  const mockLeadership = [
    { id: "l1", name: "KRAUS",   role: "Geschäftsführer", type: "leadership", specs: ["Kreativkonzept", "Markenstrategie", "Design"] },
    { id: "l2", name: "WALIEK",  role: "Geschäftsführer", type: "leadership", specs: ["Unternehmensführung", "Strategie", "Operations"] },
  ];
  const mockCoaches = [
    { id: "c1", name: "HULZNER", role: "Coach", type: "coach", specs: ["Pyrex", "CrossFit", "Wettkampfvorbereitung"] },
    { id: "c2", name: "Coach",   role: "Coach", type: "coach", specs: ["Kondition", "Gewichtheben", "Mobility"] },
    { id: "c3", name: "Coach",   role: "Coach", type: "coach", specs: ["Pyrex", "Functional Training"] },
  ];
  const allMembers = [...mockLeadership, ...mockCoaches];

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    const MobileCard = ({ m, isLeadership }: { m: typeof mockLeadership[0]; isLeadership: boolean }) => (
      <div style={{ position: "relative", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "3/4", minHeight: "240px", overflow: "hidden", flexShrink: 0, width: "72%" }}>
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #050505 30%, transparent 75%)" }} />
        {/* Accent bottom line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(202,12,133,0.5), transparent)" }} />
        {/* Type badge top-left */}
        <div style={{ position: "absolute", top: "12px", left: "12px" }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "3px", background: isLeadership ? "rgba(167,139,250,0.12)" : "rgba(96,165,250,0.12)", border: `1px solid ${isLeadership ? "rgba(167,139,250,0.3)" : "rgba(96,165,250,0.3)"}`, fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isLeadership ? "#A78BFA" : "#60A5FA" }}>
            {isLeadership ? "GESCHÄFTSFÜHRUNG" : "COACH"}
          </span>
        </div>
        {/* Content bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "var(--brand)", margin: "0 0 4px" }}>
            {m.role.toUpperCase()}
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em", color: "white", margin: "0 0 8px", lineHeight: 1.1 }}>
            {m.name}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {m.specs.slice(0, 2).map((s) => (
              <span key={s} style={{ padding: "2px 8px", background: "rgba(255,255,255,0.06)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)" }}>{s}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)" }}>
            PROFIL ANSEHEN
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ background: "var(--surface-0)" }}>
        {/* ── Leadership Section ── */}
        <div style={{ paddingTop: "40px", paddingBottom: "32px" }}>
          <div style={{ padding: "0 20px", marginBottom: "20px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#A78BFA" }}>
              <span style={{ width: "16px", height: "1px", background: "#A78BFA", display: "inline-block" }} />
              {data.leadershipSectionLabel || "GESCHÄFTSFÜHRUNG"}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 6vw, 1.8rem)", letterSpacing: "0.02em", color: "white", margin: 0, textTransform: "uppercase" }}>
              {data.leadershipHeadlineNormal || "DIE"}{" "}
              <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>{data.leadershipHeadlineOutline || "GRÜNDER"}</span>
            </h2>
          </div>
          {/* Carousel */}
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "0 20px 8px", scrollbarWidth: "none" }}>
            {mockLeadership.map((m) => <MobileCard key={m.id} m={m} isLeadership={true} />)}
            <div style={{ flexShrink: 0, width: "16px" }} />
          </div>
          {/* Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <div style={{ width: "24px", height: "8px", borderRadius: "4px", background: "var(--brand)", boxShadow: "0 0 10px rgba(202,12,133,0.4)" }} />
            {mockLeadership.slice(1).map((_, i) => (
              <div key={i} style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ padding: "0 20px" }}><div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} /></div>

        {/* ── Coaches Section ── */}
        <div style={{ paddingTop: "32px", paddingBottom: "56px" }}>
          <div style={{ padding: "0 20px", marginBottom: "20px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#60A5FA" }}>
              <span style={{ width: "16px", height: "1px", background: "#60A5FA", display: "inline-block" }} />
              {data.coachesSectionLabel || "COACHING TEAM"}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 6vw, 1.8rem)", letterSpacing: "0.02em", color: "white", margin: "0 0 8px", textTransform: "uppercase" }}>
              {data.coachesHeadlineNormal || "DEINE"}{" "}
              <span style={{ WebkitTextStroke: "1.5px rgba(240,240,240,0.7)", color: "transparent" }}>{data.coachesHeadlineOutline || "TRAINER"}</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", lineHeight: 1.6, margin: 0 }}>
              {data.coachesSubtitle || "Swipe durch unser Team und tippe für das volle Profil."}
            </p>
          </div>
          {/* Carousel */}
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "0 20px 8px", scrollbarWidth: "none" }}>
            {mockCoaches.map((m) => <MobileCard key={m.id} m={m} isLeadership={false} />)}
            <div style={{ flexShrink: 0, width: "16px" }} />
          </div>
          {/* Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <div style={{ width: "24px", height: "8px", borderRadius: "4px", background: "var(--brand)", boxShadow: "0 0 10px rgba(202,12,133,0.4)" }} />
            {mockCoaches.slice(1).map((_, i) => (
              <div key={i} style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>

        {/* ── Mobile Bottom CTA ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ margin: "0 20px", padding: "32px 20px", textAlign: "center", background: "rgba(202,12,133,0.04)", border: "1px solid rgba(202,12,133,0.12)", borderLeft: "3px solid rgba(202,12,133,0.5)" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)", margin: "0 0 16px" }}>
              {data.mobileCTABadge || "WERDE TEIL DES TEAMS"}
            </p>
            {data.mobileCTAHeadline && (
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.02em", color: "white", margin: "0 0 16px", textTransform: "uppercase" }}>
                {data.mobileCTAHeadline}
              </h3>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", color: "white", minHeight: "48px" }}>
              {data.mobileCTABtnLabel || "JETZT BEWERBEN!"}
              <ArrowRight size={15} />
            </div>
          </div>
          <div style={{ height: "56px" }} />
        </div>
      </div>
    );
  }

  // ── Desktop Grid ───────────────────────────────────────────────────────────
  const cols = data.desktopCols ?? 3;
  const DesktopCard = ({ m }: { m: typeof allMembers[0] }) => {
    const isLeadership = m.type === "leadership";
    return (
      <div style={{ position: "relative", aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", cursor: "pointer" }}>
        {/* Gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #050505 35%, transparent 80%)" }} />
        {/* Type badge */}
        <div style={{ position: "absolute", top: "12px", left: "12px" }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "3px", background: isLeadership ? "rgba(167,139,250,0.12)" : "rgba(96,165,250,0.12)", border: `1px solid ${isLeadership ? "rgba(167,139,250,0.3)" : "rgba(96,165,250,0.3)"}`, fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isLeadership ? "#A78BFA" : "#60A5FA" }}>
            {isLeadership ? "Geschäftsführung" : "Coach"}
          </span>
        </div>
        {/* Content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px" }}>
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "var(--brand)", margin: "0 0 4px" }}>
            {m.role.toUpperCase()}
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", letterSpacing: "0.02em", color: "white", margin: "0 0 12px" }}>
            {m.name}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {m.specs.slice(0, 3).map((s) => (
              <span key={s} style={{ padding: "2px 8px", background: "rgba(255,255,255,0.06)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)" }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: "var(--surface-0)" }}>
      {/* Grid */}
      <div style={{ padding: "0 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "16px", maxWidth: "960px", margin: "0 auto" }}>
          {allMembers.map((m) => <DesktopCard key={m.id} m={m} />)}
        </div>
      </div>

      {/* Desktop CTA Banner */}
      <div style={{ padding: "0 32px 64px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", background: "rgba(202,12,133,0.05)", border: "1px solid rgba(202,12,133,0.15)", borderLeft: "3px solid rgba(202,12,133,0.6)" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", color: "var(--brand)", margin: "0 0 8px" }}>
              {data.mobileCTABadge || "WERDE TEIL DES TEAMS"}
            </p>
            {data.mobileCTAHeadline && (
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "0.02em", color: "white", margin: "0 0 8px", textTransform: "uppercase" }}>
                {data.mobileCTAHeadline}
              </h3>
            )}
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0, maxWidth: "480px" }}>
              Werde Teil des Nice Athletic Club Göppingen und bewirb dich jetzt als Trainer oder in einer anderen Position.
            </p>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", color: "white", padding: "16px 32px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {data.mobileCTABtnLabel || "JETZT BEWERBEN!"}
            <ArrowRight size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────
function TeamPreview({ data, isMobile }: { data: TeamBlockData; isMobile: boolean }) {
  const mock = [
    { name: "Mimi", role: "Head Coach" },
    { name: "Dome", role: "CrossFit Trainer" },
    { name: "Jana", role: "Personal Trainer" },
    { name: "Leo",  role: "HYROX Coach" },
  ];

  const MemberCard = ({ m }: { m: typeof mock[0] }) => (
    <div style={{ background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)", padding: "20px 16px", textAlign: "center" }}>
      <div style={{ width: "60px", height: "60px", borderRadius: "50%",
        background: "rgba(202,12,133,0.15)", border: "1px solid rgba(202,12,133,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontFamily: "var(--font-condensed)",
        fontSize: "22px", fontWeight: 700, color: "var(--brand)" }}>
        {m.name.charAt(0)}
      </div>
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
        letterSpacing: "0.06em", color: "white", margin: "0 0 4px" }}>{m.name}</p>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
        {m.role}
      </p>
    </div>
  );

  return (
    <div style={{ background: "#0a0a0a", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.6rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
          {data.heading || "Unser Team"}
        </h2>
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
          Live-Daten via API · Vorschau-Platzhalter
        </p>
      </div>
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px",
          maxWidth: "860px", margin: "0 auto" }}>
          {mock.map((m) => <MemberCard key={m.name} m={m} />)}
        </div>
      ) : data.mobileLayout === "stack" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mock.map((m) => <MemberCard key={m.name} m={m} />)}
        </div>
      ) : (
        <SwipeCarousel
          items={mock}
          renderItem={(item) => <MemberCard m={item as typeof mock[0]} />}
        />
      )}
    </div>
  );
}

// ── Features List ─────────────────────────────────────────────────────────────
function FeaturesListPreview({ data, isMobile }: { data: FeaturesListBlockData; isMobile: boolean }) {
  const features = data.features ?? [];
  const Icon = ({ name }: { name: string }) => {
    const Comp = STAT_ICONS[name] ?? Zap;
    return <Comp size={16} style={{ color: "var(--brand)" }} />;
  };

  const FeatureCard = ({ f }: { f: typeof features[0] }) => (
    <div style={{ padding: "20px 16px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(202,12,133,0.10)", border: "1px solid rgba(202,12,133,0.20)",
        marginBottom: "12px" }}>
        <Icon name={f.icon} />
      </div>
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
        letterSpacing: "0.08em", color: "white", textTransform: "uppercase", margin: "0 0 6px" }}>
        {f.title}
      </p>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
        color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
        {f.description}
      </p>
    </div>
  );

  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {(data.heading || data.subtitle) && (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {data.heading && <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>}
          {data.subtitle && <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem",
            color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{data.subtitle}</p>}
        </div>
      )}
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(features.length, 3)}, 1fr)`,
          gap: "14px", maxWidth: "860px", margin: "0 auto" }}>
          {features.map((f, i) => <FeatureCard key={i} f={f} />)}
        </div>
      ) : data.mobileLayout === "grid-2" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {features.map((f, i) => <FeatureCard key={i} f={f} />)}
        </div>
      ) : data.mobileLayout === "swipe" ? (
        <SwipeCarousel items={features} renderItem={(item) => <FeatureCard f={item as typeof features[0]} />} />
      ) : (
        /* stack (default mobile) */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {features.map((f, i) => <FeatureCard key={i} f={f} />)}
        </div>
      )}
    </div>
  );
}

// ── Values Grid ───────────────────────────────────────────────────────────────
function ValuesGridPreview({ data, isMobile }: { data: ValuesGridBlockData; isMobile: boolean }) {
  const values = data.values ?? [];
  const Icon = ({ name }: { name: string }) => {
    const Comp = STAT_ICONS[name] ?? Heart;
    return <Comp size={18} style={{ color: "var(--brand)" }} />;
  };

  const ValueCard = ({ v }: { v: typeof values[0] }) => (
    <div style={{ padding: "24px 20px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
      <div style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(202,12,133,0.10)", border: "1px solid rgba(202,12,133,0.25)",
        margin: "0 auto 14px" }}>
        <Icon name={v.icon} />
      </div>
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
        letterSpacing: "0.08em", color: "white", textTransform: "uppercase", margin: "0 0 8px" }}>
        {v.title}
      </p>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px",
        color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
        {v.description}
      </p>
    </div>
  );

  return (
    <div style={{ background: "#0a0a0a", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {(data.heading || data.subtitle) && (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {data.heading && <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>}
          {data.subtitle && <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem",
            color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{data.subtitle}</p>}
        </div>
      )}
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(values.length, 4)}, 1fr)`,
          gap: "14px", maxWidth: "900px", margin: "0 auto" }}>
          {values.map((v, i) => <ValueCard key={i} v={v} />)}
        </div>
      ) : data.mobileLayout === "stack" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {values.map((v, i) => <ValueCard key={i} v={v} />)}
        </div>
      ) : (
        <SwipeCarousel items={values} renderItem={(item) => <ValueCard v={item as typeof values[0]} />} />
      )}
    </div>
  );
}

// ── Trust Badges ──────────────────────────────────────────────────────────────
function TrustBadgesPreview({ data, isMobile }: { data: TrustBadgesBlockData; isMobile: boolean }) {
  const badges = data.badges ?? [];
  return (
    <div style={{ background: "#070707", padding: isMobile ? "28px 16px" : "36px 32px",
      borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {data.heading && (
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)",
          textAlign: "center", marginBottom: "20px" }}>{data.heading}</p>
      )}
      <div style={{ display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${Math.min(badges.length, 4)}, 1fr)`,
        gap: isMobile ? "12px" : "16px", maxWidth: "860px", margin: "0 auto" }}>
        {badges.map((b, i) => {
          const Icon = STAT_ICONS[b.icon] ?? Shield;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 14px", background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: "32px", height: "32px", flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.2)" }}>
                <Icon size={14} style={{ color: "var(--brand)" }} />
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
                color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>{b.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────
function ContactFormPreview({ data, isMobile }: { data: ContactFormBlockData; isMobile: boolean }) {
  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)",
    padding: "12px 14px", fontFamily: "var(--font-sans)", fontSize: "13px",
    boxSizing: "border-box",
  };
  return (
    <div style={{ background: "#0a0a0a", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {data.heading && (
          <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3vw, 2.4rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}
          </h2>
        )}
        {data.subtitle && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem",
            color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 28px" }}>{data.subtitle}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
            <input style={fieldStyle} placeholder="Name" disabled />
            <input style={fieldStyle} placeholder="E-Mail" disabled />
          </div>
          <textarea style={{ ...fieldStyle, resize: "none", minHeight: "100px" }} placeholder="Nachricht…" disabled />
          <button style={{ background: "var(--brand)", border: "none", color: "white",
            padding: "14px 28px", fontFamily: "var(--font-condensed)", fontSize: "12px",
            fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            width: isMobile ? "100%" : "auto", alignSelf: "flex-start", cursor: "default" }}>
            {data.buttonText || "Senden"} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Location Map ──────────────────────────────────────────────────────────────
function LocationMapPreview({ data, isMobile }: { data: LocationMapBlockData; isMobile: boolean }) {
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
          margin: "0 0 28px", textAlign: "center" }}>
          {data.heading}
        </h2>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "24px", maxWidth: "860px", margin: "0 auto",
      }}>
        {/* Map placeholder */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
          minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "8px" }}>
          <MapPin size={24} style={{ color: "var(--brand)", opacity: 0.5 }} />
          <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.18em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
            Google Maps Embed
          </p>
        </div>
        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", justifyContent: "center" }}>
          {[
            { icon: MapPin, text: data.address },
            { icon: Phone, text: data.phone },
            { icon: Mail, text: data.email },
          ].filter(i => i.text).map(({ icon: Icon, text }, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon size={14} style={{ color: "var(--brand)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Opening Hours ─────────────────────────────────────────────────────────────
function OpeningHoursPreview({ data, isMobile }: { data: OpeningHoursBlockData; isMobile: boolean }) {
  const rows = data.rows ?? [];
  return (
    <div style={{ background: "#070707", padding: isMobile ? "36px 16px" : "48px 32px" }}>
      {data.heading && (
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.4rem, 8vw, 1.8rem)" : "clamp(1.4rem, 3vw, 2rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
          margin: "0 0 20px", textAlign: "center" }}>
          {data.heading}
        </h2>
      )}
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: row.highlight ? "var(--brand)" : "rgba(255,255,255,0.6)" }}>
              {row.days}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px",
              color: row.highlight ? "white" : "rgba(255,255,255,0.5)" }}>
              {row.hours}
            </span>
          </div>
        ))}
        {data.note && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
            color: "rgba(255,255,255,0.25)", marginTop: "14px", lineHeight: 1.55 }}>
            {data.note}
          </p>
        )}
      </div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqPreview({ data, isMobile }: { data: FaqBlockData; isMobile: boolean }) {
  const questions = data.questions ?? [];
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.4rem, 8vw, 1.8rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
          margin: "0 0 28px", textAlign: "center" }}>
          {data.heading}
        </h2>
      )}
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {questions.map((q, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px",
                color: "rgba(255,255,255,0.8)", lineHeight: 1.55 }}>{q.question}</p>
              <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0, fontSize: "16px" }}>+</span>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)",
            fontSize: "11px", letterSpacing: "0.12em", textAlign: "center" }}>
            Keine Fragen konfiguriert
          </p>
        )}
      </div>
    </div>
  );
}

// ── Pros/Cons ─────────────────────────────────────────────────────────────────
function ProsConsPreview({ data, isMobile }: { data: ProsConsBlockData; isMobile: boolean }) {
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.4rem, 8vw, 1.8rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
          margin: "0 0 28px", textAlign: "center" }}>
          {data.heading}
        </h2>
      )}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {(data.pros ?? []).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px",
            padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "var(--brand)", flexShrink: 0, marginTop: "2px" }}>✓</span>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
              {p.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Jobs Board ────────────────────────────────────────────────────────────────
function JobsBoardPreview({ data, isMobile }: { data: JobsBoardBlockData; isMobile: boolean }) {
  const mockJobs = [
    { title: "CrossFit Trainer (m/w/d)", type: "Teilzeit", dept: "Coaching" },
    { title: "Rezeptionist/in", type: "Vollzeit", dept: "Service" },
    { title: "Personal Trainer", type: "Freiberuflich", dept: "Coaching" },
  ];
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.4rem, 8vw, 1.8rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>
          {data.subtitle && <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem",
            color: "rgba(255,255,255,0.4)" }}>{data.subtitle}</p>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "720px", margin: "0 auto" }}>
        {mockJobs.map((job, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "12px", padding: "14px 16px", background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)", flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
                letterSpacing: "0.06em", color: "white", margin: "0 0 4px" }}>{job.title}</p>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
                color: "rgba(255,255,255,0.35)" }}>{job.dept} · {job.type}</p>
            </div>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)",
              flexShrink: 0 }}>Bewerben →</span>
          </div>
        ))}
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
          textAlign: "center", marginTop: "8px" }}>
          Live-Daten via API · Vorschau-Platzhalter
        </p>
      </div>
    </div>
  );
}

// ── Trial Form ────────────────────────────────────────────────────────────────
function TrialFormPreview({ data, isMobile }: { data: TrialFormBlockData; isMobile: boolean }) {
  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)",
    padding: "14px 16px", fontFamily: "var(--font-sans)", fontSize: "14px",
    boxSizing: "border-box",
  };
  return (
    <div style={{ background: "#0a0a0a", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      <div style={{ maxWidth: "580px", margin: "0 auto" }}>
        {data.heading && (
          <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>
        )}
        {data.subtitle && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem",
            color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 24px" }}>{data.subtitle}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
            <input style={fieldStyle} placeholder="Dein Name" disabled />
            <input style={fieldStyle} placeholder="E-Mail-Adresse" disabled />
          </div>
          <input style={fieldStyle} placeholder="Telefonnummer (optional)" disabled />
          <select style={{ ...fieldStyle, appearance: "none" }} disabled>
            <option>Wähle dein Ziel …</option>
          </select>
          <input style={{ ...fieldStyle, cursor: "default" }} type="date" disabled />
          <button style={{ background: "var(--brand)", border: "none", color: "white",
            padding: "14px", fontFamily: "var(--font-condensed)", fontSize: "12px",
            fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            width: "100%", cursor: "default" }}>
            {data.buttonText || "Anfrage absenden"} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timetable ─────────────────────────────────────────────────────────────────
function TimetablePreview({ data, isMobile }: { data: TimetableBlockData; isMobile: boolean }) {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const mockSlots = [
    { time: "07:00", name: "CrossFit Basics", cat: "CrossFit", coach: "Mimi" },
    { time: "09:00", name: "HYROX Training", cat: "Hyrox", coach: "Dome" },
    { time: "17:30", name: "Strength WOD", cat: "Strength", coach: "Jana" },
  ];
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>
          {data.subtitle && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>{data.subtitle}</p>}
        </div>
      )}
      {/* Day tabs */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto",
        paddingBottom: "4px", marginBottom: "20px", justifyContent: isMobile ? "flex-start" : "center" }}>
        {days.map((d, i) => (
          <button key={d} style={{
            padding: "7px 14px", flexShrink: 0,
            background: i === 0 ? "var(--brand)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${i === 0 ? "transparent" : "rgba(255,255,255,0.08)"}`,
            color: i === 0 ? "white" : "rgba(255,255,255,0.5)",
            fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", cursor: "default",
          }}>{d}</button>
        ))}
      </div>
      {/* Slots */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px", margin: "0 auto" }}>
        {mockSlots.map((slot, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px",
            padding: "14px 16px", background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)", minWidth: "44px" }}>{slot.time}</span>
            <span style={{ flex: 1, fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700,
              color: "white", letterSpacing: "0.06em" }}>{slot.name}</span>
            <span style={{ padding: "3px 8px", background: "rgba(202,12,133,0.12)",
              border: "1px solid rgba(202,12,133,0.25)", fontFamily: "var(--font-condensed)",
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em",
              color: "var(--brand)", textTransform: "uppercase" }}>{slot.cat}</span>
            {!isMobile && <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px",
              color: "rgba(255,255,255,0.3)" }}>{slot.coach}</span>}
          </div>
        ))}
        <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: "8px" }}>
          Vorschau · Live-Daten via PHP-API
        </p>
      </div>
    </div>
  );
}

// ── Zone Grid ─────────────────────────────────────────────────────────────────
function ZoneGridPreview({ data, isMobile }: { data: ZoneGridBlockData; isMobile: boolean }) {
  const zones = [
    { label: "Athletic Area", tag: "Strength · Power · Olympic Lifting", image: pillarStrengthImg },
    { label: "CrossFit Zone", tag: "Functional · Rig · Boxes", image: pillarCrossfitImg },
    { label: "Hyrox Zone", tag: "HYROX · Endurance · Competition", image: pillarHyroxImg },
    { label: "Nice Theke", tag: "Shakes · Snacks · Community", image: pillarThekeImg },
  ];
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "56px 32px" }}>
      {data.heading && (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.5rem, 8vw, 2rem)" : "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase", margin: "0 0 8px" }}>
            {data.heading}</h2>
          {data.subtitle && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>{data.subtitle}</p>}
        </div>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: "12px", maxWidth: "900px", margin: "0 auto",
      }}>
        {zones.map((z, i) => (
          <div key={i} style={{ position: "relative", height: isMobile ? "160px" : "240px",
            overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src={z.image} alt={z.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", filter: "brightness(0.6) saturate(0.85)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(5,5,5,0.85) 0%, transparent 60%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "12px", left: "12px", right: "12px", zIndex: 1 }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "0.9rem" : "1rem",
                color: "white", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 3px" }}>{z.label}</p>
              <p style={{ fontFamily: "var(--font-condensed)", fontSize: "8px", fontWeight: 700,
                color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{z.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGalleryPreview({ data, isMobile }: { data: ImageGalleryBlockData; isMobile: boolean }) {
  const urls = (data.imageUrls || "").split(",").map(u => u.trim()).filter(Boolean);
  const mockUrls = urls.length > 0 ? urls : Array(6).fill("");

  const ImgCell = ({ src, idx }: { src: string; idx: number }) => (
    <div style={{
      aspectRatio: "4/3", background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>
          Bild {idx + 1}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ background: "#070707", padding: isMobile ? "36px 16px" : "48px 32px" }}>
      {data.heading && (
        <h2 style={{ fontFamily: "var(--font-display)",
          fontSize: isMobile ? "clamp(1.4rem, 8vw, 1.8rem)" : "clamp(1.4rem, 3vw, 2rem)",
          color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
          margin: "0 0 24px", textAlign: "center" }}>
          {data.heading}
        </h2>
      )}
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.columns || 3}, 1fr)`,
          gap: "8px", maxWidth: "860px", margin: "0 auto" }}>
          {mockUrls.map((src, i) => <ImgCell key={i} src={src} idx={i} />)}
        </div>
      ) : data.mobileLayout === "grid-2" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {mockUrls.map((src, i) => <ImgCell key={i} src={src} idx={i} />)}
        </div>
      ) : data.mobileLayout === "stack" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {mockUrls.slice(0, 4).map((src, i) => <ImgCell key={i} src={src} idx={i} />)}
        </div>
      ) : (
        <SwipeCarousel
          items={mockUrls}
          renderItem={(item, idx) => <ImgCell src={item as string} idx={idx} />}
        />
      )}
    </div>
  );
}

// ── Legal Content ─────────────────────────────────────────────────────────────
function LegalContentPreview({ data, isMobile }: { data: LegalContentBlockData; isMobile: boolean }) {
  return (
    <div style={{ background: "#050505", padding: isMobile ? "40px 16px" : "64px 48px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {data.heading && (
          <h1 style={{ fontFamily: "var(--font-display)",
            fontSize: isMobile ? "clamp(1.8rem, 9vw, 2.4rem)" : "clamp(2rem, 4vw, 3rem)",
            color: "white", letterSpacing: "0.02em", textTransform: "uppercase",
            margin: "0 0 32px" }}>
            {data.heading}
          </h1>
        )}
        <div style={{
          padding: "24px 28px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          fontFamily: "var(--font-sans)", fontSize: "13px",
          color: "rgba(255,255,255,0.55)", lineHeight: 1.8, whiteSpace: "pre-wrap",
        }}>
          {data.content || "Kein Inhalt."}
        </div>
      </div>
    </div>
  );
}

// ── Generic placeholder for blocks without a custom preview ───────────────────
function GenericPlaceholderPreview({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ background: "#070707", padding: "40px 32px",
      borderTop: `2px solid ${color}`, borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700,
        letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
        {label} – Vorschau im Browser
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Root dispatcher ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function BlockPreview({
  block,
  previewMode = "desktop",
}: {
  block: PageBlock;
  previewMode?: "desktop" | "mobile";
}) {
  const isMobile = previewMode === "mobile";

  switch (block.type) {
    case "hero":
      return <HeroPreview data={block.data as HeroBlockData} isMobile={isMobile} />;
    case "pillars":
      return <PillarsPreview data={block.data as PillarsBlockData} isMobile={isMobile} />;
    case "stats":
      return <StatsPreview data={block.data as StatsBlockData} isMobile={isMobile} />;
    case "reviews":
      return <ReviewsPreview data={block.data as ReviewsBlockData} isMobile={isMobile} />;
    case "cta":
      return <CtaPreview data={block.data as CtaBlockData} isMobile={isMobile} />;
    case "rich-text":
      return <RichTextPreview data={block.data as RichTextBlockData} isMobile={isMobile} />;
    case "pricing":
      return <PricingPreview data={block.data as PricingBlockData} isMobile={isMobile} />;
    case "team":
      return <TeamPreview data={block.data as TeamBlockData} isMobile={isMobile} />;
    case "contact-form":
      return <ContactFormPreview data={block.data as ContactFormBlockData} isMobile={isMobile} />;
    case "features-list":
      return <FeaturesListPreview data={block.data as FeaturesListBlockData} isMobile={isMobile} />;
    case "values-grid":
      return <ValuesGridPreview data={block.data as ValuesGridBlockData} isMobile={isMobile} />;
    case "trust-badges":
      return <TrustBadgesPreview data={block.data as TrustBadgesBlockData} isMobile={isMobile} />;
    case "location-map":
      return <LocationMapPreview data={block.data as LocationMapBlockData} isMobile={isMobile} />;
    case "opening-hours":
      return <OpeningHoursPreview data={block.data as OpeningHoursBlockData} isMobile={isMobile} />;
    case "faq":
      return <FaqPreview data={block.data as FaqBlockData} isMobile={isMobile} />;
    case "pros-cons":
      return <ProsConsPreview data={block.data as ProsConsBlockData} isMobile={isMobile} />;
    case "jobs-board":
      return <JobsBoardPreview data={block.data as JobsBoardBlockData} isMobile={isMobile} />;
    case "trial-form":
      return <TrialFormPreview data={block.data as TrialFormBlockData} isMobile={isMobile} />;
    case "timetable":
      return <TimetablePreview data={block.data as TimetableBlockData} isMobile={isMobile} />;
    case "zone-grid":
      return <ZoneGridPreview data={block.data as ZoneGridBlockData} isMobile={isMobile} />;
    case "image-gallery":
      return <ImageGalleryPreview data={block.data as ImageGalleryBlockData} isMobile={isMobile} />;
    case "legal-content":
      return <LegalContentPreview data={block.data as LegalContentBlockData} isMobile={isMobile} />;
    case "pricing-cards":
    case "pricing-addons":
    case "pricing-compare":
      return <GenericPlaceholderPreview label={block.type} color="#CA0C85" />;

    // ── Team-spezifische Blöcke ─────────────────────────────────────────────
    case "team-header":
      return <TeamHeaderPreview data={block.data as unknown as TeamHeaderBlockData} isMobile={isMobile} />;
    case "team-grid":
      return <TeamGridPreview data={block.data as unknown as TeamGridBlockData} isMobile={isMobile} />;

    // ── Studio-spezifische Blöcke (1:1 echte Section-Komponenten) ──────────
    case "studio-hero":
      return (
        <StudioHeroSection
          data={block.data as unknown as StudioHeroBlockData}
          reduced={false}
        />
      );
    case "studio-zones":
      return (
        <StudioZonesSection
          data={block.data as unknown as StudioZonesBlockData}
        />
      );
    case "studio-info":
      return (
        <StudioInfoSection
          data={block.data as unknown as StudioInfoBlockData}
        />
      );

    default:
      return <GenericPlaceholderPreview label={block.type} color="#555" />;
  }
}
