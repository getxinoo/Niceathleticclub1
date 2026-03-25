/**
 * permissions.ts – NAC RBAC Permission System
 * ─────────────────────────────────────────────────────────────────────────────
 * Zentrale Definition aller Permission-Keys, Rollen und deren Zuordnungen.
 * Muss 1:1 mit der DB-Tabelle `permissions` + `role_permissions` synchron sein.
 */

// ── Permission Keys ──────────────────────────────────────────────────────────
export const P = {
  // Core
  DASHBOARD_VIEW:       'dashboard.view',

  // CRM
  LEADS_READ:           'leads.read',
  LEADS_WRITE:          'leads.write',
  MEMBERS_READ:         'members.read',
  MEMBERS_WRITE:        'members.write',
  MEMBERS_BLOCK:        'members.block',

  // Courses
  COURSES_READ:         'courses.read',
  COURSES_WRITE:        'courses.write',
  BOOKINGS_READ:        'bookings.read',
  BOOKINGS_WRITE:       'bookings.write',

  // Coaching
  COACHING_READ:        'coaching.read',
  COACHING_WRITE:       'coaching.write',

  // Finance
  FINANCES_READ:        'finances.read',
  FINANCES_WRITE:       'finances.write',
  SEPA_MANAGE:          'sepa.manage',
  DUNNING_MANAGE:       'dunning.manage',

  // HR
  HR_READ:              'hr.read',
  HR_WRITE:             'hr.write',
  TEAM_MANAGE:          'team.manage',
  SHIFTS_READ:          'shifts.read',
  SHIFTS_WRITE:         'shifts.write',
  ABSENCES_READ:        'absences.read',
  ABSENCES_WRITE:       'absences.write',

  // System
  CMS_MANAGE:           'cms.manage',
  INTEGRATIONS_MANAGE:  'integrations.manage',
  AUDIT_READ:           'audit.read',
  SETTINGS_MANAGE:      'settings.manage',
  DIAGNOSTICS_VIEW:     'diagnostics.view',
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
    P.COURSES_READ,
    P.BOOKINGS_READ, P.BOOKINGS_WRITE,
  ],

  trainer: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ,
    P.COURSES_READ, P.COURSES_WRITE,
    P.BOOKINGS_READ,
    P.COACHING_READ, P.COACHING_WRITE,
    P.SHIFTS_READ,
  ],

  finance: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ,
    P.FINANCES_READ, P.FINANCES_WRITE,
    P.SEPA_MANAGE, P.DUNNING_MANAGE,
  ],

  hr: [
    P.DASHBOARD_VIEW,
    P.MEMBERS_READ,
    P.HR_READ, P.HR_WRITE, P.TEAM_MANAGE,
    P.SHIFTS_READ, P.SHIFTS_WRITE,
    P.ABSENCES_READ, P.ABSENCES_WRITE,
  ],
};

// ── Permission-Module Gruppierung (für Admin-UI) ──────────────────────────────
export const PERMISSION_MODULES: { module: string; label: string; permissions: { key: PermissionKey; label: string }[] }[] = [
  {
    module: 'core',
    label: 'Allgemein',
    permissions: [
      { key: P.DASHBOARD_VIEW, label: 'Dashboard sehen' },
    ],
  },
  {
    module: 'crm',
    label: 'CRM & Kunden',
    permissions: [
      { key: P.LEADS_READ, label: 'Leads lesen' },
      { key: P.LEADS_WRITE, label: 'Leads bearbeiten' },
      { key: P.MEMBERS_READ, label: 'Mitglieder lesen' },
      { key: P.MEMBERS_WRITE, label: 'Mitglieder bearbeiten' },
      { key: P.MEMBERS_BLOCK, label: 'Mitglieder sperren' },
    ],
  },
  {
    module: 'courses',
    label: 'Kurse & Buchungen',
    permissions: [
      { key: P.COURSES_READ, label: 'Kurse lesen' },
      { key: P.COURSES_WRITE, label: 'Kurse bearbeiten' },
      { key: P.BOOKINGS_READ, label: 'Buchungen lesen' },
      { key: P.BOOKINGS_WRITE, label: 'Buchungen bearbeiten' },
    ],
  },
  {
    module: 'coaching',
    label: 'Coaching',
    permissions: [
      { key: P.COACHING_READ, label: 'Coaching lesen' },
      { key: P.COACHING_WRITE, label: 'Coaching bearbeiten' },
    ],
  },
  {
    module: 'finance',
    label: 'Finanzen',
    permissions: [
      { key: P.FINANCES_READ, label: 'Finanzen sehen' },
      { key: P.FINANCES_WRITE, label: 'Finanzen bearbeiten' },
      { key: P.SEPA_MANAGE, label: 'SEPA verwalten' },
      { key: P.DUNNING_MANAGE, label: 'Mahnwesen verwalten' },
    ],
  },
  {
    module: 'hr',
    label: 'HR & Personal',
    permissions: [
      { key: P.HR_READ, label: 'HR lesen' },
      { key: P.HR_WRITE, label: 'HR bearbeiten' },
      { key: P.TEAM_MANAGE, label: 'Team & Rechte verwalten' },
      { key: P.SHIFTS_READ, label: 'Einsatzplan lesen' },
      { key: P.SHIFTS_WRITE, label: 'Einsatzplan bearbeiten' },
      { key: P.ABSENCES_READ, label: 'Abwesenheiten lesen' },
      { key: P.ABSENCES_WRITE, label: 'Abwesenheiten bearbeiten' },
    ],
  },
  {
    module: 'system',
    label: 'System',
    permissions: [
      { key: P.CMS_MANAGE, label: 'Seiten verwalten' },
      { key: P.INTEGRATIONS_MANAGE, label: 'Integrationen verwalten' },
      { key: P.AUDIT_READ, label: 'Audit sehen' },
      { key: P.SETTINGS_MANAGE, label: 'Systemeinstellungen' },
      { key: P.DIAGNOSTICS_VIEW, label: 'System-Check sehen' },
    ],
  },
];
