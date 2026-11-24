// Runs the real unsubscribe tokens, route, campaign templates and send script
// against a mocked database and mocked Resend. Never reads or writes a real
// database and never sends mail: every fetch is answered here, and anything
// else fails the check.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), ts = require('typescript');
const root = path.join(__dirname, '..'), cache = new Map();
for (const k of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'RESEND_API_KEY', 'MARKETING_MAILING_ADDRESS', 'CONFIRM_SEND', 'CONTACT_FROM_EMAIL']) delete process.env[k];
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
const user = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b', other = '9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0';

// Route mocks: profiles updates are recorded, never sent anywhere.
const updates = []; let dbError = null;
const db = { from(table) {
  assert.equal(table, 'profiles');
  let value;
  const q = { update(v) { value = v; return q; }, eq(k, v) { if (!dbError) updates.push({ value, [k]: v }); return Promise.resolve({ error: dbError }); } };
  return q;
} };
function load(file) {
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id.endsWith('/supabase-server')) return { getServiceClient: () => db };
    return id.startsWith('@/') ? load(path.join(root, id.slice(2))) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  }, m, m.exports);
  return m.exports;
}
const tokens = load(path.join(root, 'lib/unsubscribe.ts'));
const route = load(path.join(root, 'app/api/unsubscribe/route.ts'));
const templates = load(path.join(root, 'lib/email-templates.ts'));
const plan = load(path.join(root, 'lib/plan.ts'));
let ip = 0;
const post = (query, from = `10.0.0.${++ip}`) => route.POST(new Request(`https://dormscape.us/api/unsubscribe?${query}`, {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': from }, body: 'List-Unsubscribe=One-Click' }));
const q = (u, t) => new URLSearchParams({ u, t }).toString();

(async () => {
  // 1. Tokens
  const token = tokens.unsubscribeToken(user);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(tokens.verifyUnsubscribeToken(user, token), true);
  assert.equal(tokens.verifyUnsubscribeToken(user.toUpperCase(), token), true, 'user ids compare case-insensitively');
  const tampered = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A');
  assert.equal(tokens.verifyUnsubscribeToken(user, tampered), false, 'tampered token');
  assert.equal(tokens.verifyUnsubscribeToken(other, token), false, "another user's token");
  for (const [u, t] of [[user, token.slice(1)], [user, token + 'A'], ['not-a-uuid', token], [user, undefined], [undefined, token], [[user], token]]) {
    assert.equal(tokens.verifyUnsubscribeToken(u, t), false, 'malformed input');
  }
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'a-different-key';
  assert.equal(tokens.verifyUnsubscribeToken(user, token), false, 'a token signed with another key');
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(tokens.verifyUnsubscribeToken(user, token), false, 'no key, nothing verifies');
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
  const native = await import(path.join(root, 'lib/unsubscribe.ts'));
  assert.equal(native.unsubscribeToken(user), token, 'the send script (Node) and the site sign the same token');
  const urls = tokens.unsubscribeUrls(user);
  assert.equal(urls.page, `https://dormscape.us/unsubscribe?${q(user, token)}`);
  assert.equal(urls.oneClick, `https://dormscape.us/api/unsubscribe?${q(user, token)}`);

  // 2. Route
  let res = await post(q(user, token));
  assert.equal(res.status, 200); assert.deepEqual(updates, [{ value: { marketing_opt_in_at: null }, id: user }], 'valid token sets marketing_opt_in_at to null');
  res = await post(q(user, tampered));
  assert.equal(res.status, 200, 'invalid token still answers 200'); assert.equal(updates.length, 1, 'invalid token changes nothing');
  res = await post(q(other, token));
  assert.equal(res.status, 200); assert.equal(updates.length, 1, "another user's token changes nothing");
  for (const bad of ['', `u=${user}`, q('x', token), q(user, 'short')]) {
    res = await post(bad); assert.equal(res.status, 400, 'malformed request'); assert.equal(updates.length, 1);
  }
  res = await route.GET(new Request(`https://dormscape.us/api/unsubscribe?${q(user, token)}`));
  assert.equal(res.status, 303); assert.equal(res.headers.get('location'), `https://dormscape.us/unsubscribe?${q(user, token)}`); assert.equal(updates.length, 1, 'GET never unsubscribes');
  dbError = { message: 'test outage' };
  res = await post(q(user, token)); assert.equal(res.status, 503, "a failed write isn't reported as done");
  res = await post(q(user, tampered)); assert.equal(res.status, 200, 'an outage reveals nothing about invalid tokens');
  dbError = null;
  const statuses = [];
  for (let i = 0; i < 32; i++) statuses.push((await post(q(other, token), '10.9.9.9')).status);
  assert.deepEqual([statuses[0], statuses[29], statuses[30]], [200, 200, 429], 'rate limited after 30 a minute per IP');

  // 3. Templates
  const { BF2026, CAMPAIGNS, MAILING_ADDRESS_PLACEHOLDER, campaignEmail } = templates;
  assert.equal(BF2026.plus.regular, `$${plan.PLUS_PRICE_USD.toFixed(2)}`, 'regular Plus price matches lib/plan.ts');
  assert.equal(BF2026.pro.regular, `$${plan.PRO_PRICE_USD.toFixed(2)}`, 'regular Pro price matches lib/plan.ts');
  assert.equal(BF2026.plus.credits - BF2026.bonus, plan.PLUS_INITIAL_CREDITS); assert.equal(BF2026.pro.credits - BF2026.bonus, plan.PRO_INITIAL_CREDITS);
  for (const campaign of CAMPAIGNS) {
    for (const option of ['a', 'b']) {
      const email = campaignEmail(campaign, { unsubscribeUrl: urls.page, option });
      const content = campaign.split('-')[1];
      for (const [kind, body] of [['html', email.html], ['text', email.text]]) {
        const unsub = kind === 'html' ? urls.page.replaceAll('&', '&amp;') : urls.page;
        assert(body.includes(unsub), `${campaign} ${kind}: unsubscribe link`);
        for (const s of ['$1.99', '$4.99', '$14.99', '5 plan credits', '12 plan credits', 'Mon Nov 30, 11:59pm ET', MAILING_ADDRESS_PLACEHOLDER, 'subscribed to dormscape tips and updates', 'account/settings#marketing-emails']) {
          assert(body.includes(s), `${campaign} ${kind}: ${s}`);
        }
        assert(body.includes(`utm_campaign=bf2026${kind === "html" ? "&amp;" : "&"}utm_content=${content}`), `${campaign} ${kind}: tagged pricing link`);
        assert(!/Dormscape|DormScape|DORMSCAPE/.test(body), `${campaign} ${kind}: lowercase brand`);
        assert(!/hurry|only \d+ left|selling fast|act now/i.test(body), `${campaign} ${kind}: no fake urgency`);
      }
      assert(!/Dormscape/.test(email.subject) && email.subject.length < 60, `${campaign}: subject`);
      const filled = campaignEmail(campaign, { unsubscribeUrl: urls.page, mailingAddress: ' 1 Elm St <b>, Town, PA 16801 ', option });
      assert(!filled.html.includes(MAILING_ADDRESS_PLACEHOLDER) && !filled.text.includes(MAILING_ADDRESS_PLACEHOLDER), 'address replaces the placeholder');
      assert(filled.html.includes('dormscape, 1 Elm St &lt;b&gt;, Town, PA 16801') && filled.text.includes('dormscape, 1 Elm St <b>, Town, PA 16801'), 'address escaped in HTML, plain in text');
    }
  }
  const [launch, lastday] = CAMPAIGNS.map(c => campaignEmail(c, { unsubscribeUrl: urls.page }));
  assert.notEqual(launch.subject, lastday.subject); assert(lastday.text.includes('After that, Plus goes back to $4.99 with 3 credits, and Pro to $14.99 with 10.'));
  const invite = templates.workspaceInvitationEmail({ owner: 'A', room: 'B', email: 'c@example.test', role: 'editor', url: 'https://example.test' });
  assert(invite.html.includes('mso-hide:all">A invited you') && !invite.html.includes('Unsubscribe'), 'transactional emails unchanged');

  // 4. Send script, with fetch mocked: fake profiles (GET only) and fake Resend.
  const people = Array.from({ length: 3 }, (_, i) => ({ id: `0000000${i}-aaaa-4bbb-8ccc-dddddddddddd`, email: `student${i}@school.example.test` }));
  people.push({ id: '0000000x-aaaa-4bbb-8ccc-dddddddddddd'.replace('x', '9'), email: 'not-an-email' });
  const batches = [], dbReads = []; let resendStatus = [];
  global.fetch = async (url, options = {}) => {
    url = String(url);
    if (url.startsWith('https://fake-supabase.example.test/rest/v1/profiles')) {
      assert.equal(options.method ?? 'GET', 'GET', 'the send script only reads profiles'); dbReads.push(url);
      assert.match(decodeURIComponent(url), /marketing_opt_in_at=not\.is\.null/);
      const u = new URL(url), offset = Number(u.searchParams.get('offset') ?? 0), limit = Number(u.searchParams.get('limit') ?? 1000);
      return new Response(JSON.stringify(people.slice(offset, offset + limit)), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(url, 'https://api.resend.com/emails/batch', `unexpected fetch ${url}`);
    assert.equal(options.headers.Authorization, 'Bearer fake-resend-key');
    const status = resendStatus.shift() ?? 200, body = JSON.parse(options.body);
    if (status !== 200) return new Response(JSON.stringify({ message: 'test' }), { status, headers: { 'retry-after': '0' } });
    batches.push({ body, headers: options.headers });
    return new Response(JSON.stringify({ data: body.map((_, i) => ({ id: `em_${batches.length}_${i}` })) }), { status: 200 });
  };
  const { main, redact } = await import(path.join(root, 'scripts/send-campaign.mjs'));
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-email-check-')), logFile = path.join(logDir, 'campaign-bf2026-launch.jsonl');
  const run = async (args, env = {}) => {
    const lines = [], saved = { ...process.env };
    Object.assign(process.env, { SUPABASE_URL: 'https://fake-supabase.example.test', RESEND_API_KEY: 'fake-resend-key' }, env);
    try { return { code: await main(args, { logDir, pauseMs: 0, sleep: async () => {}, log: l => lines.push(l) }), out: lines.join('\n') }; }
    finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
  };
  const address = { MARKETING_MAILING_ADDRESS: '1 Elm St, Town, PA 16801' };
  let r = await run([]);
  assert.equal(r.code, 0); assert.match(r.out, /3 opted-in recipients \(1 unusable/); assert.match(r.out, /s\*\*\*@school\.example\.test/); assert(!r.out.includes('student0@'), 'dry run redacts addresses');
  assert.equal(batches.length, 0, 'dry run sends nothing'); assert.equal(redact('ab@x.edu'), 'a***@x.edu');
  r = await run(['--send', '--campaign', 'bf2026-launch'], address);
  assert.equal(r.code, 1); assert.match(r.out, /CONFIRM_SEND=yes/); assert.equal(batches.length, 0, 'no send without confirmation');
  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'yes' });
  assert.equal(r.code, 1); assert.match(r.out, /MARKETING_MAILING_ADDRESS/); assert.equal(batches.length, 0, 'no send without the mailing address');
  r = await run(['--send'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 1); assert.match(r.out, /--campaign/); assert.equal(batches.length, 0, 'no send without a campaign');
  r = await run(['--send', '--campaign', 'bf2026-nope'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 1); assert.equal(batches.length, 0);
  const readsBefore = dbReads.length;
  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'no', ...address });
  assert.equal(dbReads.length, readsBefore, 'refusals happen before reading the database');

  resendStatus = [429];
  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 0, r.out); assert.equal(batches.length, 1, 'one batch after a 429 retry'); assert.match(r.out, /rate limited/);
  const sentBatch = batches[0];
  assert.equal(sentBatch.body.length, 3);
  assert.match(sentBatch.headers['Idempotency-Key'], /^bf2026-launch\/[0-9a-f]{40}$/);
  for (const [i, email] of sentBatch.body.entries()) {
    const links = tokens.unsubscribeUrls(people[i].id);
    assert.deepEqual(email.to, [people[i].email]);
    assert.equal(email.headers['List-Unsubscribe'], `<${links.oneClick}>`); assert.equal(email.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert(email.html.includes(links.page.replaceAll('&', '&amp;')) && email.text.includes(links.page), 'per-recipient unsubscribe link');
    assert(email.html.includes('1 Elm St, Town, PA 16801') && !email.html.includes(MAILING_ADDRESS_PLACEHOLDER));
    assert.equal(email.from, 'dormscape <contact@dormscape.us>'); assert.equal(email.subject, launch.subject);
  }
  assert.equal(fs.readFileSync(logFile, 'utf8').trim().split('\n').length, 3);
  assert(!fs.readFileSync(logFile, 'utf8').includes('@'), 'the sent-log holds user ids, not addresses');

  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 0); assert.equal(batches.length, 1, 'everyone in the log is skipped'); assert.match(r.out, /3 already sent/);
  people.push({ id: '00000005-aaaa-4bbb-8ccc-dddddddddddd', email: 'late@school.example.test' });
  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(batches.length, 2); assert.deepEqual(batches[1].body.map(e => e.to[0]), ['late@school.example.test'], 'only the new recipient');
  resendStatus = [500];
  people.push({ id: '00000006-aaaa-4bbb-8ccc-dddddddddddd', email: 'fail@school.example.test' });
  r = await run(['--send', '--campaign', 'bf2026-launch'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 1); assert.match(r.out, /Stopped: 0 sent/); assert.equal(fs.readFileSync(logFile, 'utf8').trim().split('\n').length, 4, 'a failed batch is not logged');

  for (let i = 0; i < 150; i++) people.push({ id: `1${String(i).padStart(7, '0')}-aaaa-4bbb-8ccc-dddddddddddd`, email: `bulk${i}@school.example.test` });
  r = await run(['--send', '--campaign', 'bf2026-lastday'], { CONFIRM_SEND: 'yes', ...address });
  assert.equal(r.code, 0, r.out); assert.deepEqual(batches.slice(2).map(b => b.body.length), [100, 55], 'batches of 100');
  assert.equal(dbReads.filter(u => /offset=1000/.test(u)).length, 0, 'one page of profiles is enough here');

  r = await run(['--test', 'owner@example.test', '--campaign', 'bf2026-lastday', '--option', 'b']);
  assert.equal(r.code, 0); assert.match(r.out, /footer shows \{\{MAILING_ADDRESS\}\}/);
  const test = batches.at(-1).body; assert.equal(test.length, 1); assert.deepEqual(test[0].to, ['owner@example.test']);
  assert(test[0].headers['List-Unsubscribe'].includes('u=00000000-0000-0000-0000-000000000000'), "the test's unsubscribe link points at no real user");
  assert(!fs.existsSync(path.join(logDir, 'campaign-bf2026-lastday.jsonl')) || !fs.readFileSync(path.join(logDir, 'campaign-bf2026-lastday.jsonl'), 'utf8').includes('00000000-0000-0000-0000-000000000000'), 'tests are not logged');
  fs.rmSync(logDir, { recursive: true });

  console.log('PASS: signed tokens (tampered, wrong user, wrong key, malformed), one-click route (valid sets null, invalid 200 with no change, GET never writes, outage 503, rate limit), both campaigns (prices, credits, end time, unsubscribe link, address placeholder, lowercase brand), and the send script (refusals, batches, headers, retry, resume from log). No real database, no email sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
