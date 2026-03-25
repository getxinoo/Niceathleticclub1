import logoImg from "figma:asset/25416d75fab01c06b3ba37880c92088e26112f56.png";
import { openCookieSettings } from "../CookieBanner";
import { useState } from "react";
import { Link } from "react-router";
import { Instagram, Youtube, Facebook, Phone, Mail, MapPin, ChevronDown, Cookie } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../../context/SettingsContext";
import { usePageVisibility } from "../../context/PageVisibilityContext";

const SOCIAL = [
  { icon: Instagram, href: "https://www.instagram.com/nice_athletic_club/", label: "Instagram" },
  { icon: Youtube,   href: "#",                                              label: "YouTube"   },
  { icon: Facebook,  href: "https://www.facebook.com/nice_athletic_club-113347320451242/", label: "Facebook" },
];

const FOOTER_LINKS: {
  category: string;
  links: { label: string; to: string | null }[];
}[] = [
  {
    category: "Club",
    links: [
      { label: "Über uns",        to: "/ueber-uns"      },
      { label: "Team",            to: "/team"            },
      { label: "Studio",          to: "/studio"          },
      { label: "Athletic Area",   to: "/athletic-area"   },
      { label: "CrossFit GP",     to: "/crossfit-gp"     },
      { label: "HYROX Zone",      to: "/hyrox"           },
      { label: "Nice Theke",      to: "/nice-theke"      },
    ],
  },
  {
    category: "Training",
    links: [
      { label: "Kurse",             to: "/kurse"             },
      { label: "Personal Training", to: "/personal-training" },
      { label: "Probetraining",     to: "/probetraining"     },
      { label: "Firmenfitness",     to: "/firmenfitness"     },
      { label: "EGYM Wellpass",     to: "/egym-wellpass"     },
    ],
  },
  {
    category: "Mitgliedschaft",
    links: [
      { label: "Preise & Tarife",  to: "/preise"    },
      { label: "Mitglieder-Login", to: "/member"    },
      { label: "Karriere",         to: "/karriere"  },
      { label: "Presse",           to: "/presse"    },
    ],
  },
  {
    category: "Rechtliches",
    links: [
      { label: "Kontakt",      to: "/kontakt"      },
      { label: "Datenschutz",  to: "/datenschutz"  },
      { label: "Impressum",    to: "/impressum"    },
      { label: "AGB",          to: "/agb"          },
    ],
  },
];

// ── Link list shared between accordion and desktop column ─────────────────────
function LinkList({ links }: { links: { label: string; to: string | null }[] }) {
  return (
    <ul className="space-y-0">
      {links.map(({ label, to }) => (
        <li key={label}>
          {to ? (
            <Link
              to={to}
              className="text-sm block py-2 transition-colors duration-200"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
            >
              {label}
            </Link>
          ) : (
            <span className="text-sm block py-2 text-white/25 cursor-default">{label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── Accordion item (mobile / tablet only) ────────────────────────────────────
function AccordionItem({
  category,
  links,
  isOpen,
  onToggle,
}: {
  category: string;
  links: { label: string; to: string | null }[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="border-b"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-expanded={isOpen}
      >
        <span
          style={{
            fontFamily: "var(--font-condensed)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {category.toUpperCase()}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="text-white/30 shrink-0"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-3 px-1">
              <LinkList links={links} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Footer ────────────────────────────────────────────���──────────────────
export function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { s } = useSettings();
  const { getVisibleLinks } = usePageVisibility();

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  // Filter footer links based on page visibility
  const filteredFooterLinks = FOOTER_LINKS
    .map(({ category, links }) => ({
      category,
      links: getVisibleLinks(links),
    }))
    .filter(({ links }) => links.length > 0);

  return (
    <footer
      id="site-footer"
      className="border-t"
      style={{ backgroundColor: "var(--surface-0)", borderColor: "rgba(255,255,255,0.05)" }}
    >
      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Desktop: 5-col grid  |  Mobile/Tablet: stacked */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-10">

          {/* Brand Column */}
          <div className="lg:col-span-1 mb-10 lg:mb-0">
            <div className="mb-4">
              <img
                src={logoImg}
                alt="Nice Athletic Club"
                className="h-16 w-auto select-none block"
                draggable={false}
                style={{ padding: "5px" }}
              />
            </div>

            <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-[220px]">
              Premium Fitness in&nbsp;Göppingen. Training, das bewegt – seit 2019.
            </p>

            {/* Contact */}
            <div className="space-y-2.5">
              <a
                href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-2 text-white/40 hover:text-brand transition-colors text-sm"
              >
                <Phone size={13} />
                {s.phone}
              </a>
              <a
                href={`mailto:${s.email}`}
                className="flex items-center gap-2 text-white/40 hover:text-brand transition-colors text-sm"
              >
                <Mail size={13} />
                {s.email}
              </a>
              <div className="flex items-start gap-2 text-white/40 text-sm">
                <MapPin size={13} className="mt-0.5 shrink-0" />
                {s.company_street}<br />{s.company_zip} {s.company_city}
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-3 mt-6">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 flex items-center justify-center text-white/40 transition-all duration-200"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                    (e.currentTarget as HTMLElement).style.color = "var(--brand)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
                  }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Mobile / Tablet: Accordion ── */}
          <div className="lg:hidden col-span-full border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {filteredFooterLinks.map(({ category, links }, i) => (
              <AccordionItem
                key={category}
                category={category}
                links={links}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>

          {/* ── Desktop: regular columns ── */}
          {filteredFooterLinks.map(({ category, links }) => (
            <div key={category} className="hidden lg:block">
              <h4
                className="mb-4 text-white/30"
                style={{
                  fontFamily: "var(--font-condensed)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                }}
              >
                {category.toUpperCase()}
              </h4>
              <LinkList links={links} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} {s.company_name} · Alle Rechte vorbehalten
          </p>
          <p className="text-white/25 text-xs">
            Made with <span style={{ color: "var(--brand)" }}>♥</span> in Göppingen by{" "}
            <a
              href="https://www.xinoo.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 transition-colors duration-200"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              XINOO.io
            </a>
          </p>
          <button
            onClick={openCookieSettings}
            className="inline-flex items-center gap-1.5 text-white/25 text-xs transition-colors duration-200 hover:text-white/50"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <Cookie size={11} />
            Cookie-Einstellungen
          </button>
        </div>
      </div>
    </footer>
  );
}