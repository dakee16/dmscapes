import * as T from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// Original, dimension-driven models. All geometry and textures are local.
export function createModelKit({onTexture=()=>{}}={}) {
  const geometries=new Map(),materials=new Map(),textures=new Map();let disposed=false;
  const c=document.createElement("canvas");c.width=c.height=128;const cx=c.getContext("2d");
  cx.fillStyle="#dddddd";cx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=3){cx.fillStyle=i%2?"#c9c9c9":"#efefef";cx.fillRect(i,0,1,128);cx.fillRect(0,i,128,1);}
  const fabric=new T.CanvasTexture(c);fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(3,3);
  const mat=(color,roughness=.65,cloth=false)=>{
    const key=[color,roughness,cloth].join("|");
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness:roughness<.3?.3:0,...(cloth?{bumpMap:fabric,bumpScale:.018}:{})}));
    return materials.get(key);
  };
  const white=mat("#fff9ef"),wood=mat("#b99263"),darkwood=mat("#785636"),ink=mat("#272839"),metal=mat("#afafb0",.25),green=mat("#59734c");
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
  function box(g,w,h,d,m,x=0,y=0,z=0,r=.035){
    w=Math.max(.008,w);h=Math.max(.008,h);d=Math.max(.008,d);
    const key=[w,h,d,r].join("|");if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)));
    const mesh=new T.Mesh(geometries.get(key),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
  }
  function cyl(g,rt,rb,h,m,x=0,y=0,z=0){
    const key=["c",rt,rb,h].join("|");if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(rt,rb,h,16));
    const mesh=new T.Mesh(geometries.get(key),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
  }
  function oval(g,x,y,z,sx,sy,sz,m){
    if(!geometries.has("sphere"))geometries.set("sphere",new T.SphereGeometry(1,16,12));
    const mesh=new T.Mesh(geometries.get("sphere"),m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;g.add(mesh);return mesh;
  }
  function build(f,palette){
    const g=new T.Group(),w=Math.max(.1,f.width_ft),d=Math.max(.1,f.length_ft),h=f.height;
    const color=f.material_color||palette[1]||"#b4c2dd",variant=f.product?.variant;
    const cloth=textile(f.product,color),accent=mat(palette[2]||"#d8b080",.9,true),finish=mat(color,variant==="clear"?.2:.65);
    const glow=mat(f.product?.color||"#ffe4ac",.35); // Emissive surfaces read as lit without one shadow light per bulb.
    if(f.kind==="lamp"||f.kind==="lights"||f.kind==="candle"){glow.emissive.set(f.product?.color||"#ffcf82");glow.emissiveIntensity=.65;}
    const legs=(height,thick=.12)=>{for(const x of [-1,1])for(const z of [-1,1])box(g,thick,height,thick,wood,x*(w/2-.15),height/2,z*(d/2-.15));};
    switch(f.kind){
      case "bed":case "bunk":{
        const loft=f.bed_mode==="lofted";
        const levels=f.kind==="bunk"?[h*.3,h*.78]:loft?[h*.78]:[h-.28];
        for(const [index,level] of levels.entries()){
          box(g,w,.18,d,wood,0,level-.36,0);
          box(g,w*.96,.35,d*.96,white,0,level-.1,0,.12).name=`mattress-${index}`;
          if(!f.bare){
            box(g,w*.99,.17,d*.72,cloth,0,level+.11,d*.1,.11);
            for(const side of [-1,1])box(g,.06,.3,d*.7,cloth,side*w*.48,level-.04,d*.1,.02);
            box(g,w*.98,.08,d*.12,cloth,0,level+.23,-d*.2,.035);
          }
          box(g,w*.72,.22,d*.16,f.bare?white:cloth,0,level+.23,-d*.34,.1);
        }
        for(const x of [-1,1])for(const z of [-1,1])box(g,.14,h,.14,wood,x*(w/2-.08),h/2,z*(d/2-.08));
        box(g,w,.65,.12,wood,0,h-.32,-d/2+.07);
        if(f.kind==="bunk"||loft){
          for(const side of [-1,1]){
            box(g,.1,.12,d-.2,wood,side*(w/2-.08),h-.18,0).name="bunk-guardrail";
            box(g,.1,.09,d-.2,wood,side*(w/2-.08),h-.53,0);
            for(const z of [-.35,.15,.35])box(g,.075,.8,.075,wood,side*(w/2-.08),h-.55,z*d);
          }
          const ladder=new T.Group();ladder.name=loft?"loft-ladder":"bunk-ladder";g.add(ladder);
          for(const x of [w*.04,w*.39])box(ladder,.08,h*.86,.09,darkwood,x,h*.43,d/2-.02);
          for(let y=.4;y<h*.85;y+=.65)box(ladder,w*.38,.09,.12,wood,w*.215,y,d/2-.02);
        }
        break;
      }
      case "sofa":case "lounge":{
        legs(h*.2,.1);box(g,w,h*.25,d,cloth,0,h*.35,0,.12);
        box(g,w,h*.55,.2,cloth,0,h*.7,-d*.44,.12);
        for(const side of [-1,1])box(g,.22,h*.48,d,cloth,side*(w/2-.11),h*.57,0,.08);
        const seats=f.kind==="sofa"?2:1;for(let i=0;i<seats;i++)box(g,(w-.5)/seats,.15,d*.75,accent,(i-(seats-1)/2)*(w-.5)/seats,h*.54,d*.05,.08);break;
      }
      case "radiator":
        for(let i=0;i<8;i++)box(g,w/10,h,d,metal,(i-3.5)*w/8,h/2,0,.04);break;
      case "column":box(g,w,h,d,white,0,h/2,0,.02);break;
      case "microwave":
        box(g,w,h,d,white,0,h/2,0);box(g,w*.72,h*.7,.02,ink,-w*.08,h*.53,d/2+.025);box(g,.04,h*.48,.05,metal,w*.21,h*.53,d/2+.045);break;
      case "desk":
        legs(Math.max(.04,h-.18));box(g,w,.16,d,wood,0,h-.08,0);
        if(w>2){box(g,w*.25,h*.45,d*.85,wood,w*.32,h*.6,0);for(let i=0;i<2;i++)box(g,.35,.035,.025,ink,w*.32,h*(.48+i*.18),d*.44);}
        break;
      case "chair":
        legs(h*.48,.085);box(g,w*.95,.15,d*.87,cloth,0,h*.5,0,.07);box(g,w*.9,h*.44,.14,cloth,0,h*.78,-d*.4,.12);break;
      case "wardrobe":case "dresser":case "shelf":case "fridge":{
        const m=f.kind==="fridge"?white:wood;box(g,w,h,d,m,0,h/2,0,.055);
        if(f.kind==="shelf"){
          box(g,w*.89,h*.9,.025,darkwood,0,h*.51,d/2+.016);
          for(let y=.3;y<h;y+=h/4)box(g,w*.9,.08,d*.9,wood,0,y,d*.06);
          for(let i=0;i<7;i++)box(g,w*.06,h*.16,d*.38,mat(["#e0c092","#465480","#f3ede0","#9f6b52"][i%4]),-w*.36+i*w*.11,h*.32,d*.25);
        }else{
          const n=f.kind==="dresser"?3:f.kind==="fridge"?2:1;
          for(let i=0;i<n;i++){const y=h*(i+.5)/n;box(g,w*.95,.022,.015,darkwood,0,h*(i+1)/n-.02,d/2+.015);box(g,f.kind==="wardrobe"?.05:w*.22,f.kind==="wardrobe"?.55:.045,.07,metal,f.kind==="wardrobe"?w*.05:0,y,d/2+.05);}
          if(f.kind==="wardrobe")box(g,.02,h*.96,.016,darkwood,0,h/2,d/2+.02);
        }break;
      }
      case "rug":
        box(g,w,h,d,cloth,0,h/2+.025,0,.012).castShadow=false;
        for(const x of [-1,1])box(g,.05,.007,d*.92,white,x*w*.43,h+.029,0,.001);
        for(const z of [-1,1])box(g,w*.9,.007,.045,white,0,h+.029,z*d*.43,.001);break;
      case "lamp":{
        cyl(g,Math.min(w,d)*.32,Math.min(w,d)*.35,.07,metal,0,.04,0);
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
          cyl(g,.035,.035,h*.65,finish,0,h*.35,0);cyl(g,Math.min(w,d)*.22,Math.min(w,d)*.43,h*.38,cloth,0,h*.79,0);cyl(g,Math.min(w,d)*.38,Math.min(w,d)*.38,.025,glow,0,h*.6,0);
        }break;
      }
      case "plant":
        if(variant==="disco")oval(g,0,h*.2,0,w*.35,h*.2,d*.35,metal);
        else cyl(g,w*.25,w*.2,h*.32,mat("#c9aa85"),0,h*.16,0);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;oval(g,Math.cos(a)*w*.24,h*(.55+(i%2)*.14),Math.sin(a)*d*.24,w*.13,h*.27,d*.14,green);}break;
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
        box(g,w,.055,.06,wood,0,h,0);for(let i=0;i<20;i++){const x=(i/19-.5)*w,length=h*(.6+.35*(1-Math.abs(x)/(w/2)));cyl(g,.018,.018,length,cloth,x,h-length/2,0);}break;
      case "curtains":
        box(g,w+.15,.05,.05,metal,0,h,0);for(const side of [-1,1])for(let i=0;i<10;i++)box(g,w*.026,h-.06,.08,cloth,side*w*(.25+i*.024),(h-.06)/2,Math.sin(i*Math.PI/2)*.08,.02);break;
      case "lights":{
        box(g,w,.025,.03,ink,0,h/2,0);
        if(variant==="neon")box(g,w,h,.025,productPrint(f.product,glow),0,h/2,.025);
        else if(variant==="strip")box(g,w,.04,.035,glow,0,h/2,.025);
        else for(let x=-w*.45;x<w*.5;x+=Math.max(.35,w/24)){
          oval(g,x,h/2,0,.045,.055,.045,glow);
          if(variant==="curtain"){box(g,.012,3.6,.012,ink,x,h/2-1.8,0);for(let y=.25;y<3.6;y+=.5)oval(g,x,h/2-y,0,.032,.045,.032,glow);}
        }break;
      }
      case "blanket":
        box(g,w,h*.65,d,cloth,0,h*.4,0,.05);box(g,w*.98,h*.25,d*.3,cloth,0,h*.85,-d*.3,.025);
        for(let i=0;i<12;i++)box(g,.02,.025,d*.13,cloth,(i/11-.5)*w,.04,d*.53);break;
      case "desk-mat":box(g,w,.02,d,cloth,0,.015,0,.01);break;
      case "riser":
        for(const x of [-1,1])box(g,.06,h-.06,d*.9,finish,x*(w/2-.07),(h-.06)/2,0);box(g,w,.06,d,finish,0,h-.03,0);break;
      case "organizer":case "caddy":
        box(g,w,.04,d,finish,0,.02,0);for(const x of [-1,1])box(g,.04,h,d,finish,x*w*.48,h/2,0);
        for(const z of [-1,1])box(g,w,h,.04,finish,0,h/2,z*d*.48);box(g,.035,h,d,finish,0,h/2,0);
        for(let i=0;i<5;i++)cyl(g,.018,.018,h*.85,mat(["#bb6b4f","#d2ba80","#596c88"][i%3]),w*.2+(i%2)*w*.12,h*.83,(i/5-.5)*d*.6);break;
      case "basket":case "hamper":case "trash":{
        const shell=variant==="woven"?cloth:finish;
        box(g,w,.06,d,shell,0,.03,0);for(const x of [-1,1])box(g,.055,h,d,shell,x*(w/2-.03),h/2,0,.025);
        for(const z of [-1,1])box(g,w,h,.055,shell,0,h/2,z*(d/2-.03),.025);
        box(g,w*.88,.03,d*.88,mat("#4e4b47"),0,h*.3,0);
        if(f.kind==="hamper"||f.kind==="basket")for(const x of [-1,1])box(g,.065,.09,d*.35,ink,x*w*.49,h*.88,0);
        if(f.kind==="trash"){box(g,w*.98,.06,d*.97,shell,0,h,0);box(g,w*.28,.055,.13,metal,0,.05,d*.54);}break;
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
      case "ottoman":box(g,w,h,d,cloth,0,h/2,0,.12);box(g,w,.12,d,cloth,0,h,0,.08);break;
      case "decor":oval(g,0,h/2,0,w*.4,h/2,d*.4,finish);break;
      case "pillow":box(g,w,h,d,cloth,0,h/2,0,Math.min(h/2,.15));break;
      default:
        // The lid and body used to share their entire upper face. Keep the
        // body below the lid instead of drawing two colors on the same plane.
        const lid=Math.min(.08,h*.2),body=Math.max(.008,h-lid-.015);
        const base=box(g,w,body,d,cloth,0,body/2,0,.09);base.name="storage-body";
        const cap=box(g,w*1.02,lid,d*1.02,accent,0,h-lid/2,0,.025);cap.name="storage-lid";
        box(g,w*.25,.08,.015,ink,0,h*.6,d/2+.015);
    }
    g.traverse(o=>{o.userData.itemId=f.id;});g.userData.itemId=f.id;return g;
  }
  function dispose(){disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());fabric.dispose();}
  return {build,box,mat,dispose};
}
