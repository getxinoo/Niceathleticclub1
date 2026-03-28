import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
import { Plus, Trash2, User, Clock, Users, Pencil, Lock, Unlock, Dumbbell, CalendarCheck2 } from "lucide-react";
import { api, Course } from "@/lib/api-service";
import type { StaffUser } from "@/lib/api-service";
import { DataTable, StatusBadge } from "@/app/components/ui/DataTable";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { KursBuchungenPanel } from "@/app/admin/components/KursBuchungenPanel";

/* ── Shared select styling ────────────────────────────────────────────────── */
const selectClass =
  "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const optionClass = "bg-[#0a0a0a] text-white";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const CATEGORIES = ["CrossFit", "Hyrox", "Functional", "Strength", "Open Gym"];
const CAT_COLORS: Record<string, string> = {
  CrossFit: "#CA0C85", Hyrox: "#f97316", Functional: "#3b82f6",
  Strength: "#22c55e", "Open Gym": "#a855f7",
};

const emptyForm = {
  title: "", instructor: "", weekday: "Montag", time: "",
  category: "Functional", capacity: 20, active: true,
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "kurse",     label: "KURSVERWALTUNG", icon: Dumbbell       },
  { id: "buchungen", label: "BUCHUNGEN",      icon: CalendarCheck2 },
] as const;
type TabId = typeof TABS[number]["id"];

export default function AdminKurse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = rawTab === "buchungen" ? "buchungen" : "kurse";

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState<StaffUser[]>([]);

  /* ── Dialog state ─────────────────────────────────────────────────────── */
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  /* ── Data loading ─────────────────────────────────────────────────────── */
  const location = useLocation();
  const loadData = async () => {
    try {
      setLoading(true);
      const [data, staffData] = await Promise.all([
        api.admin.courses.list(),
        api.admin.users.listStaff(),
      ]);
      setCourses(data);
      setTrainers(staffData.filter((u: StaffUser) => u.role === "trainer" && u.active));
    } catch {
      /* Mock-Fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [location.key]);

  /* ── Tab change ───────────────────────────────────────────────────────── */
  const setTab = (tab: TabId) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "kurse") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  /* ── Create ───────────────────────────────────────────────────────────── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.courses.create(formData);
      toast.success("Kurs erfolgreich erstellt");
      setIsCreateOpen(false);
      setFormData({ ...emptyForm });
      loadData();
    } catch {
      toast.error("Fehler beim Erstellen des Kurses");
    }
  };

  /* ── Edit ──────────────────────────────────────────────────────────────── */
  const openEdit = (course: Course) => {
    setEditCourse(course);
    setFormData({
      title: course.title, instructor: course.instructor,
      weekday: course.weekday || "Montag", time: course.time,
      category: course.category, capacity: course.capacity, active: course.active,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourse) return;
    try {
      await api.admin.courses.update(editCourse.id, formData);
      toast.success("Kurs aktualisiert");
      setEditCourse(null);
      setFormData({ ...emptyForm });
      loadData();
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  /* ── Lock / Unlock ────────────────────────────────────────────────────── */
  const toggleLock = async (course: Course) => {
    const newLocked = !course.locked;
    try {
      await api.admin.courses.update(course.id, { locked: newLocked });
      toast.success(newLocked ? "Kurs gesperrt – Anmeldungen blockiert" : "Kurs entsperrt – Anmeldungen möglich");
      loadData();
    } catch {
      toast.error("Fehler beim Sperren/Entsperren");
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────────── */
  const deleteCourse = async (id: string) => {
    if (!confirm("Diesen Kurs wirklich löschen?")) return;
    try {
      await api.admin.courses.delete(id);
      toast.success("Kurs gelöscht");
      loadData();
    } catch { /* */ }
  };

  /* ── Close dialogs ────────────────────────────────────────────────────── */
  const closeDialogs = () => {
    setIsCreateOpen(false);
    setEditCourse(null);
    setFormData({ ...emptyForm });
  };

  /* ── Shared form JSX ──────────────────────────────────────────────────── */
  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Kursname</Label>
        <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Trainer</Label>
          <select required value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })} className={selectClass}>
            <option value="" disabled className="bg-[#0a0a0a] text-white/40">Trainer wählen…</option>
            {formData.instructor && !trainers.some((t) => t.name === formData.instructor) && (
              <option value={formData.instructor} className={optionClass}>{formData.instructor} (nicht im System)</option>
            )}
            {trainers.map((t) => (
              <option key={t.id} value={t.name} className={optionClass}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Tag</Label>
          <select required value={formData.weekday} onChange={(e) => setFormData({ ...formData, weekday: e.target.value })} className={selectClass}>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d} className={optionClass}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Uhrzeit</Label>
          <Input placeholder="18:00" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={selectClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className={optionClass}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Kapazität</Label>
          <Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="submit" className="w-full">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );

  /* ── Status renderer ──────────────────────────────────────────────────── */
  const renderStatus = (r: Course) => {
    if (r.locked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1" style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#ef4444", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
        }}>
          <Lock size={10} /> GESPERRT
        </span>
      );
    }
    return <StatusBadge status={r.active ? "Aktiv" : "Inaktiv"} />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-white font-display text-4xl italic tracking-tighter uppercase">
            KURS <span className="text-brand">MANAGEMENT</span>
          </h2>
          <p className="text-white/30 text-sm">Trainingsplan, Kapazitäten und Buchungen verwalten</p>
        </div>

        {/* Action – only show in Kurse tab */}
        {activeTab === "kurse" && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) closeDialogs(); else setIsCreateOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="font-bold">
                <Plus className="mr-2" size={18} /> NEUER KURS
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0a0a] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display italic text-2xl uppercase">Neuen Kurs anlegen</DialogTitle>
                <DialogDescription className="text-white/40">Erstelle eine neue Trainingseinheit für den Kursplan.</DialogDescription>
              </DialogHeader>
              {renderForm(handleCreate, "KURS ERSTELLEN")}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="flex items-center gap-2 px-5 py-3 cursor-pointer transition-all relative"
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: isActive ? "white" : "rgba(255,255,255,0.35)",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #CA0C85" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon size={14} style={{ color: isActive ? "#CA0C85" : "rgba(255,255,255,0.3)" }} />
              {tab.label}
              {tab.id === "buchungen" && (
                <span
                  className="px-1.5 py-0.5 text-xs"
                  style={{
                    background: isActive ? "rgba(202,12,133,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isActive ? "rgba(202,12,133,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: isActive ? "#CA0C85" : "rgba(255,255,255,0.25)",
                    fontFamily: "var(--font-condensed)", fontSize: "9px", fontWeight: 700,
                  }}
                >
                  NEU
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}

      {/* Kursverwaltung Tab */}
      {activeTab === "kurse" && (
        <>
          {/* Edit Dialog */}
          <Dialog open={!!editCourse} onOpenChange={(open) => { if (!open) closeDialogs(); }}>
            <DialogContent className="bg-[#0a0a0a] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display italic text-2xl uppercase">Kurs bearbeiten</DialogTitle>
                <DialogDescription className="text-white/40">Ändere die Details für „{editCourse?.title}".</DialogDescription>
              </DialogHeader>
              {renderForm(handleUpdate, "ÄNDERUNGEN SPEICHERN")}
            </DialogContent>
          </Dialog>

          {/* Table */}
          <div className="overflow-x-auto -mx-1">
            <div className="min-w-[640px] px-1">
              <DataTable
                loading={loading}
                data={courses}
                keyField="id"
                columns={[
                  {
                    key: "title", header: "Kurs",
                    cell: (r) => (
                      <span className={r.locked ? "text-white/40 line-through" : "text-white"}>{r.title}</span>
                    ),
                  },
                  {
                    key: "category", header: "Kategorie",
                    cell: (r) => {
                      const color = CAT_COLORS[r.category] || "#60a5fa";
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5" style={{
                          background: `${color}18`, border: `1px solid ${color}33`, color,
                          fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
                        }}>
                          {r.category}
                        </span>
                      );
                    },
                  },
                  {
                    key: "instructor", header: "Trainer",
                    cell: (r) => <span className="flex items-center gap-2"><User size={12} /> {r.instructor}</span>,
                  },
                  {
                    key: "time", header: "Zeit",
                    cell: (r) => <span className="flex items-center gap-2"><Clock size={12} /> {r.weekday}, {r.time}</span>,
                  },
                  {
                    key: "capacity", header: "Kapazität",
                    cell: (r) => <span className="flex items-center gap-2"><Users size={12} /> {r.enrolled || 0}/{r.capacity}</span>,
                  },
                  { key: "status", header: "Status", cell: renderStatus },
                  {
                    key: "actions", header: "", align: "right",
                    cell: (r) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleLock(r)} title={r.locked ? "Entsperren" : "Sperren"} className="hover:bg-white/5">
                          {r.locked ? <Unlock size={15} className="text-amber-400" /> : <Lock size={15} className="text-white/30 hover:text-amber-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Bearbeiten" className="hover:bg-white/5">
                          <Pencil size={15} className="text-white/30 hover:text-white" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCourse(r.id)} title="Löschen" className="hover:bg-white/5">
                          <Trash2 size={15} className="text-red-500/60 hover:text-red-500" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </>
      )}

      {/* Buchungen Tab */}
      {activeTab === "buchungen" && <KursBuchungenPanel />}
    </div>
  );
}
