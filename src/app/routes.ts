import { createBrowserRouter } from "react-router";

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
import { AdminLayout }   from "./admin/components/AdminLayout";
import Dashboard         from "./admin/pages/Dashboard";
import AdminLeads        from "./admin/pages/AdminLeads";
import AdminKurse        from "./admin/pages/AdminKurse";
import AdminMembers      from "./admin/pages/AdminMembers";
import AdminFinances     from "./admin/pages/AdminFinances";
import AdminAudit        from "./admin/pages/AdminAudit";
import AdminSeiten       from "./admin/pages/AdminSeiten";
import AdminSettings     from "./admin/pages/AdminSettings";
import PageEditor        from "./admin/pages/PageEditor";
import AdminAntraege     from "./admin/pages/AdminAntraege";
import AdminDiagnostics  from "./admin/pages/AdminDiagnostics";
import AdminTeam         from "./admin/pages/AdminTeam";
import AdminIntegrations from "./admin/pages/AdminIntegrations";
import AdminTarife       from "./admin/pages/AdminTarife";
import AdminPresse       from "./admin/pages/AdminPresse";
import AdminBuchungen   from "./admin/pages/AdminBuchungen";
import AdminReviews     from "./admin/pages/AdminReviews";
import AdminKarriere    from "./admin/pages/AdminKarriere";
import AdminBewerber    from "./admin/pages/AdminBewerber";
import AdminEinsatzplan from "./admin/pages/AdminEinsatzplan";
import AdminAbwesenheiten from "./admin/pages/AdminAbwesenheiten";
import AdminCoaching     from "./admin/pages/AdminCoaching";

// ── Member Portal Layout & Pages ─────────────────────────────────────────────
import { MemberLayout }  from "./member/components/MemberLayout";
import MemberDashboard   from "./member/pages/MemberDashboard";
import MemberKurse       from "./member/pages/MemberKurse";
import MemberBuchungen   from "./member/pages/MemberBuchungen";
import MemberProfil      from "./member/pages/MemberProfil";
import MemberVertrag     from "./member/pages/MemberVertrag";
import MemberTracking    from "./member/pages/MemberTracking";
import MemberCoaching   from "./member/pages/MemberCoaching";

/**
 * Application Routes – React Router v7 Data Mode
 *
 * FIX (Sprint 18): AppRoot hat jetzt einen expliziten path: "/" und alle
 * direkten Kinder verwenden RELATIVE Pfade (kein fuehrendes "/").
 * Das ist die korrekte Praxis fuer React Router v7 – pathlose Root-Routen
 * mit absoluten Child-Pfaden koennen dazu fuehren, dass AppRoot nicht
 * im Render-Tree ist, wenn Kinder rendern (AuthProvider fehlt).
 *
 * Route-Hierarchie:
 *   path "/"         → AppRoot  (AuthProvider + HelmetProvider + Toaster)
 *   ├─ "login"       → Login
 *   ├─ (pathless)    → RootLayout (public website)
 *   │    ├─ index    → Home
 *   │    ├─ "kurse"  → Kurse
 *   │    └─ ...
 *   ├─ "admin"       → AdminGuard → AdminLayout → ...
 *   └─ "member"      → MemberGuard → MemberLayout → ...
 */
export const router = createBrowserRouter([
  {
    // AppRoot haelt AuthProvider + HelmetProvider + Toaster.
    // Expliziter path: "/" stellt sicher, dass AppRoot IMMER im Render-Tree
    // ist und alle Kind-Komponenten Zugriff auf AuthContext haben.
    path: "/",
    Component: AppRoot,
    children: [

      // ── Login ──────────────────────────────────────────────────────────────
      {
        path: "login",
        Component: Login,
      },

      // ── Public Site ────────────────────────────────────────────────────────
      // Pathlose Layout-Route: rendert fuer alle oeffentlichen Pfade
      {
        Component: RootLayout,
        children: [
          { index: true,            Component: Home          },
          // Nav-linked and content pages go through VisibilityRoute
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
          // Legal pages are always visible
          { path: "impressum",      Component: Impressum     },
          { path: "datenschutz",    Component: Datenschutz   },
          { path: "agb",            Component: AGB           },
          { path: "*",              Component: NotFound      },
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
              { path: "audit",                  Component: AdminAudit       },
              { path: "kurse",                  Component: AdminKurse       },
              { path: "buchungen",              Component: AdminBuchungen   },
              { path: "seiten",                 Component: AdminSeiten      },
              { path: "seiten/edit/:slug",      Component: PageEditor       },
              { path: "einstellungen",          Component: AdminSettings    },
              { path: "antraege",               Component: AdminAntraege    },
              { path: "diagnostics",            Component: AdminDiagnostics },
              { path: "team",                   Component: AdminTeam        },
              { path: "integrations",           Component: AdminIntegrations },
              { path: "tarife",                 Component: AdminTarife      },
              { path: "presse",                 Component: AdminPresse      },
              { path: "reviews",                Component: AdminReviews     },
              { path: "karriere",               Component: AdminKarriere    },
              { path: "bewerber",               Component: AdminBewerber    },
              { path: "einsatzplan",            Component: AdminEinsatzplan },
              { path: "abwesenheiten",          Component: AdminAbwesenheiten },
              { path: "coaching",                Component: AdminCoaching      },
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
              { index: true,         Component: MemberDashboard  },
              { path: "kurse",       Component: MemberKurse      },
              { path: "buchungen",   Component: MemberBuchungen  },
              { path: "tracking",    Component: MemberTracking   },
              { path: "profil",      Component: MemberProfil     },
              { path: "coaching",    Component: MemberCoaching   },
              { path: "vertrag",     Component: MemberVertrag    },
            ],
          },
        ],
      },

    ],
  },
]);