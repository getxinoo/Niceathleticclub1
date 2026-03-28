/**
 * permissions.ts – NAC RBAC Permission System
 * ─────────────────────────────────────────────────────────────────────────────
 * Zentrale Definition aller Permission-Keys, Rollen und deren Zuordnungen.
 * Muss 1:1 mit der DB-Tabelle `permissions` + `role_permissions` synchron sein.
 *
 * Erweitert um granulare Berechtigungen (Sprint 20):
 * - Kurs-Buchung/Stornierung, HR-Verträge, Bewerber, eigener Dienstplan, etc.
 */

// ── Permission Keys ──────────────────────────────────────────────────────────
export const P = {
  // ── Core ────────────────────────────────────────────────────────────────────
  DASHBOARD_VIEW:           'dashboard.view',

  // ── CRM & Mitglieder ────────────────────────────────────────────────────────
  LEADS_READ:               'leads.read',
  LEADS_WRITE:              'leads.write',
  MEMBERS_READ:             'members.read',
  MEMBERS_WRITE:            'members.write',
  MEMBERS_BLOCK:            'members.block',
  MEMBERS_EXPORT:           'members.export',       // Mitgliederliste exportieren

  // ── Kurse & Buchungen ────────────────────────────────────────────────────────
  COURSES_READ:             'courses.read',
  COURSES_WRITE:            'courses.write',         // Kurse anlegen/bearbeiten
  COURSES_BOOK:             'courses.book',           // Kurs für Mitglied buchen
  COURSES_CANCEL:           'courses.cancel',         // Kursbuchung stornieren
  BOOKINGS_READ:            'bookings.read',
  BOOKINGS_WRITE:           'bookings.write',
  BOOKINGS_CANCEL:          'bookings.cancel',        // Buchungen stornieren

  // ── Coaching ────────────────────────────────────────────────────────────────
  COACHING_READ:            'coaching.read',
  COACHING_WRITE:           'coaching.write',
  COACHING_ASSIGN:          'coaching.assign',        // Coach zuweisen

  // ── Finanzen ────────────────────────────────────────────────────────────────
  FINANCES_READ:            'finances.read',
  FINANCES_WRITE:           'finances.write',
  SEPA_MANAGE:              'sepa.manage',
  DUNNING_MANAGE:           'dunning.manage',
  TARIFE_READ:              'tarife.read',
  TARIFE_WRITE:             'tarife.write',           // Tarife bearbeiten

  // ── HR & Personal ────────────────────────────────────────────────────────────
  HR_READ:                  'hr.read',
  HR_WRITE:                 'hr.write',
  HR_CONTRACTS_READ:        'hr.contracts.read',     // Vertragsdaten einsehen
  HR_CONTRACTS_WRITE:       'hr.contracts.write',    // Vertragsdaten bearbeiten
  HR_APPLICANTS_READ:       'hr.applicants.read',    // Bewerber lesen
  HR_APPLICANTS_WRITE:      'hr.applicants.write',   // Bewerber annehmen/ablehnen
  TEAM_MANAGE:              'team.manage',
  TEAM_ROLES_MANAGE:        'team.roles.manage',     // Rollen & Rechte verwalten
  SHIFTS_READ:              'shifts.read',            // Dienstplan aller Mitarbeiter
  SHIFTS_WRITE:             'shifts.write',
  SHIFTS_OWN_READ:          'shifts.own.read',       // Eigenen Dienstplan sehen
  ABSENCES_READ:            'absences.read',
  ABSENCES_WRITE:           'absences.write',
  ABSENCES_OWN_WRITE:       'absences.own.write',    // Eigene Abwesenheit einreichen

  // ── Öffentlichkeit & Content ─────────────────────────────────────────────────
  CMS_MANAGE:               'cms.manage',
  MAGAZINE_MANAGE:          'magazine.manage',        // Magazin / Blog
  REVIEWS_MANAGE:           'reviews.manage',         // Bewertungen moderieren
  KARRIERE_READ:            'karriere.read',
  KARRIERE_WRITE:           'karriere.write',         // Stellenanzeigen bearbeiten

  // ── System ──────────────────────────────────────────────────────────────────
  INTEGRATIONS_MANAGE:      'integrations.manage',
  AUDIT_READ:               'audit.read',
  SETTINGS_MANAGE:          'settings.manage',
  DIAGNOSTICS_VIEW:         'diagnostics.view',
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];

// ── Rollen ────────────────────────────────────────────────────────────────────
export type StaffRole = 'admin' | 'hr' | 'finance' | 'trainer' | 'frontdesk';
export type UserRole = StaffRole | 'member';

export const STAFF_ROLES: StaffRole[] = ['admin', 'hr', 'finance', 'trainer', 'frontdesk'];

export function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ── Rollen-Label Mapping ──────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Administrator',
  hr:        'HR-Manager',
  finance:   'Finanzen',
  trainer:   'Trainer',
  frontdesk: 'Empfang',
  member:    'Mitglied',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin:     { bg: 'rgba(202,12,133,0.12)', text: '#CA0C85', border: 'rgba(202,12,133,0.3)' },
  hr:        { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
  finance:   { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E', border: 'rgba(34,197,94,0.3)' },
  trainer:   { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  frontdesk: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
  member:    { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' },
};

// ── Default Rollen-Permissions (Frontend-Mirror der DB) ───────────────────────
// Wird nur als Fallback verwendet wenn effective_permissions nicht im Token sind.
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  admin: Object.values(P),

  frontdesk: [
    P.DASHBOARD_VIEW,
    P.LEADS_READ, P.LEADS_WRITE,
    P.MEMBERS_READ, P.MEMBERS_WRITE, P.MEMBERS_BLOCK,
    P.COURSES_READ, P.COURSES_BOOK, P.COURSES_CANCEL,
    P.BOOKINGS_READ, P.BOOKINGS_WRITE, P.BOOKINGS_CANCEL,
    P.SHIFTS_OWN_READ, P.ABSENCES_OWN_WRITE,
    P.REVIEWS_MANAGE,
  ],

  trainer: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ,
    P.COURSES_READ, P.COURSES_WRITE, P.COURSES_BOOK, P.COURSES_CANCEL,
    P.BOOKINGS_READ, P.BOOKINGS_CANCEL,
    P.COACHING_READ, P.COACHING_WRITE, P.COACHING_ASSIGN,
    P.SHIFTS_OWN_READ, P.ABSENCES_OWN_WRITE,
  ],

  finance: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ, P.MEMBERS_EXPORT,
    P.FINANCES_READ, P.FINANCES_WRITE,
    P.SEPA_MANAGE, P.DUNNING_MANAGE,
    P.TARIFE_READ, P.TARIFE_WRITE,
  ],

  hr: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ,
    P.HR_READ, P.HR_WRITE,
    P.HR_CONTRACTS_READ, P.HR_CONTRACTS_WRITE,
    P.HR_APPLICANTS_READ, P.HR_APPLICANTS_WRITE,
    P.TEAM_MANAGE,
    P.SHIFTS_READ, P.SHIFTS_WRITE, P.SHIFTS_OWN_READ,
    P.ABSENCES_READ, P.ABSENCES_WRITE, P.ABSENCES_OWN_WRITE,
    P.KARRIERE_READ, P.KARRIERE_WRITE,
  ],
};

// ── Permission-Module Gruppierung (für Admin-UI) ──────────────────────────────
// Diese Struktur spiegelt die DB-Tabelle `permission_modules` wider.
export const PERMISSION_MODULES: {
  module: string;
  label: string;
  icon: string;
  permissions: { key: PermissionKey; label: string; desc?: string }[];
}[] = [
  {
    module: 'core',
    label: 'Allgemein',
    icon: '📊',
    permissions: [
      { key: P.DASHBOARD_VIEW, label: 'Dashboard sehen', desc: 'Zugriff auf das Admin-Dashboard' },
    ],
  },
  {
    module: 'crm',
    label: 'CRM & Mitglieder',
    icon: '👥',
    permissions: [
      { key: P.LEADS_READ,      label: 'Leads lesen',           desc: 'Interessenten und Anfragen einsehen' },
      { key: P.LEADS_WRITE,     label: 'Leads bearbeiten',      desc: 'Leads anlegen, bearbeiten, konvertieren' },
      { key: P.MEMBERS_READ,    label: 'Mitglieder lesen',      desc: 'Mitgliederdaten und Profile einsehen' },
      { key: P.MEMBERS_WRITE,   label: 'Mitglieder bearbeiten', desc: 'Stammdaten und Verträge ändern' },
      { key: P.MEMBERS_BLOCK,   label: 'Mitglieder sperren',    desc: 'Mitgliederzugang deaktivieren' },
      { key: P.MEMBERS_EXPORT,  label: 'Mitglieder exportieren',desc: 'Mitgliederliste als CSV exportieren' },
    ],
  },
  {
    module: 'courses',
    label: 'Kurse & Buchungen',
    icon: '🏋️',
    permissions: [
      { key: P.COURSES_READ,    label: 'Kurse lesen',           desc: 'Kursplan und Kursdetails einsehen' },
      { key: P.COURSES_WRITE,   label: 'Kurse verwalten',       desc: 'Kurse anlegen, bearbeiten, löschen' },
      { key: P.COURSES_BOOK,    label: 'Kurs buchen',           desc: 'Mitglieder in Kurse einbuchen' },
      { key: P.COURSES_CANCEL,  label: 'Kursbuchung stornieren',desc: 'Kursbuchung eines Mitglieds stornieren' },
      { key: P.BOOKINGS_READ,   label: 'Buchungen lesen',       desc: 'Buchungsübersicht einsehen' },
      { key: P.BOOKINGS_WRITE,  label: 'Buchungen bearbeiten',  desc: 'Buchungen anlegen und bearbeiten' },
      { key: P.BOOKINGS_CANCEL, label: 'Buchungen stornieren',  desc: 'Buchungen stornieren' },
    ],
  },
  {
    module: 'coaching',
    label: 'Coaching & PT',
    icon: '🎯',
    permissions: [
      { key: P.COACHING_READ,   label: 'Coaching lesen',        desc: 'Coaching-Anfragen und Sessions einsehen' },
      { key: P.COACHING_WRITE,  label: 'Coaching bearbeiten',   desc: 'Sessions anlegen und bearbeiten' },
      { key: P.COACHING_ASSIGN, label: 'Coach zuweisen',        desc: 'Mitglied einem Coach zuweisen' },
    ],
  },
  {
    module: 'finance',
    label: 'Finanzen',
    icon: '💶',
    permissions: [
      { key: P.FINANCES_READ,   label: 'Finanzen einsehen',     desc: 'Transaktionen und Auswertungen sehen' },
      { key: P.FINANCES_WRITE,  label: 'Finanzen bearbeiten',   desc: 'Zahlungen und Buchungen anlegen' },
      { key: P.SEPA_MANAGE,     label: 'SEPA verwalten',        desc: 'SEPA-Mandate und Einzüge verwalten' },
      { key: P.DUNNING_MANAGE,  label: 'Mahnwesen',             desc: 'Inkasso und Mahnungen steuern' },
      { key: P.TARIFE_READ,     label: 'Tarife einsehen',       desc: 'Tarifstruktur und Preise einsehen' },
      { key: P.TARIFE_WRITE,    label: 'Tarife bearbeiten',     desc: 'Tarife und Preise ändern' },
    ],
  },
  {
    module: 'hr',
    label: 'HR & Personal',
    icon: '🛡️',
    permissions: [
      { key: P.HR_READ,              label: 'HR-Daten lesen',         desc: 'Personaldaten und HR-Dokumente einsehen' },
      { key: P.HR_WRITE,             label: 'HR-Daten bearbeiten',    desc: 'Personaldaten und HR-Dokumente ändern' },
      { key: P.HR_CONTRACTS_READ,    label: 'Verträge einsehen',      desc: 'Arbeitsverträge und Konditionen einsehen' },
      { key: P.HR_CONTRACTS_WRITE,   label: 'Verträge bearbeiten',    desc: 'Vertragsdetails ändern und neue anlegen' },
      { key: P.HR_APPLICANTS_READ,   label: 'Bewerber einsehen',      desc: 'Bewerbungen und Profile einsehen' },
      { key: P.HR_APPLICANTS_WRITE,  label: 'Bewerber annehmen',      desc: 'Bewerber annehmen, ablehnen, einstellen' },
      { key: P.TEAM_MANAGE,          label: 'Team verwalten',         desc: 'Mitarbeiter anlegen und deaktivieren' },
      { key: P.TEAM_ROLES_MANAGE,    label: 'Rollen & Rechte',        desc: 'Rollen erstellen und Permissions vergeben' },
      { key: P.SHIFTS_READ,          label: 'Dienstplan lesen',       desc: 'Dienstplan aller Mitarbeiter einsehen' },
      { key: P.SHIFTS_WRITE,         label: 'Dienstplan bearbeiten',  desc: 'Schichten planen und bearbeiten' },
      { key: P.SHIFTS_OWN_READ,      label: 'Eigenen Dienstplan',     desc: 'Eigene Schichten und Zeiten einsehen' },
      { key: P.ABSENCES_READ,        label: 'Abwesenheiten lesen',    desc: 'Abwesenheiten aller MA einsehen' },
      { key: P.ABSENCES_WRITE,       label: 'Abwesenheiten verwalten',desc: 'Urlaub und Krankmeldungen genehmigen' },
      { key: P.ABSENCES_OWN_WRITE,   label: 'Eigene Abwesenheit',     desc: 'Eigene Urlaubsanträge einreichen' },
    ],
  },
  {
    module: 'content',
    label: 'Inhalte & Marketing',
    icon: '📝',
    permissions: [
      { key: P.CMS_MANAGE,       label: 'Seiten / CMS',         desc: 'Website-Seiten bearbeiten' },
      { key: P.MAGAZINE_MANAGE,  label: 'Magazin & Blog',       desc: 'Magazin-Beiträge verwalten' },
      { key: P.REVIEWS_MANAGE,   label: 'Bewertungen',          desc: 'Mitgliederbewertungen moderieren' },
      { key: P.KARRIERE_READ,    label: 'Karriere einsehen',    desc: 'Stellenangebote und Bewerbungen einsehen' },
      { key: P.KARRIERE_WRITE,   label: 'Karriere verwalten',   desc: 'Stellenanzeigen und Onboarding steuern' },
    ],
  },
  {
    module: 'system',
    label: 'System',
    icon: '⚙️',
    permissions: [
      { key: P.INTEGRATIONS_MANAGE, label: 'Integrationen',      desc: 'API-Verbindungen und Webhooks verwalten' },
      { key: P.AUDIT_READ,          label: 'Audit-Log',          desc: 'Alle Systemaktivitäten einsehen' },
      { key: P.SETTINGS_MANAGE,     label: 'Systemeinstellungen', desc: 'Allgemeine Studioeinstellungen' },
      { key: P.DIAGNOSTICS_VIEW,    label: 'System-Check',       desc: 'Systemstatus und Diagnosedaten' },
    ],
  },
];
