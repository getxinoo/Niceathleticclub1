/**
 * AdminKarriereHub.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Karriere-Bereich: Bewerber-Pipeline, Stellenangebote & Benefits
 * in einer flachen 3-Tab-Navigation (keine verschachtelten Tabs).
 *
 * Tabs:
 *  1. Bewerber    – tägliche Pipeline-Arbeit, Badge mit "neu"-Anzahl (HR_WRITE)
 *  2. Stellen     – offene Stellenangebote verwalten (HR_READ)
 *  3. Benefits    – Benefits-Cards verwalten (HR_READ)
 *
 * URL-State: ?tab=bewerber|stellen|benefits
 */

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, Briefcase, Heart, ChevronRight, Lock,
  Plus, Pencil, Trash2, X, Save, Loader2,
  Zap, Trophy, Star, MapPin, Clock, Eye, EyeOff,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../context/AuthContext";
import { useKarriereCount } from "../context/KarriereCountContext";
import { P } from "../../../lib/permissions";
import { api } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";

// ── Re-export AdminBewerber to avoid re-render on tab-switch duplication ──────
import AdminBewerber from "./AdminBewerber";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "bewerber" | "stellen" | "benefits";

interface TabDef {
  id:          TabId;
  label:       string;
  labelShort:  string;
  icon:        React.ElementType;
  description: string;
  color:       string;
  colorBg:     string;
  colorBorder: string;
  permission:  string;
}

interface Job {
  id?: number; title: string; department: string; employmentType: string;
  level: string; location: string; description: string; tags: string[];
  active: boolean; sortOrder: number;
}
interface Benefit {
  id?: number; icon: string; title: string; description: string;
  active: boolean; sortOrder: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  {
    id:          "bewerber",
    label:       "Bewerber",
    labelShort:  "Bewerber",
    icon:        Users,
    description: "Bewerbungs-Pipeline · Eingang → Screening → Onboarding",
    color:       "#CA0C85",
    colorBg:     "rgba(202,12,133,0.10)",
    colorBorder: "rgba(202,12,133,0.28)",
    permission:  P.HR_WRITE,
  },
  {
    id:          "stellen",
    label:       "Stellenangebote",
    labelShort:  "Stellen",
    icon:        Briefcase,
    description: "Offene Positionen verwalten · auf der Website anzeigen",
    color:       "#6366F1",
    colorBg:     "rgba(99,102,241,0.10)",
    colorBorder: "rgba(99,102,241,0.28)",
    permission:  P.HR_READ,
  },
  {
    id:          "benefits",
    label:       "Benefits",
    labelShort:  "Benefits",
    icon:        Heart,
    description: "Mitarbeiter-Benefits & Vorteile auf der Karriereseite",
    color:       "#F59E0B",
    colorBg:     "rgba(245,158,11,0.10)",
    colorBorder: "rgba(245,158,11,0.28)",
    permission:  P.HR_READ,
  },
];

const ICON_MAP: Record<string, React.ElementType> = { Zap, Heart, Trophy, Users, Star, MapPin, Briefcase, Clock };
const ICON_OPTIONS = Object.keys(ICON_MAP);

const EMPTY_JOB: Job = {
  title: "", department: "Training", employmentType: "Vollzeit / Teilzeit",
  level: "Erfahren", location: "Göppingen, BW", description: "",
  tags: [], active: true, sortOrder: 0,
};
const EMPTY_BENEFIT: Benefit = { icon: "Zap", title: "", description: "", active: true, sortOrder: 0 };

// ── Shared style helpers ───────────────────────────────────────────────────────

const inputS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "white", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
};
const labelS: React.CSSProperties = {
  fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700,
  letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", display: "block",
  marginBottom: "4px", textTransform: "uppercase",
};

// ── Stellen Tab ───────────────────────────────────────────────────────────────

function StellenTab() {
  const [loading, setLoading]     = useState(true);
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [editJob, setEditJob]     = useState<Job | null>(null);
  const [saving, setSaving]       = useState(false);
  const [tagInput, setTagInput]   = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.karriere.getAll();
      setJobs(data.jobs ?? []);
    } catch { toast.error("Fehler beim Laden der Stellen."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveJob = async () => {
    if (!editJob?.title) { toast.error("Titel ist Pflichtfeld."); return; }
    setSaving(true);
    try {
      await api.admin.karriere.saveJob(editJob);
      toast.success("Stelle gespeichert.");
      setEditJob(null);
      load();
    } catch { toast.error("Fehler beim Speichern."); }
    setSaving(false);
  };

  const deleteJob = async (id: number) => {
    if (!confirm("Stelle wirklich löschen?")) return;
    try { await api.admin.karriere.deleteJob(id); toast.success("Stelle gelöscht."); load(); }
    catch { toast.error("Fehler."); }
  };

  const toggleActive = async (job: Job) => {
    if (!job.id) return;
    setTogglingId(job.id);
    try {
      await api.admin.karriere.saveJob({ ...job, active: !job.active });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, active: !j.active } : j));
      toast.success(job.active ? "Stelle ausgeblendet." : "Stelle wieder sichtbar.");
    } catch { toast.error("Fehler."); }
    setTogglingId(null);
  };

  const addTag = () => {
    if (!tagInput.trim() || !editJob) return;
    setEditJob({ ...editJob, tags: [...editJob.tags, tagInput.trim()] });
    setTagInput("");
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin text-white/20" />
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          {jobs.length} {jobs.length === 1 ? "Stelle" : "Stellen"} · {jobs.filter(j => j.active).length} sichtbar
        </p>
        <motion.button
          onClick={() => setEditJob({ ...EMPTY_JOB, sortOrder: jobs.length })}
          whileHover={{ y: -1, boxShadow: "0 0 18px rgba(99,102,241,0.35)" }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 cursor-pointer"
          style={{
            background: "#6366F1", border: "none", color: "white", minHeight: "40px",
            fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
          }}
        >
          <Plus size={13} /> NEUE STELLE
        </motion.button>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
          <Briefcase size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>Noch keine Stellenangebote angelegt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id ?? i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-4"
              style={{
                background: job.active ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
                border: job.active ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.03)",
                opacity: job.active ? 1 : 0.55,
              }}
            >
              {/* Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 text-[9px]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em", color: "#6366F1" }}>
                    {job.department.toUpperCase()}
                  </span>
                  {!job.active && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)" }}>
                      <EyeOff size={9} /> VERSTECKT
                    </span>
                  )}
                </div>
                <p className="text-white text-sm">{job.title}</p>
                <p className="text-white/30 text-xs mt-0.5">{job.employmentType} · {job.level} · {job.location}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0 items-center">
                <button
                  onClick={() => toggleActive(job)}
                  disabled={togglingId === job.id}
                  className="flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-all"
                  style={{
                    background: job.active ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.03)",
                    border: job.active ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.07)",
                    color: job.active ? "rgba(134,239,172,0.85)" : "rgba(255,255,255,0.25)",
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em",
                    minHeight: "34px",
                  }}
                >
                  {togglingId === job.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : job.active ? <><Eye size={11} /> SICHTBAR</> : <><EyeOff size={11} /> VERSTECKT</>}
                </button>
                <button onClick={() => setEditJob({ ...job })} className="w-9 h-9 flex items-center justify-center text-white/35 hover:text-white transition-colors cursor-pointer" style={{ background: "none", border: "none" }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => job.id && deleteJob(job.id)} className="w-9 h-9 flex items-center justify-center text-white/35 hover:text-red-400 transition-colors cursor-pointer" style={{ background: "none", border: "none" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editJob && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setEditJob(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-2xl max-h-[82vh] overflow-y-auto"
              style={{ background: "#090909", border: "1px solid rgba(99,102,241,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(99,102,241,0.04)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
                    <Briefcase size={15} style={{ color: "#6366F1" }} />
                  </div>
                  <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>
                    {editJob.id ? "STELLE BEARBEITEN" : "NEUE STELLE"}
                  </h3>
                </div>
                <button onClick={() => setEditJob(null)} className="text-white/35 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div><label style={labelS}>Titel *</label><input value={editJob.title} onChange={e => setEditJob({ ...editJob, title: e.target.value })} style={inputS} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelS}>Abteilung</label>
                    <select value={editJob.department} onChange={e => setEditJob({ ...editJob, department: e.target.value })} style={inputS}>
                      <option>Training</option><option>Service</option><option>Marketing</option><option>Management</option>
                    </select>
                  </div>
                  <div><label style={labelS}>Anstellung</label><input value={editJob.employmentType} onChange={e => setEditJob({ ...editJob, employmentType: e.target.value })} style={inputS} /></div>
                  <div><label style={labelS}>Level</label><input value={editJob.level} onChange={e => setEditJob({ ...editJob, level: e.target.value })} style={inputS} /></div>
                  <div><label style={labelS}>Standort</label><input value={editJob.location} onChange={e => setEditJob({ ...editJob, location: e.target.value })} style={inputS} /></div>
                </div>
                <div>
                  <label style={labelS}>Beschreibung *</label>
                  <textarea value={editJob.description} onChange={e => setEditJob({ ...editJob, description: e.target.value })} rows={4} style={{ ...inputS, resize: "vertical" }} />
                </div>
                <div>
                  <label style={labelS}>Tags / Anforderungen</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editJob.tags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 text-xs text-white/55" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                        {t}
                        <button onClick={() => setEditJob({ ...editJob, tags: editJob.tags.filter((_, idx) => idx !== i) })} className="text-white/30 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tag hinzufügen…"
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} style={{ ...inputS, flex: 1 }} />
                    <Button onClick={addTag} size="sm" variant="outline">+</Button>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editJob.active} onChange={e => setEditJob({ ...editJob, active: e.target.checked })} className="accent-[#6366F1]" />
                  <span className="text-white/55 text-sm">Aktiv (sichtbar auf Website)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Button variant="outline" onClick={() => setEditJob(null)}>Abbrechen</Button>
                <Button onClick={saveJob} disabled={saving} className="gap-2" style={{ background: "#6366F1" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SPEICHERN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Benefits Tab ──────────────────────────────────────────────────────────────

function BenefitsTab() {
  const [loading, setLoading]       = useState(true);
  const [benefits, setBenefits]     = useState<Benefit[]>([]);
  const [editBenefit, setEditBenefit] = useState<Benefit | null>(null);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.karriere.getAll();
      setBenefits(data.benefits ?? []);
    } catch { toast.error("Fehler beim Laden der Benefits."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBenefit = async () => {
    if (!editBenefit?.title) { toast.error("Titel ist Pflichtfeld."); return; }
    setSaving(true);
    try {
      await api.admin.karriere.saveBenefit(editBenefit);
      toast.success("Benefit gespeichert.");
      setEditBenefit(null);
      load();
    } catch { toast.error("Fehler beim Speichern."); }
    setSaving(false);
  };

  const deleteBenefit = async (id: number) => {
    if (!confirm("Benefit wirklich löschen?")) return;
    try { await api.admin.karriere.deleteBenefit(id); toast.success("Benefit gelöscht."); load(); }
    catch { toast.error("Fehler."); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin text-white/20" />
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          {benefits.length}/9 Benefits · sichtbar auf der Karriereseite
        </p>
        {benefits.length < 9 && (
          <motion.button
            onClick={() => setEditBenefit({ ...EMPTY_BENEFIT, sortOrder: benefits.length })}
            whileHover={{ y: -1, boxShadow: "0 0 18px rgba(245,158,11,0.3)" }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 cursor-pointer"
            style={{
              background: "#D97706", border: "none", color: "white", minHeight: "40px",
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
            }}
          >
            <Plus size={13} /> NEUER BENEFIT
          </motion.button>
        )}
      </div>

      {/* Benefits Grid */}
      {benefits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
          <Heart size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>Noch keine Benefits angelegt.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {benefits.map((b, i) => {
            const Icon = ICON_MAP[b.icon] ?? Zap;
            return (
              <motion.div
                key={b.id ?? i}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 group relative"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center mb-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <Icon size={15} style={{ color: "#F59E0B" }} />
                </div>
                <p className="text-white text-sm mb-1">{b.title}</p>
                <p className="text-white/35 text-xs leading-relaxed">{b.description}</p>

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditBenefit({ ...b })} className="p-1.5 cursor-pointer text-white/40 hover:text-white" style={{ background: "rgba(255,255,255,0.06)", border: "none" }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => b.id && deleteBenefit(b.id)} className="p-1.5 cursor-pointer text-white/40 hover:text-red-400" style={{ background: "rgba(255,255,255,0.06)", border: "none" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editBenefit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setEditBenefit(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg"
              style={{ background: "#090909", border: "1px solid rgba(245,158,11,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(245,158,11,0.03)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <Heart size={15} style={{ color: "#F59E0B" }} />
                  </div>
                  <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>
                    {editBenefit.id ? "BENEFIT BEARBEITEN" : "NEUER BENEFIT"}
                  </h3>
                </div>
                <button onClick={() => setEditBenefit(null)} className="text-white/35 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Icon Picker */}
                <div>
                  <label style={labelS}>Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(name => {
                      const Icon = ICON_MAP[name];
                      const sel = editBenefit.icon === name;
                      return (
                        <button key={name} onClick={() => setEditBenefit({ ...editBenefit, icon: name })}
                          className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            background: sel ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.03)",
                            border: sel ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <Icon size={16} style={{ color: sel ? "#F59E0B" : "rgba(255,255,255,0.35)" }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><label style={labelS}>Titel *</label><input value={editBenefit.title} onChange={e => setEditBenefit({ ...editBenefit, title: e.target.value })} style={inputS} /></div>
                <div>
                  <label style={labelS}>Beschreibung *</label>
                  <textarea value={editBenefit.description} onChange={e => setEditBenefit({ ...editBenefit, description: e.target.value })} rows={3} style={{ ...inputS, resize: "vertical" }} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editBenefit.active} onChange={e => setEditBenefit({ ...editBenefit, active: e.target.checked })} className="accent-[#F59E0B]" />
                  <span className="text-white/55 text-sm">Aktiv (sichtbar auf Karriereseite)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <Button variant="outline" onClick={() => setEditBenefit(null)}>Abbrechen</Button>
                <Button onClick={saveBenefit} disabled={saving} className="gap-2" style={{ background: "#D97706" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} SPEICHERN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Hub Component ─────────────────────────────────────────────────────────────

export default function AdminKarriereHub() {
  const [params, setParams] = useSearchParams();
  const { hasPermission }   = useAuth();
  const { newCount, setNewCount } = useKarriereCount();

  // Load "new" applicant count for badge
  useEffect(() => {
    api.admin.karriere.getAll()
      .then(data => {
        const n = (data.applicants ?? []).filter((a: { status: string }) => a.status === "neu").length;
        setNewCount(n);
      })
      .catch(() => { /* silent */ });
  }, [setNewCount]);

  const allowedTabs = TABS.filter(t => hasPermission(t.permission as Parameters<typeof hasPermission>[0]));
  const requestedId = params.get("tab") as TabId | null;
  const activeTab   = allowedTabs.find(t => t.id === requestedId) ?? allowedTabs[0] ?? null;

  // Auto-redirect to first allowed tab
  useEffect(() => {
    if (!activeTab) return;
    if (requestedId !== activeTab.id) setParams({ tab: activeTab.id }, { replace: true });
  }, [activeTab, requestedId, setParams]);

  const switchTab = (id: TabId) => setParams({ tab: id }, { replace: true });

  // No access
  if (allowedTabs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Lock size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <div className="text-center">
        <p className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.12em" }}>KEIN ZUGANG</p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>Du hast keine Berechtigung für den Karriere-Bereich.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5" style={{ flexWrap: "wrap" }}>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
            <span className="text-white" style={{ fontFamily: "var(--font-condensed)", fontSize: "20px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1.2 }}>
              Karriere
            </span>
            {activeTab && (
              <>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontFamily: "var(--font-condensed)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: activeTab.color }}>
                  {activeTab.label}
                </span>
              </>
            )}
          </div>
          {activeTab && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", lineHeight: 1.4 }}>
              {activeTab.description}
            </p>
          )}
        </div>

        {/* Quick Stat */}
        {newCount > 0 && activeTab?.id !== "bewerber" && (
          <motion.button
            onClick={() => switchTab("bewerber")}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 cursor-pointer"
            style={{
              background: "rgba(202,12,133,0.08)", border: "1px solid rgba(202,12,133,0.25)",
              minHeight: "38px", fontFamily: "var(--font-condensed)", fontSize: "11px",
              fontWeight: 700, letterSpacing: "0.1em", color: "#CA0C85",
            }}
          >
            <Users size={13} />
            {newCount} neue Bewerbung{newCount !== 1 ? "en" : ""}
            <ChevronRight size={11} />
          </motion.button>
        )}
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 mb-6 overflow-x-auto"
        role="tablist"
        aria-label="Karriere Navigation"
        style={{
          background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px", padding: "5px", flexShrink: 0, scrollbarWidth: "none",
        }}
      >
        {allowedTabs.map(tab => {
          const Icon     = tab.icon;
          const isActive = activeTab?.id === tab.id;
          const showBadge = tab.id === "bewerber" && newCount > 0;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(tab.id)}
              className="relative flex items-center gap-2 flex-1 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#CA0C85]"
              style={{
                fontFamily: "var(--font-condensed)", fontSize: "12px",
                fontWeight: isActive ? 700 : 500, letterSpacing: "0.1em", textTransform: "uppercase",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.38)",
                background: isActive ? tab.colorBg : "transparent",
                border: isActive ? `1px solid ${tab.colorBorder}` : "1px solid transparent",
                borderRadius: "5px", padding: "9px 16px", minHeight: "44px",
                minWidth: "100px", justifyContent: "center", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.38)"; }}
            >
              <span className="relative flex items-center gap-2">
                <Icon size={14} style={{ color: isActive ? tab.color : "inherit", flexShrink: 0 }} />
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden">{tab.labelShort}</span>

                {/* New-applicant badge on Bewerber tab */}
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{
                      background: "#CA0C85", color: "white", borderRadius: "999px",
                      fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                      letterSpacing: "0.04em", padding: "1px 6px", lineHeight: "14px",
                      minWidth: "18px", textAlign: "center", display: "inline-block",
                    }}
                  >
                    {newCount}
                  </motion.span>
                )}
              </span>

              {/* Active underline */}
              {isActive && (
                <motion.span
                  layoutId="karriere-tab-line"
                  className="absolute"
                  style={{ bottom: "5px", left: "50%", transform: "translateX(-50%)", width: "28px", height: "2px", background: tab.color, borderRadius: "999px", pointerEvents: "none" }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab && (
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab.id === "bewerber" && <AdminBewerber />}
            {activeTab.id === "stellen"  && <StellenTab />}
            {activeTab.id === "benefits" && <BenefitsTab />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
