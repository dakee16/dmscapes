// Runs the real template, mail transport, checkout and webhook code with mocks.
// Never sends mail or creates a real payment.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.join(__dirname, '..'), cache = new Map(), rows = new Map(), sends = [], checkouts = [];
let emailOk = true, failStorage = false, event, grants = 0, invoiceReads = 0;
const userId = '11111111-1111-4111-8111-111111111111';
process.env.RESEND_API_KEY = 'fake-test-key'; process.env.STRIPE_WEBHOOK_SECRET = 'fake-test-secret'; process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test';
const db = { from(table) {
  let key, operation = 'read', value;
  const q = { select() { return q; }, eq(k,v) { if(k==='invoice_id')key=v; return q; }, maybeSingle() { return q; }, single() { return q; }, insert(v) {operation='insert';value=v;return q;}, update(v) {operation='update';value=v;return q;},
    then(resolve,reject) {
      let result = { data: null, error: null };
      if (table === 'profiles') result.data = {plan:'free',email:'buyer@example.test',stripe_customer_id:null};
      else if(table === 'purchase_email_deliveries') {
        if(operation==='insert') { if(rows.has(value.invoice_id))result.error={code:'23505'}; else rows.set(value.invoice_id,structuredClone(value)); }
        else if(operation==='update') { if(failStorage)result.error={code:'test'}; else Object.assign(rows.get(key),value); }
        else result.data = structuredClone(rows.get(key) || null);
      } else throw new Error('Unexpected table in email test: '+table);
      return Promise.resolve(result).then(resolve,reject);
    }
  };return q;
} };
const invoice = {id:'in_test_1',status:'paid',customer_email:'buyer@example.test',number:'DS-0001',currency:'usd',amount_paid:1199,created:1700000000,status_transitions:{paid_at:1700000000},metadata:{dormscape_email:'v1',purchase:'pro',credit_amount:'10',user_id:userId},invoice_pdf:'https://pay.stripe.com/invoice/example/pdf',hosted_invoice_url:'https://invoice.stripe.com/i/example'};
const stripe = {checkout:{sessions:{create:async params=>{checkouts.push(params);return {url:'https://checkout.stripe.com/test'};}}},invoices:{retrieve:async(id)=>{invoiceReads++;return {...invoice,id};}},webhooks:{constructEvent:()=>{if(event==='invalid')throw Error('bad signature');return event;}}};
global.fetch = async (url,options) => { assert.equal(url,'https://api.resend.com/emails'); sends.push({body:JSON.parse(options.body),headers:options.headers}); return new Response('{}',{status:emailOk?200:503}); };
function load(file) { if(!path.extname(file))file+='.ts'; if(cache.has(file))return cache.get(file).exports; const m={exports:{}};cache.set(file,m);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)(id=>{
    if(id.endsWith('/supabase-server'))return {getServiceClient:()=>db};
    if(id.endsWith('/supabase-auth'))return {getUserId:async()=>userId};
    if(id.endsWith('/stripe'))return {getStripe:()=>stripe};
    if(id.endsWith('/rate-limit'))return {rateLimit:()=>({allowed:true})};
    if(id.endsWith('/credit-ledger'))return {addPlanCredits:async()=>grants++,grantPurchasedPlan:async()=>grants++};
    return id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
  },m,m.exports);return m.exports;
}
const {deliverPurchaseInvoice}=load(path.join(root,'lib/purchase-email.ts'));
const templates=load(path.join(root,'lib/email-templates.ts'));
const checkout=load(path.join(root,'app/api/checkout/route.ts'));
const webhook=load(path.join(root,'app/api/stripe/webhook/route.ts'));
const request=()=>new Request('https://preview.example.test/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'test'},body:'test'});
(async()=>{
  const invitation=templates.workspaceInvitationEmail({owner:'<img src=x>',room:'<script>oops</script>',email:'friend@example.test',role:'commenter',url:'https://example.test/rooms/join#token'});
  assert(!invitation.html.includes('<script>'));assert(!invitation.html.includes('<img src=x>'));assert(invitation.html.includes('&lt;script&gt;'));assert(invitation.html.includes('Comment access'));
  for(const type of ['plus','pro','flex_credits']) {
    const response=await checkout.POST(new Request('https://preview.example.test/api/checkout',{method:'POST',body:JSON.stringify({type,quantity:3})}));
    assert.equal(response.status,200);const created=checkouts.at(-1);assert.equal(created.mode,'payment');assert.equal(created.invoice_creation.enabled,true);assert.equal(created.invoice_creation.invoice_data.metadata.purchase,type);assert.equal(created.invoice_creation.invoice_data.metadata.dormscape_email,'v1');assert.equal(created.customer_creation,'always');
  }
  await deliverPurchaseInvoice(db,stripe,invoice);
  assert.equal(sends.length,1);assert.match(sends[0].body.subject,/Dormscape Pro/);assert.match(sends[0].body.text,/\$11.99/);assert.match(sends[0].body.text,/10 plan credits/);assert.equal(sends[0].body.attachments[0].path,invoice.invoice_pdf);assert.equal(sends[0].headers['Idempotency-Key'],'purchase-invoice/in_test_1');assert(rows.get(invoice.id).sent_at);
  await deliverPurchaseInvoice(db,stripe,invoice);assert.equal(sends.length,1,'Duplicate event must not email again');
  await deliverPurchaseInvoice(db,stripe,{...invoice,id:'ignored',metadata:{}});assert.equal(sends.length,1,'Old and unrelated invoices are ignored');
  await deliverPurchaseInvoice(db,stripe,{...invoice,id:'unpaid',status:'open'});assert.equal(sends.length,1,'Unpaid invoices cannot email');
  emailOk=false;const retry={...invoice,id:'in_retry'};await assert.rejects(()=>deliverPurchaseInvoice(db,stripe,retry),/not accepted/);assert(!rows.get(retry.id).sent_at);const failedPayload=sends.at(-1);
  emailOk=true;await deliverPurchaseInvoice(db,stripe,{...retry,amount_paid:1});assert.deepEqual(sends.at(-1),failedPayload,'Retries freeze invoice amounts, links, body and idempotency key');
  failStorage=true;const storage={...invoice,id:'in_storage'};await assert.rejects(()=>deliverPurchaseInvoice(db,stripe,storage),/record/);const storagePayload=sends.at(-1);failStorage=false;await deliverPurchaseInvoice(db,stripe,storage);assert.deepEqual(sends.at(-1),storagePayload,'Database retry keeps same Resend key and content');
  await deliverPurchaseInvoice(db,stripe,{...invoice,id:'in_fetch',invoice_pdf:null});assert.equal(invoiceReads,1,'Wait for the actual invoice PDF');
  event={type:'invoice.paid',data:{object:{...invoice,id:'in_webhook'}}};assert.equal((await webhook.POST(request())).status,200);assert.equal(grants,0,'Invoice events never grant credits');const sent=sends.length;assert.equal((await webhook.POST(request())).status,200);assert.equal(sends.length,sent);
  emailOk=false;event={type:'invoice.paid',data:{object:{...invoice,id:'in_webhook_failure'}}};assert.equal((await webhook.POST(request())).status,503,'Mail failure must ask Stripe to retry');assert.equal(grants,0);emailOk=true;
  event='invalid';assert.equal((await webhook.POST(request())).status,400,'Invalid signature is rejected before sending');assert.equal(grants,0);
  for(const name of ['confirm-signup','reset-password','change-email']){const html=fs.readFileSync(path.join(root,'docs/email-templates',name+'.html'),'utf8');assert(html.includes('href="{{ .ConfirmationURL }}"'));assert(!/<script|<form/.test(html));assert(html.includes('max-width:560px'));assert(html.includes('Your dorm, planned to the inch.'));}
  console.log('PASS: checkout invoices, PDF attachments, actual paid amounts, duplicate/failure retries, signature checks, recipient-safe templates, and Supabase action links. No live emails sent.');
})().catch(error=>{console.error(error);process.exitCode=1;});
