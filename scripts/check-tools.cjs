// Free tools: the rug-size fit (lib/rug-fit) against the planner's real starting layouts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
  if(!path.extname(file))file+='.ts';if(file.endsWith('.json'))return require(file);if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','module','exports',code)(id=>id.startsWith('@/')?load(path.join(root,id.slice(2))):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id),mod,mod.exports);
  return mod.exports;
}
const {fitRoom}=load(path.join(root,'lib/room-preview'));
const {bestRug,fittingRugs}=load(path.join(root,'lib/rug-fit'));
const {footprint}=load(path.join(root,'components/canvas/geometry'));
const room=(l,w,o)=>fitRoom({type:o===1?'single':o===2?'double':'triple',label:'',occupants:o,length_ft:l,width_ft:w,sqft:null,bed_size:'twin_xl',closet:null});
const overlaps=(a,b)=>a.x<b.x+b.w-1e-6&&b.x<a.x+a.w-1e-6&&a.y<b.y+b.h-1e-6&&b.y<a.y+a.h-1e-6;

for(const [l,w,o] of [[15,12,2],[11,9,1],[17,10,2],[13,12,3],[12,11,2],[24,8,2]]){
  const fit=room(l,w,o),rug=bestRug(fit);
  assert(rug,`a ${l}x${w} room fits some rug`);
  const r={x:rug.x,y:rug.y,w:rug.w,h:rug.l};
  assert(r.x>=0&&r.y>=0&&r.x+r.w<=fit.lengthFt+1e-6&&r.y+r.h<=fit.widthFt+1e-6,`${l}x${w}: rug stays inside the room`);
  for(const f of fit.furniture){if(f.type==='desk_chair')continue;assert(!overlaps(r,footprint(f)),`${l}x${w}: rug clears the ${f.type}`);}
  const door=Math.min(3,fit.widthFt*0.4);
  assert(!overlaps(r,{x:0,y:fit.widthFt-door,w:door,h:door}),`${l}x${w}: rug clears the door swing`);
  console.log(`${l}x${w} (${o}): ${rug.size.join('x')} ft fits; also ${fittingRugs(fit).map(s=>s.size.join('x')).join(', ')}`);
}
// Monotone: a bigger room of the same type never gets a smaller best rug.
const area=s=>s[0]*s[1];
assert(area(bestRug(room(18,14,2)).size)>=area(bestRug(room(15,12,2)).size),'bigger double, rug no smaller');
console.log('PASS: rug sizes fit the open floor, clear of furniture and the door swing.');

// Loft and bunk rules: every stated rule has an official source with its quote, and
// the client flags match the full data.
const rules=require(path.join(root,'lib/bed-rules.json')),quotes=require(path.join(root,'data/bed-rules-quotes.json')),flags=require(path.join(root,'lib/bed-rule-flags.json'));
const ids=new Set(fs.readdirSync(path.join(root,'data/schools')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)));
const A=['yes','no','some','unknown'],Y=['yes','no','unknown'];
for(const [id,r] of Object.entries(rules.schools)){
  assert(ids.has(id),`${id}: a real school`);
  assert(A.includes(r.loft)&&A.includes(r.bunk)&&Y.includes(r.risers)&&Y.includes(r.own_loft_kits),`${id}: valid values`);
  assert(r.sources.length>0,`${id}: has sources`);
  for(const s of r.sources){
    const q=(quotes.schools[id]||[]).find(x=>x.url===s.url);
    assert(q&&q.quote.trim().length>10,`${id}: ${s.url} has its quote`);
    const host=new URL(s.url).hostname;
    // The university's own document hosts: its Google Workspace site (NYU), Box (Ole Miss) and a CDN (UNO).
    assert(host.endsWith('.edu')||host.endsWith('website-files.com')||host==='olemiss.box.com'||(host==='sites.google.com'&&s.url.includes('/nyu.edu/')),`${id}: official source ${host}`);
  }
  assert.deepEqual(flags[id],[r.loft,r.bunk],`${id}: flags match`);
  if(r.bed_height_in)assert(r.bed_height_in.min<r.bed_height_in.max,`${id}: height range`);
}
assert.equal(Object.keys(flags).length,Object.keys(rules.schools).length,'flags cover the same schools');
console.log(`PASS: ${Object.keys(rules.schools).length} schools' loft and bunk rules each have official, quoted sources.`);

// The footer's small comparison list (lib/compare-names) matches the quoted data.
const {COMPARE_NAMES}=load(path.join(root,'lib/compare-names'));
const compare=require(path.join(root,'data/compare.json'));
assert.deepEqual(COMPARE_NAMES.map(c=>c.slug).sort(),compare.map(c=>c.slug).sort(),'footer comparisons match data/compare.json');
console.log('PASS: footer comparison links match the comparison pages.');
