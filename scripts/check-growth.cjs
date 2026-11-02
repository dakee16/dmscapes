// Growth loops: invites pay out once, to the right people, within the monthly cap; creator
// codes unlock Plus once per account. Runs lib/referrals + lib/creator-codes against an
// in-memory stand-in for the Supabase tables (no network, no database).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
  if(!path.extname(file))file+='.ts';if(file.endsWith('.json'))return require(file);if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','module','exports',code)(id=>id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id),mod,mod.exports);
  return mod.exports;
}

// Just enough of the supabase-js query builder for these helpers.
const KEYS={profiles:'id',creator_redemptions:'user_id',creator_codes:'code',saved_rooms:'id',creators:'user_id'};
function fakeDb(tables){
  return{from(name){
    const q={op:'select',filters:[],opts:{},one:false};
    const b={
      select(_c,opts){if(q.op==='select')q.opts=opts||{};return b;},
      update(v){q.op='update';q.values=v;return b;},
      insert(v){q.op='insert';q.values=v;return b;},
      delete(){q.op='delete';return b;},
      eq(c,v){q.filters.push(r=>r[c]===v);return b;},
      is(c,v){q.filters.push(r=>(r[c]??null)===v);return b;},
      not(c,_op,v){q.filters.push(r=>(r[c]??null)!==v);return b;},
      gte(c,v){q.filters.push(r=>r[c]!=null&&r[c]>=v);return b;},
      maybeSingle(){q.one=true;return b;},
      then(ok,no){return Promise.resolve(run()).then(ok,no);},
    };
    function run(){
      const rows=(tables[name]??=[]),hit=rows.filter(r=>q.filters.every(f=>f(r)));
      if(q.op==='insert'){const key=KEYS[name];if(rows.some(r=>r[key]===q.values[key]))return{data:null,error:{code:'23505'}};rows.push({...q.values});return{data:null,error:null};}
      if(q.op==='delete'){tables[name]=rows.filter(r=>!hit.includes(r));return{data:null,error:null};}
      if(q.op==='update'){hit.forEach(r=>Object.assign(r,q.values));return{data:q.one?(hit[0]??null):hit,error:null};}
      if(q.opts.head)return{data:null,count:hit.length,error:null};
      return{data:q.one?(hit[0]??null):hit,count:hit.length,error:null};
    }
    return b;
  }};
}

const {claimReferral,payReferral,referralCode}=load(path.join(root,'lib/referrals'));
const {redeemCreatorCode}=load(path.join(root,'lib/creator-codes'));
const {planCreditBalance}=load(path.join(root,'lib/credit-ledger'));
const {applyAsCreator}=load(path.join(root,'lib/creators'));
const {imageKind,imageSize,AVATAR_MAX_SIDE}=load(path.join(root,'lib/avatars'));
const {layoutOnly,fairRows}=load(path.join(root,'lib/gallery'));
const {REFERRAL_MONTHLY_CAP,PLUS_INITIAL_CREDITS}=load(path.join(root,'lib/plan'));
const now=new Date().toISOString(),old=new Date(Date.now()-72*3600e3).toISOString();
const free=(id,extra={})=>({id,plan:'free',free_plans_used:0,plan_credits_remaining:null,created_at:now,...extra});

(async()=>{
  // Claims: only a brand-new, unused Free account, never from itself, once.
  const t={profiles:[free('inviter'),free('friend'),free('oldie',{created_at:old}),free('used',{free_plans_used:1})],saved_rooms:[{id:'room123abc',user_id:'inviter'}]};
  const db=fakeDb(t);
  const code=await referralCode(db,'inviter');
  assert.match(code,/^[a-z0-9]{8}$/);
  assert.equal(await referralCode(db,'inviter'),code,'the code is made once');
  assert.equal(await claimReferral(db,'inviter',{code}),false,'no self-invites');
  assert.equal(await claimReferral(db,'oldie',{code}),false,'older accounts cannot claim');
  assert.equal(await claimReferral(db,'used',{code}),false,'accounts that already designed cannot claim');
  assert.equal(await claimReferral(db,'friend',{code}),true);
  assert.equal(await claimReferral(db,'friend',{room:'room123abc'}),false,'a claim happens once');
  t.profiles.push(free('roomie'));
  assert.equal(await claimReferral(db,'roomie',{room:'room123abc'}),true,'a shared room invites for its owner');
  assert.equal(t.profiles.find(p=>p.id==='roomie').referred_by,'inviter');

  // Payout: the friend's first design gives the friend one, and the inviter one (keeping the inviter's unused free plan).
  assert.equal(await payReferral(db,'oldie'),false,'no invite, no payout');
  t.profiles.find(p=>p.id==='friend').free_plans_used=1; // the first design just spent the free plan
  assert.equal(await payReferral(db,'friend'),true);
  assert.equal(await planCreditBalance(db,'friend'),1,'friend gets a free design');
  assert.equal(await planCreditBalance(db,'inviter'),2,'inviter gets one and keeps the free plan they had not used');
  assert.equal(await payReferral(db,'friend'),false,'pays out once');
  assert.equal(await planCreditBalance(db,'inviter'),2);

  // Cap: past REFERRAL_MONTHLY_CAP rewarded friends this month, only the friend is paid.
  const c={profiles:[{...free('busy'),plan:'flex',plan_credits_remaining:0}]};
  for(let i=0;i<REFERRAL_MONTHLY_CAP;i++)c.profiles.push(free('f'+i,{referred_by:'busy',referral_rewarded_at:now,free_plans_used:1}));
  c.profiles.push(free('late',{referred_by:'busy',free_plans_used:1}));
  const cdb=fakeDb(c);
  assert.equal(await payReferral(cdb,'late'),true);
  assert.equal(await planCreditBalance(cdb,'late'),1,'the friend is still paid');
  assert.equal(await planCreditBalance(cdb,'busy'),0,'the inviter is capped');

  // Creator codes: Plus once per account, within limits.
  const k={profiles:[free('a'),free('b'),free('c'),{...free('p'),plan:'pro',plan_credits_remaining:4}],
    creator_codes:[{code:'jane',active:true,max_redemptions:2,expires_at:null},{code:'gone',active:true,max_redemptions:null,expires_at:old},{code:'off',active:false,max_redemptions:null,expires_at:null}],
    creator_redemptions:[]};
  const kdb=fakeDb(k);
  assert.equal((await redeemCreatorCode(kdb,'a','no way!')).status,400);
  assert.equal((await redeemCreatorCode(kdb,'a','gone')).status,404,'expired');
  assert.equal((await redeemCreatorCode(kdb,'a','off')).status,404,'switched off');
  assert.equal((await redeemCreatorCode(kdb,'p','jane')).status,409,'Pro has nothing to unlock');
  assert.deepEqual(await redeemCreatorCode(kdb,'a','  JANE '),{ok:true},'codes are trimmed and lowercased');
  const a=k.profiles.find(p=>p.id==='a');
  assert.equal(a.plan,'plus');assert.equal(a.plus_features_unlocked,true);
  assert.equal(await planCreditBalance(kdb,'a'),PLUS_INITIAL_CREDITS);
  assert.equal((await redeemCreatorCode(kdb,'a','jane')).status,409,'once per account');
  assert.deepEqual(await redeemCreatorCode(kdb,'b','jane'),{ok:true});
  assert.equal((await redeemCreatorCode(kdb,'c','jane')).status,410,'the code is used up');
  k.creator_codes.push({code:'jane-doe',active:true,max_redemptions:null,expires_at:null});
  assert.deepEqual(await redeemCreatorCode(kdb,'c','@Jane.Doe'),{ok:true},'a username with dots finds its creator code');

  // Creators: 10k+ followers, a username for the code, a bio code that stays put on re-apply.
  const cr={profiles:[{id:'cz',username:'jane.doe'},{id:'nou',username:null}],creators:[],creator_codes:[],creator_redemptions:[]};
  const crdb=fakeDb(cr);
  assert.equal((await applyAsCreator(crdb,'cz',{platform:'tiktok',handle:'@jane',followers:9999})).status,400,'needs 10,000 followers');
  assert.equal((await applyAsCreator(crdb,'cz',{platform:'myspace',handle:'jane',followers:20000})).status,400,'Instagram or TikTok only');
  assert.equal((await applyAsCreator(crdb,'nou',{platform:'tiktok',handle:'jane',followers:20000})).status,400,'needs a username');
  const app=await applyAsCreator(crdb,'cz',{platform:'tiktok',handle:'@jane',followers:20000});
  assert.equal(app.ok,true);assert.equal(app.status.status,'pending');assert.equal(app.status.handle,'jane');
  assert.match(app.status.verifyCode,/^DS-[A-Z2-9]{4}$/);
  const again=await applyAsCreator(crdb,'cz',{platform:'instagram',handle:'jane_ig',followers:30000});
  assert.equal(again.status.verifyCode,app.status.verifyCode,'re-applying keeps the bio code');
  assert.equal(again.isNew,false,'no second email while still pending');
  cr.creators[0].status='approved';
  assert.equal((await applyAsCreator(crdb,'cz',{platform:'tiktok',handle:'jane',followers:20000})).status,409,'approved creators stay approved');

  // Profile photos: only real images, only from your own folder.
  assert.equal(imageKind(Buffer.from('RIFF\0\0\0\0WEBPVP8 ','latin1')),'webp');
  assert.equal(imageKind(Buffer.from([0xff,0xd8,0xff,0xe0,0,0])),'jpeg');
  assert.equal(imageKind(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0])),'png');
  assert.equal(imageKind(Buffer.from('<svg onload=alert(1)>')),null,'no SVG or HTML');
  // Real dimensions from the header, so a tiny file can't claim to be a 20,000 px bomb.
  const file=(f)=>fs.readFileSync(path.join(root,f));
  assert.deepEqual(imageSize(file('public/redesign/site-hall-clay-room.jpg'),'jpeg'),{w:1440,h:1280},'progressive JPEG');
  assert.deepEqual(imageSize(file('public/redesign/hero-room-v5.webp'),'webp'),{w:2000,h:1167},'lossy WebP');
  assert.deepEqual(imageSize(file('public/og.png'),'png'),{w:1200,h:630},'PNG');
  const bomb=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13]),Buffer.from('IHDR'),Buffer.from([0,0,0x4e,0x20,0,0,0x4e,0x20])]);
  assert.ok(imageSize(bomb,'png').w>AVATAR_MAX_SIDE,'a 20,000 px PNG header is caught');
  assert.equal(imageSize(Buffer.from([0xff,0xd8,0xff]),'jpeg'),null,'a truncated JPEG has no size');

  // Gallery layouts carry shapes only: no labels, owners, assignments, products, costs or ids.
  const shared=layoutOnly([{id:'sofa-x9',type:'bed',label:'Jake bed',owner:'Jake',assigned_to:'Jake',product_id:'B0X',cost:99,x_ft:1,y_ft:2,width_ft:3,length_ft:6.5,rotation_deg:90,movable:true,built_in:false,color_category:'bed'}]);
  assert.deepEqual(Object.keys(shared[0]).sort(),['built_in','color_category','id','label','length_ft','movable','owner','rotation_deg','type','width_ft','x_ft','y_ft']);
  assert.equal(JSON.stringify(shared).match(/Jake|B0X|sofa-x9|99/),null,'nothing personal survives');

  // One layout per person per hall, real halls only.
  const fr=fairRows([
    {user_id:'u1',college_id:'penn-state',dorm_id:'atherton-hall',n:1},{user_id:'u1',college_id:'penn-state',dorm_id:'atherton-hall',n:2},
    {user_id:'u2',college_id:'penn-state',dorm_id:'atherton-hall',n:3},{user_id:'u3',college_id:'penn-state',dorm_id:'not-a-hall',n:4},
  ]);
  assert.deepEqual(fr.map((r)=>r.n),[1,3],'a second layout from the same person, and a made-up hall, are left out');

  // A creator can't unlock Plus with their own code.
  k.creator_codes.push({code:'mine',active:true,max_redemptions:null,expires_at:null,owner_id:'e'});
  k.profiles.push(free('e'));
  assert.equal((await redeemCreatorCode(kdb,'e','mine')).status,403,'no redeeming your own creator code');

  // A creator's own code (a public username) always has a limit, even when none was set.
  const {CREATOR_CODE_DEFAULT_CAP}=load(path.join(root,'lib/plan'));
  k.creator_codes.push({code:'popular',active:true,max_redemptions:null,expires_at:null,owner_id:'someone'});
  for(let i=0;i<CREATOR_CODE_DEFAULT_CAP;i++)k.creator_redemptions.push({user_id:'r'+i,code:'popular'});
  k.profiles.push(free('late2'));
  assert.equal((await redeemCreatorCode(kdb,'late2','popular')).status,410,'the default cap applies');

  console.log('PASS: invites pay out once, within the cap; creator codes unlock Plus once per account; creators need 10k and a bio code; photos are real, small images; gallery layouts are shapes only, one per person per hall.');
})().catch(e=>{console.error(e);process.exit(1);});
