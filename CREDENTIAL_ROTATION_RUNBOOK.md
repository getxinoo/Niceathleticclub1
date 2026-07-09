# Credential Rotation Runbook — nicefitness.de (T1.2)

For: Tobias (manual execution — requires Checkdomain panel + FTP access)
Companion to: `SECURITY_REMEDIATION_PLAN.md` · Status: **PREPARED, nothing executed**
Contains **no secret values** — names, locations, and procedures only.

Golden rules for the whole session:
- New secrets go **only** into your password manager and the server. Never into chat, tickets, screenshots, e-mail, or any git-tracked file.
- `api/config.php` is **server-only** (untracked since commit `10fe40b`). Never upload it from git; never commit it. `api/config.example.php` is a placeholder template only.
- Do everything below in **one sitting** where steps are coupled (especially B).

---

## 0. Pre-rotation backup checklist (do first, ~15 min)

- [ ] **Backup server `api/config.php`**: download via FTP into `backups/` inside the repo folder (that folder is git-ignored — verified) or anywhere outside the repo. Do NOT commit it.
- [ ] **Backup database**: Checkdomain panel → phpMyAdmin → full export of the production DB (SQL file, store outside the repo or in `backups/`). Required before the DB password change.
- [ ] **Note hosting constraints**: PHP 7.4 (CGI/FastCGI), MySQL 5.7, host `db-host271` — no env-var facility; config lives in the PHP file.
- [ ] **Confirm frontend stability**: open nicefitness.de — logo + team photos + studio images must be the real ones (i.e., the incident rollback is in effect and holding). If the site currently shows stock photos, stop and fix the rollback first.
- [ ] **Prepare all new secrets in your password manager now** (step A below) so each server edit is paste-in, not think-up.

---

## A) Prepare new secrets (password manager only)

Generate and store, before touching anything:
| Secret | Format guidance |
|---|---|
| DB password | Checkdomain panel generator or 24+ random chars |
| `TOKEN_SECRET` | ≥64 random hex chars (`php -r "echo bin2hex(random_bytes(48));"` — run locally/server, never paste output into chat) |
| `MASTER_ADMIN_PASS` | strong random; will be disabled right after anyway |
| `CRON_SECRET` | ≥32 random hex chars |
| Google Places API key | generated in Google Cloud Console (step G) |
| Magicline credentials | issued in Magicline portal (step H) |
| SMTP password | issued at mail provider (step I) |
| Checkdomain panel/FTP | panel generator |
| `SEPA_AES_KEY` | 64 hex chars — see step K warning before setting |

## B) DB password ⚠ the one step with real downtime

1. Have the server `config.php` open in the Checkdomain file manager (or the FTP-downloaded copy ready to re-upload) with the new `DB_PASS` value pre-typed but not yet saved.
2. Checkdomain panel → MySQL user → change password.
3. **Immediately** save/upload the updated server `config.php`.
4. Gap between 2 and 3 = API fully down. Keep it under a minute.

**Downtime behavior during the gap:** the static frontend still loads, but API-driven sections degrade — `/preise` silently falls back to built-in mock pricing data (it will show *wrong-looking but plausible* prices!), team/course sections may show fallbacks, admin + member login fail. This is another reason to keep the gap tiny and do it at a low-traffic hour.

**Test:** open `/preise` (hard refresh) — real tariffs visible (Athletic Weekend 39 / Athletic 69 / Nicest 104 / +Unlimited 119 as currently live); admin login works; member login works.
**Rollback:** set the *old* DB password again in the panel (you still have it in the manager) — instant restore.

## C) Verify site + admin before continuing
- [ ] Public pages `/`, `/preise`, `/team`, `/kurse` load with real data
- [ ] Admin dashboard loads, members list loads (proves DB read/write)
Only proceed when green.

## D) `TOKEN_SECRET`
Edit server `config.php`, replace value. **Effect: every JWT becomes invalid — all admins, staff and members are logged out** (sessions were 30-day). That is the point; accept it and inform the team.
**Test:** old session is rejected (you get logged out), fresh login works, member portal login works.
**Rollback:** restore old value (old sessions become valid again).

## E) `MASTER_ADMIN_PASS` + disable bootstrap
1. Replace `MASTER_ADMIN_PASS` value in server `config.php`.
2. Confirm your **real** admin user login works (not the bootstrap).
3. Set `MASTER_BOOTSTRAP_DISABLED = true` in server `config.php`.
**Test:** normal admin login still works afterwards.
**Rollback:** flip the flag back to `false` only if you are locked out of all admin accounts (it exists exactly for that emergency).

## F) `CRON_SECRET`
1. Replace value in server `config.php`.
2. Update the Checkdomain cronjob definitions that call `api/cron/fetch-reviews.php` and `api/cron/gdpr-cleanup.php` — the secret is passed in the cron URL; both URLs must carry the new value.
**Test:** trigger the reviews cron URL manually (browser/curl on the server) → expect a success JSON, then check Google reviews still render on the site.
**Break risk if forgotten:** review sync + DSGVO cleanup silently stop (no visitor-facing breakage).

## G) Google Places API key
1. Google Cloud Console → credentials → create new key; **restrict**: API = Places API, IP = Checkdomain server IP.
2. Put new key into server `config.php`; delete the old key in the console (it is burned — it sat in git).
**Test:** run the reviews cron once (step F test) — reviews refresh without error.
**Rollback:** keys are independent; if the new one misbehaves, fix restrictions rather than resurrecting the old.

## H) Magicline credentials (exposed via DB dump)
1. Rotate in the Magicline portal.
2. Enter new credentials via **Admin → System → Integrationen** (writes `integration_settings` — use the UI, not SQL).
**Test:** trigger a sync run from the same screen; check the sync-runs log shows success.
**Break risk:** member sync pauses until updated — no public impact.

## I) SMTP credentials (exposed via DB dump)
1. Rotate at the mail provider.
2. Enter via **Admin → Einstellungen → SMTP** (writes `smtp_settings` — UI, not SQL).
**Test:** use the SMTP test-mail function; also submit the public contact/trial form once and confirm the mail arrives.
**Break risk:** lead/booking notification mails fail silently until fixed — test immediately.

## J) Checkdomain panel/FTP password (precaution)
Rotate in the Checkdomain account settings. Update any FTP client saved profiles.
**Test:** log in once with the new password before closing the old session.

## K) `SEPA_AES_KEY` — read this warning first
It was **empty** at audit (SEPA encryption never armed). Set a fresh 64-hex key now so SEPA work can start safely later. ⚠ **Once real IBANs are encrypted with it, this key can never be casually rotated** — changing it makes existing encrypted data unreadable (rotation then requires a re-encryption migration). Store it with your most protected secrets.

## L) Staff/user passwords from the dump
The dump exposed `users` password *hashes*. Force a password reset for every staff account that existed at dump time (Admin → Users). Members authenticate via the same users table — if member counts are small, reset those too; otherwise prioritize all staff/admin roles.

---

## What Tobias must NEVER paste/share (also not "just once, to check")
- Any password, token, API key, `TOKEN_SECRET`, `CRON_SECRET`, `SEPA_AES_KEY` — old or new
- The downloaded `config.php` backup or DB export contents
- Screenshots of the panel/file manager showing values
- IBANs or member PII
If a value ever lands in chat/mail: treat it as burned and rotate it again.

---

## Post-rotation Git steps (in this order)
1. **Push `10fe40b`** to `origin/main` — safe once rotation is done (the commit removes secrets and adds only placeholder/docs; pre-rotation it would merely signpost the still-valid secrets in history).
2. **History purge** (separate approved session): mirror backup → `git filter-repo` per `SECURITY_REMEDIATION_PLAN.md` §4 → force-push → re-clone all machines. Do **not** force-push before the purge plan is explicitly approved.
3. After purge: verify `api/config.php` and `sql-dump.md` are absent from *all* history (`git log --all -- api/config.php` returns nothing).

## Rollback options summary
| Step | Rollback |
|---|---|
| DB password | Re-set old password in panel (fastest) or restore new config upload |
| `TOKEN_SECRET` | Restore old value → old sessions valid again |
| Bootstrap flag | Set `false` only in lockout emergency |
| `CRON_SECRET` | Restore old value + old cron URLs |
| Google key | Fix restrictions on new key; old key stays deleted |
| Magicline/SMTP | Re-enter previous creds via same admin UIs (if still valid) |
| Whole config | Re-upload the step-0 `config.php` backup |
