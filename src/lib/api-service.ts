/**
 * api-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NAC Enterprise Management System (EMS) – Zentraler HTTP-Client.
 * Strict Live Mode: Kommuniziert ausschließlich mit dem PHP/MySQL-Backend.
 * Basis-URL via Umgebungsvariable VITE_API_BASE_URL, Fallback auf Produktions-Domain.
 */

import { toast } from "sonner";

// ── Konfiguration ─────────────────────────────────────────────────────────────
export const BASE_URL: string = "https://nicefitness.de/api";

const TOKEN_KEY = "nac_auth_token";

const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("nac_user_data");
    } catch { /* noop */ }
  },
  /** Prüft ob der aktuelle Token ein Mock-Token ist (Offline-Login) */
  isMock: (): boolean => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      // "mock-jwt-" = Legacy-Prefix, "dev-mock-" = AuthContext Dev-Fallback (beide sind Mock-Sessions)
      return !!t && (t.startsWith("mock-jwt-") || t.startsWith("dev-mock-"));
    } catch { return false; }
  },
};

// ── Current-User Helper ───────────────────────────────────────────────────────
// Liest die gecachte User-ID aus dem localStorage-Store.
// Das PHP-Backend extrahiert member_id leider nicht selbst aus dem JWT,
// daher schicken wir sie bei Member-Endpunkten immer mit.
const getCurrentUserId = (): string | null => {
  try {
    const raw = localStorage.getItem("nac_user_data");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
};

// ── Sitebuilder Typen ─────────────────────────────────────────────────────────

/** Ein serialisierter Block wie er in der DB gespeichert / über die API geschickt wird */
export interface SerializedBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

// ── Fehlerklasse ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string
  ) {
    super(message ?? `Fehler ${status}`);
    this.name = "ApiError";
  }
}

// ── Mock-Fallback für Sandbox / Offline-Modus ─────────────────────────────────
// Wird bei Netzwerkfehler (fetch reject) verwendet wenn die PHP-API nicht erreichbar ist.

let _mockFallbackNotified = false;
let _mockFallbackDisabled = false;
let _toastsSuppressed = false;

// In-Memory Store fuer onboardete Mitarbeiter (Mock-Modus)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _mockOnboardedStaff: any[] = [];

// In-Memory Store fuer Frontend-Team-Profile (Mock-Modus)
// Wird beim ersten GET aus TEAM_MEMBERS initialisiert, danach per CRUD mutiert.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _mockTeamProfiles: any[] | null = null;

// ── Karriere Mock-Store (localStorage-basiert, cross-tab) ─────────────────────
// Speichert Jobs & Benefits im localStorage, damit Admin- und Frontend-Tab
// denselben Zustand sehen, ohne einen echten Server zu benötigen.
const KARRIERE_LS_KEY = "nac_mock_karriere";

const KARRIERE_SEED_JOBS = [
  { id: 1, title: "Personal Trainer / Coach", department: "Training", employmentType: "Vollzeit / Teilzeit", level: "Erfahren", location: "Göppingen, BW", description: "Du betreust unsere Mitglieder im 1:1 und kleinen Gruppen, erstellst individuelle Trainingspläne und bist Motivator auf dem Weg zu persönlichen Bestleistungen.", tags: ["PT-Lizenz", "Sport-Studium o.ä.", "Leidenschaft fürs Training"], active: true, sortOrder: 0 },
  { id: 2, title: "Kursleiter:in (CrossFit & HIIT)", department: "Training", employmentType: "Minijob / Teilzeit", level: "Erfahren", location: "Göppingen, BW", description: "Du leitest begeistert CrossFit- und HIIT-Kurse, motivierst eine großartige Community und bringst frische Ideen in unseren Kursplan ein.", tags: ["CrossFit L1+", "Kurs-Erfahrung", "Teamplayer"], active: true, sortOrder: 1 },
  { id: 3, title: "Mitarbeiter:in Empfang & Service", department: "Service", employmentType: "Teilzeit / Minijob", level: "Quereinsteiger willkommen", location: "Göppingen, BW", description: "Als erste Anlaufstelle für unsere Mitglieder repräsentierst du den NAC-Spirit.", tags: ["Serviceorientierung", "MS Office", "Kommunikationsstärke"], active: true, sortOrder: 2 },
  { id: 4, title: "Social Media & Content Creator", department: "Marketing", employmentType: "Freelance / Teilzeit", level: "Junior – Senior", location: "Göppingen, BW", description: "Du erstellst hochwertigen Content für Instagram, Facebook & Co.", tags: ["Instagram / Reels", "Fotografie / Video", "Kreativität"], active: true, sortOrder: 3 },
];
const KARRIERE_SEED_BENEFITS = [
  { id: 1, icon: "Zap", title: "Freie Mitgliedschaft", description: "Trainiere kostenlos in allen NAC-Bereichen.", sortOrder: 0, active: true },
  { id: 2, icon: "Heart", title: "Teamspirit pur", description: "Flache Hierarchien, ehrliches Feedback.", sortOrder: 1, active: true },
  { id: 3, icon: "Trophy", title: "Weiterbildung", description: "Wir fördern Zertifizierungen und Seminare.", sortOrder: 2, active: true },
  { id: 4, icon: "Users", title: "Flexible Zeiten", description: "Work-Life-Balance ist uns ernst.", sortOrder: 3, active: true },
  { id: 5, icon: "Star", title: "Attraktive Vergütung", description: "Faire Bezahlung mit Entwicklungsperspektive.", sortOrder: 4, active: true },
  { id: 6, icon: "MapPin", title: "Göppingen & Umgebung", description: "Zentraler Standort mit guter Verkehrsanbindung.", sortOrder: 5, active: true },
];
const KARRIERE_SEED_APPLICANTS = [
  { id: 1, jobId: 1, firstName: "Max", lastName: "Mustermann", email: "max@example.com", phone: "+49 176 1234", status: "probetraining", createdAt: "2026-03-01T10:00:00Z", source: "Instagram", coverLetter: "Leidenschaftlicher Trainer mit 5 Jahren Erfahrung." },
  { id: 2, jobId: 2, firstName: "Laura", lastName: "Berger", email: "laura@example.com", phone: "+49 151 5678", status: "neu", createdAt: "2026-03-08T14:00:00Z", source: "Website" },
  { id: 3, jobId: 3, firstName: "Tim", lastName: "Schulz", email: "tim@example.com", status: "gesichtet", createdAt: "2026-03-05T09:00:00Z", source: "Empfehlung" },
  { id: 4, jobId: 4, firstName: "Mia", lastName: "Hoffmann", email: "mia@example.com", phone: "+49 170 9012", status: "telefonat", createdAt: "2026-03-03T16:00:00Z", source: "Indeed" },
  { id: 5, jobId: null, firstName: "Felix", lastName: "Wagner", email: "felix@example.com", status: "neu", createdAt: "2026-03-09T11:00:00Z", source: "Website", coverLetter: "Initiativbewerbung als Yoga-Trainer." },
  { id: 6, jobId: 1, firstName: "Lukas", lastName: "Fit", email: "lukas.fit@gmail.com", phone: "+49 176 5555 1234", status: "probetraining", createdAt: "2026-03-07T09:30:00Z", source: "Empfehlung", city: "Göppingen", profession: "Personal Trainer", coverLetter: "Ich bin seit 6 Jahren leidenschaftlicher Fitness-Trainer mit A-Lizenz und CrossFit L2 Zertifizierung. Ich würde mich freuen, Teil des NAC-Teams zu werden!" },
];

/** Liest den Karriere-Store aus localStorage; fällt auf Seed-Daten zurück */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _getMockKarriereStore(): { jobs: any[]; benefits: any[]; applicants: any[] } {
  try {
    const raw = localStorage.getItem(KARRIERE_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.jobs) return parsed;
    }
  } catch { /* fall through */ }
  return {
    jobs: KARRIERE_SEED_JOBS.map(j => ({ ...j })),
    benefits: KARRIERE_SEED_BENEFITS.map(b => ({ ...b })),
    applicants: KARRIERE_SEED_APPLICANTS.map(a => ({ ...a })),
  };
}

/** Speichert den Karriere-Store in localStorage */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _setMockKarriereStore(store: { jobs: any[]; benefits: any[]; applicants: any[] }) {
  try { localStorage.setItem(KARRIERE_LS_KEY, JSON.stringify(store)); } catch { /* noop */ }
}

// Map team profile slug → staff user_id for linking
const _profileUserMap: Record<string, string> = {
  mimi: "3", dome: "2", jana: "4", lydi: "7", leo: "8",
};

function _initTeamProfiles(TEAM_MEMBERS: any[]) {
  if (_mockTeamProfiles !== null) return;
  _mockTeamProfiles = TEAM_MEMBERS.map((m: any, idx: number) => ({
    id: m.id,
    slug: m.id,
    user_id: _profileUserMap[m.id] || null,
    name: m.name,
    first_name: m.name.split(" ")[0] || "",
    last_name: m.name.split(" ").slice(1).join(" ") || "",
    position: m.role,
    role: m.role,
    type: m.type,
    profile_image: m.image,
    detail_image: m.image,
    bio: m.bio,
    meta_bio: `Premium Fitness in Goeppingen – ${m.name}, ${m.role} im Nice Athletic Club. ${m.specialties?.slice(0, 2).join(", ") || ""}`,
    specialties: m.specialties || [],
    certifications: m.certifications || [],
    image: m.image,
    instagram: m.instagram || "",
    facebook: "",
    linkedin: "",
    tiktok: "",
    snapchat: "",
    visible: m.visible !== false,
    sort_order: idx,
  }));
}

/** Find mock team profile by user_id */
function _findProfileByUserId(userId: string): any | null {
  if (!_mockTeamProfiles) return null;
  return _mockTeamProfiles.find((p: any) => p.user_id === userId) || null;
}

/** Find mock team profile by name match */
function _findProfileByName(firstName: string, lastName: string): any | null {
  if (!_mockTeamProfiles) return null;
  const fullLower = `${firstName} ${lastName}`.trim().toLowerCase();
  return _mockTeamProfiles.find((p: any) => {
    const pName = `${p.first_name} ${p.last_name}`.trim().toLowerCase();
    return pName === fullLower || p.name?.toLowerCase() === fullLower;
  }) || null;
}

/** Deaktiviert den Mock-Fallback temporär (z.B. für System-Check) */
export function setMockFallbackEnabled(enabled: boolean) {
  _mockFallbackDisabled = !enabled;
  // Wenn Mock deaktiviert wird (System-Check), auch Toasts unterdrücken
  _toastsSuppressed = !enabled;
}

/** Loggt den Offline-Fallback einmalig in die Konsole (kein sichtbarer Toast für Besucher) */
function notifyMockActive() {
  if (!_mockFallbackNotified) {
    _mockFallbackNotified = true;
    console.info(
      "%c[NAC] Mock-Fallback aktiv – API nicht erreichbar, verwende lokale Daten",
      "color:#CA0C85;font-weight:bold"
    );
  }
}

/** Gibt Mock-Daten für GET-Requests oder simulierte Erfolgsantworten für Schreiboperationen zurück */
async function getMockFallback<T>(endpoint: string, method?: string, body?: string): Promise<T | null> {
  try {
    // Normalize: strip .php extension for forward-compat (old URLs still work in mock)
    const _normalizedEndpoint = endpoint.replace(/\.php(\?|$)/, (_, q) => q ?? "");
    const ep = _normalizedEndpoint.split("?")[0];
    endpoint = _normalizedEndpoint; // shadow for all downstream checks
    const isWrite = method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";

    // ── GET: Vollständige Mock-Daten ────────────────────────────────────────
    if (!isWrite) {
      const { TEAM_MEMBERS, TIMETABLE } = await import("../data/team");
      const { MEMBERSHIP_PLANS } = await import("../data/classes");
      const { DEFAULT_PRICING_DATA } = await import("../data/classes");
      const { PRESS_ARTICLES } = await import("../data/press");
      const { MOCK_REVIEWS, MOCK_REVIEW_STATS } = await import("../data/reviews");

      const mockCourses = TIMETABLE.map((t, i) => {
        const DAY_LONG: Record<string, string> = {
          Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch",
          Do: "Donnerstag", Fr: "Freitag", Sa: "Samstag", So: "Sonntag",
        };
        return {
          id: t.id ?? String(i + 1),
          title: t.title,
          category: t.category ?? "Functional",
          instructor: t.trainer,
          is_recurring: true,
          weekday: DAY_LONG[t.day] ?? t.day,
          time: t.time,
          duration: t.duration ?? "60 min",
          capacity: t.spots ?? 20,
          enrolled: (t.spots ?? 20) - (t.spotsLeft ?? 5),
          active: true,
          locked: false,
        };
      });

      const mockMembers = [
        { id: "1", first_name: "Max", last_name: "Mustermann", email: "max@example.com", phone: "+49 176 1234", status: "active", is_blocked: false, contract_type: "performance", member_since: "2024-01-15", notes: null },
        { id: "2", first_name: "Lisa", last_name: "Bergmann", email: "lisa@example.com", phone: "+49 151 9876", status: "active", is_blocked: false, contract_type: "elite", member_since: "2023-06-01", notes: null },
        { id: "3", first_name: "Jonas", last_name: "Richter", email: "jonas@example.com", status: "active", is_blocked: false, contract_type: "starter", member_since: "2025-03-10", notes: null },
        { id: "4", first_name: "Sarah", last_name: "Möller", email: "sarah@example.com", phone: "+49 177 2345", status: "frozen", is_blocked: false, contract_type: "performance", member_since: "2024-09-01", notes: "Pausierung bis 01.04." },
        { id: "5", first_name: "Felix", last_name: "Wagner", email: "felix@example.com", status: "active", is_blocked: false, contract_type: "elite", member_since: "2023-11-20", notes: null },
        { id: "6", first_name: "Laura", last_name: "Schneider", email: "laura@example.com", phone: "+49 160 5678", status: "active", is_blocked: false, contract_type: "performance", member_since: "2024-05-12", notes: null },
        { id: "7", first_name: "Tim", last_name: "Becker", email: "tim@example.com", status: "terminated", is_blocked: false, contract_type: "starter", member_since: "2023-03-01", notes: "Kündigung zum 31.03." },
        { id: "8", first_name: "Nina", last_name: "Fischer", email: "nina@example.com", phone: "+49 172 8901", status: "active", is_blocked: false, contract_type: "elite", member_since: "2024-11-15", notes: null },
      ];

      const mockInvoices = [
        { id: "INV-001", invoice_number: "RE-2026-001", member_id: "1", member_name: "Max Mustermann", amount: 99, due_date: "2026-03-01", status: "paid", dunning_level: 0, created_at: "2026-02-15" },
        { id: "INV-002", invoice_number: "RE-2026-002", member_id: "2", member_name: "Lisa Bergmann", amount: 119, due_date: "2026-03-01", status: "open", dunning_level: 0, created_at: "2026-02-15" },
        { id: "INV-003", invoice_number: "RE-2026-003", member_id: "4", member_name: "Sarah Möller", amount: 99, due_date: "2026-02-01", status: "overdue", dunning_level: 1, created_at: "2026-01-15" },
        { id: "INV-004", invoice_number: "RE-2026-004", member_id: "5", member_name: "Felix Wagner", amount: 119, due_date: "2026-03-01", status: "paid", dunning_level: 0, created_at: "2026-02-15" },
        { id: "INV-005", invoice_number: "RE-2026-005", member_id: "6", member_name: "Laura Schneider", amount: 99, due_date: "2026-03-15", status: "open", dunning_level: 0, created_at: "2026-03-01" },
      ];

      // ── UUID-Konstanten (ein UUID pro Identität, rollenübergreifend) ─────────
      const UUID = {
        admin:  "f47ac10b-58cc-4372-a567-0e02b2c3d479", // Admin NAC   (user_id: 1)
        dome:   "550e8400-e29b-41d4-a716-446655440000", // Dome Fuchs  (user_id: 2, staff)
        kraus:  "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // M. Kraus    (user_id: 3, trainer)
        jana:   "6ba7b811-9dad-11d1-80b4-00c04fd430c8", // Jana Ebt    (user_id: 4, reception)
        max:    "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // Max Musterml(member_id: 1)
        lisa:   "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", // Lisa Bergm. (member_id: 2)
        jonas:  "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13", // Jonas Richter(member_id: 3)
        sarah:  "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14", // Sarah M.    (member_id: 4, pseudonymized)
        felix:  "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15", // Felix Wagner(member_id: 5)
        cron:   "00000000-0000-0000-0000-00000000cron", // CronJob-System
        system: "00000000-0000-0000-0000-0000system01",  // Interne Automatisierung
      };
      const mockAudit: AuditLog[] = [
        // ── 17. März 2026 ─────────────────────────────────────────────────────
        { id:"1",  uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"sepa_collection_batch",    entity_type:"sepa",     entity_id:"batch-2026-03", severity:"info",     ip_address:null,         user_agent:null,                              session_id:null,              details:{ processed:847, total_amount:81453, failed:2, failed_member_ids:["4","7"] }, timestamp:"2026-03-17T06:00:00Z" },
        { id:"2",  uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"google_reviews_cache_refresh", entity_type:"cron",  entity_id:"reviews-cache", severity:"info",   ip_address:null,         user_agent:null,                              session_id:null,              details:{ reviews_fetched:47, avg_rating:4.8, cache_ttl_hours:24 },                timestamp:"2026-03-17T05:30:00Z" },
        { id:"3",  uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"login",                    entity_type:"auth",     entity_id:"session-a1b2",  severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ device:"Desktop", browser:"Chrome 124", os:"Windows 11" },            timestamp:"2026-03-17T08:12:00Z" },
        { id:"4",  uuid:UUID.max,    user_id:"1",  user_name:"Max Mustermann",gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"login",                    entity_type:"auth",     entity_id:"session-m1",    severity:"info",     ip_address:"176.24.88.12",user_agent:"Safari/17 iPhone iOS 17",        session_id:"sess-m1x2y3",    details:{ device:"Mobile", browser:"Safari 17", os:"iOS 17" },                 timestamp:"2026-03-17T07:45:00Z" },
        { id:"5",  uuid:UUID.max,    user_id:"1",  user_name:"Max Mustermann",gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"book_course",              entity_type:"course",   entity_id:"hyrox-sat-01",  severity:"info",     ip_address:"176.24.88.12",user_agent:"Safari/17 iPhone iOS 17",        session_id:"sess-m1x2y3",    details:{ course:"HYROX Race Prep", weekday:"Samstag", time:"10:00", spots_left:7 }, timestamp:"2026-03-17T08:30:00Z" },
        { id:"6",  uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"block_member",             entity_type:"member",   entity_id:"7",             severity:"critical", ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ reason:"Zahlungsrückstand >60 Tage", member:"Tim Becker", amount_due:238, notification_sent:true }, timestamp:"2026-03-17T09:15:00Z" },
        // ── 16. März 2026 ─────────────────────────────────────────────────────
        { id:"7",  uuid:UUID.system, user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"system", actor_role:null,        source:"system",    action:"auto_freeze_member",       entity_type:"member",   entity_id:"4",             severity:"warning",  ip_address:null,         user_agent:null,                              session_id:null,              details:{ trigger:"sepa_failure_2nd_attempt", member_id:"4", next_retry:"2026-04-01", notification:"mail+sms" }, timestamp:"2026-03-16T18:00:00Z" },
        { id:"8",  uuid:UUID.lisa,   user_id:"2",  user_name:"Lisa Bergmann", gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"password_change",          entity_type:"auth",     entity_id:"user-2",        severity:"warning",  ip_address:"85.22.140.5",user_agent:"Firefox/123 MacOS",               session_id:"sess-l2m3n4",    details:{ method:"email_link", previous_hash_updated:true },                  timestamp:"2026-03-16T19:45:00Z" },
        { id:"9",  uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"storno_invoice",           entity_type:"invoice",  entity_id:"INV-003",       severity:"critical", ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ before:{ status:"open", amount:99 }, after:{ status:"cancelled" }, reason:"Pausierung genehmigt", suffix:"-STO" }, timestamp:"2026-03-16T14:30:00Z" },
        { id:"10", uuid:UUID.felix,  user_id:"5",  user_name:"Felix Wagner",  gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"sepa_update",              entity_type:"sepa_mandate",entity_id:"NAC-SEPA-2025-003",severity:"warning",ip_address:"94.12.35.99",user_agent:"Chrome/124 Android",             session_id:"sess-f5g6h7",    details:{ iban_masked_new:"DE55 **** **** **** **** 44", old_mandate_revoked:true, new_mandate_reference:"NAC-SEPA-2026-008" }, timestamp:"2026-03-16T11:20:00Z" },
        { id:"11", uuid:UUID.dome,   user_id:"2",  user_name:"Dome Fuchs",    gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"trainer",   source:"admin_ui",  action:"update_course",            entity_type:"course",   entity_id:"cf-1",          severity:"info",     ip_address:"85.22.140.5",user_agent:"Chrome/124 MacOS",                session_id:"sess-d2o3m4",    details:{ before:{ capacity:16 }, after:{ capacity:20 }, title:"CrossFit WOD" },  timestamp:"2026-03-16T10:45:00Z" },
        { id:"12", uuid:UUID.jana,   user_id:"4",  user_name:"Jana Ebt",      gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"reception", source:"admin_ui",  action:"create_lead",              entity_type:"lead",     entity_id:"lead-012",      severity:"info",     ip_address:"88.77.66.55",user_agent:"Edge/123 Win11",                  session_id:"sess-j4k5l6",    details:{ name:"Tobias Mair", type:"trial", goal:"gewichtsverlust", source:"website" }, timestamp:"2026-03-16T09:30:00Z" },
        // ── 15. März 2026 ─────────────────────────────────────────────────────
        { id:"13", uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"dunning_run_auto",         entity_type:"invoice",  entity_id:"batch-dunning", severity:"warning",  ip_address:null,         user_agent:null,                              session_id:null,              details:{ checked:847, affected:3, level_1_new:2, level_2_new:1, total_overdue_eur:397 }, timestamp:"2026-03-15T09:00:00Z" },
        { id:"14", uuid:UUID.lisa,   user_id:"2",  user_name:"Lisa Bergmann", gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"cancel_booking",           entity_type:"booking",  entity_id:"bk-lisa-07",    severity:"info",     ip_address:"85.22.140.5",user_agent:"Firefox/123 MacOS",               session_id:"sess-l2m3n4",    details:{ course:"Strength Advanced", date:"2026-03-18", spots_released:1 },     timestamp:"2026-03-15T20:15:00Z" },
        { id:"15", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"data_export",              entity_type:"member",   entity_id:"export-all",    severity:"critical", ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ export_type:"member_list_csv", record_count:1043, fields:["id","uuid","name","email","contract"], gdpr_note:"Pseudonymisiert" }, timestamp:"2026-03-15T08:30:00Z" },
        // ── 14. März 2026 ─────────────────────────────────────────────────────
        { id:"16", uuid:UUID.jonas,  user_id:"3",  user_name:"Jonas Richter", gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"profile_update",           entity_type:"member",   entity_id:"3",             severity:"info",     ip_address:"212.45.67.89",user_agent:"Chrome/124 Win11",               session_id:"sess-j3o4n5",    details:{ before:{ phone:"+49 176 0001234" }, after:{ phone:"+49 151 9876543" }, changed_fields:["phone"] }, timestamp:"2026-03-14T18:20:00Z" },
        { id:"17", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"convert_lead",             entity_type:"lead",     entity_id:"lead-005",      severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ lead_name:"Tom Keller", contract_type:"performance", new_member_id:"9", converted_at:"2026-03-14" }, timestamp:"2026-03-14T11:45:00Z" },
        { id:"18", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"revoke_mandate",           entity_type:"sepa_mandate",entity_id:"NAC-SEPA-2024-010",severity:"critical",ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",               session_id:"sess-a1b2c3d4",   details:{ member:"Tim Becker", reason:"Kündigung verarbeitet", mandate_status_before:"active", revoked_at:"2026-03-14" }, timestamp:"2026-03-14T10:30:00Z" },
        { id:"19", uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"db_backup_complete",       entity_type:"cron",     entity_id:"backup-20260314", severity:"info",   ip_address:null,         user_agent:null,                              session_id:null,              details:{ size_mb:2847, duration_sec:142, location:"s3://nac-backup/2026/03/14", tables:["members","invoices","audit_logs"] }, timestamp:"2026-03-14T03:00:00Z" },
        // ── 13. März 2026 ─────────────────────────────────────────────────────
        { id:"20", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"create_invoice",           entity_type:"invoice",  entity_id:"INV-005",       severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ member:"Laura Schneider", amount:99, type:"Monatsbeitrag März", due_date:"2026-03-15" }, timestamp:"2026-03-13T16:40:00Z" },
        { id:"21", uuid:UUID.sarah,  user_id:null, user_name:null,           gdpr_pseudonymized:true,  actor_type:"member", actor_role:"member",    source:"member_ui", action:"pause_request",            entity_type:"member",   entity_id:"4",             severity:"info",     ip_address:null,         user_agent:null,                              session_id:null,              details:{ start:"2026-03-01", end:"2026-04-01", reason_category:"gesundheit" },  timestamp:"2026-03-13T11:20:00Z" },
        // ── 12. März 2026 ─────────────────────────────────────────────────────
        { id:"22", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"update_tarif",             entity_type:"tarif",    entity_id:"elite",         severity:"warning",  ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ before:{ price:109, name:"Elite" }, after:{ price:119, name:"Elite" }, effective_date:"2026-04-01", affected_members:312 }, timestamp:"2026-03-12T15:45:00Z" },
        { id:"23", uuid:UUID.system, user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"system", actor_role:null,        source:"system",    action:"auto_status_update",       entity_type:"member",   entity_id:"batch-exp",     severity:"info",     ip_address:null,         user_agent:null,                              session_id:null,              details:{ trigger:"contract_end_reached", affected:4, statuses_set:"terminated", batch_id:"asu-20260312" }, timestamp:"2026-03-12T09:00:00Z" },
        // ── 11. März 2026 ─────────────────────────────────────────────────────
        { id:"24", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"update_settings",          entity_type:"settings", entity_id:"studio",        severity:"warning",  ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ before:{ phone:"+49 7161 9163660" }, after:{ phone:"+49 (0) 7161 / 9163663" }, field:"phone" }, timestamp:"2026-03-11T10:00:00Z" },
        { id:"25", uuid:UUID.kraus,  user_id:"3",  user_name:"Michael Kraus", gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"trainer",   source:"admin_ui",  action:"create_course",            entity_type:"course",   entity_id:"hx-new",        severity:"info",     ip_address:"172.16.0.44",user_agent:"Safari/17 MacOS",                 session_id:"sess-k3r4u5",    details:{ title:"HYROX Race Prep", weekday:"Samstag", time:"10:00", capacity:12, trainer:"Michael Kraus" }, timestamp:"2026-03-11T14:20:00Z" },
        // ── 10. März 2026 ─────────────────────────────────────────────────────
        { id:"26", uuid:UUID.dome,   user_id:"2",  user_name:"Dome Fuchs",    gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"trainer",   source:"admin_ui",  action:"delete_course",            entity_type:"course",   entity_id:"old-3",         severity:"warning",  ip_address:"85.22.140.5",user_agent:"Chrome/124 MacOS",                session_id:"sess-d2o3m4",    details:{ title:"Morning Stretch (abgesetzt)", reason:"Zu wenig Teilnehmer", enrolled_at_time:2, notified:true }, timestamp:"2026-03-10T17:30:00Z" },
        { id:"27", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"mark_paid",                entity_type:"invoice",  entity_id:"INV-001",       severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1b2c3d4",   details:{ member:"Max Mustermann", amount:99, method:"Barzahlung", receipt_nr:"BAR-2026-031001" }, timestamp:"2026-03-10T14:30:00Z" },
        { id:"28", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"login",                    entity_type:"auth",     entity_id:"session-a9b8",  severity:"info",     ip_address:"91.44.12.87",user_agent:"Safari/17 iOS 17",                session_id:"sess-a9b8c7",    details:{ device:"Mobile", browser:"Safari 17", os:"iOS 17" },                  timestamp:"2026-03-10T08:12:00Z" },
        { id:"29", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"update_member",            entity_type:"member",   entity_id:"4",             severity:"warning",  ip_address:"91.44.12.87",user_agent:"Safari/17 iOS 17",                session_id:"sess-a9b8c7",    details:{ before:{ status:"active" }, after:{ status:"frozen" }, reason:"Pausierung auf Wunsch – Antrag genehmigt" }, timestamp:"2026-03-10T08:25:00Z" },
        // ── 9. März 2026 ──────────────────────────────────────────────────────
        { id:"30", uuid:UUID.felix,  user_id:"5",  user_name:"Felix Wagner",  gdpr_pseudonymized:false, actor_type:"member", actor_role:"member",    source:"member_ui", action:"contract_upgrade",         entity_type:"member",   entity_id:"5",             severity:"info",     ip_address:"94.12.35.99",user_agent:"Chrome/124 Android",              session_id:"sess-f5g6h7",    details:{ before:{ contract_type:"performance" }, after:{ contract_type:"elite" }, effective_date:"2026-04-01" }, timestamp:"2026-03-09T20:00:00Z" },
        { id:"31", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"block_member",             entity_type:"member",   entity_id:"7",             severity:"critical", ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a9x0y1",    details:{ reason:"Zahlungsrueckstand", member:"Tim Becker", amount_due:238, notification_sent:true }, timestamp:"2026-03-09T15:10:00Z" },
        { id:"32", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"update_settings",          entity_type:"settings", entity_id:"studio",        severity:"warning",  ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a9x0y1",    details:{ before:{ phone:"+49 7161 9163660" }, after:{ phone:"+49 (0) 7161 / 9163663" } }, timestamp:"2026-03-09T10:00:00Z" },
        // ── 8. März 2026 ──────────────────────────────────────────────────────
        { id:"33", uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"sepa_collection_failed",   entity_type:"sepa",     entity_id:"NAC-SEPA-2025-004", severity:"critical",ip_address:null,         user_agent:null,                              session_id:null,              details:{ member_id:"4", mandate:"NAC-SEPA-2025-004", reason:"Konto nicht gedeckt (AC01)", retry_count:2, next_action:"escalate_inkasso" }, timestamp:"2026-03-08T06:00:00Z" },
        { id:"34", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"create_mandate",           entity_type:"sepa_mandate",entity_id:"NAC-SEPA-2026-007",severity:"info",  ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a8b9c0",    details:{ member:"Jonas Richter", iban_masked:"DE50 **** **** **** **** 33", bic:"GENODES1VBH" }, timestamp:"2026-03-08T11:00:00Z" },
        { id:"35", uuid:UUID.jana,   user_id:"4",  user_name:"Jana Ebt",      gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"reception", source:"admin_ui",  action:"create_lead",              entity_type:"lead",     entity_id:"lead-007",      severity:"info",     ip_address:"88.77.66.55",user_agent:"Edge/123 Win11",                  session_id:"sess-j4k5l6",    details:{ name:"Felix Wagner", type:"contact", goal:"crossfit" },               timestamp:"2026-03-08T09:15:00Z" },
        { id:"36", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"create_press",             entity_type:"press",    entity_id:"press-007",     severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a8b9c0",    details:{ outlet:"Südwest Presse", title:"Eislinger Fitnesspfad: Mimi Kraus wird Vorturner" }, timestamp:"2026-03-08T12:10:00Z" },
        // ── 7. März 2026 ──────────────────────────────────────────────────────
        { id:"37", uuid:UUID.cron,   user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"cron",   actor_role:null,        source:"cron",      action:"session_cleanup",          entity_type:"cron",     entity_id:"cleanup-20260307", severity:"info",  ip_address:null,         user_agent:null,                              session_id:null,              details:{ sessions_expired:284, sessions_deleted:284, duration_ms:312 },       timestamp:"2026-03-07T04:00:00Z" },
        { id:"38", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"unblock_member",           entity_type:"member",   entity_id:"7",             severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a7b8c9",    details:{ reason:"Zahlung eingegangen", member:"Tim Becker", payment_ref:"ZHG-20260307" }, timestamp:"2026-03-07T10:30:00Z" },
        { id:"39", uuid:UUID.jana,   user_id:"4",  user_name:"Jana Ebt",      gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"reception", source:"admin_ui",  action:"update_lead_status",       entity_type:"lead",     entity_id:"lead-002",      severity:"info",     ip_address:"88.77.66.55",user_agent:"Edge/123 Win11",                  session_id:"sess-j4k5l6",    details:{ before:{ status:"Neu" }, after:{ status:"Kontaktiert" }, note:"Telefonisch erreicht, Probetraining vereinbart" }, timestamp:"2026-03-07T14:55:00Z" },
        // ── 5. März 2026 ──────────────────────────────────────────────────────
        { id:"40", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"escalate_inkasso",         entity_type:"inkasso",  entity_id:"INK-003",       severity:"critical", ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a5b6c7",    details:{ invoice:"RE-2026-003", member:"Sarah Möller", amount:99, dunning_level:3, inkasso_id:"INK-2026-001" }, timestamp:"2026-03-05T15:20:00Z" },
        { id:"41", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"approve_pause",            entity_type:"member",   entity_id:"4",             severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a5b6c7",    details:{ before:{ status:"active" }, after:{ status:"frozen" }, start:"2026-03-01", end:"2026-04-01", reason:"krankheit" }, timestamp:"2026-03-05T11:20:00Z" },
        // ── 4. März 2026 ──────────────────────────────────────────────────────
        { id:"42", uuid:UUID.dome,   user_id:"2",  user_name:"Dome Fuchs",    gdpr_pseudonymized:false, actor_type:"staff",  actor_role:"trainer",   source:"admin_ui",  action:"login",                    entity_type:"auth",     entity_id:"session-d02",   severity:"info",     ip_address:"85.22.140.5",user_agent:"Chrome/124 MacOS",                session_id:"sess-d4o5m6",    details:{ device:"Desktop", browser:"Chrome 124", os:"macOS 14" },               timestamp:"2026-03-04T07:45:00Z" },
        { id:"43", uuid:UUID.system, user_id:null, user_name:null,           gdpr_pseudonymized:false, actor_type:"system", actor_role:null,        source:"system",    action:"jwt_token_cleanup",        entity_type:"cron",     entity_id:"jwt-cleanup",   severity:"info",     ip_address:null,         user_agent:null,                              session_id:null,              details:{ tokens_expired:1847, tokens_purged:1847, duration_ms:89 },            timestamp:"2026-03-04T00:00:00Z" },
        // ── 1. März 2026 ──────────────────────────────────────────────────────
        { id:"44", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"create_member",            entity_type:"member",   entity_id:"8",             severity:"info",     ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1m2e3",    details:{ name:"Nina Fischer", contract_type:"elite", source:"Probetraining", uuid_assigned:UUID.system }, timestamp:"2026-03-01T16:50:00Z" },
        { id:"45", uuid:UUID.admin,  user_id:"1",  user_name:"Admin NAC",    gdpr_pseudonymized:false, actor_type:"admin",  actor_role:"admin",     source:"admin_ui",  action:"process_termination",      entity_type:"member",   entity_id:"7",             severity:"warning",  ip_address:"91.44.12.87",user_agent:"Chrome/124 Win11",                session_id:"sess-a1m2e3",    details:{ member:"Tim Becker", effective_date:"2026-03-31", reason:"umzug", mandate_revoked:true } , timestamp:"2026-03-01T09:00:00Z" },
      ];

      const mockSettings: Record<string, string> = {
        // Studio (öffentlich)
        studio_name:    "Nice Athletic Club Göppingen",
        phone:          "+49 (0) 7161 / 9163663",
        email:          "info@nice-fitness.de",
        website:        "https://www.nice-fitness.de",
        // Firma / Absender
        company_name:   "MK Fitness & Strength GmbH",
        company_street: "Robert-Bosch-Str. 5",
        company_zip:    "73037",
        company_city:   "Göppingen",
        company_email:  "info@nice-fitness.de",
        vat_id:         "DE320247039",
        company_court:  "Amtsgericht Ulm",
        company_hrb:    "HRB 737370",
        ceo:            "Wilhelm Walter",
        // Bankverbindung
        bank_iban:      "DE89 3704 0044 0532 0130 00",
        bank_bic:       "COBADEFFXXX",
        bank_name:      "Commerzbank AG",
        // Logo
        logo_url:       "",
        // Rechnungswesen
        invoice_number_format: "RE-ymd-###",
        storno_suffix:  "-STO",
        vat_rate:       "19",
      };

      const mockStaff = [
        { id: "1", first_name: "Admin", last_name: "NAC", name: "Admin NAC", email: "admin@niceathleticclub.de", role: "admin", active: true },
        { id: "2", first_name: "Dome", last_name: "Fuchs", name: "Dome Fuchs", email: "dome@nice-fitness.de", role: "trainer", active: true },
        { id: "3", first_name: "Michael", last_name: "Kraus", name: "Michael Kraus", email: "mimi@nice-fitness.de", role: "trainer", active: true },
        { id: "4", first_name: "Jana", last_name: "Ebt", name: "Jana Ebt", email: "jana@nice-fitness.de", role: "trainer", active: true },
        { id: "5", first_name: "Sarah", last_name: "Coach", name: "Sarah Coach", email: "sarah.coach@nice-fitness.de", role: "trainer", active: true, permissions: ["Kurse verwalten"], staff_number: "NAC-005", phone: "+49 170 9876 5432", hire_date: "2025-06-15", hired_at: "2025-06-15T00:00:00Z", source: "manual", status: "aktiv" },
        { id: "6", first_name: "Thomas", last_name: "Meier", name: "Thomas Meier", email: "thomas.meier@nice-fitness.de", role: "trainer", active: false, permissions: [], staff_number: "NAC-006", phone: "+49 151 1234 0000", hire_date: "2024-01-10", hired_at: "2024-01-10T00:00:00Z", exit_date: "2026-02-28", terminated_at: "2026-02-28", termination_reason: "umzug", source: "manual", status: "gekuendigt" },
        { id: "7", first_name: "Lydi", last_name: "Tauber", name: "Lydi Tauber", email: "lydi@nice-fitness.de", role: "trainer", active: true },
        { id: "8", first_name: "Leo", last_name: "Holzner", name: "Leo Holzner", email: "leo@nice-fitness.de", role: "trainer", active: true },
      ];

      const mockLeads = [
        { id: "001", type: "trial", name: "Max Mustermann", email: "max.mustermann@gmail.com", phone: "+49 176 1234 5678", goal: "muskelaufbau", desired_date: "2026-03-03", status: "Neu", created_at: "2026-02-24T09:15:00Z" },
        { id: "002", type: "trial", name: "Lisa Bergmann", email: "l.bergmann@web.de", phone: "+49 151 9876 5432", goal: "abnehmen", desired_date: "2026-03-05", status: "Kontaktiert", created_at: "2026-02-23T14:22:00Z" },
        { id: "003", type: "trial", name: "Jonas Richter", email: "jonas.richter@outlook.de", goal: "crossfit", desired_date: "2026-03-04", status: "Bestätigt", created_at: "2026-02-22T11:00:00Z" },
        { id: "004", type: "contact", name: "Sarah Möller", email: "sarah.moeller@icloud.com", phone: "+49 177 2345 6789", goal: "fitness", desired_date: "2026-03-07", status: "Neu", created_at: "2026-02-22T08:30:00Z" },
        { id: "005", type: "trial", name: "Tom Keller", email: "t.keller@gmx.de", goal: "muskelaufbau", desired_date: "2026-02-28", status: "Bestätigt", created_at: "2026-02-21T16:45:00Z" },
        { id: "006", type: "trial", name: "Anna Schuster", email: "anna.s@googlemail.com", phone: "+49 162 8765 4321", goal: "abnehmen", desired_date: "2026-03-10", status: "Abgesagt", created_at: "2026-02-20T10:00:00Z" },
        { id: "007", type: "contact", name: "Felix Wagner", email: "felix.w@web.de", goal: "crossfit", desired_date: "2026-03-06", status: "Kontaktiert", created_at: "2026-02-20T09:15:00Z" },
        { id: "008", type: "trial", name: "Mia Hofmann", email: "mia.hofmann@t-online.de", phone: "+49 170 3456 7890", goal: "fitness", desired_date: "2026-03-12", status: "Neu", created_at: "2026-02-19T13:20:00Z" },
      ];

      const mockRequests = {
        pauses: [
          { id: "p1", member_id: "4", first_name: "Sarah", last_name: "Möller", email: "sarah@example.com", start_date: "2026-03-01", end_date: "2026-04-01", reason: "krankheit", status: "pending", created_at: "2026-02-25" },
        ],
        terminations: [
          { id: "t1", member_id: "7", first_name: "Tim", last_name: "Becker", email: "tim@example.com", requested_date: "2026-03-31", reason: "umzug", status: "pending", created_at: "2026-02-20" },
        ],
      };

      const mockBookings: Booking[] = [
        { id: "bk-1", course_id: "1", course_title: "CrossFit WOD", course_weekday: "Montag", course_time: "06:30", course_category: "CrossFit", instructor: "Lydi Tauber", booking_type: "member", member_id: "1", member_name: "Max Mustermann", status: "confirmed", booked_at: "2026-03-09T18:00:00Z" },
        { id: "bk-2", course_id: "3", course_title: "Functional Training", course_weekday: "Montag", course_time: "08:00", course_category: "Functional", instructor: "Jana Ebt", booking_type: "guest", guest_name: "Sophie Klein", guest_email: "sophie.klein@gmail.com", guest_phone: "+49 176 5555 1234", status: "confirmed", booked_at: "2026-03-09T19:30:00Z" },
        { id: "bk-3", course_id: "5", course_title: "Hyrox Training", course_weekday: "Dienstag", course_time: "17:00", course_category: "Hyrox", instructor: "Dome Fuchs", booking_type: "member", member_id: "2", member_name: "Lisa Bergmann", status: "confirmed", booked_at: "2026-03-08T14:20:00Z" },
        { id: "bk-4", course_id: "1", course_title: "CrossFit WOD", course_weekday: "Montag", course_time: "06:30", course_category: "CrossFit", instructor: "Lydi Tauber", booking_type: "guest", guest_name: "Tobias Meier", guest_email: "tobias.m@web.de", guest_phone: "+49 151 2222 3333", status: "attended", booked_at: "2026-03-02T20:15:00Z" },
        { id: "bk-5", course_id: "8", course_title: "Strength Advanced", course_weekday: "Mittwoch", course_time: "18:30", course_category: "Strength", instructor: "Michael Kraus", booking_type: "member", member_id: "5", member_name: "Felix Wagner", status: "cancelled", booked_at: "2026-03-07T09:00:00Z" },
        { id: "bk-6", course_id: "10", course_title: "Open Gym", course_weekday: "Freitag", course_time: "07:00", course_category: "Open Gym", instructor: "Leo Holzner", booking_type: "guest", guest_name: "Anna Braun", guest_email: "anna.braun@outlook.de", status: "no-show", booked_at: "2026-03-05T10:45:00Z" },
        { id: "bk-7", course_id: "2", course_title: "CrossFit WOD", course_weekday: "Montag", course_time: "06:30", course_category: "CrossFit", instructor: "Lydi Tauber", booking_type: "member", member_id: "6", member_name: "Laura Schneider", status: "confirmed", booked_at: "2026-03-10T07:30:00Z" },
      ];

      const getMap: Record<string, unknown> = {
        "/dashboard.php": {
          newLeads7d: mockLeads.filter((l: any) => {
            const d = new Date(l.created_at);
            return (Date.now() - d.getTime()) < 7 * 86400000;
          }).length,
          newLeads7dDelta: 2,
          courseOccupancy: Math.round(mockCourses.reduce((s, c) => s + (c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0), 0) / Math.max(mockCourses.length, 1)),
          courseOccupancyDelta: 3,
          activeMembers: mockMembers.filter((m) => m.status === "active").length,
          activeMembersDelta: 1,
          openRequests: mockLeads.filter((l: any) => l.status === "Neu").length,
          openRequestsDelta: -1,
          leadsPerDay: (() => {
            const result: { date: string; count: number }[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().split("T")[0];
              const cnt = mockLeads.filter((l: any) => l.created_at?.startsWith(dateStr)).length;
              result.push({ date: dateStr, count: cnt || Math.floor(Math.random() * 3) });
            }
            return result;
          })(),
        },
        "/team.php": (() => { _initTeamProfiles(TEAM_MEMBERS); return (_mockTeamProfiles || []).filter((p: any) => p.visible).sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)); })(),
        "/team.php?all=1": (() => { _initTeamProfiles(TEAM_MEMBERS); return (_mockTeamProfiles || []).sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999)); })(),
        "/tarife.php": MEMBERSHIP_PLANS,
        "/pricing.php": DEFAULT_PRICING_DATA,
        "/kurse.php": mockCourses,
        "/press.php": PRESS_ARTICLES,
        "/reviews.php": MOCK_REVIEWS.filter((r: any) => r.visible),
        "/leads.php": mockLeads,
        "/admin/members.php": mockMembers,
        "/admin/finances.php": mockInvoices,
        "/admin/finances.php?type=mandates": [
          { id: 1, member_id: "1", member_name: "Max Mustermann", iban_masked: "DE89 **** **** **** **** 30", bic: "COBADEFFXXX", mandate_reference: "NAC-SEPA-2025-001", signed_at: "2025-01-15", status: "active", last_collection_date: "2026-03-01", next_collection_date: "2026-04-01" },
          { id: 2, member_id: "2", member_name: "Lisa Bergmann", iban_masked: "DE71 **** **** **** **** 12", bic: "DEUTDEDBFRA", mandate_reference: "NAC-SEPA-2025-002", signed_at: "2025-02-01", status: "active", last_collection_date: "2026-03-01", next_collection_date: "2026-04-01" },
          { id: 3, member_id: "5", member_name: "Felix Wagner", iban_masked: "DE44 **** **** **** **** 55", bic: "GENODES1VBH", mandate_reference: "NAC-SEPA-2025-003", signed_at: "2025-06-10", status: "active", last_collection_date: "2026-03-01", next_collection_date: "2026-04-01" },
          { id: 4, member_id: "6", member_name: "Laura Schneider", iban_masked: "DE25 **** **** **** **** 89", bic: "COBADEFFXXX", mandate_reference: "NAC-SEPA-2025-004", signed_at: "2025-05-20", status: "active", last_collection_date: "2026-03-01", next_collection_date: "2026-04-01" },
          { id: 5, member_id: "8", member_name: "Nina Fischer", iban_masked: "DE63 **** **** **** **** 01", bic: "SOLADES1STU", mandate_reference: "NAC-SEPA-2025-005", signed_at: "2025-11-18", status: "active", last_collection_date: "2026-03-01", next_collection_date: "2026-04-01" },
          { id: 6, member_id: "7", member_name: "Tim Becker", iban_masked: "DE82 **** **** **** **** 77", bic: "COBADEFFXXX", mandate_reference: "NAC-SEPA-2024-010", signed_at: "2024-03-15", status: "revoked", revoked_at: "2026-02-28", last_collection_date: "2026-02-01" },
          { id: 7, member_id: "3", member_name: "Jonas Richter", iban_masked: "DE50 **** **** **** **** 33", bic: "GENODES1VBH", mandate_reference: "NAC-SEPA-2025-006", signed_at: "2025-03-12", status: "pending" },
        ],
        "/admin/finances.php?type=transactions": [
          { id: 1, invoice_id: 1, invoice_number: "RE-2026-001", mandate_id: 1, mandate_reference: "NAC-SEPA-2025-001", member_name: "Max Mustermann", amount: 99, type: "debit", status: "success", return_reason: null, retry_count: 0, processed_at: "2026-03-01T06:00:00Z", created_at: "2026-02-28T22:00:00Z" },
          { id: 2, invoice_id: 2, invoice_number: "RE-2026-002", mandate_id: 2, mandate_reference: "NAC-SEPA-2025-002", member_name: "Lisa Bergmann", amount: 119, type: "debit", status: "pending", return_reason: null, retry_count: 0, processed_at: null, created_at: "2026-03-01T06:00:00Z" },
          { id: 3, invoice_id: 3, invoice_number: "RE-2026-003", mandate_id: 4, mandate_reference: "NAC-SEPA-2025-004", member_name: "Sarah Möller", amount: 99, type: "debit", status: "failed", return_reason: "Konto nicht gedeckt (AC01)", retry_count: 1, processed_at: "2026-02-03T06:00:00Z", created_at: "2026-02-01T06:00:00Z" },
          { id: 4, invoice_id: 3, invoice_number: "RE-2026-003", mandate_id: 4, mandate_reference: "NAC-SEPA-2025-004", member_name: "Sarah Möller", amount: 99, type: "debit", status: "failed", return_reason: "Konto nicht gedeckt – 2. Versuch (AC01)", retry_count: 2, processed_at: "2026-02-10T06:00:00Z", created_at: "2026-02-08T06:00:00Z" },
          { id: 5, invoice_id: 4, invoice_number: "RE-2026-004", mandate_id: 3, mandate_reference: "NAC-SEPA-2025-003", member_name: "Felix Wagner", amount: 119, type: "debit", status: "success", return_reason: null, retry_count: 0, processed_at: "2026-03-01T06:00:00Z", created_at: "2026-02-28T22:00:00Z" },
          { id: 6, invoice_id: 5, invoice_number: "RE-2026-005", mandate_id: 4, mandate_reference: "NAC-SEPA-2025-004", member_name: "Laura Schneider", amount: 99, type: "debit", status: "success", return_reason: null, retry_count: 0, processed_at: "2026-03-15T06:00:00Z", created_at: "2026-03-14T22:00:00Z" },
          { id: 7, invoice_id: 1, invoice_number: "RE-2026-001", mandate_id: null, member_name: "Max Mustermann", amount: 5, type: "fee", status: "success", return_reason: null, retry_count: 0, processed_at: "2026-03-01T06:00:00Z", created_at: "2026-03-01T06:00:00Z" },
          { id: 8, invoice_id: 3, invoice_number: "RE-2026-003", mandate_id: null, member_name: "Sarah Möller", amount: 99, type: "refund", status: "success", return_reason: "Pausierung genehmigt – Storno", retry_count: 0, processed_at: "2026-03-03T14:00:00Z", created_at: "2026-03-03T10:15:00Z" },
          { id: 9, invoice_id: 2, invoice_number: "RE-2026-002", mandate_id: 2, mandate_reference: "NAC-SEPA-2025-002", member_name: "Lisa Bergmann", amount: 119, type: "debit", status: "reversed", return_reason: "SEPA-Ruecklastschrift – Widerspruch Kontoinhaber (MD06)", retry_count: 0, processed_at: "2026-03-05T10:00:00Z", created_at: "2026-03-01T06:00:00Z" },
          { id: 10, invoice_id: 6, invoice_number: "RE-2026-006", mandate_id: 5, mandate_reference: "NAC-SEPA-2025-005", member_name: "Nina Fischer", amount: 119, type: "debit", status: "success", return_reason: null, retry_count: 0, processed_at: "2026-03-01T06:00:00Z", created_at: "2026-02-28T22:00:00Z" },
          { id: 11, invoice_id: 6, invoice_number: "RE-2026-006", mandate_id: null, member_name: "Nina Fischer", amount: 119, type: "credit", status: "success", return_reason: "Gutschrift wegen Doppelbuchung", retry_count: 0, processed_at: "2026-03-08T09:30:00Z", created_at: "2026-03-08T09:00:00Z" },
        ],
        "/admin/finances.php?type=inkasso": [
          { id: "INK-001", invoice_id: "INV-EX1", invoice_number: "RE-2025-088", member_id: "10", member_name: "Marcel Gross", amount: 297, dunning_level: 3, escalated_at: "2026-01-15", status: "uebergeben", external_ref: "INK-2026-FRD-4412", notes: "An Inkasso-Partner Forderungsmanagement Schmidt uebergeben." },
          { id: "INK-002", invoice_id: "INV-EX2", invoice_number: "RE-2025-102", member_id: "11", member_name: "Claudia Huber", amount: 198, dunning_level: 3, escalated_at: "2026-02-10", status: "offen", notes: "3. Mahnung zugestellt, Frist bis 28.02. – noch kein Inkasso-Partner." },
          { id: "INK-003", invoice_id: "INV-EX3", invoice_number: "RE-2025-071", member_id: "12", member_name: "Tobias Klein", amount: 119, dunning_level: 3, escalated_at: "2025-11-20", status: "bezahlt", external_ref: "INK-2025-FRD-3301", notes: "Vollstaendige Zahlung am 15.01.2026 eingegangen." },
        ],
        "/member/sepa.php": { iban_masked: "DE89 **** **** **** **** 30", mandate_reference: "NAC-SEPA-2025-001", status: "active", signed_at: "2025-01-15", next_collection_date: "2026-04-01", cancellation_limit_hours: 24 },
        "/admin/audit_logs.php": mockAudit,
        "/admin/settings.php": mockSettings,
        "/public/settings.php": mockSettings,
        "/admin/users.php": [...mockStaff, ..._mockOnboardedStaff],
        "/admin/requests.php": mockRequests,
        "/admin/integrations.php": {
          settings: { base_url: "", client_id: "", studio_id: "", api_key: "", mode: "live" },
          magicline_enabled: false,
        },
        "/admin/smtp.php": {
          smtp_host: "host271.checkdomain.de",
          smtp_port: 465,
          smtp_user: "",
          smtp_pass: "",
          smtp_encryption: "ssl",
          from_email: "",
          from_name: "Nice Athletic Club",
          reply_to_email: "",
          is_active: false,
          last_test_at: null,
          last_test_ok: null,
          has_password: false,
        },
        "/admin/tracking.php": {
          checkins: [
            { week: "KW 8",  count: 4 },
            { week: "KW 9",  count: 3 },
            { week: "KW 10", count: 4 },
            { week: "KW 11", count: 2 },
          ],
          goals: {
            calories_goal: 2200, protein_goal: 160, carbs_goal: 220, fat_goal: 70,
            goal_type: "cut", target_weight: 80, target_date: "2026-06-01",
            coaching_note: "Fokus auf Proteinzufuhr – mind. 150g/Tag.",
            set_by_user_id: 1,
          },
          progress: [],
        },
        // Member Portal
        "/member/profile.php": mockMembers[0],
        "/member/stats.php": { checkins_this_month: 12, checkins_total: 87, upcoming_bookings: 2, membership_days_left: 245 },
        "/member/contracts.php": { invoices: mockInvoices.slice(0, 2), pauses: [] },
        "/member/sessions.php": [],
        "/member/bookings.php": [],
        "/member/tracking.php": {
          measurements: [
            { date: "2026-01-05", weight: 87.2, body_fat: 22.1, muscle_mass: 65.0 },
            { date: "2026-02-02", weight: 84.8, body_fat: 20.6, muscle_mass: 65.8 },
            { date: "2026-03-16", weight: 82.7, body_fat: 18.8, muscle_mass: 66.9, waist_cm: 87.0, hip_cm: 97.5 },
          ],
          goals: {
            calories_goal: 2200, protein_goal: 160, carbs_goal: 220, fat_goal: 70,
            goal_type: "cut", target_weight: 80, target_date: "2026-06-01",
            coaching_note: "Fokus auf Proteinzufuhr – mind. 150g/Tag.",
            set_by_trainer: true,
          },
          logs: [{ date: new Date().toISOString().split("T")[0], calories: 1850, protein: 142, carbs: 180, fat: 55, water_ml: 1800 }],
        },
        "/member/coaching.php": [
          { id: "cr-1", type: "training", status: "in_progress", goal: "Muskelaufbau – Fokus Oberkörper", notes: "12-Wochen-Plan für Hypertrophie, 4 Trainingstage/Woche.", created_at: "2026-02-20T10:00:00Z", assigned_to: "2", assigned_name: "Dome Fuchs", plan_data: { title: "Hypertrophie 12-Wochen Plan", description: "Progressiver Oberkörper-Split mit Periodisierung. Woche 1-4: Grundlagen, Woche 5-8: Intensität, Woche 9-12: Peaking.", items: [{ label: "Woche 1-2: Eingewöhnung – 3x12 @ RPE 7", done: true }, { label: "Woche 3-4: Volumen-Phase – 4x10 @ RPE 8", done: true }, { label: "Woche 5-6: Intensität steigern – 4x8 @ RPE 8.5", done: false }, { label: "Woche 7-8: Deload + Technikfokus", done: false }, { label: "Woche 9-10: Peak-Phase – 5x5 @ RPE 9", done: false }, { label: "Woche 11-12: Taper + Re-Test", done: false }], created_at: "2026-02-22T14:00:00Z", coach_name: "Dome Fuchs" } },
          { id: "cr-2", type: "nutrition", status: "open", goal: "Körperfettreduktion bei Muskelerhalt", notes: "Aktuell 87kg, Ziel 82kg in 3 Monaten. Brauche Ernährungsplan.", created_at: "2026-03-08T16:00:00Z" },
          { id: "cr-3", type: "both", status: "completed", goal: "Wettkampfvorbereitung HYROX", created_at: "2026-01-10T09:00:00Z", assigned_to: "3", assigned_name: "Michael Kraus", plan_data: { title: "HYROX Race Prep – 8 Wochen", description: "Kombinierter Trainings- und Ernährungsplan für optimale HYROX-Leistung.", items: [{ label: "Grundlagenausdauer aufbauen (Zone 2)", done: true }, { label: "Kraft-Ausdauer: Sled Push/Pull, Wall Balls", done: true }, { label: "Intervall-Training 3x/Woche", done: true }, { label: "Race-Pace Simulation", done: true }, { label: "Wettkampf-Ernährung testen", done: true }], created_at: "2026-01-12T10:00:00Z", coach_name: "Michael Kraus" } },
        ],
        "/admin/coaching.php": [
          { id: "cr-1", member_id: "1", member_name: "Max Mustermann", type: "training", status: "in_progress", goal: "Muskelaufbau – Fokus Oberkörper", notes: "12-Wochen-Plan für Hypertrophie, 4 Trainingstage/Woche.", created_at: "2026-02-20T10:00:00Z", assigned_to: "2", assigned_name: "Dome Fuchs", plan_data: { title: "Hypertrophie 12-Wochen Plan", description: "Progressiver Oberkörper-Split mit Periodisierung.", items: [{ label: "Woche 1-2: Eingewöhnung – 3x12 @ RPE 7", done: true }, { label: "Woche 3-4: Volumen-Phase – 4x10 @ RPE 8", done: true }, { label: "Woche 5-6: Intensität steigern – 4x8 @ RPE 8.5", done: false }, { label: "Woche 7-8: Deload + Technikfokus", done: false }], created_at: "2026-02-22T14:00:00Z", coach_name: "Dome Fuchs" } },
          { id: "cr-2", member_id: "2", member_name: "Lisa Bergmann", type: "nutrition", status: "open", goal: "Körperfettreduktion bei Muskelerhalt", notes: "Aktuell 87kg, Ziel 82kg in 3 Monaten.", created_at: "2026-03-08T16:00:00Z" },
          { id: "cr-3", member_id: "5", member_name: "Felix Wagner", type: "both", status: "open", goal: "HYROX Wettkampf-Vorbereitung", created_at: "2026-03-10T09:00:00Z" },
          { id: "cr-4", member_id: "6", member_name: "Laura Schneider", type: "training", status: "completed", goal: "Kraftsteigerung für Deadlift & Squat", created_at: "2026-01-15T11:00:00Z", assigned_to: "3", assigned_name: "Michael Kraus", plan_data: { title: "Strength Block – 6 Wochen", description: "Fokus auf die großen Lifts mit Periodisierung.", items: [{ label: "Technik-Assessment durchführen", done: true }, { label: "Woche 1-3: Volumen-Phase 5x5", done: true }, { label: "Woche 4-6: Peaking 3x3/2x2", done: true }, { label: "Re-Test Maximalkraft", done: true }], created_at: "2026-01-17T08:00:00Z", coach_name: "Michael Kraus" } },
          { id: "cr-5", member_id: "8", member_name: "Nina Fischer", type: "nutrition", status: "in_progress", goal: "Ernährungsumstellung – vegetarisch + sportgerecht", notes: "Vegetarierin seit 2024, braucht Hilfe mit Proteinquellen.", created_at: "2026-03-05T14:00:00Z", assigned_to: "3", assigned_name: "Michael Kraus", plan_data: { title: "Vegetarischer Sport-Ernährungsplan", description: "Ausgewogene pflanzliche Ernährung mit 140g Protein/Tag.", items: [{ label: "Ist-Analyse Ernährungstagebuch (3 Tage)", done: true }, { label: "Basis-Mahlzeitenplan erstellen", done: true }, { label: "Supplement-Empfehlung (B12, Kreatin)", done: false }, { label: "2-Wochen Check-In", done: false }], created_at: "2026-03-07T10:00:00Z", coach_name: "Michael Kraus" } },
        ],
        "/admin/bookings.php": mockBookings,
        "/bookings.php": mockBookings,
        "/reviews.php?all=1": { reviews: MOCK_REVIEWS, stats: MOCK_REVIEW_STATS },
        // Pages / Sitebuilder – fallback to seed data from blocks.ts
        "/pages.php": null,  // POST handled in write section below
        // ── Karriere: IIFE liest immer frisch aus dem mutablen localStorage-Store ──
        // Public GET (/karriere) → nur aktive Jobs zurückgeben (wie PHP-Backend)
        // Admin GET (/karriere?admin=1) → alle Jobs (handled im special-case block unten)
        "/karriere.php": (() => {
          const store = _getMockKarriereStore();
          return {
            jobs: store.jobs.filter((j: any) => j.active),
            benefits: store.benefits.filter((b: any) => b.active),
            applicants: store.applicants,
          };
        })(),
        "/karriere.php?action=shifts": [
          { id: 1, staffId: "2", staffName: "Dome Fuchs", date: "2026-03-09", startTime: "06:00", endTime: "14:00", role: "Trainer", status: "bestaetigt" },
          { id: 2, staffId: "3", staffName: "Michael Kraus", date: "2026-03-09", startTime: "14:00", endTime: "22:00", role: "Trainer", status: "geplant" },
          { id: 3, staffId: "4", staffName: "Jana Ebt", date: "2026-03-09", startTime: "08:00", endTime: "16:00", role: "Empfang", status: "bestaetigt" },
          { id: 4, staffId: "2", staffName: "Dome Fuchs", date: "2026-03-10", startTime: "08:00", endTime: "16:00", role: "Trainer", status: "geplant" },
          { id: 5, staffId: "4", staffName: "Jana Ebt", date: "2026-03-10", startTime: "06:00", endTime: "14:00", role: "Empfang", status: "geplant" },
          { id: 6, staffId: "3", staffName: "Michael Kraus", date: "2026-03-11", startTime: "06:00", endTime: "14:00", role: "Trainer", status: "geplant" },
          { id: 7, staffId: "2", staffName: "Dome Fuchs", date: "2026-03-12", startTime: "14:00", endTime: "22:00", role: "Trainer", status: "tausch_offen", notes: "Suche Tausch – Arzttermin" },
          { id: 8, staffId: "4", staffName: "Jana Ebt", date: "2026-03-12", startTime: "08:00", endTime: "16:00", role: "Empfang", status: "geplant" },
          { id: 9, staffId: "3", staffName: "Michael Kraus", date: "2026-03-13", startTime: "08:00", endTime: "16:00", role: "Trainer", status: "bestaetigt" },
          { id: 10, staffId: "2", staffName: "Dome Fuchs", date: "2026-03-14", startTime: "06:00", endTime: "14:00", role: "Trainer", status: "geplant" },
          { id: 11, staffId: "4", staffName: "Jana Ebt", date: "2026-03-14", startTime: "14:00", endTime: "22:00", role: "Theke", status: "geplant" },
        ],
        "/absences.php": [
          { id: 1, staffId: "2", staffName: "Dome Fuchs", type: "urlaub", startDate: "2026-03-16", endDate: "2026-03-20", reason: "Familienurlaub Ostsee", status: "genehmigt", approvedBy: "1", createdAt: "2026-02-20T10:00:00Z" },
          { id: 2, staffId: "2", staffName: "Dome Fuchs", type: "fortbildung", startDate: "2026-04-01", endDate: "2026-04-02", reason: "CrossFit L2 Zertifizierung", status: "genehmigt", approvedBy: "1", createdAt: "2026-02-25T09:00:00Z" },
          { id: 3, staffId: "4", staffName: "Jana Ebt", type: "krank", startDate: "2026-03-10", endDate: "2026-03-12", reason: "Erkältung", status: "genehmigt", approvedBy: "1", createdAt: "2026-03-10T07:00:00Z" },
          { id: 4, staffId: "3", staffName: "Michael Kraus", type: "urlaub", startDate: "2026-03-24", endDate: "2026-03-28", reason: "Skiurlaub", status: "beantragt", approvedBy: null, createdAt: "2026-03-05T14:00:00Z" },
          { id: 5, staffId: "4", staffName: "Jana Ebt", type: "urlaub", startDate: "2026-04-14", endDate: "2026-04-18", reason: "Osterurlaub", status: "beantragt", approvedBy: null, createdAt: "2026-03-08T11:00:00Z" },
        ],
        "/absences.php?budgets": [
          { staffId: "2", staffName: "Dome Fuchs", totalDays: 28, usedDays: 5, carryOver: 3 },
          { staffId: "3", staffName: "Michael Kraus", totalDays: 28, usedDays: 2, carryOver: 0 },
          { staffId: "4", staffName: "Jana Ebt", totalDays: 26, usedDays: 8, carryOver: 2 },
        ],
        "/absences.php?swap_offers": [
          { id: 1, shiftId: 7, staffId: "2", staffName: "Dome Fuchs", date: "2026-03-12", startTime: "14:00", endTime: "22:00", role: "Trainer", reason: "Arzttermin", status: "offen", createdAt: "2026-03-09T18:00:00Z" },
        ],
      };

      // ── Normalize getMap keys: strip .php so clean URLs and .php URLs both match ──
      for (const _k of Object.keys(getMap)) {
        const _nk = _k.replace(/\.php(\?|$)/, (_, q: string) => q || "");
        if (_nk !== _k) { (getMap as Record<string,unknown>)[_nk] = getMap[_k]; }
      }

      // ── Karriere: Admin GET (/karriere?admin=1) → alle Jobs ──────────────────
      if (endpoint.includes("/karriere") && endpoint.includes("admin=1")) {
        notifyMockActive();
        const store = _getMockKarriereStore();
        return { jobs: store.jobs, benefits: store.benefits, applicants: store.applicants } as T;
      }

      // Karriere shifts special case (query param handling)
      if (endpoint.includes("/karriere") && endpoint.includes("action=shifts")) {
        notifyMockActive();
        return getMap["/karriere?action=shifts"] as T;
      }

      // Absences special cases
      if (endpoint.includes("/absences") && endpoint.includes("budgets")) {
        notifyMockActive();
        return getMap["/absences?budgets"] as T;
      }
      if (endpoint.includes("/absences") && endpoint.includes("swap_offers")) {
        notifyMockActive();
        return getMap["/absences?swap_offers"] as T;
      }

      // Finance special cases (type= query params)
      if (endpoint.includes("/admin/finances") && endpoint.includes("type=mandates")) {
        notifyMockActive();
        return getMap["/admin/finances?type=mandates"] as T;
      }
      if (endpoint.includes("/admin/finances") && endpoint.includes("type=transactions")) {
        notifyMockActive();
        return getMap["/admin/finances?type=transactions"] as T;
      }
      if (endpoint.includes("/admin/finances") && endpoint.includes("type=inkasso")) {
        notifyMockActive();
        return getMap["/admin/finances?type=inkasso"] as T;
      }
      // Member SEPA
      if (endpoint.includes("/member/sepa") && !endpoint.includes("action=")) {
        notifyMockActive();
        return getMap["/member/sepa"] as T;
      }

      // Team special case: ?all=1
      if (ep === "/team" && endpoint.includes("all=1")) {
        notifyMockActive();
        return getMap["/team?all=1"] as T;
      }

      // Reviews Admin: ?all=1 → { reviews: [...], stats: {...} }
      if (ep === "/reviews" && endpoint.includes("all=1")) {
        notifyMockActive();
        return getMap["/reviews?all=1"] as T;
      }

      // Staff detail: action=detail is a GET but needs dynamic data
      if (ep === "/admin/users" && endpoint.includes("action=detail")) {
        notifyMockActive();
        const { TEAM_MEMBERS: TMGet } = await import("../data/team");
        _initTeamProfiles(TMGet);
        const dIdGet = endpoint.match(/id=([^&]+)/)?.[1];
        const allStaffGet: any[] = [
          ...(getMap["/admin/users"] as any[] || []),
        ];
        const su = allStaffGet.find((u: any) => String(u.id) === dIdGet);
        if (!su) return { user: null, teamProfile: null, legacyTeamMember: null, syncStatus: { profile_exists: false, legacy_exists: false, mismatches: [] } } as T;
        let dp = _findProfileByUserId(dIdGet!);
        if (!dp) dp = _findProfileByName(su.first_name || su.name?.split(" ")[0] || "", su.last_name || su.name?.split(" ").slice(1).join(" ") || "");
        return { user: su, teamProfile: dp || null, legacyTeamMember: null, syncStatus: { profile_exists: !!dp, legacy_exists: false, mismatches: [] } } as T;
      }

      // Page Visibility – GET (Admin)
      if (ep === "/admin/page-visibility") {
        notifyMockActive();
        try {
          const raw = localStorage.getItem("nac_page_visibility");
          if (raw) return JSON.parse(raw) as T;
        } catch {}
        return { visibility: {}, navOverrides: {} } as T;
      }

      // Page Visibility – GET (Public)
      if (ep === "/public/page-visibility") {
        notifyMockActive();
        try {
          const raw = localStorage.getItem("nac_page_visibility");
          if (raw) return JSON.parse(raw) as T;
        } catch {}
        return { visibility: {}, navOverrides: {} } as T;
      }

      // Pages / Sitebuilder – GET ?slug=<slug>
      // Priority: localStorage (admin edits from PageEditor) → PAGE_INITIAL_BLOCKS (seed)
      if (ep === "/pages") {
        const slugMatch = endpoint.match(/slug=([^&]+)/);
        const pageSlug = slugMatch ? decodeURIComponent(slugMatch[1]) : "home";

        // 1. Check localStorage first – PageEditor writes here on save
        try {
          const saved = localStorage.getItem(`nac_blocks_${pageSlug}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              notifyMockActive();
              return { blocks: parsed, published: true } as T;
            }
          }
        } catch { /* fall through */ }

        // 2. Seed data fallback
        notifyMockActive();
        const { PAGE_INITIAL_BLOCKS } = await import("../data/blocks");
        const blocks = PAGE_INITIAL_BLOCKS[pageSlug] ?? PAGE_INITIAL_BLOCKS["home"] ?? [];
        return { blocks, published: true } as T;
      }

      if (ep in getMap) {
        notifyMockActive();
        return getMap[ep] as T;
      }

      // Einzelnes Mitglied per ID
      if (ep === "/admin/members" && endpoint.includes("id=")) {
        notifyMockActive();
        const idMatch = endpoint.match(/id=(\w+)/);
        const found = mockMembers.find((m) => m.id === idMatch?.[1]);
        return (found ?? mockMembers[0]) as T;
      }
    }

    // ── WRITE: Simulierte Erfolgsantworten ──────────────────────────────────
    if (isWrite) {
      notifyMockActive();
      const parsed = body ? JSON.parse(body) : {};

      // POST/PATCH/DELETE → spezifische Handler zuerst, generischer DELETE am Ende
      const mockId = "mock-" + Date.now();

      // Page Visibility – PUT (save)
      if (ep === "/admin/page-visibility") {
        try { localStorage.setItem("nac_page_visibility", body ?? "{}"); } catch {}
        return { success: true, message: "Sichtbarkeit gespeichert (Offline-Mock)" } as T;
      }

      // Pages / Sitebuilder – POST (saveBlocks)
      if (ep === "/pages") {
        return { success: true, message: "Seite gespeichert (Offline-Mock)" } as T;
      }

      // Spezifische Antworten für bestimmte Endpunkte
      if (ep === "/admin/finances") {
        if (endpoint.includes("action=create")) {
          return { id: mockId, invoice_number: "RE-MOCK-" + Date.now().toString().slice(-4), success: true } as T;
        }
        if (endpoint.includes("action=pay") || endpoint.includes("action=storno")) {
          return { success: true } as T;
        }
        if (endpoint.includes("action=dunning_run")) {
          return { success: true, affected: 0 } as T;
        }
        if (endpoint.includes("action=create_mandate")) {
          return { id: Date.now(), mandate_reference: "NAC-SEPA-MOCK-" + Date.now().toString().slice(-4) } as T;
        }
        if (endpoint.includes("action=retry_transaction")) {
          return { success: true, message: "Transaktion wird erneut verarbeitet." } as T;
        }
        if (endpoint.includes("action=revoke_mandate") || endpoint.includes("action=escalate_inkasso") || endpoint.includes("action=update_inkasso")) {
          return { success: true } as T;
        }
      }

      // ── Team Profile CRUD (mutable mock store) ──────────────────────────────
      if (ep === "/team") {
        const { TEAM_MEMBERS } = await import("../data/team");
        _initTeamProfiles(TEAM_MEMBERS);
        const idMatch = endpoint.match(/id=([^&]+)/);
        const targetId = idMatch?.[1];

        if (method === "POST") {
          const newProfile = { id: "tp-" + Date.now(), ...parsed, slug: parsed.slug || parsed.id || "tp-" + Date.now() };
          _mockTeamProfiles!.push(newProfile);
          return { success: true, id: newProfile.id, ...newProfile } as T;
        }
        if (method === "PATCH" && targetId) {
          _mockTeamProfiles = (_mockTeamProfiles || []).map((p: any) =>
            (p.id === targetId || p.slug === targetId) ? { ...p, ...parsed } : p
          );
          return { success: true } as T;
        }
        if (method === "DELETE" && targetId) {
          _mockTeamProfiles = (_mockTeamProfiles || []).filter((p: any) => p.id !== targetId && p.slug !== targetId);
          return { success: true } as T;
        }
      }

      // ── Karriere CRUD (mutabler localStorage-Store) ──────────────────────────
      if (ep === "/karriere") {
        const store = _getMockKarriereStore();

        // Job speichern (anlegen oder updaten)
        if (endpoint.includes("action=save_job")) {
          const existing = store.jobs.find((j: any) => j.id === parsed.id);
          if (existing) {
            // Update
            store.jobs = store.jobs.map((j: any) => j.id === parsed.id ? { ...j, ...parsed } : j);
          } else {
            // Neu anlegen
            const newId = Math.max(0, ...store.jobs.map((j: any) => j.id || 0)) + 1;
            store.jobs.push({ ...parsed, id: newId });
          }
          _setMockKarriereStore(store);
          return { success: true, id: parsed.id || store.jobs[store.jobs.length - 1].id } as T;
        }

        // Job löschen
        if (method === "DELETE" && endpoint.includes("job_id=")) {
          const delId = parseInt(endpoint.match(/job_id=(\d+)/)?.[1] ?? "0");
          if (delId) {
            store.jobs = store.jobs.filter((j: any) => j.id !== delId);
            _setMockKarriereStore(store);
          }
          return { success: true } as T;
        }

        // Benefit speichern
        if (endpoint.includes("action=save_benefit")) {
          const existingB = store.benefits.find((b: any) => b.id === parsed.id);
          if (existingB) {
            store.benefits = store.benefits.map((b: any) => b.id === parsed.id ? { ...b, ...parsed } : b);
          } else {
            const newBId = Math.max(0, ...store.benefits.map((b: any) => b.id || 0)) + 1;
            store.benefits.push({ ...parsed, id: newBId });
          }
          _setMockKarriereStore(store);
          return { success: true } as T;
        }

        // Benefit löschen
        if (method === "DELETE" && endpoint.includes("benefit_id=")) {
          const delBId = parseInt(endpoint.match(/benefit_id=(\d+)/)?.[1] ?? "0");
          if (delBId) {
            store.benefits = store.benefits.filter((b: any) => b.id !== delBId);
            _setMockKarriereStore(store);
          }
          return { success: true } as T;
        }

        // Bewerber-Status updaten
        if (method === "PATCH" && endpoint.includes("applicant_id=")) {
          const appId = parseInt(endpoint.match(/applicant_id=(\d+)/)?.[1] ?? "0");
          if (appId) {
            store.applicants = store.applicants.map((a: any) => a.id === appId ? { ...a, ...parsed } : a);
            _setMockKarriereStore(store);
          }
          return { success: true } as T;
        }

        // Bewerber löschen
        if (method === "DELETE" && endpoint.includes("applicant_id=")) {
          const delAppId = parseInt(endpoint.match(/applicant_id=(\d+)/)?.[1] ?? "0");
          if (delAppId) {
            store.applicants = store.applicants.filter((a: any) => a.id !== delAppId);
            _setMockKarriereStore(store);
          }
          return { success: true } as T;
        }

        // Bewerbung einreichen
        if (endpoint.includes("action=apply")) {
          const newApp = {
            id: Math.max(0, ...store.applicants.map((a: any) => a.id || 0)) + 1,
            ...parsed,
            status: "neu",
            createdAt: new Date().toISOString(),
          };
          store.applicants.push(newApp);
          _setMockKarriereStore(store);
          return { success: true, id: newApp.id } as T;
        }
      }

      // Member SEPA write
      if (ep === "/member/sepa" && endpoint.includes("action=update_iban")) {
        return { success: true, message: "IBAN aktualisiert" } as T;
      }

      if (ep === "/admin/smtp") {
        if (endpoint.includes("action=save")) {
          return { success: true, message: "SMTP-Einstellungen gespeichert (Mock)." } as T;
        }
        if (endpoint.includes("action=test")) {
          return {
            success: true,
            message: "SMTP-Verbindungstest erfolgreich.",
            log: "Verbinde mit host271.checkdomain.de:465 ...\nServer: 220 host271.checkdomain.de ESMTP\n>> SSL/TLS-Handshake erfolgreich.\n>> EHLO localhost\n>> AUTH LOGIN\nAuthentifizierung erfolgreich!\nVerbindung getrennt.",
          } as T;
        }
        if (endpoint.includes("action=send_test")) {
          return { success: true, message: "Test-E-Mail erfolgreich gesendet." } as T;
        }
        return { success: true } as T;
      }

      if (ep === "/admin/integrations") {
        if (endpoint.includes("action=connection_test")) {
          return { success: false, message: "Offline-Modus – kein Verbindungstest möglich." } as T;
        }
        if (endpoint.includes("action=sync")) {
          return { success: false, message: "Offline-Modus – Sync nicht verfügbar." } as T;
        }
        return { success: true } as T;
      }

      if (ep === "/login") {
        // Im Mock-Modus: Credentials gegen bekannte Dev-Accounts prüfen.
        // Im Preview/Offline-Modus reicht Email-Match – Passwort wird nur vom echten PHP-Backend geprüft.
        if (body) {
          try {
            const creds = JSON.parse(body) as { email?: string };
            const DEV_ACCOUNTS = [
              { email: "admin@niceathleticclub.de", id: "dev-admin-1", name: "NAC Admin", role: "admin" as const },
              { email: "info@xinoo.io",             id: "dev-admin-2", name: "Xinoo Dev", role: "admin" as const },
            ];
            const match = DEV_ACCOUNTS.find(
              (a) => a.email.toLowerCase() === (creds.email ?? "").toLowerCase()
            );
            if (match) {
              notifyMockActive();
              return {
                token: "mock-jwt-" + Date.now(),
                user: {
                  id:             match.id,
                  name:           match.name,
                  email:          match.email,
                  role:           match.role,
                  is_blocked:     false,
                  must_change_pw: false,
                },
              } as T;
            }
          } catch { /* noop */ }
        }
        return null;
      }

      if (ep === "/admin/convert_lead") {
        return { success: true, member_id: mockId } as T;
      }

      // Staff-Onboarding: createStaff soll staff_number + id zurueckgeben
      if (ep === "/admin/users" && endpoint.includes("action=create")) {
        const staffNum = "EMP-" + String(Math.floor(Math.random() * 900) + 100);
        // Persist in mock memory so listTeam returns the new employee
        const firstName = parsed.first_name ?? "";
        const lastName = parsed.last_name ?? "";
        const cleanName = (s: string) => s.toLowerCase().replace(/[äÄ]/g,"ae").replace(/[öÖ]/g,"oe").replace(/[üÜ]/g,"ue").replace(/ß/g,"ss").replace(/[^a-z]/g,"");
        const compEmail = `${cleanName(firstName)}.${cleanName(lastName)}@nice-fitness.de`;
        _mockOnboardedStaff.push({
          id: mockId,
          staff_number: staffNum,
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`.trim(),
          email: parsed.email ?? "",
          company_email: compEmail,
          phone: parsed.phone ?? null,
          role: parsed.role ?? "trainer",
          active: true,
          must_change_pw: parsed.must_change_pw ?? false,
          permissions: parsed.permissions ?? [],
          source: parsed.source ?? "manual",
          applicant_id: parsed.applicant_id ?? null,
          hired_at: new Date().toISOString(),
        });
        return { 
          success: true, 
          id: mockId, 
          staff_number: staffNum, 
          company_email: compEmail,
          temp_password: null,
          must_change_pw: parsed.must_change_pw ?? false,
        } as T;
      }

      // Staff Update with Profile: saves both users + team_profile atomically
      if (ep === "/admin/users" && endpoint.includes("action=update_profile")) {
        const { TEAM_MEMBERS: TM3 } = await import("../data/team");
        _initTeamProfiles(TM3);
        const upIdMatch = endpoint.match(/id=([^&]+)/);
        const upTargetId = upIdMatch?.[1];
        if (parsed.user) {
          const sIdx = _mockOnboardedStaff.findIndex((u: any) => String(u.id) === upTargetId);
          if (sIdx >= 0) _mockOnboardedStaff[sIdx] = { ..._mockOnboardedStaff[sIdx], ...parsed.user };
        }
        if (parsed.teamProfile) {
          const pd = parsed.teamProfile;
          let ep2 = _findProfileByUserId(upTargetId!);
          if (!ep2 && parsed.user) ep2 = _findProfileByName(parsed.user.first_name || "", parsed.user.last_name || "");
          if (ep2) {
            _mockTeamProfiles = (_mockTeamProfiles || []).map((p: any) =>
              p.id === ep2.id ? { ...p, ...pd, user_id: upTargetId, name: `${pd.first_name || p.first_name} ${pd.last_name || p.last_name}`.trim() } : p
            );
          } else {
            const nId = `tp-${Date.now()}`;
            _mockTeamProfiles!.push({ id: nId, slug: pd.slug || nId, user_id: upTargetId, ...pd, name: `${pd.first_name || ""} ${pd.last_name || ""}`.trim() });
          }
        }
        return { success: true, action: "update_profile" } as T;
      }

      // Onboard-Endpunkte
      if (ep === "/onboard") {
        if (endpoint.includes("action=change_password")) {
          return { success: true, message: "Passwort erfolgreich geaendert." } as T;
        }
        if (endpoint.includes("action=check_email")) {
          const fn = (parsed.first_name ?? "").toLowerCase().replace(/[^a-z]/g,"");
          const ln = (parsed.last_name ?? "").toLowerCase().replace(/[^a-z]/g,"");
          return { company_email: `${fn}.${ln}@nice-fitness.de` } as T;
        }
        // Default: onboard action
        const staffN = "EMP-" + String(Math.floor(Math.random() * 900) + 100);
        const fn2 = (parsed.first_name ?? "").toLowerCase().replace(/[^a-z]/g,"");
        const ln2 = (parsed.last_name ?? "").toLowerCase().replace(/[^a-z]/g,"");
        return {
          success: true,
          mode: parsed.mode ?? "auto",
          user_id: mockId,
          staff_number: staffN,
          company_email: `${fn2}.${ln2}@nice-fitness.de`,
          temp_password: null,
          mail_sent: false,
          message: "Mitarbeiter-Account erfolgreich erstellt.",
        } as T;
      }

      // Coaching-Endpunkte
      if (ep === "/admin/coaching" || ep === "/member/coaching") {
        return { success: true, id: mockId } as T;
      }

      // ── Reviews CRUD ──────────────────────────────────────────────────────
      if (ep === "/reviews") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        if (endpoint.includes("action=sync")) {
          return { success: true, message: "Google-Reviews synchronisiert (Mock).", imported: 0 } as T;
        }
        return { success: true } as T;
      }

      // ── Tarife CRUD ───────────────────────────────────────────────────────
      if (ep === "/tarife") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Press CRUD ────────────────────────────────────────────────────────
      if (ep === "/press") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Kurse CRUD ────────────────────────────────────────────────────────
      if (ep === "/kurse") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Leads CRUD ────────────────────────────────────────────────────────
      if (ep === "/leads") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true, ...parsed } as T;
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Admin Members CRUD ────────────────────────────────────────────────
      if (ep === "/admin/members") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true, ...parsed } as T;
        if (endpoint.includes("action=block") || endpoint.includes("action=unblock")) {
          return { success: true } as T;
        }
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Admin Bookings CRUD ───────────────────────────────────────────────
      if (ep === "/admin/bookings") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true } as T;
      }

      // ── Öffentliche Buchungen ─────────────────────────────────────────────
      if (ep === "/bookings") {
        return { id: mockId, success: true } as T;
      }

      // ── Admin Settings ────────────────────────────────────────────────────
      if (ep === "/admin/settings") {
        return { success: true, message: "Einstellungen gespeichert." } as T;
      }

      // ── Pricing CRUD ──────────────────────────────────────────────────────
      if (ep === "/pricing") {
        return { success: true } as T;
      }

      // ── Abwesenheiten CRUD ────────────────────────────────────────────────
      if (ep === "/absences") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true, id: mockId } as T;
      }

      // ── Karriere: Shift/Swap (nicht im ep===/karriere Block oben) ─────────
      if (ep === "/karriere") {
        if (method === "DELETE") return { success: true } as T;
        if (method === "PATCH") return { success: true } as T;
        return { success: true, id: mockId } as T;
      }

      // ── Member-Endpunkte ──────────────────────────────────────────────────
      if (ep === "/member/profile") return { success: true, ...parsed } as T;
      if (ep === "/member/checkin") return { success: true, message: "Check-in erfolgreich (Mock)." } as T;
      if (ep === "/member/tracking") return { success: true } as T;
      if (ep === "/member/sepa") return { success: true } as T;
      if (ep === "/admin/tracking") return { success: true } as T;

      // ── Admin Users (Status / Delete / allgemein) ─────────────────────────
      if (ep === "/admin/users") {
        if (method === "DELETE") return { success: true } as T;
        return { success: true, id: mockId, ...parsed } as T;
      }

      // ── Generischer DELETE-Fallback (MUSS nach allen spezifischen Handlern stehen) ──
      if (method === "DELETE") {
        return { success: true, message: "Gelöscht (Offline-Mock)" } as T;
      }

      // Generische Antwort: Die gesendeten Daten + Mock-ID zurückgeben
      return { id: mockId, success: true, ...parsed } as T;
    }
  } catch (e) {
    console.warn("[NAC] Mock-Fallback fehlgeschlagen:", e);
  }
  return null;
}

// ── HTTP-Client ───────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  silent = false
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = tokenStore.get();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept:         "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Toasts unterdrücken wenn System-Check läuft
  const shouldToast = !silent && !_toastsSuppressed;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    // ── Netzwerkfehler: Mock-Fallback versuchen ──────────────────────────────
    if (!_mockFallbackDisabled) {
      const mock = await getMockFallback<T>(endpoint, options.method, typeof options.body === "string" ? options.body : undefined);
      if (mock !== null) return mock;
    }
    const msg = "Netzwerkfehler – Verbindung zum Server fehlgeschlagen.";
    if (shouldToast) toast.error(msg);
    throw new ApiError(0, "NetworkError", msg);
  }

  // ── Mock-Session: Server ist erreichbar, aber PHP-API fehlt ────────────────
  // Wenn wir mit einem Mock-Token arbeiten und der Server antwortet (z.B. 401/404/500
  // weil die PHP-Dateien nicht deployed sind), NICHT ausloggen, sondern Mock-Daten liefern.
  const isMockSession = tokenStore.isMock();
  if ((isMockSession || res.status === 404) && !res.ok && !_mockFallbackDisabled) {
    const mock = await getMockFallback<T>(endpoint, options.method, typeof options.body === "string" ? options.body : undefined);
    if (mock !== null) {
      notifyMockActive();
      return mock;
    }
  }

  if (res.status === 401) {
    // Bei Mock-Session NICHT ausloggen – der Server kennt unseren Mock-Token nicht
    if (isMockSession) {
      console.info(
        "%c[NAC] 401 vom Server ignoriert (Mock-Session aktiv)",
        "color:#CA0C85;font-weight:bold"
      );
      throw new ApiError(401, "Unauthorized", "Mock-Session – API nicht konfiguriert");
    }
    // Während des System-Checks (mockFallbackDisabled) NIEMALS ausloggen –
    // der Check testet nur die Erreichbarkeit, er darf die Session nicht zerstören.
    if (_mockFallbackDisabled) {
      console.info(
        "%c[NAC] 401 vom Server ignoriert (System-Check aktiv – kein Logout)",
        "color:#CA0C85;font-weight:bold"
      );
      throw new ApiError(401, "Unauthorized", "API antwortet mit 401 (System-Check)");
    }
    tokenStore.remove();
    if (typeof window !== "undefined") {
      // Soft-Logout Event feuern, statt die Seite hart neu zu laden
      window.dispatchEvent(new Event("nac:unauthorized"));
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    let errorMessage = `Fehler ${res.status} (${res.statusText || "Unbekannt"})`;

    // ── HTML-Response (z.B. PHP Fatal Error / 500 Page) ────────────────────────
    const looksLikeHtml =
      rawText.trimStart().startsWith("<") ||
      rawText.toLowerCase().includes("<!doctype") ||
      rawText.toLowerCase().includes("<html");

    if (looksLikeHtml) {
      if (shouldToast) {
        console.error(
          `%c[NAC API] HTML-Fehlerantwort von ${endpoint} (HTTP ${res.status})`,
          "color:#CA0C85;font-weight:bold"
        );
        console.error("API HTML Error:", rawText);
        toast.error("Server/Datenbank-Fehler! (Siehe Konsole)", {
          description: `HTTP ${res.status} – Das Backend hat HTML statt JSON geliefert (z.B. PHP Fatal Error).`,
        });
      }
      throw new ApiError(res.status, rawText, `HTTP ${res.status} – Server lieferte HTML (PHP/MySQL-Fehler)`);
    }

    // ── JSON-Response mit { error: "..." } ─────────────────────────────────────
    try {
      const parsed = JSON.parse(rawText);
      if (parsed?.error) {
        errorMessage = parsed.error;
      } else if (parsed?.message) {
        errorMessage = parsed.message;
      } else if (typeof parsed === "string") {
        errorMessage = parsed;
      }
      if (shouldToast) {
        console.warn(
          `%c[NAC API] Server-Fehler ${res.status} auf ${endpoint}:`,
          "color:#CA0C85;font-weight:bold",
          parsed
        );
      }
    } catch {
      // Keine JSON-Response – Rohtext verwenden
      if (rawText.length > 0 && rawText.length < 300) {
        errorMessage = rawText;
      }
      if (shouldToast) {
        console.error(`[NAC API] Nicht-JSON Fehler ${res.status} auf ${endpoint}:`, rawText);
      }
    }

    if (shouldToast)
      toast.error(`Aktion fehlgeschlagen (${res.status})`, { description: errorMessage });
    throw new ApiError(res.status, rawText, errorMessage);
  }

  return res.json() as Promise<T>;
}

// ── Domain Types ──────────────────────────────────────────────────────────────

export type UserRole     = "admin" | "hr" | "finance" | "trainer" | "frontdesk" | "member";
export type LeadStatus   = "Neu" | "Kontaktiert" | "Bestätigt" | "Abgesagt";
export type LeadGoal     = "abnehmen" | "muskelaufbau" | "fitness" | "crossfit";
export type LeadType     = "trial" | "contact";
export type MemberStatus = "active" | "frozen" | "terminated";
export type ContractType = "starter" | "performance" | "elite";

export interface Lead {
  id: string;
  magicline_id?: string | null;
  /** Anfrage-Typ aus DB: 'trial' = Probetraining, 'contact' = Kontaktanfrage */
  type: LeadType;
  name: string;
  email: string;
  phone?: string | null;
  goal: LeadGoal;
  /** mapped from desired_date (DB snake_case) */
  desiredDate: string;
  status: LeadStatus;
  /** mapped from created_at */
  createdAt: string;
  notes?: string | null;
  /** FK zu users.id – zustaendiger Mitarbeiter */
  assigned_to?: string | null;
  /** JOIN-Feld: Name des zustaendigen Mitarbeiters */
  assigned_to_name?: string | null;
  /** Datum des letzten Kontakts */
  last_contact?: string | null;
  /** Datum des naechsten geplanten Kontakts */
  next_contact?: string | null;
}

// ── Staff User (fuer Lead-Zuweisung) ──────────────────────────────────────────
export interface StaffUser {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  role: UserRole;
  active: boolean;
  /** Herkunft: onboarding, manual, import */
  source?: string | null;
  /** FK auf career_applicants.id (wenn via Onboarding) */
  applicant_id?: number | null;
  /** Einstellungsdatum */
  hired_at?: string | null;
  /** Kuendigungsdatum */
  terminated_at?: string | null;
  /** Kuendigungsgrund */
  termination_reason?: string | null;
  /** Zusaetzliche UI-Felder */
  staff_number?: string | null;
  phone?: string | null;
  hire_date?: string | null;
  exit_date?: string | null;
  status?: string | null;
  permissions?: string[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  instructor: string;
  is_recurring: boolean;
  weekday?: string;
  event_date?: string;
  time: string;
  duration: string;
  capacity: number;
  enrolled: number;
  active: boolean;
  /** Manuell gesperrt – Anmeldungen blockiert */
  locked?: boolean;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: MemberStatus;
  is_blocked: boolean;
  block_reason?: string;
  block_message?: string;
  contract_type: ContractType | null;
  member_since: string;
  iban?: string;
  /** FK auf SEPA-Mandate (sepa_mandates.id) */
  sepa_mandate_id?: number | null;
  /** Storno-Frist in Stunden (Default: 24) */
  cancellation_limit_hours?: number;
  check_in_code?: string;
  /** Gesetzt wenn das Mitglied via Magicline-Sync importiert wurde */
  magicline_id?: string | null;
  /** Magicline Kundenstatus: PROSPECT | MEMBER | FORMER_MEMBER | ... */
  magicline_customer_status?: string | null;
  /** Interne Notizen (Admin) */
  notes?: string | null;
  /** Adressfelder */
  street?: string | null;
  street_number?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  /** Geschlecht: M | F | D */
  gender?: string | null;
  /** Dummy-Flag: wird per API geliefert wenn Echtzeit-Checkin integriert ist */
  is_checked_in?: boolean;
}

export interface Invoice {
  id: string;
  invoice_number?: string;
  member_id: string;
  member_name?: string;
  amount: number;
  due_date: string;
  status: "paid" | "open" | "overdue" | "cancelled";
  dunning_level: 0 | 1 | 2 | 3;
  created_at?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  // ── DSGVO-konforme Identität ──────────────────────────────────────────────
  uuid: string;                    // Einmalige UUID der Identität (immer sichtbar)
  user_id: string | null;          // Interne DB-ID (null bei Cron/System)
  user_name: string | null;        // Klartext-Name (null wenn pseudonymisiert)
  gdpr_pseudonymized: boolean;     // true → nur UUID anzeigen (DSGVO-Pflicht)
  // ── Actor / Kontext ────────────────────────────────────────────────────────
  actor_type: 'admin' | 'staff' | 'member' | 'cron' | 'system' | 'api';
  actor_role: string | null;       // RBAC-Rolle (admin, trainer, reception …)
  source: 'admin_ui' | 'member_ui' | 'cron' | 'system' | 'api';
  // ── Aktion ────────────────────────────────────────────────────────────────
  action: string;
  entity_type: string;
  entity_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  severity: 'info' | 'warning' | 'critical';
  // ── Technische Metadaten ───────────────────────────────────────────────────
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  timestamp: string;
}

export interface MemberStats {
  checkins_this_month: number;
  checkins_total: number;
  upcoming_bookings: number;
  membership_days_left: number;
}

// ── Dashboard Aggregated Stats ────────────────────────────────────────────────
export interface DashboardStats {
  newLeads7d: number;
  newLeads7dDelta: number;
  courseOccupancy: number;
  courseOccupancyDelta: number;
  activeMembers: number;
  activeMembersDelta: number;
  openRequests: number;
  openRequestsDelta: number;
  leadsPerDay: { date: string; count: number }[];
}

// ── SEPA / Inkasso Types ──────────────────────────────────────────────────────
export type MandateStatus = "active" | "revoked" | "pending" | "failed";

export interface SepaMandate {
  id: number;
  member_id: string;
  member_name: string;
  iban_masked: string;
  bic?: string;
  mandate_reference: string;
  signed_at: string;
  status: MandateStatus;
  revoked_at?: string | null;
  last_collection_date?: string | null;
  next_collection_date?: string | null;
}

export interface InkassoCase {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  member_id: string;
  member_name: string;
  amount: number;
  dunning_level: 3;
  escalated_at: string;
  status: "offen" | "uebergeben" | "bezahlt" | "abgeschrieben";
  external_ref?: string | null;
  notes?: string | null;
}

// ── Transaction Types ─────────────────────────────────────────────────────────
export type TransactionType = "debit" | "credit" | "refund" | "fee";
export type TransactionStatus = "pending" | "success" | "failed" | "reversed";

export interface Transaction {
  id: number;
  invoice_id: number;
  invoice_number?: string;
  mandate_id?: number | null;
  mandate_reference?: string | null;
  member_name?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  return_reason?: string | null;
  retry_count: number;
  processed_at?: string | null;
  created_at: string;
}

export interface UpcomingSession {
  id: string;
  course_id: string;
  title: string;
  date: string;
  time: string;
  instructor: string;
  spots_left: number;
}

export type BookingStatus = "confirmed" | "attended" | "cancelled" | "no-show";
export type BookingType = "member" | "guest";

export interface Booking {
  id: string;
  course_id: string;
  course_title: string;
  course_weekday: string;
  course_time: string;
  course_category: string;
  instructor: string;
  /** 'member' = eingeloggt, 'guest' = Gast ohne Account */
  booking_type: BookingType;
  /** member_id wenn booking_type='member' */
  member_id?: string | null;
  member_name?: string | null;
  /** Gast-Daten wenn booking_type='guest' */
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  status: BookingStatus;
  booked_at: string;
}

export interface LoginCredentials { email: string; password: string; }
export interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: UserRole; is_blocked: boolean; permissions?: string[]; must_change_pw?: boolean; company_email?: string; };
}

// ── Data Normalization Helpers ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeMember = (m: any): Member => ({
  ...m,
  status: (m.status === "active" || m.status === "frozen" || m.status === "terminated") 
            ? m.status 
            : (m.active === 1 || m.active === true || String(m.status) === "1" ? "active" : "terminated"),
  is_blocked: Boolean(m.is_blocked)
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeLead = (l: any): Lead => ({
  id:                String(l.id),
  magicline_id:      l.magicline_id ?? null,
  type:              (l.type === "contact" || l.type === "trial") ? l.type : "trial",
  name:              l.name ?? "",
  email:             l.email ?? "",
  phone:             l.phone ?? null,
  goal:              (l.goal as LeadGoal) ?? "fitness",
  desiredDate:       l.desired_date ?? l.desiredDate ?? "",
  status:            (l.status as LeadStatus) ?? "Neu",
  createdAt:         l.created_at ?? l.createdAt ?? "",
  notes:             l.notes ?? null,
  assigned_to:       l.assigned_to != null ? String(l.assigned_to) : null,
  assigned_to_name:  l.assigned_to_name ?? null,
  last_contact:      l.last_contact ?? null,
  next_contact:      l.next_contact ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeStaffUser = (u: any): StaffUser => ({
  id:                  String(u.id),
  name:                u.name ?? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
  first_name:          u.first_name ?? null,
  last_name:           u.last_name  ?? null,
  email:               u.email ?? "",
  role:                u.role ?? "member",
  active:              Boolean(u.active),
  source:              u.source ?? null,
  applicant_id:        u.applicant_id ?? null,
  hired_at:            u.hired_at ?? null,
  terminated_at:       u.terminated_at ?? null,
  termination_reason:  u.termination_reason ?? null,
  staff_number:        u.staff_number ?? null,
  phone:               u.phone ?? null,
  hire_date:           u.hire_date ?? null,
  exit_date:           u.exit_date ?? null,
  status:              u.status ?? null,
  permissions:         u.permissions ?? [],
});
// ── Resource APIs ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (creds: LoginCredentials): Promise<LoginResponse> =>
      request("/login", { method: "POST", body: JSON.stringify(creds) }, true),
    changePassword: (newPassword: string) =>
      request("/onboard?action=change_password", { method: "POST", body: JSON.stringify({ new_password: newPassword }) }),
  },

  // ── PUBLIC ENDPOINTS (kein Auth noetig) ─────────────────────────────────────
  public: {
    /** Oeffentliche Team-Mitglieder laden (nur visible=1) */
    team: () => request<any[]>("/team", {}, true),

    /** Oeffentliche Tarife laden (nur active=1) */
    tarife: () => request<any[]>("/tarife", {}, true),

    /** Modulare Pricing-Daten (Basis-Tarife + Add-ons) laden */
    pricing: () => request<any>("/pricing", {}, true),

    /** Oeffentliche Kurse laden */
    kurse: () => request<any[]>("/kurse", {}, true),

    /** Oeffentliche Presseberichte laden */
    press: () => request<any[]>("/press", {}, true),

    /** Oeffentliche Google-Rezensionen laden (nur visible=1) */
    reviews: () => request<any[]>("/reviews", {}, true),

    /** Oeffentliche Studio-/Firmendaten (Adresse, Kontakt, Bankverbindung) */
    settings: () => request<Record<string, string>>("/public/settings", {}, true),

    /** Oeffentliche Karriere-Daten laden (Jobs + Benefits) */
    karriere: () => request<any>("/karriere", {}, true),

    /** Bewerbung einreichen */
    submitApplication: (data: any) =>
      request<any>("/karriere?action=apply", { method: "POST", body: JSON.stringify(data) }, true),

    /** Oeffentliches Lead-Formular (Probetraining/Kontakt) – silent, keine Toasts */
    submitLead: async (data: Omit<Lead, "id" | "createdAt">) => {
      const payload = {
        ...data,
        desired_date: data.desiredDate,
      };
      return request<any>("/leads", { method: "POST", body: JSON.stringify(payload) }, true);
    },

    /** Gast-Buchung – erstellt Buchung ohne Account */
    bookAsGuest: (data: { course_id: string; name: string; email: string; phone?: string }) =>
      request<{ id: string; success: boolean }>("/bookings", { method: "POST", body: JSON.stringify({ ...data, booking_type: "guest" }) }, true),
  },

  // ── ADMIN BEREICH ───────────────────────────────────────────────────────────
  admin: {
    /** Aggregierte Dashboard-KPIs aus /dashboard */
    dashboard: {
      stats: () => request<DashboardStats>("/dashboard"),
    },
    leads: {
      list: async () => {
        const data = await request<any[]>("/leads");
        return data.map(normalizeLead);
      },
      create: async (data: Omit<Lead, "id" | "createdAt">) => {
        const payload = {
          ...data,
          desired_date: data.desiredDate,
        };
        const res = await request<any>("/leads", { method: "POST", body: JSON.stringify(payload) });
        return normalizeLead(res);
      },
      update: async (id: string, data: Partial<Lead>) => {
        const payload: Record<string, unknown> = { ...data };
        if (data.desiredDate !== undefined) {
          payload.desired_date = data.desiredDate;
          delete payload.desiredDate;
        }
        const res = await request<any>(`/leads?id=${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        return normalizeLead(res);
      },
      updateStatus: (id: string, data: { status: LeadStatus }) =>
        request(`/leads?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request(`/leads?id=${id}`, { method: "DELETE" }),
      convertToMember: (leadId: string, contractData: Record<string, unknown>) =>
        request("/admin/convert_lead", { method: "POST", body: JSON.stringify({ leadId, ...contractData }) }),
    },

    courses: {
      list: () => request<Course[]>("/kurse"),
      create: (data: Omit<Course, "id" | "enrolled">) =>
        request("/kurse", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Course>) =>
        request(`/kurse?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request(`/kurse?id=${id}`, { method: "DELETE" }),
    },

    members: {
      list: async () => {
        const data = await request<any[]>("/admin/members");
        return data.map(normalizeMember);
      },
      get: async (id: string) => {
        const data = await request<any>(`/admin/members?id=${id}`);
        return normalizeMember(data);
      },
      create: (payload: any) =>
        request("/admin/members?action=create", { method: "POST", body: JSON.stringify(payload) }),
      update: async (id: string, payload: Partial<Member>) => {
        const data = await request<any>(`/admin/members?id=${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        return normalizeMember(data);
      },
      block: (id: string, payload: { reason: string; message: string }) =>
        request(`/admin/members?id=${id}&action=block`, { method: "POST", body: JSON.stringify(payload) }),
      unblock: (id: string) =>
        request(`/admin/members?id=${id}&action=unblock`, { method: "POST" }, true),
      deleteMember: (id: string) =>
        request(`/admin/members?id=${id}`, { method: "DELETE" }, true),
    },

    finances: {
      invoices: () => request<Invoice[]>("/admin/finances?type=invoices"),
      create: (data: { member_id: string; amount: number; due_date: string }) =>
        request<{ id: string; invoice_number: string }>("/admin/finances?action=create", { method: "POST", body: JSON.stringify(data) }),
      markAsPaid: (id: string) =>
        request(`/admin/finances?action=pay&id=${encodeURIComponent(id)}`, { method: "POST" }),
      storno: (id: string, reason: string) =>
        request(`/admin/finances?action=storno&id=${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ reason }) }),
      triggerDunningRun: () =>
        request<{ success: boolean; affected: number }>("/admin/finances?action=dunning_run", { method: "POST" }),
      // ── SEPA-Mandate ──────────────────────────────────────────────────────
      mandates: () => request<SepaMandate[]>("/admin/finances?type=mandates"),
      createMandate: (data: { member_id: string; iban: string; bic?: string }) =>
        request<{ id: number; mandate_reference: string }>("/admin/finances?action=create_mandate", { method: "POST", body: JSON.stringify(data) }),
      revokeMandate: (id: number) =>
        request("/admin/finances?action=revoke_mandate", { method: "POST", body: JSON.stringify({ id }) }),
      // ── Transaktionen ────────────────────────────────────────────────────
      transactions: () => request<Transaction[]>("/admin/finances?type=transactions"),
      retryTransaction: (id: number) =>
        request("/admin/finances?action=retry_transaction", { method: "POST", body: JSON.stringify({ id }) }),
      // ── Inkasso ───────────────────────────────────────────────────────────
      inkassoList: () => request<InkassoCase[]>("/admin/finances?type=inkasso"),
      escalateToInkasso: (invoiceId: string) =>
        request("/admin/finances?action=escalate_inkasso", { method: "POST", body: JSON.stringify({ invoice_id: invoiceId }) }),
      updateInkasso: (id: string, data: { status: string; external_ref?: string; notes?: string }) =>
        request(`/admin/finances?action=update_inkasso&id=${id}`, { method: "POST", body: JSON.stringify(data) }),
    },

    audit: {
      list: (params?: {
        limit?: number; offset?: number;
        actor_type?: string; source?: string; severity?: string;
        entity_type?: string; search?: string;
        date_from?: string; date_to?: string;
      }) => {
        const qs = params
          ? "?" + Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
          : "";
        // Mock-Modus liefert AuditLog[] direkt → normalisieren
        return request<AuditLog[] | { data: AuditLog[]; total: number }>(`/admin/audit_logs${qs}`)
          .then(r => (Array.isArray(r) ? r : r.data));
      },
    },

    settings: {
      get: () => request<Record<string, string>>("/admin/settings"),
      update: (payload: Record<string, string>) =>
        request("/admin/settings", { method: "PATCH", body: JSON.stringify(payload) }),
    },

    requests: {
      getAll: () => request<{ pauses: any[]; terminations: any[] }>("/admin/requests"),
      updatePause: (id: string, status: "approved" | "rejected") =>
        request(`/admin/requests?action=update_pause&id=${id}`, { method: "POST", body: JSON.stringify({ status }) }),
      updateTermination: (id: string, payload: { status: "processed"; effective_date?: string }) =>
        request(`/admin/requests?action=update_termination&id=${id}`, { method: "POST", body: JSON.stringify(payload) }),
      createManual: (payload: any) =>
        request("/admin/requests?action=create_manual", { method: "POST", body: JSON.stringify(payload) }),
    },

    tracking: {
      getMemberData: (memberId: string) => request<any>(`/admin/tracking?member_id=${memberId}`),
      setGoals: (memberId: string, payload: any) =>
        request(`/admin/tracking?action=set_goals&member_id=${memberId}`, { method: "POST", body: JSON.stringify(payload) }),
    },

    users: {
      listTeam: async () => {
        const data = await request<any[]>("/admin/users");
        return data.map(normalizeStaffUser);
      },
      listStaff: async () => {
        const data = await request<any[]>("/admin/users");
        const STAFF_ROLES: UserRole[] = ["admin", "hr", "finance", "trainer", "frontdesk"];
        return data
          .map(normalizeStaffUser)
          .filter((u) => STAFF_ROLES.includes(u.role) && u.active);
      },
      createStaff: (payload: any) =>
        request("/admin/users?action=create", { method: "POST", body: JSON.stringify(payload) }),
      updateStaff: (id: string, payload: any) =>
        request(`/admin/users?action=update&id=${id}`, { method: "POST", body: JSON.stringify(payload) }),
      updateStatus: (id: string, active: boolean) =>
        request(`/admin/users?action=status&id=${id}`, { method: "POST", body: JSON.stringify({ active }) }),
      deleteStaff: (id: string) =>
        request(`/admin/users?id=${id}`, { method: "DELETE" }, true),
      /** Load user + linked team_profile + syncStatus */
      detail: (id: string) =>
        request<{ user: any; teamProfile: any; legacyTeamMember: any; syncStatus: { profile_exists: boolean; legacy_exists: boolean; mismatches: string[] } }>(
          `/admin/users?action=detail&id=${id}`
        ),
      /** Save both user account + team_profile in one logical transaction */
      updateWithProfile: (id: string, payload: { user: any; teamProfile: any }) =>
        request(`/admin/users?action=update_profile&id=${id}`, { method: "POST", body: JSON.stringify(payload) }),
    },

    // ── TARIFE (Membership Plans) Admin CRUD ──────────────────────────────────
    tarife: {
      list: () => request<any[]>("/tarife?all=1"),
      create: (data: any) =>
        request("/tarife", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request(`/tarife?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request(`/tarife?id=${id}`, { method: "DELETE" }),
    },

    // ── PRICING (Modular: BasePlans + AddOns) Admin CRUD ─────────────────────
    pricing: {
      get: () => request<any>("/pricing"),
      savePlans: (data: any) =>
        request("/pricing?action=save_plans", { method: "POST", body: JSON.stringify(data) }),
      saveAddOns: (data: any) =>
        request("/pricing?action=save_addons", { method: "POST", body: JSON.stringify(data) }),
      saveNotes: (data: any) =>
        request("/pricing?action=save_notes", { method: "POST", body: JSON.stringify(data) }),
    },

    // ── TEAM (Public Team Members) Admin CRUD ─────────────────────────────────
    teamPublic: {
      list: () => request<any[]>("/team?all=1"),
      create: (data: any) =>
        request("/team", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request(`/team?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request(`/team?id=${id}`, { method: "DELETE" }),
    },

    // ── PRESS (Presseberichte) Admin CRUD ──────────────────────────────────────
    press: {
      list: () => request<any[]>("/press"),
      create: (data: any) =>
        request("/press", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request(`/press?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request(`/press?id=${id}`, { method: "DELETE" }),
    },

    // ── BOOKINGS (Kursbuchungen) Admin CRUD ───────────────────────────────────
    bookings: {
      list: () => request<Booking[]>("/admin/bookings"),
      updateStatus: (id: string, status: BookingStatus) =>
        request(`/admin/bookings?id=${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
      delete: (id: string) =>
        request(`/admin/bookings?id=${id}`, { method: "DELETE" }),
    },

    // ── REVIEWS (Google-Rezensionen) Admin CRUD ──────────────────────────────
    reviews: {
      /** Alle Reviews + Stats laden */
      getAll: () => request<{ reviews: any[]; stats: any }>("/reviews?all=1"),
      /** Google-Sync starten */
      sync: () => request<{ success: boolean; message: string; imported: number }>(
        "/reviews?action=sync", { method: "POST" }
      ),
      /** Sichtbarkeit togglen */
      toggleVisibility: (id: string, visible: boolean) =>
        request(`/reviews?id=${id}`, {
          method: "PATCH",
          body: JSON.stringify({ visible }),
        }),
      /** Review entfernen */
      delete: (id: string) =>
        request(`/reviews?id=${id}`, { method: "DELETE" }),
    },

    // ── KARRIERE / HR ─────────────���────────────────────────────────────────────
    karriere: {
      /** Alle Jobs + Benefits + Bewerber laden (Admin) */
      getAll: () => request<any>("/karriere?admin=1"),
      /** Job anlegen/updaten */
      saveJob: (data: any) =>
        request("/karriere?action=save_job", { method: "POST", body: JSON.stringify(data) }),
      /** Job loeschen */
      deleteJob: (id: number) =>
        request(`/karriere?job_id=${id}`, { method: "DELETE" }),
      /** Benefit anlegen/updaten */
      saveBenefit: (data: any) =>
        request("/karriere?action=save_benefit", { method: "POST", body: JSON.stringify(data) }),
      /** Benefit loeschen */
      deleteBenefit: (id: number) =>
        request(`/karriere?benefit_id=${id}`, { method: "DELETE" }),
      /** Bewerber-Status updaten */
      updateApplicant: (id: number, data: any) =>
        request(`/karriere?applicant_id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      /** Bewerber loeschen */
      deleteApplicant: (id: number) =>
        request(`/karriere?applicant_id=${id}`, { method: "DELETE" }),
    },

    // ── EINSATZPLANUNG / SHIFTS ──────────────────────────────────────────────
    shifts: {
      /** Schichten einer Woche laden */
      getWeek: (weekStart: string) =>
        request<any[]>(`/karriere?action=shifts&week=${weekStart}`),
      /** Schicht anlegen/updaten */
      save: (data: any) =>
        request("/karriere?action=save_shift", { method: "POST", body: JSON.stringify(data) }),
      /** Schicht loeschen */
      delete: (id: number) =>
        request(`/karriere?shift_id=${id}`, { method: "DELETE" }),
      /** Tauschanfrage */
      requestSwap: (data: any) =>
        request("/karriere?action=swap_request", { method: "POST", body: JSON.stringify(data) }),
      /** Tauschanfrage genehmigen/ablehnen */
      reviewSwap: (id: number, data: any) =>
        request(`/karriere?swap_id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      /** Schicht als Tausch anbieten */
      offerSwap: (shiftId: number, reason: string) =>
        request("/karriere?action=offer_swap", { method: "POST", body: JSON.stringify({ shiftId, reason }) }),
      /** Tausch-Angebot annehmen */
      acceptSwap: (offerId: number, acceptorId: string, acceptorName: string) =>
        request("/karriere?action=accept_swap", { method: "POST", body: JSON.stringify({ offerId, acceptorId, acceptorName }) }),
    },

    // ── ABWESENHEITEN / ABSENCES ────────────────────────────────────────────
    absences: {
      /** Alle Abwesenheiten laden */
      list: () => request<any[]>("/absences"),
      /** Abwesenheit beantragen */
      request: (data: any) =>
        request("/absences?action=request", { method: "POST", body: JSON.stringify(data) }),
      /** Genehmigen / Ablehnen */
      review: (id: number, data: { status: string; approvedBy: string }) =>
        request(`/absences?id=${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      /** Loeschen */
      delete: (id: number) =>
        request(`/absences?id=${id}`, { method: "DELETE" }),
      /** Urlaubsbudgets laden */
      budgets: () => request<any[]>("/absences?action=budgets"),
      /** Offene Tausch-Angebote laden */
      swapOffers: () => request<any[]>("/absences?action=swap_offers"),
    },

    // ── COACHING PIPELINE ──────────────────────────────────────────────────
    coaching: {
      /** Alle Coaching-Requests laden (Admin) */
      list: () => request<any[]>("/admin/coaching"),
      /** Trainer zuweisen */
      assign: (requestId: string, staffId: string) =>
        request(`/admin/coaching?action=assign&id=${requestId}`, {
          method: "POST",
          body: JSON.stringify({ staff_id: staffId }),
        }),
      /** Plan speichern & an Mitglied senden */
      savePlan: (requestId: string, plan: any) =>
        request(`/admin/coaching?action=save_plan&id=${requestId}`, {
          method: "POST",
          body: JSON.stringify(plan),
        }),
      /** Status ändern (completed, cancelled) */
      updateStatus: (requestId: string, status: string) =>
        request(`/admin/coaching?action=update_status&id=${requestId}`, {
          method: "POST",
          body: JSON.stringify({ status }),
        }),
    },
  },

  // ── INTEGRATIONS ────────────────────────────────────────────────────────────
  integrations: {
    getSettings: () =>
      request<any>("/admin/integrations?action=settings"),
    saveSettings: (payload: any) =>
      request(
        "/admin/integrations?action=settings",
        { method: "POST", body: JSON.stringify(payload) },
        true
      ),
    /** Verbindungstest gegen Magicline (x-api-key HEAD /customers) */
    connectionTest: () =>
      request<{ success: boolean; message: string; environment?: string; studio?: string }>(
        "/admin/integrations?action=connection_test",
        {},
        true
      ),
    /** Dry Run – zeigt was importiert wuerde, ohne zu schreiben */
    syncPreview: (payload: { customer_statuses: string[]; policy: string }) =>
      request<{
        success: boolean;
        message: string;
        preview: {
          total_fetched: number;
          would_insert: number;
          would_update: number;
          would_merge: number;
          total_by_status: Record<string, number>;
        };
      }>(
        "/admin/integrations?action=sync_preview",
        { method: "POST", body: JSON.stringify(payload) },
        true
      ),
    /** Master-Sync – schreibt tatsaechlich in die DB */
    syncRun: (payload: { customer_statuses: string[]; policy: string }) =>
      request<{
        success: boolean;
        message: string;
        audit: {
          total_fetched: number;
          inserted_new: number;
          ignored_nac_is_master: number;
          sent_to_merge_queue: number;
          updated?: number;
          merge_candidates_created?: number;
          raw_saved?: number;
          total_by_status?: Record<string, number>;
          errors?: number;
        };
      }>(
        "/admin/integrations?action=sync_run",
        { method: "POST", body: JSON.stringify(payload) },
        true
      ),
    /** Legacy sync_members – bleibt fuer Abwaertskompatibilitaet */
    syncMembers: () =>
      request<{
        success: boolean;
        message: string;
        audit: {
          total_fetched: number;
          inserted_new: number;
          ignored_nac_is_master: number;
          sent_to_merge_queue: number;
          errors: number;
        };
      }>("/admin/integrations?action=sync_members", { method: "POST" }, true),
    getMergeCandidates: () =>
      request<{
        candidates: Array<{
          id: number;
          magicline_id: string;
          nac_local_id: number;
          score: number;
          reasons: string[];
          nac?: { first_name: string; last_name: string; email: string; member_since?: string; status?: string };
          ml?: { first_name: string; last_name: string; email: string; customer_status?: string };
        }>;
      }>("/admin/integrations?action=merge_candidates", {}, true),
    /** Link / Create aus der Merge-Queue */
    mergeApply: (payload: { candidate_id: number; action: "link" | "create"; member_id?: string }) =>
      request<{ success: boolean; message: string }>(
        "/admin/integrations?action=merge_apply",
        { method: "POST", body: JSON.stringify(payload) },
        true
      ),
    /** Kandidaten aus der Merge-Queue ignorieren */
    mergeIgnore: (candidateId: number) =>
      request<{ success: boolean; message: string }>(
        "/admin/integrations?action=merge_ignore",
        { method: "POST", body: JSON.stringify({ candidate_id: candidateId }) },
        true
      ),
    resolveMerge: (id: number, resolution: "link" | "ignore") =>
      request<{ success: boolean; message: string }>(
        `/admin/integrations?action=resolve_merge&id=${id}&resolution=${resolution}`,
        { method: "POST" },
        true
      ),
    getDebugLog: () =>
      request<{ lines: string[]; total: number; showing: number; log_path: string }>(
        "/admin/integrations?action=debug_log",
        {},
        true
      ),
    testLog: () =>
      request<{
        success: boolean;
        message: string;
        diagnosis: Record<string, unknown>;
      }>(
        "/admin/integrations?action=test_log",
        {},
        true
      ),
  },

  // ── SMTP ────────────────────────────────────────────────────────────────────
  smtp: {
    getSettings: () =>
      request<any>("/admin/smtp"),
    save: (payload: any) =>
      request<{ message: string }>("/admin/smtp?action=save", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    test: (payload: any) =>
      request<{ success: boolean; message: string; log?: string }>("/admin/smtp?action=test", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    sendTest: (toEmail: string) =>
      request<{ success: boolean; message: string }>("/admin/smtp?action=send_test", {
        method: "POST",
        body: JSON.stringify({ to_email: toEmail }),
      }),
  },

  // ── MEMBER PORTAL ──────────────────────────────────────────────────────────
  member: {
    profile: {
      get: async () => {
        const data = await request<any>("/member/profile");
        return normalizeMember(data);
      },
      update: (payload: any) =>
        request("/member/profile", { method: "PATCH", body: JSON.stringify(payload) }),
    },
    stats: () => request<MemberStats>("/member/stats"),
    changePassword: (newPassword: string) =>
      request("/member/profile", { method: "PATCH", body: JSON.stringify({ password: newPassword }) }),

    // NEU: Self-Service & Uploads
    uploadDocument: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      const token = tokenStore.get();
      const res = await fetch(`${BASE_URL}/member/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
      return res.json() as Promise<{ success: boolean; url: string }>;
    },

    contracts: {
      getData: () =>
        request<{ invoices: Invoice[]; pauses: any[] }>(
          "/member/contracts",
          {},
          true  // silent – PHP hat denselben member_id-JWT-Bug wie tracking.php;
                // MemberVertrag.tsx fängt den Fehler mit Mock-Daten ab
        ),
      upgrade: (plan: string) => {
        const memberId = getCurrentUserId();
        return request(
          "/member/contracts?action=upgrade" + (memberId ? `&member_id=${encodeURIComponent(memberId)}` : ""),
          { method: "POST", body: JSON.stringify({ plan, member_id: memberId }) },
          true  // silent – PHP liest member_id nicht aus Request; Fehler wird im Component behandelt
        );
      },
      requestPause: (payload: any) => {
        const memberId = getCurrentUserId();
        return request(
          "/member/contracts?action=pause" + (memberId ? `&member_id=${encodeURIComponent(memberId)}` : ""),
          { method: "POST", body: JSON.stringify({ ...payload, member_id: memberId }) },
          true  // silent
        );
      },
      terminate: (payload: any) => {
        const memberId = getCurrentUserId();
        return request(
          "/member/contracts?action=terminate" + (memberId ? `&member_id=${encodeURIComponent(memberId)}` : ""),
          { method: "POST", body: JSON.stringify({ ...payload, member_id: memberId }) },
          true  // silent
        );
      },
      // ── SEPA / IBAN Self-Service ────────────────────────────────────────
      getSepaStatus: () =>
        request<{ iban_masked: string; mandate_reference: string; status: string; signed_at: string; next_collection_date?: string; cancellation_limit_hours?: number }>("/member/sepa", {}, true),
      updateIban: (iban: string) => {
        const memberId = getCurrentUserId();
        return request("/member/sepa?action=update_iban", {
          method: "POST",
          body: JSON.stringify({ iban, member_id: memberId }),
        });
      },
    },

    tracking: {
      // Das PHP-Backend hat einen Bug beim Lesen von member_id (vermutlich aus
      // dem JWT-Payload statt aus dem Request). Alle drei Calls laufen daher im
      // Silent-Modus: Fehler werden nicht geloggt, kein Toast wird gezeigt.
      // MemberTracking.tsx hat einen eigenen catch-Block mit Demo-Fallback-Daten.
      getData: () => {
        const memberId = getCurrentUserId();
        return request<{ measurements: any[]; goals: any; logs: any[] }>(
          "/member/tracking",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              member_id: memberId ?? "",
              action: "get",
            }).toString(),
          },
          true  // silent – kein console.error, kein toast
        );
      },
      addMeasurement: (payload: any) => {
        const memberId = getCurrentUserId();
        return request(
          "/member/tracking",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              member_id:   memberId ?? "",
              action:      "add_measurement",
              weight:      String(payload.weight      ?? ""),
              body_fat:    String(payload.body_fat    ?? ""),
              muscle_mass: String(payload.muscle_mass ?? ""),
              waist_cm:    String(payload.waist_cm    ?? ""),
              hip_cm:      String(payload.hip_cm      ?? ""),
              date:        String(payload.date        ?? ""),
            }).toString(),
          },
          true  // silent
        );
      },
      logNutrition: (payload: any) => {
        const memberId = getCurrentUserId();
        return request(
          "/member/tracking",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              member_id: memberId ?? "",
              action:    "log_nutrition",
              calories:  String(payload.calories  ?? ""),
              protein:   String(payload.protein   ?? ""),
              carbs:     String(payload.carbs     ?? ""),
              fat:       String(payload.fat       ?? ""),
              water_ml:  String(payload.water_ml  ?? ""),
              date:      String(payload.date      ?? ""),
            }).toString(),
          },
          true  // silent
        );
      },
    },

    // ── COACHING (Member) ──────────────────────────────────────────────────
    coaching: {
      /** Meine Coaching-Requests laden */
      list: () => request<any[]>("/member/coaching", {}, true),
      /** Neue Coaching-Anfrage stellen */
      request: (data: { type: string; goal: string; notes?: string }) =>
        request("/member/coaching?action=request", {
          method: "POST",
          body: JSON.stringify({ ...data, member_id: getCurrentUserId() }),
        }),
      /** Checklist-Item togglen */
      toggleItem: (requestId: string, itemIndex: number) =>
        request(`/member/coaching?action=toggle_item&id=${requestId}`, {
          method: "POST",
          body: JSON.stringify({ item_index: itemIndex, member_id: getCurrentUserId() }),
        }),
    },

    sessions: {
      upcoming: () => request<any[]>("/member/sessions", {}, true),
      myBookings: () => request<any[]>("/member/bookings", {}, true),
      book:   (id: string) => request("/member/book", { method: "POST", body: JSON.stringify({ id, member_id: getCurrentUserId() }) }),
      cancel: (id: string) => {
        const memberId = getCurrentUserId();
        const qs = memberId ? `&member_id=${encodeURIComponent(memberId)}` : "";
        return request(`/member/bookings?id=${encodeURIComponent(id)}${qs}`, {
          method: "DELETE",
          body: JSON.stringify({ id, member_id: memberId }),
        });
      },
    },
  },

  // ── PAGES / SITEBUILDER ────────────────────────────────────────────────────
  pages: {
    /**
     * Lädt die Block-Konfiguration einer Seite vom Backend.
     * GET /pages.php?slug=<slug>
     * Antwort: { blocks: SerializedBlock[], published: boolean }
     */
    getBlocks: (slug: string) =>
      request<{ blocks: SerializedBlock[]; published: boolean }>(
        `/pages?slug=${encodeURIComponent(slug)}`,
        {},
        true   // silent – Fallback in PageEditor selbst implementiert
      ),

    /**
     * Speichert die Block-Konfiguration einer Seite.
     * PUT /pages.php
     * Body: { slug, blocks, published }
     */
    saveBlocks: (slug: string, payload: { blocks: SerializedBlock[]; published: boolean }) =>
      request<{ success: boolean; message?: string }>(
        "/pages",
        { method: "PUT", body: JSON.stringify({ slug, ...payload }) }
      ),
  },

  // ── PAGE VISIBILITY ────────────────────────────────────────────────────────
  pageVisibility: {
    /**
     * Lädt den Sichtbarkeitsstatus aller Seiten.
     * GET /admin/page-visibility.php
     * Antwort: { visibility: Record<string, boolean>, navOverrides: Record<string, NavOverrideDTO> }
     */
    get: () =>
      request<{
        visibility: Record<string, boolean>;
        navOverrides: Record<string, { navHref: string; customHref: string; customLabel?: string }>;
      }>("/admin/page-visibility", {}, true),

    /**
     * Öffentlicher Endpoint (kein Auth) – für Navbar/Footer-Filterung.
     * GET /public/page-visibility
     */
    getPublic: () =>
      request<{
        visibility: Record<string, boolean>;
        navOverrides: Record<string, { navHref: string; customHref: string; customLabel?: string }>;
      }>("/public/page-visibility"),

    /**
     * Speichert den Sichtbarkeitsstatus aller Seiten.
     * PUT /admin/page-visibility
     * Body: { visibility, navOverrides }
     */
    save: (payload: {
      visibility: Record<string, boolean>;
      navOverrides: Record<string, { navHref: string; customHref: string; customLabel?: string }>;
    }) =>
      request<{ success: boolean; message?: string }>(
        "/admin/page-visibility.php",
        { method: "PUT", body: JSON.stringify(payload) }
      ),
  },
};