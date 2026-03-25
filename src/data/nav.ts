// ── Navigation Data ─────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  /** React Router path – always starts with "/" */
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Studio",   href: "/studio"  },
  { label: "Kurse",    href: "/kurse"   },
  { label: "Preise",   href: "/preise"  },
  { label: "Team",     href: "/team"    },
  { label: "Kontakt",  href: "/kontakt" },
];
