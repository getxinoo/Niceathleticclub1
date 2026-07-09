# Security Remediation Plan — Secrets & Data in Repository (T1)

Status: **PREPARED — nothing rotated, no history rewritten, nothing pushed.**
Scope of this document: repo `github.com/getxinoo/Niceathleticclub1`, working copy
`C:\Users\XNO-TG001\Documents\GitHub\Niceathleticclub1`, audited at commit `752b3ff`.
No secret values appear in this document — categories and file paths only.

---

## 1. Findings (paths + categories, no values)

### Tracked in git (in current HEAD **and** in remote history since first commit)

| File | Contains (categories) | Severity |
|---|---|---|
| `api/config.php` | Production DB host/name/user/**password**; JWT `TOKEN_SECRET`; master-admin bootstrap email + **password**; Google Places **API key** + Place ID; `CRON_SECRET`; `SEPA_AES_KEY` slot | **Critical** |
| `sql-dump.md` (~4 MB) | Full production schema + data rows for: `users` (incl. password hashes), `smtp_settings` (SMTP credentials), `integration_settings` (Magicline credentials), `members` (PII), `leads` (PII), `invoices` | **Critical** (credentials + DSGVO-relevant PII) |
| `src/imports/pasted_text/login-endpoint.txt` | Pasted source referencing master-admin bootstrap password constant | High |
| `src/api/php/setup/config.example.php` | Older example: secret values are placeholders (verified by hash comparison), but real hosting-infrastructure identifiers appear; superseded by new canonical `api/config.example.php` | Moderate |

### Untracked local artifacts (never committed, never pushed)

| Path | Issue |
|---|---|
| `deploy-package-cms-editor-752b3ff/` + `.zip` | **UNSAFE build** — bundles contain Unsplash fallback image URLs (caused the live image incident). Marked with `UNSAFE_DO_NOT_DEPLOY.txt`; now git-ignored. Must never be uploaded. |

### Explicitly checked, NOT found elsewhere
- Google API key prefix: appears **only** in `api/config.php`.
- No `.env` files, no other `*.sql`, no credential values in frontend source or built bundles
  (frontend hits on `api_key`/`client_secret` are UI field names only; Magicline secrets live in the DB → exposed via the dump, not via code).

---

## 2. Config loading decision — **Option A (recommended)**

**`api/config.php` exists ONLY on the production server; git ships `api/config.example.php`.**

Why A over B/C on Checkdomain shared hosting (PHP 7.4, CGI/FastCGI, FTP deploys):
- **C (env vars)** is unreliable here: no managed env-var facility; `.htaccess SetEnv` is fragile under CGI (the existing `HTTP_AUTHORIZATION` fallback chain in config.php is evidence of exactly these CGI quirks).
- **B (loader includes config.local.php)** requires deploying a *modified* config.php to production — a production-touching change with real breakage risk if the local file isn't in place first, for no security gain over A.
- **A** requires zero production changes today, matches the deployment doc's original intent ("config.php aus config.example.php ableiten"), and makes every future `api/` upload safe by construction (config.php simply isn't in the upload set).

Operational rule after remediation: **never upload `api/config.php` during deploys; the server copy is authoritative.**

---

## 3. Credential rotation checklist (prepare only — DO NOT rotate without server access + explicit approval)

Order matters: rotation is the *only* real mitigation (history purge does not un-leak already-cloned copies), so rotate **before** the history rewrite.

| # | Secret | Where to rotate | Post-rotation step |
|---|---|---|---|
| 1 | Database password | Checkdomain panel → MySQL user | Update server `api/config.php` immediately (site API goes down between the two steps — do both in one sitting) |
| 2 | `TOKEN_SECRET` (JWT) | Server `api/config.php` (generate: `php -r "echo bin2hex(random_bytes(48));"`) | Invalidates all sessions — every admin/member must log in again (acceptable, announce it) |
| 3 | Master-admin bootstrap password | Server `api/config.php` | Then set `MASTER_BOOTSTRAP_DISABLED = true` (a real admin user exists) |
| 4 | Google Places API key | Google Cloud Console: delete/regenerate key, add IP restriction to Checkdomain server IP | Update server `api/config.php` |
| 5 | `CRON_SECRET` | Server `api/config.php` | Update the cron job URLs that pass it |
| 6 | SMTP credentials | Mail provider + `smtp_settings` DB row (values were in the dump) | Verify mailer still sends |
| 7 | Magicline API credentials | Magicline portal + `integration_settings` DB row (values were in the dump) | Re-test sync |
| 8 | All `users` passwords with weak/known hashes | Force password reset for staff accounts present in the dump | — |
| 9 | `SEPA_AES_KEY` | Was empty at audit; set a fresh 64-hex key **before** any SEPA data is stored (never reuse anything from the dump era) | — |
| 10 | Checkdomain panel/FTP password | Checkdomain account settings (precaution — panel creds were not found in the repo, but the DB creds imply panel-era exposure) | — |

---

## 4. Git history purge plan (DO NOT execute yet)

**Files to purge from ALL history:**
- `api/config.php`
- `sql-dump.md`
- `src/imports/pasted_text/login-endpoint.txt`
- `src/api/php/setup/config.example.php` (superseded; contains infra identifiers)

**Recommended tool: `git filter-repo`** (BFG works too, but filter-repo is the maintained,
git-project-recommended successor and handles path-based removal cleanly).

**Sequence (each step needs explicit approval):**
1. Rotate all credentials (section 3) — do this FIRST.
2. Fresh mirror backup: `git clone --mirror <remote> nac-backup.git` + zip it somewhere offline.
3. Untrack in working repo: `git rm --cached api/config.php sql-dump.md src/imports/pasted_text/login-endpoint.txt src/api/php/setup/config.example.php` + commit (ignore rules in `.gitignore` then take effect; local files stay on disk).
4. History rewrite (on a fresh clone): `git filter-repo --invert-paths --path api/config.php --path sql-dump.md --path src/imports/pasted_text/login-endpoint.txt --path src/api/php/setup/config.example.php`
5. Force-push rewritten history: `git push --force --all` + `git push --force --tags`.
6. **Every collaborator/machine must re-clone** (or hard-reset to the new history). Old clones still contain the secrets — which is why rotation (step 1) is the real fix.
7. GitHub follow-ups: delete the now-orphaned PR-#1 head if cached; contact GitHub support to clear cached views if the repo was ever public (believed private — verify).

**Impact summary:** all commit hashes change; open PRs/branches based on old history break; any CI/clone caches must be invalidated; the backup mirror is the rollback.

---

## 5. Commands that must NOT be run yet (approval gates)

```
git rm --cached ...          # gate: Tobias approves untracking commit
git filter-repo ...          # gate: rotation done + backup taken + Tobias approves
git push --force ...         # gate: after filter-repo only, Tobias approves
(any credential change)      # gate: server access + Tobias approves
(deleting server config.php) # never — server copy is authoritative under Option A
```

---

## 6. Residual risks after full remediation
- Secrets remain in any pre-existing clone/fork until rotation completes — rotation is the mitigation, purge is hygiene.
- `MASTER_BOOTSTRAP_DISABLED` was `false` at audit — until flipped, a leaked bootstrap password is a live admin login on an empty-users edge case.
- CORS in config.php reflects any Origin with credentials allowed — tighten to an allowlist in a separate reviewed ticket (runtime behavior change; out of T1 scope).
- The DSGVO exposure (member/lead PII in the dump) may carry notification duties depending on actual access to the repo — assess with a data-protection advisor; not a code task.
