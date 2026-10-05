import * as T from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// Original, dimension-driven models (design-handoff/3d-studio/scene.js is the
// look reference). Every piece is built inside its real footprint: width_ft
// along x, length_ft along z, centred on the group, standing on y = 0. Only
// what is in the plan is drawn; the vibe changes colours and materials only.
export function createModelKit({onTexture=()=>{}}={}) {
  const geometries=new Map(),materials=new Map(),textures=new Map(),glows=new Set();let disposed=false,night=false;
  const c=document.createElement("canvas");c.width=c.height=128;const cx=c.getContext("2d");
  cx.fillStyle="#dddddd";cx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=3){cx.fillStyle=i%2?"#c9c9c9":"#efefef";cx.fillRect(i,0,1,128);cx.fillRect(0,i,128,1);}
  const fabric=new T.CanvasTexture(c);fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(3,3);
  const mat=(color,roughness=.65,cloth=false,metal=null)=>{
    const key=[color,roughness,cloth,metal].join("|");
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness:metal??(roughness<.3?.3:0),...(cloth?{bumpMap:fabric,bumpScale:.015}:{})}));
    return materials.get(key);
  };
  /** A lit surface (lamp shade, bulb, LED): brighter at night. */
  function glowMat(color){
    const key="glow|"+color;if(materials.has(key))return materials.get(key);
    const m=new T.MeshStandardMaterial({color:"#fff6e4",emissive:color,emissiveIntensity:night?2.6:.55,roughness:.4});
    materials.set(key,m);glows.add(m);return m;
  }
  const mix=(a,b,t)=>"#"+new T.Color(a).lerp(new T.Color(b),t).getHexString();
  const white=mat("#fbf8f1",.9),wood=mat("#ddbf8f",.62),woodDark=mat("#c9a573",.6),ink=mat("#2b2c3a",.5),metal=mat("#c9c4bd",.35,false,.6),
    leafA=mat("#5f8a4c",.75),leafB=mat("#7aa560",.75),soil=mat("#5b4636",.95),terracotta=mat("#c4826a",.9);
  function textile(product,color){
    if(!product || product.pattern==="solid")return mat(color,.95,true);
    const key="textile:"+product.id+":"+color;if(materials.has(key))return materials.get(key);
    const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const ctx=canvas.getContext("2d");
    ctx.fillStyle=color;ctx.fillRect(0,0,256,256);ctx.fillStyle="#f8f0df";ctx.strokeStyle="#f8f0df";ctx.lineWidth=5;
    for(let x=0;x<256;x+=32)for(let y=0;y<256;y+=32){
      if(product.pattern==="check"&&(x+y)%64===0)ctx.fillRect(x,y,32,32);
      if(product.pattern==="stripe"&&x%64===0)ctx.fillRect(x,y,12,32);
      if(product.pattern==="diamond"){ctx.beginPath();ctx.moveTo(x+16,y+2);ctx.lineTo(x+30,y+16);ctx.lineTo(x+16,y+30);ctx.lineTo(x+2,y+16);ctx.closePath();ctx.stroke();}
      if(product.pattern==="floral"){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+16+Math.cos(a)*7,y+16+Math.sin(a)*7,5,8,a,0,Math.PI*2);ctx.fill();}}
    }
    if(product.pattern==="wave")for(let x=-128;x<384;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+130,80,x-100,180,x+32,256);ctx.lineWidth=20;ctx.stroke();}
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;textures.set(key,tex);
    const material=new T.MeshStandardMaterial({map:tex,roughness:.98,bumpMap:fabric,bumpScale:.012});materials.set(key,material);return material;
  }
  function productPrint(product,fallback){
    if(!product?.image || !/^https:\/\/m\.media-amazon\.com\//.test(product.image))return fallback;
    const key="photo:"+product.image;if(materials.has(key))return materials.get(key);
    const material=new T.MeshStandardMaterial({color:"#fffaf2",roughness:.9});materials.set(key,material);
    new T.TextureLoader().load(product.image,texture=>{if(disposed){texture.dispose();return;}
      const source=texture.image,canvas=document.createElement("canvas"),scale=Math.min(1,768/Math.max(source.width,source.height));
      canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));canvas.getContext("2d").drawImage(source,0,0,canvas.width,canvas.height);texture.image=canvas;texture.needsUpdate=true;
      texture.colorSpace=T.SRGBColorSpace;textures.set(key,texture);material.map=texture;material.needsUpdate=true;onTexture();
    },undefined,()=>{});
    return material;
  }
  const add=(g,mesh,x,y,z)=>{mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;};
  /** A rounded box (the studio's soft, real-world edges). */
  function box(g,w,h,d,m,x=0,y=0,z=0,r=.035,seg=2){
    w=Math.max(.008,w);h=Math.max(.008,h);d=Math.max(.008,d);
    const key=[w,h,d,r,seg].join("|");if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,seg,Math.min(r,w/2-1e-3,h/2-1e-3,d/2-1e-3)));
    return add(g,new T.Mesh(geometries.get(key),m),x,y,z);
  }
  function cyl(g,rt,rb,h,m,x=0,y=0,z=0,seg=20){
    const key=["c",rt,rb,h,seg].join("|");if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(rt,rb,h,seg));
    return add(g,new T.Mesh(geometries.get(key),m),x,y,z);
  }
  function oval(g,x,y,z,sx,sy,sz,m){
    if(!geometries.has("sphere"))geometries.set("sphere",new T.SphereGeometry(1,24,16));
    const mesh=add(g,new T.Mesh(geometries.get("sphere"),m),x,y,z);mesh.scale.set(sx,sy,sz);return mesh;
  }
  /** A bean bag: a slumped, slightly lumpy sphere, fitted to the footprint. */
  function beanGeometry(){
    if(geometries.has("bean"))return geometries.get("bean");
    const g=new T.SphereGeometry(1,40,28),p=g.attributes.position,v=new T.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=Math.sin(v.x*3.1)*.05+Math.cos(v.z*2.7+v.y*2)*.05;v.multiplyScalar(1+n);
      if(v.y>.33)v.y=.33+(v.y-.33)*.35-Math.max(0,.37-Math.hypot(v.x,v.z))*.3;p.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();g.computeBoundingBox();geometries.set("bean",g);return g;
  }
  /** One curtain panel with real folds: a plane rippled across its width. */
  function foldGeometry(w,h){
    const key=["fold",w,h].join("|");if(geometries.has(key))return geometries.get(key);
    const g=new T.PlaneGeometry(w,h,Math.max(12,Math.round(w*14)),1),p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)/w*Math.PI*2*Math.max(2,w*3))*Math.min(.09,w*.08));
    g.computeVertexNormals();geometries.set(key,g);return g;
  }
  /** Leaves as one instanced mesh per green: a leafy cluster inside radius r between heights y0 and y1. */
  function leaves(g,r,y0,y1,count){
    if(!geometries.has("leaf"))geometries.set("leaf",new T.SphereGeometry(1,10,8));
    const dummy=new T.Object3D();let seed=Math.round(r*1000+count);const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(const [m,n] of [[leafA,Math.ceil(count/2)],[leafB,Math.floor(count/2)]]){
      const inst=new T.InstancedMesh(geometries.get("leaf"),m,n);inst.castShadow=true;inst.receiveShadow=true;
      for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,t=Math.sqrt(rnd()),y=y0+(y1-y0)*(.15+.85*rnd()),reach=r*(.25+.65*t)*(1-.35*(y-y0)/(y1-y0+1e-3));
        const s=Math.min(r*.42,.55)*(.7+rnd()*.5);
        dummy.position.set(Math.cos(a)*reach,y,Math.sin(a)*reach);dummy.rotation.set((rnd()-.5)*.6,-a,.5+rnd()*.7);dummy.scale.set(s,s*.12,s*.36);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}
      g.add(inst);}
  }
  function build(f,palette,{theme,dress=true}={}){
    const g=new T.Group(),w=Math.max(.1,f.width_ft),d=Math.max(.1,f.length_ft),h=f.height,variant=f.product?.variant;
    // Soft goods take the vibe's colours when the room is dressed; a piece's own colour always wins.
    const vibe=dress&&theme;
    const color=f.material_color||(vibe?theme.textileAlt:palette[1])||"#b4c2dd";
    const cloth=textile(f.product,color),accent=mat(vibe?theme.accent:palette[2]||"#d8b080",.9,true),finish=mat(color,variant==="clear"?.2:.65);
    const glow=glowMat(f.product?.color||(theme?.glow)||"#ffcf82");
    const legs=(height,thick=.12,m=wood)=>{for(const x of [-1,1])for(const z of [-1,1])box(g,thick,height,thick,m,x*(w/2-thick/2-.03),height/2,z*(d/2-thick/2-.03),.02);};
    switch(f.kind){
      case "bed":case "bunk":{
        const loft=f.bed_mode==="lofted";
        const levels=f.kind==="bunk"?[h*.3,h*.78]:loft?[h*.78]:[h-.28];
        const duvetColor=f.material_color||(vibe?theme.textile:color),duvet=textile(f.product,duvetColor);
        const fold=mat(mix(duvetColor,"#ffffff",.3),.95,true),pillow=mat(vibe?mix(theme.textileAlt,"#ffffff",.25):"#fbfaf7",1,true),mattress=mat("#fbfaf6",1,true);
        for(const [index,level] of levels.entries()){
          box(g,w,.18,d,wood,0,level-.36,0,.04);
          box(g,w*.96,.38,d*.96,mattress,0,level-.08,0,.14,3).name=`mattress-${index}`;
          if(!f.bare){
            // The duvet covers the lower part and drapes over both long sides and the foot.
            const len=d*.72,zc=d*.12;
            box(g,w*.98,.13,len,duvet,0,level+.16,zc,.06,3);
            box(g,w*.98,.06,d*.07,fold,0,level+.22,zc-len/2+d*.035,.03);
            for(const side of [-1,1])box(g,.07,.46,len,duvet,side*(w/2-.05),level-.06,zc,.03).rotation.z=side*.04;
            box(g,w*.98,.4,.07,duvet,0,level-.04,d/2-.05,.03).rotation.x=-.04;
            const n=w>=3.8?2:1,pw=n>1?w*.42:w*.62,pd=Math.min(d*.16,1.5);
            for(let i=0;i<n;i++){const p=box(g,pw,.3,pd,pillow,(i-(n-1)/2)*w*.47,level+.27,-d/2+pd/2+.22,.13,3);p.rotation.x=-.32;p.rotation.z=(i-(n-1)/2)*.08;}
          }
        }
        for(const x of [-1,1])for(const z of [-1,1])box(g,.16,h,.16,wood,x*(w/2-.08),h/2,z*(d/2-.08),.03);
        box(g,w,.65,.12,wood,0,h-.32,-d/2+.07,.04);
        if(f.kind==="bunk"||loft){
          for(const side of [-1,1]){
            box(g,.1,.12,d-.2,wood,side*(w/2-.08),h-.18,0,.03).name="bunk-guardrail";
            box(g,.1,.09,d-.2,wood,side*(w/2-.08),h-.53,0,.03);
          }
          const ladder=new T.Group();ladder.name=loft?"loft-ladder":"bunk-ladder";g.add(ladder);
          for(const x of [w*.04,w*.39])box(ladder,.1,h*.86,.1,woodDark,x,h*.43,d/2-.06,.02);
          for(let y=.6;y<h*.85;y+=.9)box(ladder,w*.38,.09,.13,wood,w*.215,y,d/2-.06,.02);
        }
        break;
      }
      case "sofa":{
        legs(h*.18,.1);box(g,w,h*.28,d,cloth,0,h*.32,0,.14,3);
        box(g,w,h*.55,.24,cloth,0,h*.7,-d/2+.12,.12,3);
        for(const side of [-1,1])box(g,.24,h*.5,d,cloth,side*(w/2-.12),h*.56,0,.1,3);
        for(let i=0;i<2;i++)box(g,(w-.56)/2-.02,.18,d*.74,accent,(i-.5)*(w-.56)/2,h*.53,d*.07,.08,3);break;
      }
      case "lounge":{
        // A bean bag, slumped into its footprint.
        const geo=beanGeometry(),bb=geo.boundingBox,mesh=add(g,new T.Mesh(geo,cloth),0,0,0);
        const s=Math.min(w/2/bb.max.x,d/2/bb.max.z)*.98;mesh.scale.set(s,h/(bb.max.y-bb.min.y),s);mesh.position.y=-bb.min.y*mesh.scale.y;mesh.rotation.y=.4;break;
      }
      case "ottoman":{
        // A soft pouf with a seam round its middle.
        const r=Math.min(w,d)/2;oval(g,0,h/2,0,w/2*.98,h/2,d/2*.98,cloth);
        const ring=cyl(g,r*.99,r*.99,.035,accent,0,h/2,0,32);ring.scale.set(w/2/r,1,d/2/r);break;
      }
      case "radiator":
        for(let i=0;i<8;i++)box(g,w/10,h,d,mat("#e7e5e0",.4),(i-3.5)*w/8,h/2,0,.04);break;
      case "column":box(g,w,h,d,white,0,h/2,0,.02);break;
      case "microwave":
        box(g,w,h,d,white,0,h/2,0,.06);box(g,w*.72,h*.7,.02,ink,-w*.08,h*.53,d/2-.005);box(g,.04,h*.48,.05,metal,w*.33,h*.53,d/2-.02);break;
      case "desk":{
        // A top on legs, with a drawer cabinet on the right when there's room.
        box(g,w,.14,d,wood,0,h-.07,0,.03);
        const cab=w>2.2,cw=cab?Math.min(1.6,w*.38):0;
        for(const z of [-1,1])box(g,.12,h-.14,.12,wood,-w/2+.09,(h-.14)/2,z*(d/2-.09),.02);
        if(cab){box(g,cw,h-.16,d*.92,wood,w/2-cw/2-.02,(h-.16)/2,0,.03);
          for(const y of [.34,.66])box(g,cw*.9,.025,.02,woodDark,w/2-cw/2-.02,(h-.16)*y,d*.46+.005);
          for(const y of [.17,.5,.83])cyl(g,.045,.045,.08,metal,w/2-cw/2-.02,(h-.16)*y,d*.46+.03,12).rotation.x=Math.PI/2;}
        else for(const z of [-1,1])box(g,.12,h-.14,.12,wood,w/2-.09,(h-.14)/2,z*(d/2-.09),.02);
        box(g,w-(cab?cw:0)-.2,.6,.06,wood,-(cab?cw/2:0),h-.45,-d/2+.06,.02);
        break;
      }
      case "chair":{
        // A wooden chair with a slatted back (the back is on the -z side).
        const m=f.built_in?wood:finish,seat=Math.min(h*.5,1.6);
        box(g,w*.92,.12,d*.86,m,0,seat,d*.03,.05);
        legs(seat-.06,.1,m);
        for(const x of [-1,1])box(g,.1,h-seat+.1,.1,m,x*(w/2-.08),seat+(h-seat)/2,-d/2+.08,.02);
        const slats=3;for(let i=0;i<slats;i++)box(g,w*.78,.12,.07,m,0,seat+(h-seat)*(.35+i*.22),-d/2+.08,.02);
        break;
      }
      case "wardrobe":case "dresser":case "fridge":{
        const body=f.kind==="fridge"?white:wood;box(g,w,h,d,body,0,h/2,0,.05);
        if(f.kind==="wardrobe"){box(g,.02,h*.94,.02,woodDark,0,h/2,d/2+.003);for(const x of [-.07,.07])box(g,.04,.5,.06,metal,x,h*.55,d/2+.02,.015);}
        else{const n=f.kind==="dresser"?Math.max(2,Math.min(4,Math.round(h/.85))):2;
          for(let i=1;i<n;i++)box(g,w*.94,.025,.02,f.kind==="fridge"?mat("#d8dadd"):woodDark,0,h*i/n,d/2+.003);
          for(let i=0;i<n;i++){const y=h*(i+.5)/n;
            if(f.kind==="fridge")box(g,.05,h/n*.55,.06,metal,w*.38,y,d/2+.02,.02);
            else for(const x of w>2.2?[-w*.25,w*.25]:[0])cyl(g,.05,.05,.1,metal,x,y,d/2+.04,12).rotation.x=Math.PI/2;}}
        break;
      }
      case "shelf":{
        // A bookcase of real boards: sides, a back and evenly spaced shelves. No books unless they're in the list.
        const m=f.built_in?wood:finish,t=.08;
        for(const x of [-1,1])box(g,t,h,d,m,x*(w/2-t/2),h/2,0,.02);
        box(g,w-.02,h,.04,m,0,h/2,-d/2+.02,.01);
        const n=Math.max(2,Math.round(h/1.15));for(let i=0;i<=n;i++)box(g,w-t*2,t,d*.96,m,0,i===0?t/2+.06:Math.min(h-t/2,i*h/n),0,.015);
        break;
      }
      case "rug":{
        // A soft rug with a woven border.
        const base=vibe&&!f.material_color?theme.rug.base:color,edge=vibe&&!f.material_color?theme.rug.line:mix(color,"#ffffff",.35);
        box(g,w,h,d,mat(base,1,true),0,h/2+.012,0,.012).castShadow=false;
        const band=box(g,w*.9,h+.006,d*.9,mat(edge,1,true),0,h/2+.015,0,.01);band.castShadow=false;
        const inner=box(g,w*.86,h+.012,d*.86,mat(base,1,true),0,h/2+.018,0,.01);inner.castShadow=false;
        break;
      }
      case "lamp":{
        cyl(g,Math.min(w,d)*.32,Math.min(w,d)*.36,.07,metal,0,.04,0);
        if(variant==="lava"||variant==="salt"){
          cyl(g,w*.24,w*.35,h*.2,metal,0,h*.1,0);oval(g,0,h*.53,0,w*.3,h*.35,d*.3,glow);cyl(g,w*.08,w*.25,h*.15,metal,0,h*.92,0);
        }else if(variant==="mushroom"){
          cyl(g,w*.15,w*.22,h*.6,finish,0,h*.3,0);oval(g,0,h*.77,0,w*.48,h*.23,d*.48,finish);cyl(g,w*.42,w*.42,.02,glow,0,h*.68,0);
        }else if(variant==="task"||variant==="bar"){
          const arm=box(g,.06,h*.68,.07,finish,0,h*.36,-d*.2);arm.rotation.z=-.13;
          box(g,w*.9,.07,d*.65,finish,0,h*.8,0);box(g,w*.82,.025,d*.56,glow,0,h*.755,0);
        }else if(variant==="banker"){
          cyl(g,.04,.04,h*.72,mat("#b29654",.25),0,h*.36,0);box(g,w*.94,h*.25,d*.75,mat("#396c50",.3),0,h*.85,0,.15);box(g,w*.8,.025,d*.6,glow,0,h*.71,0);
        }else if(variant==="projector"){
          cyl(g,.035,.035,h*.6,finish,0,h*.3,0);oval(g,0,h*.78,0,w*.4,h*.22,d*.4,finish);oval(g,0,h*.8,d*.34,w*.27,h*.15,.025,glow);
        }else{
          // A stem and a fabric shade, lit from inside.
          const r=Math.min(w,d);cyl(g,.035,.035,h*.62,finish,0,h*.33,0);
          if(!geometries.has("shade"))geometries.set("shade",new T.CylinderGeometry(.5,1,1,28,1,true));
          const shadeMat=mat(vibe?mix(theme.textile,"#ffffff",.3):"#f6efe2",.9,true);shadeMat.side=T.DoubleSide;
          const shade=add(g,new T.Mesh(geometries.get("shade"),shadeMat),0,h*.8,0);shade.scale.set(r*.42,h*.36,r*.42);
          cyl(g,r*.2,r*.2,.03,glow,0,h*.66,0);oval(g,0,h*.7,0,r*.12,r*.12,r*.12,glow);
        }break;
      }
      case "plant":{
        // A pot, its soil and a leafy cluster, all inside the footprint.
        const r=Math.min(w,d)/2,potH=Math.min(h*.36,1.05);
        if(variant==="disco")oval(g,0,h*.2,0,w*.35,h*.2,d*.35,metal);
        else{cyl(g,r*.55,r*.42,potH,terracotta,0,potH/2,0);cyl(g,r*.5,r*.5,.04,soil,0,potH-.01,0);}
        leaves(g,r*.92,potH,h,Math.max(18,Math.min(60,Math.round(r*r*60))));break;
      }
      case "mirror":
        if(variant==="round"){oval(g,0,h/2,0,w/2,h/2,d/2,finish);oval(g,0,h/2,d/2,w*.46,h*.46,.02,mat("#bdcdd2",.1));}
        else if(variant==="arch"){
          box(g,w,h-w/2,d,finish,0,(h-w/2)/2,0);oval(g,0,h-w/2,0,w/2,w/2,d/2,finish);
          box(g,w*.91,h-w/2-.08,.025,mat("#bdcdd2",.1),0,(h-w/2)/2,d/2+.016);oval(g,0,h-w/2,d/2+.018,w*.455,w*.455,.018,mat("#bdcdd2",.1));
        }else{box(g,w,h,Math.max(.06,d),finish,0,h/2,0);box(g,w*.9,h*.92,.025,mat("#bdcdd2",.1),0,h/2,d/2+.015);}break;
      case "art":
        box(g,w,h,Math.max(d,.04),wood,0,h/2,0);box(g,w*.9,h*.9,.025,white,0,h/2,d/2+.02);
        box(g,w*.88,h*.88,.012,productPrint(f.product,cloth),0,h/2,d/2+.04);break;
      case "wall-shelf":
        for(let i=0;i<3;i++){box(g,w*(.72+i*.1),.09,Math.max(.55,d),finish,0,h*(i+.3)/3,0);box(g,w*.75,.15,.06,finish,0,h*(i+.3)/3-.12,-.2);}break;
      case "macrame":
        box(g,w,.055,.06,wood,0,h,0);for(let i=0;i<20;i++){const x=(i/19-.5)*w,length=h*(.6+.35*(1-Math.abs(x)/(w/2)));cyl(g,.018,.018,length,cloth,x,h-length/2,0,8);}break;
      case "curtains":{
        // Two gathered panels with real folds, on a rod.
        cyl(g,.03,.03,w,metal,0,h-.03,0,10).rotation.z=Math.PI/2;
        const pw=w*.34,curtain=mat(f.material_color||(vibe?theme.textile:color),.95,true);curtain.side=T.DoubleSide;
        for(const side of [-1,1])add(g,new T.Mesh(foldGeometry(pw,h-.08),curtain),side*(w/2-pw/2),(h-.08)/2,0);
        break;
      }
      case "lights":{
        if(variant==="neon"){box(g,w,.025,.03,ink,0,h/2,0);box(g,w,h,.025,productPrint(f.product,glow),0,h/2,.025);}
        else if(variant==="strip")box(g,w,.04,.035,glow,0,h/2,0,.015);
        else{
          // Warm bulbs hanging on a sagging wire.
          const n=Math.max(4,Math.round(w/.55)),sag=Math.min(.2,w*.02);
          if(!geometries.has("bulb"))geometries.set("bulb",new T.SphereGeometry(.06,10,8));
          const bulbs=new T.InstancedMesh(geometries.get("bulb"),glow,n+1),dummy=new T.Object3D(),pts=[];
          for(let i=0;i<=n;i++){const x=-w/2+w*i/n,y=h/2-Math.sin(i/n*Math.PI*3)**2*sag;pts.push(new T.Vector3(x,y+.05,0));dummy.position.set(x,y-.04,0);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);}
          const wireKey=["wire",w,h].join("|");if(!geometries.has(wireKey))geometries.set(wireKey,new T.TubeGeometry(new T.CatmullRomCurve3(pts),n*4,.012,4));
          g.add(new T.Mesh(geometries.get(wireKey),mat("#5c5246",.6)),bulbs);
          if(variant==="curtain")for(let i=0;i<=n;i++){const x=-w/2+w*i/n;box(g,.012,3.6,.012,ink,x,h/2-1.8,0,.004);for(let y=.25;y<3.6;y+=.5)oval(g,x,h/2-y,0,.032,.045,.032,glow);}
        }break;
      }
      case "blanket":
        box(g,w,h*.65,d,cloth,0,h*.4,0,.05);box(g,w*.98,h*.25,d*.3,cloth,0,h*.85,-d*.3,.025);
        for(let i=0;i<12;i++)box(g,.02,.025,d*.13,cloth,(i/11-.5)*w,.04,d*.43,.008);break;
      case "desk-mat":box(g,w,.02,d,cloth,0,.015,0,.01);break;
      case "riser":
        for(const x of [-1,1])box(g,.06,h-.06,d*.9,finish,x*(w/2-.07),(h-.06)/2,0);box(g,w,.06,d,finish,0,h-.03,0);break;
      case "organizer":case "caddy":
        box(g,w,.04,d,finish,0,.02,0);for(const x of [-1,1])box(g,.04,h,d,finish,x*w*.48,h/2,0);
        for(const z of [-1,1])box(g,w,h,.04,finish,0,h/2,z*d*.48);box(g,.035,h,d,finish,0,h/2,0);break;
      case "basket":case "hamper":case "trash":{
        const shell=variant==="woven"?cloth:finish;
        box(g,w,.06,d,shell,0,.03,0);for(const x of [-1,1])box(g,.055,h,d,shell,x*(w/2-.03),h/2,0,.025);
        for(const z of [-1,1])box(g,w,h,.055,shell,0,h/2,z*(d/2-.03),.025);
        box(g,w*.88,.03,d*.88,mat("#4e4b47"),0,h*.3,0);
        if(f.kind==="hamper"||f.kind==="basket")for(const x of [-1,1])box(g,.065,.09,d*.35,ink,x*(w/2-.04),h*.88,0);
        if(f.kind==="trash"){box(g,w*.98,.06,d*.97,shell,0,h,0);box(g,w*.28,.055,.13,metal,0,.05,d/2-.07);}break;
      }
      case "power-strip":
        box(g,w,h,d,finish,0,h/2,0);for(let i=0;i<4;i++)for(const z of [-1,1])box(g,.035,.012,.05,ink,(i/3-.5)*w*.72,h+.01,z*d*.15);break;
      case "towels":case "books":
        for(let i=0;i<3;i++)box(g,w*(1-i*.04),h*.29,d, f.kind==="books"?mat([color,"#e6d5b7","#626c79"][i]):cloth,0,h*(i+.5)/3,0,.025);break;
      case "candle":cyl(g,w*.45,w*.45,h,finish,0,h/2,0);oval(g,0,h+.05,0,.025,.07,.025,glow);break;
      case "disco":oval(g,0,h/2,0,w/2,h/2,d/2,metal);break;
      case "fan":
        box(g,w*.65,.12,d*.7,finish,0,.06,0);box(g,.06,h*.55,.06,finish,0,h*.3,0);oval(g,0,h*.7,0,w*.48,h*.3,.05,ink);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;oval(g,Math.cos(a)*w*.18,h*.7+Math.sin(a)*h*.13,.05,w*.19,h*.07,.025,finish);}break;
      case "decor":oval(g,0,h/2,0,w*.4,h/2,d*.4,f.material_color?finish:accent);break;
      case "pillow":box(g,w,h,d,f.material_color?cloth:accent,0,h/2,0,Math.min(h/2,.15),3);break;
      default:{
        // Storage: a body under its lid, both soft-edged.
        const lid=Math.min(.08,h*.2),body=Math.max(.008,h-lid-.015);
        const base=box(g,w,body,d,cloth,0,body/2,0,.09,3);base.name="storage-body";
        const cap=box(g,w*.99,lid,d*.99,accent,0,h-lid/2,0,.025);cap.name="storage-lid";
        box(g,w*.25,.08,.015,ink,0,h*.6,d/2-.005);
      }
    }
    g.traverse(o=>{o.userData.itemId=f.id;});g.userData.itemId=f.id;return g;
  }
  /** Night makes every lit surface glow; day keeps them a soft warm white. */
  function setNight(on){if(night===on)return;night=on;for(const m of glows)m.emissiveIntensity=on?2.6:.55;}
  function dispose(){disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());fabric.dispose();}
  return {build,box,mat,setNight,dispose};
}
