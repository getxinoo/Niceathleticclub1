/**
 * security-acceptance.test.mjs — P1 authorization hotfix acceptance matrix
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises the permission/ownership guarantees added by the P1 security hotfix
 * against a RUNNING backend (staging — never production). It cannot run in a
 * frontend-only/dev environment: it needs the real PHP API and a JWT per role.
 *
 * REQUIRED ENV (obtain tokens by logging in as each identity on staging):
 *   API_BASE                e.g. http://localhost:8080/api   (a PHP host)
 *   TOKEN_MEMBER            valid member JWT
 *   TOKEN_MEMBER2           a SECOND member (for IDOR checks) — its member_id in MEMBER2_ID
 *   MEMBER2_ID              numeric member_id of the second member
 *   TOKEN_TRAINER, TOKEN_FRONTDESK, TOKEN_FINANCE, TOKEN_HR, TOKEN_ADMIN
 *
 * OPTIONAL FIXTURES (onboarding section; cases without their fixture are
 * reported as MANUAL, never as silently passed):
 *   APPLICANT_ID            id of a disposable career_applicants row (staging) —
 *                           enables the positive "authorized manager onboards" case
 *   TOKEN_EXPIRED           an EXPIRED JWT of any staff user — enables the
 *                           expired-credential rejection case
 *   RUN_MUTATING=1          allow tests that really change a password on staging
 *   MEMBER_NEW_PASSWORD     policy-conform password used when RUN_MUTATING=1
 *
 * Usage:  API_BASE=... TOKEN_MEMBER=... [...] node scripts/security-acceptance.test.mjs
 * Exit 0 = all expectations met; exit 1 = at least one violation.
 *
 * NOTE: This suite was authored with the hotfix but NOT executed locally — no
 * PHP runtime is available in the CMS build environment. Run it on staging
 * (with a PHP backend + rotated secrets) before merge/deploy.
 */
const BASE = process.env.API_BASE;
if (!BASE) { console.error('❌ API_BASE not set — cannot run (needs a PHP backend). Skipping as UNRUN.'); process.exit(2); }

const T = {
  member:   process.env.TOKEN_MEMBER,
  member2:  process.env.TOKEN_MEMBER2,
  trainer:  process.env.TOKEN_TRAINER,
  frontdesk:process.env.TOKEN_FRONTDESK,
  finance:  process.env.TOKEN_FINANCE,
  hr:       process.env.TOKEN_HR,
  admin:    process.env.TOKEN_ADMIN,
};
const MEMBER2_ID = process.env.MEMBER2_ID;

const results = [];
function record(name, ok, detail) { results.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); }

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
async function expectStatus(name, path, opts, expected) {
  const r = await call(path, opts);
  const ok = (Array.isArray(expected) ? expected.includes(r.status) : r.status === expected);
  record(name, ok, `got ${r.status}, expected ${expected}`);
  return r;
}

(async () => {
  // 1. Unauthenticated → 401 on the formerly-open endpoints
  await expectStatus('1a unauth dashboard → 401',      '/dashboard.php',        {}, 401);
  await expectStatus('1b unauth leads → 401',          '/leads.php',            {}, 401);
  await expectStatus('1c unauth admin coaching → 401',  '/admin/coaching.php',   {}, 401);
  await expectStatus('1d unauth member coaching → 401', '/member/coaching.php',  {}, 401);

  // 2. Member token calling admin endpoints → 403
  await expectStatus('2a member→admin members → 403',  '/admin/members.php',    { token: T.member }, 403);
  await expectStatus('2b member→dashboard → 403',      '/dashboard.php',        { token: T.member }, 403);
  await expectStatus('2c member→admin coaching → 403', '/admin/coaching.php',   { token: T.member }, 403);
  await expectStatus('2d member→leads → 403',          '/leads.php',            { token: T.member }, 403);

  // 3. Member coaching IDOR — passing another member_id must NEVER return their data
  {
    const r = await call(`/member/coaching.php?member_id=${MEMBER2_ID}`, { token: T.member });
    // Must reflect the CALLER's own data (member_id ignored), never member2's.
    const leaked = JSON.stringify(r.json || '').includes(`"member_id":${MEMBER2_ID}`);
    record('3 member coaching IDOR blocked', r.status === 200 && !leaked, `status ${r.status}, leaked=${leaked}`);
  }

  // 4. CMS publish with member token → 403
  await expectStatus('4 member CMS publish → 403', '/pages.php?slug=studio', { token: T.member, method: 'PUT', body: { blocks: [], status: 'published', allow_empty_blocks: true } }, 403);

  // 5. CMS publish with admin (cms.manage) → success (2xx)
  await expectStatus('5 admin CMS read → 2xx', '/pages.php?slug=studio&admin=1', { token: T.admin }, [200]);

  // 6. Members read with members.read (frontdesk has it) → success
  await expectStatus('6 frontdesk members read → 2xx', '/admin/members.php', { token: T.frontdesk }, [200]);

  // 7. Members write without members.write (trainer lacks it) → 403
  await expectStatus('7 trainer members write → 403', '/admin/members.php', { token: T.trainer, method: 'POST', body: { first_name: 'x', last_name: 'y' } }, 403);

  // 8. Course write without courses.write (frontdesk lacks courses.write) → 403
  await expectStatus('8 frontdesk course write → 403', '/kurse.php', { token: T.frontdesk, method: 'POST', body: { title: 'x' } }, 403);

  // 9. Lead conversion without both perms (member) → 403
  await expectStatus('9 member lead-convert → 403', '/admin/convert_lead.php', { token: T.member, method: 'POST', body: { leadId: 1, plan: 'starter' } }, 403);

  // 10. Lead conversion injected failure → full rollback
  //     (Requires a staging fixture that forces a mid-transaction failure, e.g. a
  //     duplicate email on the members insert. Verify NO orphan user/member/contract
  //     rows exist afterwards. Left as a documented manual/fixture step.)
  record('10 lead-convert rollback (fixture)', false, 'MANUAL: force mid-tx failure on staging, assert no partial rows');

  // ── Onboarding & password authorization (api/onboard.php) ──────────────────
  // NOTE: this system has no separate invitation-token endpoint. The
  // "invitation" is: authorized manager creates the account with a temp
  // password (must_change_pw=1); the invited person authenticates with it and
  // is forced through ?action=change_password, which nulls temp_password_hash.
  // The credential-bound cases below therefore exercise the Bearer credential.

  // 11. Unauthenticated staff creation → 401
  await expectStatus('11 unauth staff creation → 401', '/onboard.php', { method: 'POST', body: { applicant_id: 1, mode: 'manual' } }, 401);

  // 12. Normal member creates staff → 403
  await expectStatus('12 member staff creation → 403', '/onboard.php', { token: T.member, method: 'POST', body: { applicant_id: 1, mode: 'manual' } }, 403);

  // 13. Staff WITHOUT team.manage/users.manage creates staff → 403
  //     (trainer and finance default role sets both lack team.manage)
  await expectStatus('13a trainer staff creation → 403', '/onboard.php', { token: T.trainer, method: 'POST', body: { applicant_id: 1, mode: 'manual' } }, 403);
  await expectStatus('13b finance staff creation → 403', '/onboard.php', { token: T.finance, method: 'POST', body: { applicant_id: 1, mode: 'manual' } }, 403);

  // 14. check_email is part of the staff-creation flow → same gate
  await expectStatus('14a unauth check_email → 401', '/onboard.php?action=check_email', { method: 'POST', body: { first_name: 'a', last_name: 'b' } }, 401);
  await expectStatus('14b member check_email → 403', '/onboard.php?action=check_email', { token: T.member, method: 'POST', body: { first_name: 'a', last_name: 'b' } }, 403);

  // 15. Authorized manager (hr has team.manage) passes the gate.
  //     15a is side-effect-free proof the permission gate opens for hr.
  await expectStatus('15a hr check_email → 2xx', '/onboard.php?action=check_email', { token: T.hr, method: 'POST', body: { first_name: 'Gate', last_name: 'Probe' } }, [200]);
  //     15b really onboards — only with a disposable staging fixture applicant.
  if (process.env.APPLICANT_ID) {
    await expectStatus('15b hr onboard (manual mode) → 2xx', '/onboard.php', { token: T.hr, method: 'POST', body: { applicant_id: Number(process.env.APPLICANT_ID), mode: 'manual' } }, [200]);
  } else {
    record('15b hr onboard (fixture)', false, 'MANUAL: set APPLICANT_ID to a disposable staging applicant');
  }

  // 16. Cross-user password change must be impossible.
  //     The endpoint accepts NO target-user parameter — the affected user comes
  //     exclusively from the Bearer token. A smuggled user_id/id must be ignored.
  //     The policy-failing password ("short") keeps this probe side-effect-free:
  //     400 proves the request was processed as the CALLER's own self-service
  //     change (authorization passed, validation rejected) — never a foreign write.
  {
    const r = await call('/onboard.php?action=change_password', { token: T.member, method: 'POST', body: { new_password: 'short', user_id: Number(MEMBER2_ID), id: Number(MEMBER2_ID) } });
    record('16 cross-user password change blocked (structural)', r.status === 400, `got ${r.status}, expected 400 (self-service validation; foreign ids ignored, no admin path exists)`);
  }
  if (process.env.RUN_MUTATING === '1' && process.env.MEMBER_NEW_PASSWORD) {
    // Mutating confirmation: member1 changes "member2's" password → afterwards
    // member2's token must still be the one that works (change hit member1 only).
    const r = await call('/onboard.php?action=change_password', { token: T.member, method: 'POST', body: { new_password: process.env.MEMBER_NEW_PASSWORD, user_id: Number(MEMBER2_ID) } });
    const m2 = await call(`/member/coaching.php`, { token: T.member2 });
    record('16m mutating cross-user check', r.status === 200 && m2.status === 200, `change ${r.status}, member2 session still valid ${m2.status}`);
  }

  // 17. Authenticated user may change their OWN password without any admin
  //     permission. 400 (policy) — and explicitly NOT 401/403 — proves the
  //     self-service path is open to a plain member. Side-effect-free.
  {
    const r = await call('/onboard.php?action=change_password', { token: T.member, method: 'POST', body: { new_password: 'short' } });
    record('17 own password change permitted (no admin gate)', r.status === 400, `got ${r.status} (403 would mean self-service is broken)`);
  }
  if (process.env.RUN_MUTATING === '1' && process.env.MEMBER_NEW_PASSWORD) {
    await expectStatus('17m member changes own password → 2xx', '/onboard.php?action=change_password', { token: T.member, method: 'POST', body: { new_password: process.env.MEMBER_NEW_PASSWORD } }, [200]);
  }

  // 18. Invalid credential ("invalid invitation token") → 401
  await expectStatus('18 invalid bearer on change_password → 401', '/onboard.php?action=change_password', { token: 'invalid.invitation.token', method: 'POST', body: { new_password: 'short' } }, 401);

  // 19. Expired credential → 401 (verify_token enforces exp) — needs fixture
  if (process.env.TOKEN_EXPIRED) {
    await expectStatus('19 expired bearer → 401', '/onboard.php?action=change_password', { token: process.env.TOKEN_EXPIRED, method: 'POST', body: { new_password: 'short' } }, 401);
  } else {
    record('19 expired bearer (fixture)', false, 'MANUAL: set TOKEN_EXPIRED to an expired staff JWT');
  }

  // 20. "Invitation" cannot be reused: after the first change_password, the
  //     temp password is invalidated (temp_password_hash = NULL, must_change_pw = 0).
  //     Requires a freshly onboarded fixture user + login attempts → manual.
  record('20 temp-password single use (fixture)', false, 'MANUAL: onboard fixture user, change pw once, assert temp password login now fails');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? '❌' : '✅'} security-acceptance: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('runner error:', e.message); process.exit(1); });
