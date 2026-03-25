/**
 * CommandPalette.tsx
 * Cmd+K / Ctrl+K Suchpalette fuer den Admin-Bereich.
 * Navigiert zwischen Admin-Seiten, oeffnet Quick Actions.
 *
 * Keyboard Shortcuts:
 *   Cmd/Ctrl + K  → Palette oeffnen
 *   N             → Neuer Lead (wenn Palette geschlossen und nicht in Input)
 *   Escape        → Palette schliessen
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Dumbbell,
  CreditCard,
  ShieldAlert,
  Settings,
  FileText,
  Inbox,
  Server,
  UsersRound,
  Cable,
  Plus,
  Search,
  ArrowRight,
  Command,
  CalendarCheck2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./command";

// ── Navigation items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard",       href: "/admin",              icon: LayoutDashboard, keywords: "start home uebersicht" },
  { label: "Leads / CRM",     href: "/admin/leads",        icon: Users,           keywords: "anfragen probetraining kontakte crm" },
  { label: "Mitglieder",      href: "/admin/mitglieder",   icon: UserCheck,       keywords: "members kunden" },
  { label: "Kurse",           href: "/admin/kurse",        icon: Dumbbell,        keywords: "classes training einheiten" },
  { label: "Buchungen",       href: "/admin/buchungen",    icon: CalendarCheck2,  keywords: "bookings reservierungen gaeste" },
  { label: "Finanzen",        href: "/admin/finanzen",     icon: CreditCard,      keywords: "rechnungen umsatz" },
  { label: "Antraege",        href: "/admin/antraege",     icon: Inbox,           keywords: "requests" },
  { label: "Team & Rechte",   href: "/admin/team",         icon: UsersRound,      keywords: "mitarbeiter rollen rbac" },
  { label: "Seiten / CMS",    href: "/admin/seiten",       icon: FileText,        keywords: "pages content" },
  { label: "Einstellungen",   href: "/admin/einstellungen",icon: Settings,        keywords: "settings konfiguration" },
  { label: "Integrationen",   href: "/admin/integrations", icon: Cable,           keywords: "magicline api" },
  { label: "System-Check",    href: "/admin/diagnostics",  icon: Server,          keywords: "health status" },
  { label: "Audit-Log",       href: "/admin/audit",        icon: ShieldAlert,     keywords: "protokoll log sicherheit" },
  { label: "Karriere / Jobs", href: "/admin/karriere",     icon: FileText,        keywords: "karriere jobs stellen benefits" },
  { label: "Bewerber-Zentrum",href: "/admin/bewerber",     icon: Users,           keywords: "bewerber applicants hr kanban" },
  { label: "Einsatzplan",     href: "/admin/einsatzplan",  icon: CalendarCheck2,  keywords: "schichten shifts planung einsatz" },
  { label: "Abwesenheiten",   href: "/admin/abwesenheiten",icon: CalendarCheck2,  keywords: "urlaub krank vacation absence fortbildung" },
];

const QUICK_ACTIONS = [
  { label: "Neuer Lead erstellen",       action: "/admin/leads",      shortcut: "N",     icon: Plus },
  { label: "Neues Mitglied anlegen",     action: "/admin/mitglieder", shortcut: undefined, icon: Plus },
];

// ── Hook: Global keyboard shortcuts ───────────────────────────────────────────
export function useAdminShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + K → open palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Don't trigger single-key shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";
      const isContentEditable = (e.target as HTMLElement)?.isContentEditable;

      if (isInput || isContentEditable) return;

      // N → navigate to leads (new lead intent)
      if (e.key === "n" || e.key === "N") {
        // Only trigger when no modifier keys are held
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          navigate("/admin/leads");
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { open, setOpen };
}

// ── Command Palette Component ─────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Admin-Suche"
      description="Navigiere schnell zu jeder Seite oder Aktion."
    >
      <CommandInput placeholder="Seite oder Aktion suchen..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              Keine Ergebnisse gefunden.
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Schnellaktionen">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.label}
                onSelect={() => handleSelect(action.action)}
                className="cursor-pointer"
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "rgba(202,12,133,0.1)",
                    border: "1px solid rgba(202,12,133,0.15)",
                    borderRadius: "4px",
                  }}
                >
                  <Icon size={13} style={{ color: "var(--brand)" }} />
                </div>
                <span style={{ fontWeight: 500 }}>{action.label}</span>
                {action.shortcut && (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.keywords}`}
                onSelect={() => handleSelect(item.href)}
                className="cursor-pointer"
              >
                <Icon size={15} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                <span>{item.label}</span>
                <CommandShortcut>
                  <ArrowRight size={11} />
                </CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>

      {/* Footer hint */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "var(--font-condensed)",
          letterSpacing: "0.06em",
        }}
      >
        <span className="flex items-center gap-1.5">
          <kbd
            className="inline-flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              padding: "1px 5px",
              fontSize: "10px",
              fontFamily: "inherit",
            }}
          >
            Enter
          </kbd>
          <span>zum Navigieren</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd
            className="inline-flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              padding: "1px 5px",
              fontSize: "10px",
              fontFamily: "inherit",
            }}
          >
            Esc
          </kbd>
          <span>zum Schliessen</span>
        </span>
      </div>
    </CommandDialog>
  );
}