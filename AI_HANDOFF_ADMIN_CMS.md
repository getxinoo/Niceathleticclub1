# AI Handoff — Admin CMS Editor (Preise / Add-ons / Team)

## Repository
- **Path:** `C:\Users\XNO-TG001\Documents\GitHub\Niceathleticclub1-clean-verification`
- **Branch:** `feat/admin-pages-pricing-team-editor`
- **HEAD:** `68598e8 feat(cms): improve admin page editor controls`
- **Base commit (T2B/T2C asset safety):** `05b2002 fix(assets): restore canonical images and fail on unsafe fallbacks`

## Status
- **Build:** `npm run build` → PASS (exit 0). No tsconfig in repo — esbuild is the only compile gate (no type-check step).
- **Predeploy:** `npm run predeploy:check` → PASS at last full run (41 Unsplash baseline, 0 figma→Unsplash). Not re-run since editor-core (no asset/dist-affecting change).
- **Working tree:** clean at HEAD. One stash holds out-of-scope WIP (see below).

## Completed work (committed in 68598e8)
Admin editor core, all landing in these files:
- `src/data/blocks.ts`
  - `PageBlock.hidden?: boolean` (additive; undefined/false = current behavior).
  - New `FieldType` value `"link"`.
  - Converted CTA/pillar link fields (hero `btn1Url`/`btn2Url`, cta `btn1Url`/`btn2Url`, pillars `pillar1-4Link`) from `"text"` → `"link"`. Data stays a plain string.
- `src/app/admin/components/BlockSettingsSheet.tsx`
  - `LinkField` component: live validation via `src/lib/links.ts` (`classifyLinkInput` + `validateLink`). Internal must start with `/`, external `http(s)://`, `javascript:` and `#` rejected. Shows intern/extern/invalid badge + inline error. Wired into `FieldRow` for `type: "link"`.
  - `RepeaterField`: per-item **move up / move down / duplicate** (via new `RepeaterItemBtn`), `structuredCloneSafe` deep clone, nested-repeater default (`[]`), new rows default visible (`toggle → true`).
- `src/app/admin/pages/PageEditor.tsx`
  - `duplicateBlock(id)` (deep-clone data, fresh `uid()`, insert after) and `toggleBlockHidden(id)`.
  - Sidebar rows: duplicate + hide/show buttons, "Aus" hidden chip, amber asset-warning chip (`blockHasAssetWarning` → figma:asset / unsplash).
  - Preview: hidden blocks dimmed (opacity 0.4) + "Ausgeblendet" ribbon.
  - Dirty tracking: `lastSavedRef` snapshot + `loadedCountRef`; "Ungespeichert" toolbar chip; snapshot reset on load and after save.
  - Save hardening: large-deletion confirm (blocks < ceil(loaded/2) when loaded ≥ 4) and Unsplash-in-image-field confirm (both non-blocking).
- `src/app/pages/Preise.tsx`, `src/app/pages/Team.tsx`
  - Public renderers skip hidden sections: `blocks.filter((b) => !b.hidden)`.

## Incomplete / not started
- **Phase 3 SharedPageRenderer** — STARTED then parked. A WIP edit to `src/app/components/blocks/BlockRenderer.tsx` (real `PricingSection`/`PricingComparisonSection`/`PricingAddonsSection` + `TeamGridSection` instead of `ApiBox` placeholders) is saved in **git stash** (`stash@{0}`, message "wip: shared-renderer start..."). It is NOT applied and NOT built. It references optional `heading`/`subtitle` props on `PricingAddonsSection` that were not yet added. Decide whether to resume from the stash or re-implement.
- **Phase 4 Preise wiring** — not started.
- **Phase 5 Add-ons/Boxen** — not started.
- **Phase 6 Team wiring** — not started.
- **Phase 7 `page_versions` migration + versioning** — not started.

## Architectural decisions already made (must hold)
- CMS (PageEditor / blocks) controls **section layout, selection, order, visibility, and headings only**.
- Pricing plans/add-ons/options and team members/profiles stay **domain-owned** (`data/mock-db.ts`, `data/classes.ts`, prod `pricing.php` / `team.php`; edited in `AdminTarife` / `AdminTeam`).
- Entity data is **read-only inside PageEditor**, with a link to the corresponding domain module. **No mockDb entity editing** from the CMS.
- No production writes. No Unsplash/Figma fallback. **Public frontend output is the visual source of truth** — additive, default-preserving changes only.
- `BlockRenderer` is admin-preview only (also used by AdminSeiten thumbnails); no public page imports it. Public pages (`Preise.tsx`, `Team.tsx`) use their own inline section renderers.

## Exact next implementation steps
1. **Shared renderer (Phase 3):** resume `git stash show -p stash@{0}` OR re-do: in `BlockRenderer.tsx` replace `ApiBox` placeholders for `pricing-cards` → `PricingSection`, `pricing-compare` → `PricingComparisonSection`, `pricing-addons` → real (already partly), `team`/`team-grid` → exported `TeamGridSection` (import from `../../pages/Team`, acyclic). Add optional `heading`/`subtitle` props to `PricingAddonsSection` (default = current fixed text) before passing them.
2. **Preise (Phase 4):** fix `pricing`/`pricing-cards` `selectedPlans` options to real slugs (`athletic-weekend`, `athletic`, `nicest`, `athletic-unlimited`); add `selectedPlanIds`/`visibleAddonIds`/`columns`/CTA to block schema; wire `Preise.tsx` `PricingBlock` to honor them **with defaults that reproduce today's output** (undefined → show all / current layout).
3. **Add-ons (Phase 5):** CMS-side selection + order + show/hide of existing add-on boxes (block config), read-only entity fields + "Edit in Tarife module" link. No entity CRUD in CMS.
4. **Team (Phase 6):** add `selectedTeamMemberIds` (options from `data/team.ts` `TEAM_MEMBERS`: mimi, bella, wilhelm, dome, leo, jana, lydi), tablet/mobile cols, card style; wire `TeamGridSection` to honor selection with defaults = current behavior; read-only member fields + "Edit in Team module" link.
5. **Versioning (Phase 7):** additive `page_versions` SQL migration file (do NOT run), API skeleton, editor history panel, restore-as-draft (loads snapshot into editor, never auto-publishes).

## Commands to validate
```
git -C "C:\Users\XNO-TG001\Documents\GitHub\Niceathleticclub1-clean-verification" status --short
git -C "..." branch --show-current
git -C "..." log --oneline -3
npm run build
npm run predeploy:check     # run before any push/deploy consideration
git stash list              # stash@{0} = parked shared-renderer WIP
```

## Hard safety rules
- No push. No deploy. No production DB changes. No server upload.
- Do not touch `api/config.php`. Do not print secrets.
- Do not switch to the old tainted repo (`Documents/Crome` decoy). Stay in `Niceathleticclub1-clean-verification`.
- Do not reset or discard committed work (`68598e8`) or the stash.
- Do not overwrite `PAGE_INITIAL_BLOCKS`. Do not edit Studio content. Do not remove the 41 known Unsplash seed-data strings.
- Keep the 41-Unsplash baseline; predeploy must not regress above it.
