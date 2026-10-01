// Exercise real route handlers with a fake transport. Never touches hosted data.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.join(__dirname, '..'), cache = new Map();
const actor = '11111111-1111-4111-8111-111111111111';
let available = true, verified = true, ready = true, allowed = true, deletionError = false;
let stored = true, emailed = false, deleted = [], reports = [], emails = [];
const db = {
  auth: { getUser: async () => ({ data: { user: verified ? { id: actor } : null }, error: null }),
    admin: { deleteUser: async (...args) => { deleted.push(args); return { error: deletionError ? { code: 'failure' } : null }; } } },
  rpc: async () => ({ data: ready, error: null }),
  from: table => ({ insert: async value => { reports.push({ table, value }); return { error: stored ? null : { code: 'missing' } }; } }),
};
function load(file) {
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id.endsWith('supabase-server')) return { getServiceClient: () => available ? db : null };
    if (id.endsWith('supabase-auth')) return { getUserId: async () => verified ? actor : null };
    if (id.endsWith('rate-limit')) return { rateLimit: () => ({ allowed, retryAfterSec: 600 }) };
    if (id.endsWith('/email')) return { sendEmail: async value => { emails.push(value); return emailed; } };
    return id.startsWith('@/') ? load(path.join(root, id.slice(2))) : require(id);
  }, m, m.exports);
  return m.exports;
}
const del = load(path.join(root, 'app/api/account/delete/route.ts'));
const report = load(path.join(root, 'app/api/reports/route.ts'));
const { reportPath } = load(path.join(root, 'lib/reports.ts'));
const { hasRecentSignIn } = load(path.join(root, 'lib/account-deletion.ts'));
const jwt = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const fresh = jwt({ amr: [{ method: 'oauth', timestamp: Date.now() / 1000 }] });
const request = (method, body, token = fresh, extra = {}) => new Request('https://example.test/api/action', {
  method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify(body),
});
const confirmation = { confirmation: 'DELETE', acknowledged: true, user_id: 'forged' };
const validReport = { category: 'bug', description: 'The room canvas stops when I rotate the desk.', email: 'student@example.test', page_path: '/rooms/abc?token=secret#private', user_id: 'forged' };
(async () => {
  assert(hasRecentSignIn(fresh));
  for (const claims of [{}, { iat: Date.now() / 1000 }, { amr: [{ method: 'password', timestamp: 1 }] }, { amr: [{ method: 'anonymous', timestamp: Date.now() / 1000 }] }]) assert(!hasRecentSignIn(jwt(claims)));
  assert.equal((await del.DELETE(request('DELETE', confirmation, null))).status, 401);
  assert.equal((await del.DELETE(request('DELETE', confirmation, fresh, { Origin: 'https://evil.test' }))).status, 403);
  allowed = false; assert.equal((await del.DELETE(request('DELETE', confirmation))).status, 429); allowed = true;
  available = false; assert.equal((await del.DELETE(request('DELETE', confirmation))).status, 503); available = true;
  for (const body of [null, [], {}, { confirmation: 'delete', acknowledged: true }, { confirmation: 'DELETE' }]) assert.equal((await del.DELETE(request('DELETE', body))).status, 400);
  verified = false; assert.equal((await del.DELETE(request('DELETE', confirmation))).status, 401); verified = true;
  const stale = await del.DELETE(request('DELETE', confirmation, jwt({ amr: [{ method: 'password', timestamp: 1 }] })));
  assert.equal((await stale.json()).code, 'REAUTH_REQUIRED');
  ready = false; assert.equal((await del.DELETE(request('DELETE', confirmation))).status, 503); ready = true;
  assert.equal(deleted.length, 0);
  const result = await del.DELETE(request('DELETE', confirmation));
  assert.equal(result.status, 200); assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
  assert.deepEqual(deleted, [[actor, false]], 'Only the verified user can be deleted, never a body-supplied id');
  deletionError = true; assert.equal((await del.DELETE(request('DELETE', confirmation))).status, 500);

  assert.equal(reportPath('//evil.test'), null); assert.equal(reportPath('/\\evil.test'), null);
  assert.equal(reportPath('/rooms/abc?token=secret#private'), '/rooms/abc');
  for (const body of [null, {}, { ...validReport, category: 'made-up' }, { ...validReport, description: 'short' }, { ...validReport, email: 'invalid' }, { ...validReport, website: 'bot' }]) assert.equal((await report.POST(request('POST', body))).status, 400);
  assert.equal((await report.POST(request('POST', { ...validReport, description: 'x'.repeat(25000) }))).status, 400);
  assert.equal((await report.POST(request('POST', validReport, fresh, { Origin: 'https://evil.test' }))).status, 403);
  const good = await report.POST(request('POST', validReport)); assert.equal(good.status, 201);
  assert.match((await good.json()).reference, /^[a-f0-9]{8}$/);
  assert.equal(reports.at(-1).value.user_id, actor); assert.equal(reports.at(-1).value.page_path, '/rooms/abc');
  assert(!JSON.stringify(emails.at(-1)).includes('secret'));
  verified = false; assert.equal((await report.POST(request('POST', { ...validReport, email: '' }, null))).status, 201);
  assert.equal(reports.at(-1).value.user_id, null);
  stored = false; emailed = true; assert.equal((await report.POST(request('POST', validReport))).status, 201);
  emailed = false; assert.equal((await report.POST(request('POST', validReport))).status, 503);
  available = false; assert.equal((await report.POST(request('POST', validReport))).status, 503);
  allowed = false; assert.equal((await report.POST(request('POST', validReport))).status, 429);
  console.log('PASS: account deletion authentication, confirmation, recent sign-in, setup guard, actor scope and failures.');
  console.log('PASS: report validation, size limits, origin, attribution, URL privacy, durable success and delivery failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
