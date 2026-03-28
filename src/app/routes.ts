import { createBrowserRouter, redirect } from "react-router";

// ── Null component used for loader-only redirect routes ───────────────────────
// React Router v7 requires a Component on every leaf route, even redirect-only
// ones. Without it the router renders a null <Outlet> = blank page.
const NullComponent = () => null;

// ── HydrateFallback: shown during initial client hydration on data routes ──────
const HydrateFallback = () => null;

// ── App Root (providers: Auth, Helmet, Toaster) ───────────────────────────────
import { AppRoot } from "./components/layout/AppRoot";

// ── Public Layout & Pages ─────────────────────────────────────────────────────
import { RootLayout }    from "./components/layout/RootLayout";
import Home              from "./pages/Home";
import Kurse             from "./pages/Kurse";
import Preise            from "./pages/Preise";
import Team              from "./pages/Team";
import Kontakt           from "./pages/Kontakt";
import Probetraining     from "./pages/Probetraining";
import Studio            from "./pages/Studio";
import NotFound          from "./pages/NotFound";
import Impressum         from "./pages/Impressum";
import Datenschutz       from "./pages/Datenschutz";
import AGB               from "./pages/AGB";
import Karriere          from "./pages/Karriere";
import Presse            from "./pages/Presse";
import UeberUns          from "./pages/UeberUns";
import PersonalTraining  from "./pages/PersonalTraining";
import CrossfitGP        from "./pages/CrossfitGP";
import Firmenfitness     from "./pages/Firmenfitness";
import AthleticArea      from "./pages/AthleticArea";
import HyroxZone         from "./pages/HyroxZone";
import NiceTheke         from "./pages/NiceTheke";
import EgymWellpass      from "./pages/EgymWellpass";

// ── Auth ──────────────────────────────────────────────────────────────────────
import Login             from "./pages/Login";
import { AdminGuard, MemberGuard } from "./components/ProtectedRoute";
import { VisibilityRoute } from "./components/VisibilityRoute";

// ── Admin Layout & Pages ─────────────────────────────────────────────────────
import { AdminLayout }    from "./admin/components/AdminLayout";
import Dashboard          from "./admin/pages/Dashboard";
import AdminLeads         from "./admin/pages/AdminLeads";
import AdminKurse         from "./admin/pages/AdminKurse";
import AdminMembers       from "./admin/pages/AdminMembers";
import AdminFinances      from "./admin/pages/AdminFinances";
import AdminSeiten        from "./admin/pages/AdminSeiten";
import AdminSettings      from "./admin/pages/AdminSettings";
import PageEditor         from "./admin/pages/PageEditor";
import AdminAntraege      from "./admin/pages/AdminAntraege";
import AdminTeam          from "./admin/pages/AdminTeam";
import AdminTarife        from "./admin/pages/AdminTarife";
import AdminPresse        from "./admin/pages/AdminPresse";
import AdminBuchungen     from "./admin/pages/AdminBuchungen";
import AdminReviews       from "./admin/pages/AdminReviews";
import AdminPersonalPlanung from "./admin/pages/AdminPersonalPlanung";
import AdminEinsatzplan   from "./admin/pages/AdminEinsatzplan";
import AdminAbwesenheiten from "./admin/pages/AdminAbwesenheiten";
import AdminCoaching      from "./admin/pages/AdminCoaching";
import AdminMagazin       from "./admin/pages/AdminMagazin";
import AdminSystemHub     from "./admin/pages/AdminSystemHub";
import AdminKarriereHub   from "./admin/pages/AdminKarriereHub";

// ── Member Portal Layout & Pages ─────────────────────────────────────────────
import { MemberLayout }  from "./member/components/MemberLayout";
import MemberDashboard   from "./member/pages/MemberDashboard";
import MemberKurse       from "./member/pages/MemberKurse";
import MemberBuchungen   from "./member/pages/MemberBuchungen";
import MemberProfil      from "./member/pages/MemberProfil";
import MemberVertrag     from "./member/pages/MemberVertrag";
import MemberTracking    from "./member/pages/MemberTracking";
import MemberCoaching    from "./member/pages/MemberCoaching";
import MemberDienstplan  from "./member/pages/MemberDienstplan";

/**
 * Application Routes – React Router v7 Data Mode
 *
 * Route-Hierarchie:
 *   path "/"         → AppRoot  (AuthProvider + HelmetProvider + Toaster)
 *   ├─ "login"       → Login
 *   ├─ (pathless)    → RootLayout (public website)
 *   │    ├─ index    → Home
 *   │    └─ ...
 *   ├─ "admin"       → AdminGuard → AdminLayout → ...
 *   └─ "member"      → MemberGuard → MemberLayout → ...
 *
 * Legacy redirects (loader-based, instant, no render):
 *   /admin/diagnostics  → /admin/system?tab=systemcheck
 *   /admin/integrations → /admin/system?tab=integrationen
 *   /admin/audit        → /admin/system?tab=audit
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoot,
    HydrateFallback,
    children: [

      // ── Login ──────────────────────────────────────────────────────────────
      {
        path: "login",
        Component: Login,
      },

      // ── Public Site ────────────────────────────────────────────────────────
      {
        Component: RootLayout,
        children: [
          { index: true,               Component: Home          },
          {
            Component: VisibilityRoute,
            children: [
              { path: "kurse",          Component: Kurse         },
              { path: "preise",         Component: Preise        },
              { path: "team",           Component: Team          },
              { path: "kontakt",        Component: Kontakt       },
              { path: "probetraining",  Component: Probetraining },
              { path: "studio",         Component: Studio        },
              { path: "ueber-uns",      Component: UeberUns      },
              { path: "personal-training", Component: PersonalTraining },
              { path: "crossfit-gp",    Component: CrossfitGP    },
              { path: "firmenfitness",  Component: Firmenfitness },
              { path: "athletic-area",  Component: AthleticArea  },
              { path: "hyrox",          Component: HyroxZone     },
              { path: "nice-theke",     Component: NiceTheke     },
              { path: "egym-wellpass",  Component: EgymWellpass  },
              { path: "karriere",       Component: Karriere      },
              { path: "presse",         Component: Presse        },
            ],
          },
          { path: "impressum",          Component: Impressum     },
          { path: "datenschutz",        Component: Datenschutz   },
          { path: "agb",                Component: AGB           },
          { path: "*",                  Component: NotFound      },
        ],
      },

      // ── Admin CMS (geschuetzt: staff roles) ────────────────────────────────
      {
        path: "admin",
        Component: AdminGuard,
        children: [
          {
            Component: AdminLayout,
            children: [
              { index: true,                    Component: Dashboard        },
              { path: "leads",                  Component: AdminLeads       },
              { path: "mitglieder",             Component: AdminMembers     },
              { path: "finanzen",               Component: AdminFinances    },
              { path: "kurse",                  Component: AdminKurse       },
              { path: "buchungen",              Component: AdminBuchungen   },
              { path: "seiten",                 Component: AdminSeiten      },
              { path: "seiten/edit/:slug",      Component: PageEditor       },
              { path: "einstellungen",          Component: AdminSettings    },
              { path: "antraege",               Component: AdminAntraege    },
              { path: "team",                   Component: AdminTeam        },
              { path: "tarife",                 Component: AdminTarife      },
              { path: "presse",                 Component: AdminPresse      },
              { path: "reviews",                Component: AdminReviews     },
              { path: "karriere",               Component: AdminKarriereHub },
              { path: "bewerber",               loader: () => redirect("/admin/karriere?tab=bewerber"), Component: NullComponent },
              { path: "personalplanung",         Component: AdminPersonalPlanung },
              { path: "einsatzplan",            Component: AdminEinsatzplan },
              { path: "abwesenheiten",          Component: AdminAbwesenheiten },
              { path: "coaching",               Component: AdminCoaching    },
              { path: "magazin",                Component: AdminMagazin     },
              // ── System Hub (vereint System-Check, Integrationen, Audit) ──
              { path: "system",                 Component: AdminSystemHub   },
              // ── Legacy URL-Redirects (loader-basiert, kein Render) ────────
              { path: "diagnostics",  loader: () => redirect("/admin/system?tab=systemcheck"),   Component: NullComponent },
              { path: "integrations", loader: () => redirect("/admin/system?tab=integrationen"), Component: NullComponent },
              { path: "audit",        loader: () => redirect("/admin/system?tab=audit"),         Component: NullComponent },
            ],
          },
        ],
      },

      // ── Member Portal (geschuetzt: isAuthenticated) ─────────────────────────
      {
        path: "member",
        Component: MemberGuard,
        children: [
          {
            Component: MemberLayout,
            children: [
              { index: true,        Component: MemberDashboard },
              { path: "kurse",      Component: MemberKurse     },
              { path: "buchungen",  Component: MemberBuchungen },
              { path: "tracking",   Component: MemberTracking  },
              { path: "profil",     Component: MemberProfil    },
              { path: "coaching",   Component: MemberCoaching  },
              { path: "vertrag",    Component: MemberVertrag   },
              { path: "dienstplan", Component: MemberDienstplan },
            ],
          },
        ],
      },

    ],
  },
]);