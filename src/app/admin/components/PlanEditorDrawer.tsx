/**
 * PlanEditorDrawer.tsx – Fullscreen Tarif-Editor (Admin)
 * ─────────────────────────────────────────────────────────────────────────────
 * 4 Tabs: Stammdaten, Inhalt, Seitenausspielung, Vorschau
 * Zwei-Spalten-Layout, große Textareas, sticky Footer, Vorschau im Dialog
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Save,
  Eye,
  FileText,
  Layers,
  Globe,
  Star,
  AlertTriangle,
  Zap,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PricingPageSlug,
  PageOverride,
  AdminPlan,
} from "../../../lib/pricing-types";
import {
  ALL_PAGE_SLUGS,
  PAGE_SLUG_LABELS,
} from "../../../lib/pricing-types";

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = "stammdaten" | "inhalt" | "seiten" | "vorschau";

interface Props {
  open: boolean;
  onClose: () => void;
  plan: AdminPlan | null;
  onSave: (plan: AdminPlan) => void;
  saving?: boolean;
  /** All plans – used to warn about multiple featured per page */
  allPlans?: AdminPlan[];
}

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "stammdaten", label: "Stammdaten", icon: FileText },
  { id: "inhalt", label: "Inhalt", icon: Layers },
  { id: "seiten", label: "Seitenausspielung", icon: Globe },
  { id: "vorschau", label: "Vorschau", icon: Eye },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-condensed)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {children}
        {required && (
          <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>
        )}
      </label>
      {hint && (
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "6px",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "120px",
};

function Input({
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={textareaStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
    />
  );
}

// ── Default Override ─────────────────────────────────────────────────────────
function defaultOverride(slug: PricingPageSlug): PageOverride {
  return {
    page_slug: slug,
    is_visible: false,
    is_featured: false,
    show_cta: true,
    badge_text: "",
    description_override: "",
    features_override: "",
    sort_order: 0,
  };
}

// ── Main Component ──────────────────────────────────────────────────────────
export function PlanEditorDrawer({
  open,
  onClose,
  plan,
  onSave,
  saving = false,
  allPlans = [],
}: Props) {
  const isEdit = !!plan?.id;
  const [tab, setTab] = useState<Tab>("stammdaten");

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [period, setPeriod] = useState("pro Monat");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [ctaText, setCtaText] = useState("Jetzt starten");
  const [ctaUrl, setCtaUrl] = useState("/probetraining");
  const [restrictions, setRestrictions] = useState("");
  const [blaulicht, setBlaulicht] = useState("");
  const [studentPrice, setStudentPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [overrides, setOverrides] = useState<PageOverride[]>(
    ALL_PAGE_SLUGS.map(defaultOverride)
  );

  // Preview page selection – default to first visible page
  const [previewPage, setPreviewPage] = useState<PricingPageSlug>("preise");

  // Populate from plan
  useEffect(() => {
    if (!open) return;
    setTab("stammdaten");
    if (plan) {
      setName(plan.name);
      setSlug(plan.slug);
      setPrice(String(plan.price));
      setPeriod(plan.period);
      setDescription(plan.description);
      setFeatures(plan.features.join("\n"));
      setCtaText(plan.cta_text);
      setCtaUrl(plan.cta_url);
      setRestrictions(plan.restrictions);
      setBlaulicht(plan.blaulicht_discount ? String(plan.blaulicht_discount) : "");
      setStudentPrice(plan.student_price ? String(plan.student_price) : "");
      setSortOrder(String(plan.sort_order));
      // Merge existing overrides with defaults
      const merged = ALL_PAGE_SLUGS.map((s) => {
        const existing = plan.page_overrides.find((o) => o.page_slug === s);
        return existing ?? defaultOverride(s);
      });
      setOverrides(merged);
    } else {
      setName("");
      setSlug("");
      setPrice("");
      setPeriod("pro Monat");
      setDescription("");
      setFeatures("");
      setCtaText("Jetzt starten");
      setCtaUrl("/probetraining");
      setRestrictions("");
      setBlaulicht("");
      setStudentPrice("");
      setSortOrder("0");
      setOverrides(ALL_PAGE_SLUGS.map(defaultOverride));
    }
  }, [open, plan]);

  // Auto-generate slug
  useEffect(() => {
    if (!isEdit && name) {
      setSlug(
        name
          .toLowerCase()
          .replace(/ä/g, "ae")
          .replace(/ö/g, "oe")
          .replace(/ü/g, "ue")
          .replace(/ß/g, "ss")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      );
    }
  }, [name, isEdit]);

  // Warn: multiple featured on same page
  const featuredWarnings = useMemo(() => {
    const warnings: string[] = [];
    overrides.forEach((ov) => {
      if (!ov.is_featured) return;
      const others = allPlans.filter(
        (p) =>
          p.slug !== slug &&
          p.page_overrides.some(
            (o) =>
              o.page_slug === ov.page_slug &&
              o.is_featured &&
              o.is_visible
          )
      );
      if (others.length > 0) {
        warnings.push(
          `${PAGE_SLUG_LABELS[ov.page_slug]}: ${others.map((p) => p.name).join(", ")} ist bereits Klassiker`
        );
      }
    });
    return warnings;
  }, [overrides, allPlans, slug]);

  const updateOverride = (
    pageSlug: PricingPageSlug,
    patch: Partial<PageOverride>
  ) => {
    setOverrides((prev) =>
      prev.map((o) =>
        o.page_slug === pageSlug ? { ...o, ...patch } : o
      )
    );
  };

  const setAsOnlyFeatured = (pageSlug: PricingPageSlug) => {
    setOverrides((prev) =>
      prev.map((o) =>
        o.page_slug === pageSlug
          ? { ...o, is_featured: true, is_visible: true }
          : o
      )
    );
    toast.info(`Klassiker auf ${PAGE_SLUG_LABELS[pageSlug]} gesetzt`);
  };

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      toast.error("Name und Preis sind Pflichtfelder.");
      return;
    }
    onSave({
      id: plan?.id ?? null,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      name: name.trim(),
      price: Number(price) || 0,
      period,
      description: description.trim(),
      features: features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      cta_text: ctaText.trim() || "Jetzt starten",
      cta_url: ctaUrl.trim() || "/probetraining",
      restrictions: restrictions.trim(),
      blaulicht_discount: blaulicht ? Number(blaulicht) : null,
      student_price: studentPrice ? Number(studentPrice) : null,
      sort_order: Number(sortOrder) || 0,
      page_overrides: overrides,
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative ml-auto w-full max-w-[960px] h-full flex flex-col"
            style={{
              background: "#0a0a0a",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-8 py-5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div>
                <h2
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "24px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {isEdit ? "Tarif bearbeiten" : "Neuer Tarif"}
                </h2>
                {isEdit && (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "2px" }}>
                    {plan?.name} · {plan?.slug}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: "44px",
                  height: "44px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  color: "rgba(255,255,255,0.4)",
                }}
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-1 px-8 pt-4 pb-1 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors"
                  style={{
                    fontFamily: "var(--font-condensed)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: tab === id ? "rgba(202,12,133,0.1)" : "transparent",
                    color: tab === id ? "white" : "rgba(255,255,255,0.35)",
                    border: "none",
                    borderBottom: tab === id ? "2px solid var(--brand)" : "2px solid transparent",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {/* ── Tab: Stammdaten ── */}
              {tab === "stammdaten" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 max-w-[850px]">
                  <div className="lg:col-span-2">
                    <FieldLabel required>Tarif-Name</FieldLabel>
                    <Input value={name} onChange={setName} placeholder="z.B. Athletic Weekend" />
                  </div>
                  <div>
                    <FieldLabel hint="Wird automatisch generiert">Slug</FieldLabel>
                    <Input value={slug} onChange={setSlug} placeholder="athletic-weekend" />
                  </div>
                  <div>
                    <FieldLabel>Sortierung</FieldLabel>
                    <Input type="number" value={sortOrder} onChange={setSortOrder} placeholder="0" />
                  </div>
                  <div>
                    <FieldLabel required>Preis (€)</FieldLabel>
                    <Input type="number" value={price} onChange={setPrice} placeholder="69" />
                  </div>
                  <div>
                    <FieldLabel>Periode</FieldLabel>
                    <Input value={period} onChange={setPeriod} placeholder="pro Monat" />
                  </div>
                  <div>
                    <FieldLabel>Blaulicht-Rabatt (€)</FieldLabel>
                    <Input type="number" value={blaulicht} onChange={setBlaulicht} placeholder="10" />
                  </div>
                  <div>
                    <FieldLabel>Schüler/Student-Preis (€)</FieldLabel>
                    <Input type="number" value={studentPrice} onChange={setStudentPrice} placeholder="49" />
                  </div>
                  <div>
                    <FieldLabel>CTA-Text</FieldLabel>
                    <Input value={ctaText} onChange={setCtaText} placeholder="Jetzt starten" />
                  </div>
                  <div>
                    <FieldLabel>CTA-URL</FieldLabel>
                    <Input value={ctaUrl} onChange={setCtaUrl} placeholder="/probetraining" />
                  </div>
                  <div className="lg:col-span-2">
                    <FieldLabel>Einschränkung</FieldLabel>
                    <Input value={restrictions} onChange={setRestrictions} placeholder="Nur Fr–So, 5:00–00:00" />
                  </div>
                </div>
              )}

              {/* ── Tab: Inhalt ── */}
              {tab === "inhalt" && (
                <div className="max-w-[850px] space-y-6">
                  <div>
                    <FieldLabel>Beschreibung (Standard)</FieldLabel>
                    <Textarea
                      value={description}
                      onChange={setDescription}
                      placeholder="Kurzbeschreibung des Tarifs..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <FieldLabel hint="Eine Feature pro Zeile">
                      Features (Standard)
                    </FieldLabel>
                    <Textarea
                      value={features}
                      onChange={setFeatures}
                      placeholder={"Freies Training\nAlle Geräte\nNAC App-Zugang"}
                      rows={8}
                    />
                  </div>
                  <div
                    className="px-4 py-3 flex items-start gap-3"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "6px",
                    }}
                  >
                    <Layers size={14} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                      Diese Werte sind die Standardtexte. Im Tab „Seitenausspielung" kannst du pro Seite
                      eigene Beschreibungen und Features setzen, die die Standards überschreiben.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Tab: Seitenausspielung ── */}
              {tab === "seiten" && (
                <div className="max-w-[850px] space-y-5">
                  {/* Warnings */}
                  {featuredWarnings.length > 0 && (
                    <div
                      className="px-4 py-3 flex items-start gap-3"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        borderRadius: "6px",
                      }}
                    >
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                      <div>
                        <p style={{ fontSize: "12px", color: "#F59E0B", fontWeight: 700, marginBottom: "4px" }}>
                          Mehrfache Klassiker-Warnung
                        </p>
                        {featuredWarnings.map((w) => (
                          <p key={w} style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                            {w}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Page Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {overrides.map((ov) => (
                      <div
                        key={ov.page_slug}
                        className="flex flex-col"
                        style={{
                          background: ov.is_visible
                            ? "rgba(202,12,133,0.04)"
                            : "rgba(255,255,255,0.02)",
                          border: ov.is_visible
                            ? "1px solid rgba(202,12,133,0.2)"
                            : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        {/* Card Header */}
                        <div
                          className="px-5 py-4 flex items-center justify-between"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div className="flex items-center gap-3">
                            <Globe size={14} style={{ color: ov.is_visible ? "var(--brand)" : "rgba(255,255,255,0.2)" }} />
                            <span
                              style={{
                                fontFamily: "var(--font-condensed)",
                                fontSize: "13px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                color: ov.is_visible ? "white" : "rgba(255,255,255,0.4)",
                              }}
                            >
                              {PAGE_SLUG_LABELS[ov.page_slug]}
                            </span>
                          </div>
                          {/* Toggle visible */}
                          <button
                            onClick={() => updateOverride(ov.page_slug, { is_visible: !ov.is_visible })}
                            className="px-3 py-1.5 cursor-pointer transition-colors"
                            style={{
                              background: ov.is_visible ? "var(--brand)" : "rgba(255,255,255,0.04)",
                              border: ov.is_visible ? "none" : "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "4px",
                              color: ov.is_visible ? "white" : "rgba(255,255,255,0.4)",
                              fontFamily: "var(--font-condensed)",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                            }}
                          >
                            {ov.is_visible ? "SICHTBAR" : "AUSGEBLENDET"}
                          </button>
                        </div>

                        {/* Card Body (only when visible) */}
                        {ov.is_visible && (
                          <div className="px-5 py-4 space-y-4">
                            {/* Featured + CTA toggles */}
                            <div className="flex gap-3 flex-wrap">
                              <button
                                onClick={() => updateOverride(ov.page_slug, { is_featured: !ov.is_featured })}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                                style={{
                                  background: ov.is_featured ? "rgba(202,12,133,0.1)" : "rgba(255,255,255,0.02)",
                                  border: ov.is_featured ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "6px",
                                  color: ov.is_featured ? "var(--brand)" : "rgba(255,255,255,0.4)",
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                }}
                              >
                                <Star size={12} fill={ov.is_featured ? "currentColor" : "none"} />
                                KLASSIKER
                              </button>
                              <button
                                onClick={() => updateOverride(ov.page_slug, { show_cta: !ov.show_cta })}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                                style={{
                                  background: ov.show_cta ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.02)",
                                  border: ov.show_cta ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "6px",
                                  color: ov.show_cta ? "#34D399" : "rgba(255,255,255,0.4)",
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                }}
                              >
                                <ArrowRight size={12} />
                                CTA-BUTTON
                              </button>
                              {ov.is_featured && (
                                <button
                                  onClick={() => setAsOnlyFeatured(ov.page_slug)}
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                                  style={{
                                    background: "rgba(59,130,246,0.08)",
                                    border: "1px solid rgba(59,130,246,0.2)",
                                    borderRadius: "6px",
                                    color: "#3B82F6",
                                    fontFamily: "var(--font-condensed)",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                  }}
                                >
                                  <Zap size={12} />
                                  ALS EINZIGEN SETZEN
                                </button>
                              )}
                            </div>

                            {/* Badge + Sort */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <FieldLabel>Badge-Text</FieldLabel>
                                <Input
                                  value={ov.badge_text}
                                  onChange={(v) => updateOverride(ov.page_slug, { badge_text: v })}
                                  placeholder="z.B. Der Klassiker"
                                />
                              </div>
                              <div>
                                <FieldLabel>Sortierung</FieldLabel>
                                <Input
                                  type="number"
                                  value={String(ov.sort_order)}
                                  onChange={(v) => updateOverride(ov.page_slug, { sort_order: Number(v) || 0 })}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* Override Description */}
                            <div>
                              <FieldLabel hint="Leer = Standard-Beschreibung">
                                Beschreibung (Override)
                              </FieldLabel>
                              <textarea
                                value={ov.description_override}
                                onChange={(e) => updateOverride(ov.page_slug, { description_override: e.target.value })}
                                placeholder="Eigene Beschreibung für diese Seite..."
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                              />
                            </div>

                            {/* Override Features */}
                            <div>
                              <FieldLabel hint="Leer = Standard-Features. Eine pro Zeile.">
                                Features (Override)
                              </FieldLabel>
                              <textarea
                                value={ov.features_override}
                                onChange={(e) => updateOverride(ov.page_slug, { features_override: e.target.value })}
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Vorschau ── */}
              {tab === "vorschau" && (() => {
                const currentOv = overrides.find((o) => o.page_slug === previewPage) ?? overrides[0];
                const previewDescription = currentOv?.description_override || description;
                const previewFeatures = currentOv?.features_override || features;
                return (
                <div className="max-w-[450px] mx-auto">
                  <p
                    className="text-center mb-4"
                    style={{
                      fontFamily: "var(--font-condensed)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    LIVE-VORSCHAU
                  </p>

                  {/* Page selector for preview context */}
                  <div className="flex gap-2 justify-center mb-6 flex-wrap">
                    {ALL_PAGE_SLUGS.map((s) => {
                      const ov = overrides.find((o) => o.page_slug === s);
                      return (
                        <button
                          key={s}
                          onClick={() => setPreviewPage(s)}
                          className="px-3 py-1.5 cursor-pointer transition-colors"
                          style={{
                            background: previewPage === s ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
                            border: previewPage === s ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "4px",
                            color: previewPage === s ? "white" : "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-condensed)",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            opacity: ov?.is_visible ? 1 : 0.4,
                          }}
                        >
                          {PAGE_SLUG_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>

                  {!currentOv?.is_visible ? (
                    <div
                      className="px-5 py-8 text-center"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "6px",
                      }}
                    >
                      <Globe size={24} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                      <p style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                        Tarif ist auf dieser Seite ausgeblendet
                      </p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>
                        Aktiviere die Sichtbarkeit im Tab „Seitenausspielung"
                      </p>
                    </div>
                  ) : (
                    <PreviewCard
                      name={name}
                      price={price}
                      period={period}
                      description={previewDescription}
                      features={previewFeatures}
                      restrictions={restrictions}
                      studentPrice={studentPrice}
                      badge={currentOv.is_featured ? (currentOv.badge_text || "") : ""}
                      isFeatured={currentOv.is_featured}
                      ctaText={ctaText}
                      showCta={currentOv.show_cta}
                    />
                  )}
                </div>
                );
              })()}
            </div>

            {/* Sticky Footer */}
            <div
              className="shrink-0 flex items-center justify-between px-8 py-4 gap-4"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(10,10,10,0.95)",
                backdropFilter: "blur(8px)",
              }}
            >
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-6 cursor-pointer transition-colors"
                style={{
                  height: "48px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-condensed)",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                Abbrechen
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setTab("vorschau")}
                  className="flex items-center justify-center gap-2 px-5 cursor-pointer transition-colors"
                  style={{
                    height: "48px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  <Eye size={14} />
                  Vorschau
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-7 cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    height: "48px",
                    background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontFamily: "var(--font-condensed)",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    boxShadow: "0 0 20px rgba(202,12,133,0.3)",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  <Save size={14} />
                  {isEdit ? "Speichern" : "Erstellen"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Preview Card ────────────────────────────────────────────────────────────
function PreviewCard({
  name,
  price,
  period,
  description,
  features,
  restrictions,
  studentPrice,
  badge,
  isFeatured,
  ctaText,
  showCta,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string;
  restrictions: string;
  studentPrice: string;
  badge: string;
  isFeatured: boolean;
  ctaText: string;
  showCta: boolean;
}) {
  const featureList = features
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  return (
    <div
      className="relative flex flex-col p-7"
      style={{
        background: isFeatured
          ? "linear-gradient(160deg, rgba(202,12,133,0.12), rgba(202,12,133,0.04))"
          : "var(--surface-2)",
        border: isFeatured
          ? "1px solid rgba(202,12,133,0.35)"
          : "1px solid rgba(255,255,255,0.06)",
        borderRadius: "2px",
      }}
    >
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-white whitespace-nowrap"
          style={{
            background: "var(--brand)",
            fontFamily: "var(--font-condensed)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          {badge.toUpperCase()}
        </div>
      )}

      <div
        className="text-white/35 mb-3"
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.2em",
        }}
      >
        {(name || "TARIF NAME").toUpperCase()}
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.8rem",
            color: isFeatured ? "var(--brand)" : "white",
            lineHeight: 1,
          }}
        >
          {price || "0"}€
        </span>
      </div>
      <p className="text-white/30 text-xs mb-1">{period || "pro Monat"}</p>

      {studentPrice && (
        <div
          className="mt-3 mb-2 px-3 py-2.5 flex items-center gap-2.5"
          style={{
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.18)",
          }}
        >
          <GraduationCap size={15} className="shrink-0" style={{ color: "#34D399" }} />
          <div>
            <p
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(52,211,153,0.7)",
              }}
            >
              SCHÜLER & STUDENTEN
            </p>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.3rem",
                color: "#34D399",
                lineHeight: 1,
              }}
            >
              {studentPrice}€
            </span>
          </div>
        </div>
      )}

      {restrictions && (
        <div
          className="mt-2 mb-3 px-3 py-2"
          style={{
            background: "rgba(255,180,0,0.06)",
            border: "1px solid rgba(255,180,0,0.15)",
          }}
        >
          <p
            className="text-yellow-400/70 text-xs"
            style={{
              fontFamily: "var(--font-condensed)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {restrictions}
          </p>
        </div>
      )}

      {description && (
        <p className="text-white/45 text-sm leading-relaxed mb-5 mt-2">
          {description}
        </p>
      )}

      {featureList.length > 0 && (
        <ul className="space-y-2.5 mb-6">
          {featureList.map((f, fIdx) => (
            <li key={`preview-f-${fIdx}`} className="flex items-start gap-2.5 text-sm text-white/55">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0"
                style={{
                  color: isFeatured ? "var(--brand)" : "rgba(255,255,255,0.2)",
                }}
              />
              <span style={{ fontSize: "13px" }}>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {showCta && (
        <div
          className="mt-auto flex items-center justify-center gap-2 py-3 px-4"
          style={{
            background: isFeatured ? "var(--brand)" : "transparent",
            border: isFeatured ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
            color: isFeatured ? "white" : "rgba(255,255,255,0.7)",
            fontFamily: "var(--font-condensed)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          {ctaText || "Jetzt starten"}
          <ArrowRight size={14} />
        </div>
      )}
    </div>
  );
}