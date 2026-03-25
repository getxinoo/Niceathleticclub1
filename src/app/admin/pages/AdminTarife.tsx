/**
 * AdminTarife.tsx – Modulares Pricing-System
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-Seite: Basis-Tarife, Add-ons und Hinweise verwalten.
 * API-First mit Mock-DB Fallback.
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion } from "motion/react";
import {
  Euro,
  Plus,
  Pencil,
  Trash2,
  Star,
  RefreshCw,
  Save,
  Zap,
  FileText,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api-service";
import { mockDb } from "../../../data/mock-db";
import type { BasePlan, AddOn, PricingData } from "../../../data/classes";
import { DEFAULT_PRICING_DATA } from "../../../data/classes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";
import { PlanEditorDrawer } from "../components/PlanEditorDrawer";
import type { AdminPlan, PageOverride } from "../../../lib/pricing-types";
import { ALL_PAGE_SLUGS, PAGE_SLUG_LABELS } from "../../../lib/pricing-types";

// ── Helpers ────────────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "6px" }}>
      {children}{required && <span style={{ color: "var(--brand)", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function FieldInput({ type = "text", value, onChange, placeholder }: {
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(202,12,133,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  );
}

type Tab = "plans" | "addons" | "notes";

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminTarife() {
  const [data, setData] = useState<PricingData>(DEFAULT_PRICING_DATA);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("plans");
  const [saving, setSaving] = useState(false);

  // Plan Sheet
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<BasePlan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm());

  // Plan Drawer (new fullscreen editor)
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [drawerPlan, setDrawerPlan] = useState<AdminPlan | null>(null);

  // Add-on Sheet
  const [addonSheetOpen, setAddonSheetOpen] = useState(false);
  const [editAddon, setEditAddon] = useState<AddOn | null>(null);
  const [addonForm, setAddonForm] = useState(emptyAddonForm());

  // Notes
  const [contractNote, setContractNote] = useState("");
  const [blaulichtNote, setBlaulichtNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.pricing.get();
      if (res && Array.isArray(res.basePlans)) {
        setData(res as PricingData);
        setContractNote(res.contractNote || "");
        setBlaulichtNote(res.blaulichtNote || "");
      } else {
        const fallback = mockDb.getPricingData();
        setData(fallback);
        setContractNote(fallback.contractNote);
        setBlaulichtNote(fallback.blaulichtNote);
      }
    } catch {
      const fallback = mockDb.getPricingData();
      setData(fallback);
      setContractNote(fallback.contractNote);
      setBlaulichtNote(fallback.blaulichtNote);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
  useEffect(() => { load(); }, [location.key]);

  // ── PLANS CRUD ─────────────────────────────────────────────────────────────
  const openCreatePlan = () => {
    setDrawerPlan(null);
    setPlanDrawerOpen(true);
  };

  const openEditPlan = (plan: BasePlan) => {
    // Convert BasePlan → AdminPlan for the drawer
    // Try to read saved overrides from mock DB first
    const savedOverrides = mockDb.getPageOverrides(plan.id);
    const adminPlan: AdminPlan = {
      id: null,
      slug: plan.id,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      description: plan.description,
      features: plan.features,
      cta_text: plan.cta,
      cta_url: "/probetraining",
      restrictions: plan.restrictions || "",
      blaulicht_discount: plan.blaulichtDiscount ?? null,
      student_price: plan.studentPrice ?? null,
      sort_order: plan.sortOrder,
      page_overrides: savedOverrides ?? ALL_PAGE_SLUGS.map((slug) => ({
        page_slug: slug,
        is_visible: slug === "preise",
        is_featured: plan.highlight && slug === "preise",
        show_cta: true,
        badge_text: (plan.highlight && slug === "preise") ? (plan.badge || "") : "",
        description_override: "",
        features_override: "",
        sort_order: plan.sortOrder,
      })),
    };
    setDrawerPlan(adminPlan);
    setPlanDrawerOpen(true);
  };

  const handleDrawerSave = async (adminPlan: AdminPlan) => {
    setSaving(true);
    const planData: BasePlan = {
      id: adminPlan.slug,
      name: adminPlan.name,
      price: adminPlan.price,
      period: adminPlan.period,
      description: adminPlan.description,
      highlight: adminPlan.page_overrides.some((o) => o.is_featured && o.is_visible),
      badge: adminPlan.page_overrides.find((o) => o.is_featured && o.badge_text)?.badge_text || undefined,
      features: adminPlan.features,
      cta: adminPlan.cta_text,
      restrictions: adminPlan.restrictions || undefined,
      blaulichtDiscount: adminPlan.blaulicht_discount ?? undefined,
      studentPrice: adminPlan.student_price ?? undefined,
      sortOrder: adminPlan.sort_order,
    };
    try {
      const isEdit = drawerPlan?.slug === adminPlan.slug && data.basePlans.some((p) => p.id === adminPlan.slug);
      await api.admin.pricing.savePlans({ plan: planData, action: isEdit ? "update" : "create" });
      toast.success(`Tarif "${planData.name}" ${isEdit ? "aktualisiert" : "erstellt"}.`);
    } catch {
      const existing = data.basePlans.find((p) => p.id === adminPlan.slug);
      if (existing) mockDb.updateBasePlan(existing.id, planData);
      else mockDb.addBasePlan(planData);
      toast.success(`Tarif "${planData.name}" gespeichert (lokal).`);
    }
    // Always persist page overrides in mock DB
    mockDb.setPageOverrides(adminPlan.slug, adminPlan.page_overrides);
    setData(mockDb.getPricingData());
    setPlanDrawerOpen(false);
    setSaving(false);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim() || !planForm.price.trim()) {
      toast.error("Name und Preis sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    const planData: BasePlan = {
      id: editPlan?.id || planForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9äöüß-]/g, ""),
      name: planForm.name.trim(),
      price: Number(planForm.price) || 0,
      period: planForm.period || "pro Monat",
      description: planForm.description.trim(),
      highlight: planForm.highlight,
      badge: planForm.badge.trim() || undefined,
      features: planForm.features.split("\n").map((f) => f.trim()).filter(Boolean),
      cta: planForm.cta.trim() || "Jetzt starten",
      restrictions: planForm.restrictions.trim() || undefined,
      blaulichtDiscount: planForm.blaulichtDiscount ? Number(planForm.blaulichtDiscount) : undefined,
      studentPrice: planForm.studentPrice ? Number(planForm.studentPrice) : undefined,
      sortOrder: Number(planForm.sortOrder) || 0,
    };

    try {
      await api.admin.pricing.savePlans({ plan: planData, action: editPlan ? "update" : "create" });
      toast.success(`Tarif "${planData.name}" ${editPlan ? "aktualisiert" : "erstellt"}.`);
    } catch {
      if (editPlan) mockDb.updateBasePlan(editPlan.id, planData);
      else mockDb.addBasePlan(planData);
      toast.success(`Tarif "${planData.name}" ${editPlan ? "aktualisiert" : "erstellt"} (lokal).`);
    }
    const updated = mockDb.getPricingData();
    setData(updated);
    setPlanSheetOpen(false);
    setSaving(false);
  };

  const handleDeletePlan = async (plan: BasePlan) => {
    if (!window.confirm(`Tarif "${plan.name}" wirklich löschen?`)) return;
    try {
      await api.admin.pricing.savePlans({ id: plan.id, action: "delete" });
      toast.success(`Tarif "${plan.name}" gelöscht.`);
    } catch {
      mockDb.removeBasePlan(plan.id);
      toast.success(`Tarif "${plan.name}" gelöscht (lokal).`);
    }
    setData(mockDb.getPricingData());
  };

  // ── ADDONS CRUD ────────────────────────────────────────────────────────────
  const openCreateAddon = () => {
    setEditAddon(null);
    setAddonForm(emptyAddonForm());
    setAddonSheetOpen(true);
  };

  const openEditAddon = (addon: AddOn) => {
    setEditAddon(addon);
    setAddonForm({
      name: addon.name,
      description: addon.description || "",
      options: addon.options.map((o) => `${o.label}|${o.price}`).join("\n"),
      sortOrder: String(addon.sortOrder),
    });
    setAddonSheetOpen(true);
  };

  const handleSaveAddon = async () => {
    if (!addonForm.name.trim()) {
      toast.error("Name ist Pflichtfeld.");
      return;
    }
    setSaving(true);
    const options = addonForm.options.split("\n").map((line) => {
      const [label, price] = line.split("|").map((s) => s.trim());
      return { label: label || "", price: Number(price) || 0 };
    }).filter((o) => o.label);

    const addonData: AddOn = {
      id: editAddon?.id || addonForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9äöüß-]/g, ""),
      name: addonForm.name.trim(),
      description: addonForm.description.trim() || undefined,
      options,
      sortOrder: Number(addonForm.sortOrder) || 0,
    };

    try {
      await api.admin.pricing.saveAddOns({ addon: addonData, action: editAddon ? "update" : "create" });
      toast.success(`Add-on "${addonData.name}" ${editAddon ? "aktualisiert" : "erstellt"}.`);
    } catch {
      if (editAddon) mockDb.updateAddOn(editAddon.id, addonData);
      else mockDb.addAddOn(addonData);
      toast.success(`Add-on "${addonData.name}" ${editAddon ? "aktualisiert" : "erstellt"} (lokal).`);
    }
    setData(mockDb.getPricingData());
    setAddonSheetOpen(false);
    setSaving(false);
  };

  const handleDeleteAddon = async (addon: AddOn) => {
    if (!window.confirm(`Add-on "${addon.name}" wirklich löschen?`)) return;
    try {
      await api.admin.pricing.saveAddOns({ id: addon.id, action: "delete" });
      toast.success(`Add-on "${addon.name}" gelöscht.`);
    } catch {
      mockDb.removeAddOn(addon.id);
      toast.success(`Add-on "${addon.name}" gelöscht (lokal).`);
    }
    setData(mockDb.getPricingData());
  };

  // ── NOTES SAVE ─────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.admin.pricing.saveNotes({ contractNote, blaulichtNote });
      toast.success("Hinweise aktualisiert.");
    } catch {
      mockDb.updatePricingNotes(contractNote, blaulichtNote);
      toast.success("Hinweise aktualisiert (lokal).");
    }
    setData(mockDb.getPricingData());
    setSaving(false);
  };

  // ── TABS ───────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: typeof Euro }[] = [
    { id: "plans", label: "Basis-Tarife", icon: Euro },
    { id: "addons", label: "Add-ons", icon: Zap },
    { id: "notes", label: "Hinweise", icon: FileText },
  ];

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Euro size={20} style={{ color: "var(--brand)" }} />
            <h2 className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>
              Tarife &amp; Preise
            </h2>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}>
            Basis-Tarife, Add-ons und Hinweistexte verwalten
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.4)", cursor: "pointer" }} aria-label="Neu laden">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Basis-Tarife", value: data.basePlans.length, color: "rgba(255,255,255,0.7)" },
          { label: "Add-ons", value: data.addOns.length, color: "#CA0C85" },
          { label: "Günstigster", value: data.basePlans.length ? `${Math.min(...data.basePlans.map((p) => p.price))} €` : "–", color: "#34D399" },
          { label: "Teuerster", value: data.basePlans.length ? `${Math.max(...data.basePlans.map((p) => p.price))} €` : "–", color: "#60A5FA" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "22px", fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: "4px" }}>{stat.value}</p>
            <p style={{ fontFamily: "var(--font-condensed)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "1px" }}>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(202,12,133,0.3)", borderTopColor: "var(--brand)", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* ── TAB: Plans ── */}
          {tab === "plans" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={openCreatePlan}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 18px", height: "44px", background: "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  <Plus size={15} /> Neuer Tarif
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.basePlans.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    className="relative flex flex-col"
                    style={{
                      background: plan.highlight
                        ? "linear-gradient(160deg, rgba(202,12,133,0.1), rgba(202,12,133,0.03))"
                        : "rgba(255,255,255,0.02)",
                      border: plan.highlight
                        ? "1px solid rgba(202,12,133,0.35)"
                        : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "6px",
                      padding: "20px",
                    }}
                  >
                    {plan.badge && (
                      <div className="absolute -top-2.5 left-4 px-3 py-0.5 text-white" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", borderRadius: "2px" }}>
                        {plan.badge.toUpperCase()}
                      </div>
                    )}
                    {plan.highlight && (
                      <Star size={14} className="absolute top-3 right-3" style={{ color: "var(--brand)" }} fill="currentColor" />
                    )}

                    <p style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "4px" }}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: plan.highlight ? "var(--brand)" : "white", lineHeight: 1 }}>
                        {plan.price}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>€</span>
                    </div>
                    <p className="text-white/25 text-xs mb-1">{plan.period}</p>

                    {plan.restrictions && (
                      <p className="text-yellow-400/50 text-xs mb-2" style={{ fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}>
                        {plan.restrictions}
                      </p>
                    )}

                    {plan.blaulichtDiscount && (
                      <p className="text-xs mb-2" style={{ color: "rgba(59,130,246,0.6)" }}>
                        Blaulicht: {plan.price - plan.blaulichtDiscount} €
                      </p>
                    )}

                    {plan.studentPrice && (
                      <p className="text-xs mb-2" style={{ color: "rgba(52,211,153,0.7)" }}>
                        Schüler/Student: {plan.studentPrice} €
                      </p>
                    )}

                    <p className="text-white/35 text-xs leading-relaxed mb-3 flex-1">
                      {plan.description}
                    </p>

                    <ul className="space-y-1 mb-4">
                      {plan.features.slice(0, 3).map((f, fIdx) => (
                        <li key={`${plan.id}-f-${fIdx}`} className="flex items-start gap-2 text-white/45 text-xs">
                          <span className="mt-0.5 w-1 h-1 rounded-full shrink-0" style={{ background: plan.highlight ? "var(--brand)" : "rgba(255,255,255,0.2)" }} />
                          {f}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-white/20 text-xs">+{plan.features.length - 3} weitere</li>
                      )}
                    </ul>

                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => openEditPlan(plan)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "34px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
                        <Pencil size={11} /> Bearbeiten
                      </button>
                      <button onClick={() => handleDeletePlan(plan)} style={{ width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "4px", color: "#F87171", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Add-ons ── */}
          {tab === "addons" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={openCreateAddon}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 18px", height: "44px", background: "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  <Plus size={15} /> Neues Add-on
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {data.addOns.map((addon, idx) => (
                  <motion.div
                    key={addon.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px" }}
                  >
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-3">
                        <Zap size={16} style={{ color: "var(--brand)" }} />
                        <span style={{ fontFamily: "var(--font-condensed)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>
                          {addon.name}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditAddon(addon)} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteAddon(addon)} style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "4px", color: "#F87171", cursor: "pointer" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {addon.description && (
                      <div className="px-5 py-2">
                        <p className="text-white/30 text-xs">{addon.description}</p>
                      </div>
                    )}
                    {addon.options.map((opt, optIdx) => (
                      <div key={`${addon.id}-opt-${optIdx}`} className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span className="text-white/50 text-sm">{opt.label}</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--brand)", lineHeight: 1 }}>
                          +{opt.price} €
                        </span>
                      </div>
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Notes ── */}
          {tab === "notes" && (
            <div className="max-w-xl space-y-6">
              <div>
                <FieldLabel>Vertragshinweis (wird auf Preise-Seite angezeigt)</FieldLabel>
                <textarea
                  value={contractNote}
                  onChange={(e) => setContractNote(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <div>
                <FieldLabel>Blaulicht-Hinweis</FieldLabel>
                <textarea
                  value={blaulichtNote}
                  onChange={(e) => setBlaulichtNote(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 24px", height: "44px", background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", cursor: saving ? "not-allowed" : "pointer" }}
              >
                <Save size={14} />
                Hinweise speichern
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Plan Sheet ── */}
      <Sheet open={planSheetOpen} onOpenChange={setPlanSheetOpen}>
        <SheetContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px", overflowY: "auto" }}>
          <SheetHeader>
            <SheetTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              {editPlan ? "Tarif bearbeiten" : "Neuer Tarif"}
            </SheetTitle>
            <SheetDescription style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {editPlan ? `"${editPlan.name}" bearbeiten` : "Neuen Basis-Tarif anlegen"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel required>Name</FieldLabel>
              <FieldInput value={planForm.name} onChange={(v) => setPlanForm({ ...planForm, name: v })} placeholder="z.B. Athletic Weekend" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Preis (€)</FieldLabel>
                <FieldInput type="number" value={planForm.price} onChange={(v) => setPlanForm({ ...planForm, price: v })} placeholder="69" />
              </div>
              <div>
                <FieldLabel>Blaulicht-Rabatt (€)</FieldLabel>
                <FieldInput type="number" value={planForm.blaulichtDiscount} onChange={(v) => setPlanForm({ ...planForm, blaulichtDiscount: v })} placeholder="10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Schüler/Student-Preis (€)</FieldLabel>
                <FieldInput type="number" value={planForm.studentPrice} onChange={(v) => setPlanForm({ ...planForm, studentPrice: v })} placeholder="49" />
              </div>
              <div>
                <FieldLabel>Sortierung</FieldLabel>
                <FieldInput type="number" value={planForm.sortOrder} onChange={(v) => setPlanForm({ ...planForm, sortOrder: v })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Periode</FieldLabel>
                <FieldInput value={planForm.period} onChange={(v) => setPlanForm({ ...planForm, period: v })} placeholder="pro Monat" />
              </div>
            </div>
            <div>
              <FieldLabel>Beschreibung</FieldLabel>
              <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Kurzbeschreibung..." rows={2} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div>
              <FieldLabel>Einschränkung (z.B. "Nur Wochenende...")</FieldLabel>
              <FieldInput value={planForm.restrictions} onChange={(v) => setPlanForm({ ...planForm, restrictions: v })} placeholder="Nur Fr–So, 5:00–00:00" />
            </div>
            <div>
              <FieldLabel>Features (eine pro Zeile)</FieldLabel>
              <textarea value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} placeholder={"Freies Training\nAlle Geräte\nNAC App"} rows={4} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <FieldInput value={planForm.badge} onChange={(v) => setPlanForm({ ...planForm, badge: v })} placeholder="z.B. Premium" />
              </div>
              <div>
                <FieldLabel>CTA-Text</FieldLabel>
                <FieldInput value={planForm.cta} onChange={(v) => setPlanForm({ ...planForm, cta: v })} placeholder="Jetzt starten" />
              </div>
            </div>
            <div>
              <button onClick={() => setPlanForm({ ...planForm, highlight: !planForm.highlight })} className="flex items-center gap-3 w-full py-3 px-4 cursor-pointer" style={{ background: planForm.highlight ? "rgba(202,12,133,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${planForm.highlight ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "4px" }}>
                <Star size={14} style={{ color: planForm.highlight ? "var(--brand)" : "rgba(255,255,255,0.2)" }} fill={planForm.highlight ? "currentColor" : "none"} />
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: planForm.highlight ? "white" : "rgba(255,255,255,0.4)" }}>
                  {planForm.highlight ? "Highlight aktiv" : "Als Highlight markieren"}
                </span>
              </button>
            </div>
            <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setPlanSheetOpen(false)} style={{ flex: 1, height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={handleSavePlan} disabled={saving} style={{ flex: 1, height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: saving ? "not-allowed" : "pointer" }}>
                <Save size={14} />
                {editPlan ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add-on Sheet ── */}
      <Sheet open={addonSheetOpen} onOpenChange={setAddonSheetOpen}>
        <SheetContent style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", maxWidth: "480px", overflowY: "auto" }}>
          <SheetHeader>
            <SheetTitle style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "0.04em", textTransform: "uppercase", color: "white" }}>
              {editAddon ? "Add-on bearbeiten" : "Neues Add-on"}
            </SheetTitle>
            <SheetDescription style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>
              {editAddon ? `"${editAddon.name}" bearbeiten` : "Neues Add-on mit Preis-Optionen anlegen"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel required>Name</FieldLabel>
              <FieldInput value={addonForm.name} onChange={(v) => setAddonForm({ ...addonForm, name: v })} placeholder="z.B. CrossFit / HYROX" />
            </div>
            <div>
              <FieldLabel>Beschreibung</FieldLabel>
              <textarea value={addonForm.description} onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })} placeholder="Optionale Beschreibung..." rows={2} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div>
              <FieldLabel required>Optionen (Label|Preis, eine pro Zeile)</FieldLabel>
              <textarea
                value={addonForm.options}
                onChange={(e) => setAddonForm({ ...addonForm, options: e.target.value })}
                placeholder={"1× pro Woche|20\n2× pro Woche|30\nUnlimited|50"}
                rows={4}
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-body)", fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical" }}
              />
              <p className="text-white/20 text-xs mt-1">Format: Label|Preis (z.B. "Unlimited|50")</p>
            </div>
            <div>
              <FieldLabel>Sortierung</FieldLabel>
              <FieldInput type="number" value={addonForm.sortOrder} onChange={(v) => setAddonForm({ ...addonForm, sortOrder: v })} placeholder="0" />
            </div>
            <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setAddonSheetOpen(false)} style={{ flex: 1, height: "44px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={handleSaveAddon} disabled={saving} style={{ flex: 1, height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: saving ? "rgba(202,12,133,0.5)" : "var(--brand)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: saving ? "not-allowed" : "pointer" }}>
                <Save size={14} />
                {editAddon ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Plan Drawer ── */}
      <PlanEditorDrawer
        open={planDrawerOpen}
        onClose={() => setPlanDrawerOpen(false)}
        plan={drawerPlan}
        onSave={handleDrawerSave}
        saving={saving}
      />
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function emptyPlanForm() {
  return {
    name: "", price: "", period: "pro Monat", description: "",
    highlight: false, badge: "", features: "", cta: "Jetzt starten",
    restrictions: "", blaulichtDiscount: "", studentPrice: "", sortOrder: "0",
  };
}

function emptyAddonForm() {
  return {
    name: "", description: "", options: "", sortOrder: "0",
  };
}