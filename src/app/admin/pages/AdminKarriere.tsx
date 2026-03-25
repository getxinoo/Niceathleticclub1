/**
 * AdminKarriere.tsx – Jobs & Benefits Management
 * Full CRUD for career page content
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, X, Save, Loader2, Briefcase,
  Heart, Zap, Trophy, Users, Star, MapPin, Clock, Eye, EyeOff,
  GripVertical, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import { Button } from "@/app/components/ui/button";

const ICON_MAP: Record<string, React.ElementType> = { Zap, Heart, Trophy, Users, Star, MapPin, Briefcase, Clock };
const ICON_OPTIONS = Object.keys(ICON_MAP);

interface Job {
  id?: number; title: string; department: string; employmentType: string;
  level: string; location: string; description: string; tags: string[];
  active: boolean; sortOrder: number;
}
interface Benefit {
  id?: number; icon: string; title: string; description: string;
  active: boolean; sortOrder: number;
}

const emptyJob: Job = { title: "", department: "Training", employmentType: "Vollzeit / Teilzeit", level: "Erfahren", location: "Göppingen, BW", description: "", tags: [], active: true, sortOrder: 0 };
const emptyBenefit: Benefit = { icon: "Zap", title: "", description: "", active: true, sortOrder: 0 };

export default function AdminKarriere() {
  const location = useLocation();
  const [tab, setTab] = useState<"jobs" | "benefits">("jobs");
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editBenefit, setEditBenefit] = useState<Benefit | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.karriere.getAll();
      setJobs(data.jobs ?? []);
      setBenefits(data.benefits ?? []);
    } catch { toast.error("Fehler beim Laden."); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [location.key]);

  // ── Job CRUD ──────────────────────────────────────────────────────────────
  const saveJob = async () => {
    if (!editJob?.title) { toast.error("Titel ist Pflichtfeld."); return; }
    setSaving(true);
    try {
      await api.admin.karriere.saveJob(editJob);
      toast.success("Job gespeichert.");
      setEditJob(null);
      load();
    } catch { toast.error("Fehler beim Speichern."); }
    setSaving(false);
  };

  const deleteJob = async (id: number) => {
    if (!confirm("Job wirklich löschen?")) return;
    try {
      await api.admin.karriere.deleteJob(id);
      toast.success("Job gelöscht.");
      load();
    } catch { toast.error("Fehler."); }
  };

  // ── Benefit CRUD ──────────────────────────────────────────────────────────
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
    try {
      await api.admin.karriere.deleteBenefit(id);
      toast.success("Benefit gelöscht.");
      load();
    } catch { toast.error("Fehler."); }
  };

  const addTag = () => {
    if (!tagInput.trim() || !editJob) return;
    setEditJob({ ...editJob, tags: [...editJob.tags, tagInput.trim()] });
    setTagInput("");
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-condensed)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "4px", textTransform: "uppercase",
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", letterSpacing: "0.02em" }}>
            KARRIERE
          </h1>
          <p className="text-white/35 text-sm mt-1">Jobs & Benefits verwalten</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(["jobs", "benefits"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 cursor-pointer transition-all"
            style={{
              fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em",
              background: tab === t ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
              border: tab === t ? "1px solid rgba(202,12,133,0.3)" : "1px solid rgba(255,255,255,0.06)",
              color: tab === t ? "white" : "rgba(255,255,255,0.4)",
            }}>
            {t === "jobs" ? `JOBS (${jobs.length})` : `BENEFITS (${benefits.length}/9)`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>
      )}

      {/* ── JOBS TAB ── */}
      {!loading && tab === "jobs" && (
        <>
          <Button onClick={() => setEditJob({ ...emptyJob, sortOrder: jobs.length })}
            className="mb-4 gap-2" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em" }}>
            <Plus size={14} /> NEUEN JOB ANLEGEN
          </Button>

          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 p-4"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[9px]" style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)", fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.14em", color: "var(--brand)" }}>
                      {job.department.toUpperCase()}
                    </span>
                    {!job.active && <span className="text-[9px] text-white/30" style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, letterSpacing: "0.1em" }}>INAKTIV</span>}
                  </div>
                  <p className="text-white text-sm">{job.title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{job.employmentType} · {job.level}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditJob({ ...job })} className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer" style={{ background: "none", border: "none" }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => job.id && deleteJob(job.id)} className="p-2 text-white/40 hover:text-red-400 transition-colors cursor-pointer" style={{ background: "none", border: "none" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── BENEFITS TAB ── */}
      {!loading && tab === "benefits" && (
        <>
          {benefits.length < 9 && (
            <Button onClick={() => setEditBenefit({ ...emptyBenefit, sortOrder: benefits.length })}
              className="mb-4 gap-2" style={{ background: "var(--brand)", fontFamily: "var(--font-condensed)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em" }}>
              <Plus size={14} /> NEUEN BENEFIT ANLEGEN
            </Button>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {benefits.map(b => {
              const Icon = ICON_MAP[b.icon] ?? Zap;
              return (
                <div key={b.id} className="p-4 group relative"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 flex items-center justify-center mb-3" style={{ background: "rgba(202,12,133,0.1)", border: "1px solid rgba(202,12,133,0.2)" }}>
                    <Icon size={14} style={{ color: "var(--brand)" }} />
                  </div>
                  <p className="text-white text-sm mb-1">{b.title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{b.description}</p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditBenefit({ ...b })} className="p-1.5 text-white/40 hover:text-white cursor-pointer" style={{ background: "rgba(255,255,255,0.06)", border: "none" }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => b.id && deleteBenefit(b.id)} className="p-1.5 text-white/40 hover:text-red-400 cursor-pointer" style={{ background: "rgba(255,255,255,0.06)", border: "none" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── EDIT JOB SHEET ── */}
      <AnimatePresence>
        {editJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setEditJob(null)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  {editJob.id ? "JOB BEARBEITEN" : "NEUER JOB"}
                </h3>
                <button onClick={() => setEditJob(null)} className="text-white/40 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div><label style={labelStyle}>Titel *</label><input value={editJob.title} onChange={e => setEditJob({ ...editJob, title: e.target.value })} style={inputStyle} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={labelStyle}>Abteilung</label>
                    <select value={editJob.department} onChange={e => setEditJob({ ...editJob, department: e.target.value })} style={inputStyle}>
                      <option value="Training">Training</option><option value="Service">Service</option><option value="Marketing">Marketing</option><option value="Management">Management</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Anstellung</label><input value={editJob.employmentType} onChange={e => setEditJob({ ...editJob, employmentType: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Level</label><input value={editJob.level} onChange={e => setEditJob({ ...editJob, level: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Standort</label><input value={editJob.location} onChange={e => setEditJob({ ...editJob, location: e.target.value })} style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Beschreibung *</label>
                  <textarea value={editJob.description} onChange={e => setEditJob({ ...editJob, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div><label style={labelStyle}>Tags / Anforderungen</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editJob.tags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 text-xs text-white/60"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {t}
                        <button onClick={() => setEditJob({ ...editJob, tags: editJob.tags.filter((_, idx) => idx !== i) })}
                          className="text-white/30 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Neuen Tag hinzufügen..."
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} style={{ ...inputStyle, flex: 1 }} />
                    <Button onClick={addTag} size="sm" variant="outline">+</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editJob.active} onChange={e => setEditJob({ ...editJob, active: e.target.checked })} className="accent-[#CA0C85]" />
                    <span className="text-white/60 text-sm">Aktiv (sichtbar auf Website)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditJob(null)}>Abbrechen</Button>
                <Button onClick={saveJob} disabled={saving}
                  style={{ background: "var(--brand)" }} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  SPEICHERN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT BENEFIT SHEET ── */}
      <AnimatePresence>
        {editBenefit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setEditBenefit(null)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg p-6"
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  {editBenefit.id ? "BENEFIT BEARBEITEN" : "NEUER BENEFIT"}
                </h3>
                <button onClick={() => setEditBenefit(null)} className="text-white/40 hover:text-white cursor-pointer" style={{ background: "none", border: "none" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div><label style={labelStyle}>Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map(name => {
                      const Icon = ICON_MAP[name];
                      const sel = editBenefit.icon === name;
                      return (
                        <button key={name} onClick={() => setEditBenefit({ ...editBenefit, icon: name })}
                          className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            background: sel ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.03)",
                            border: sel ? "1px solid rgba(202,12,133,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <Icon size={16} style={{ color: sel ? "var(--brand)" : "rgba(255,255,255,0.4)" }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><label style={labelStyle}>Titel *</label><input value={editBenefit.title} onChange={e => setEditBenefit({ ...editBenefit, title: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Beschreibung *</label>
                  <textarea value={editBenefit.description} onChange={e => setEditBenefit({ ...editBenefit, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editBenefit.active} onChange={e => setEditBenefit({ ...editBenefit, active: e.target.checked })} className="accent-[#CA0C85]" />
                  <span className="text-white/60 text-sm">Aktiv</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditBenefit(null)}>Abbrechen</Button>
                <Button onClick={saveBenefit} disabled={saving}
                  style={{ background: "var(--brand)" }} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  SPEICHERN
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}