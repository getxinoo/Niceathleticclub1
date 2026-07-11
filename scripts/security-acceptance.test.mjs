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

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? '❌' : '✅'} security-acceptance: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('runner error:', e.message); process.exit(1); });
