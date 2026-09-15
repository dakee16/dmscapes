import * as T from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// Original, dimension-driven models. All geometry and textures are local.
export function createModelKit() {
  const geometries=new Map(),materials=new Map();
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
    const cloth=mat(f.material_color||palette[1]||"#b4c2dd",.95,true),accent=mat(palette[2]||"#d8b080",.9,true);
    const legs=(height,thick=.12)=>{for(const x of [-1,1])for(const z of [-1,1])box(g,thick,height,thick,wood,x*(w/2-.15),height/2,z*(d/2-.15));};
    switch(f.kind){
      case "bed":case "bunk":{
        const levels=f.kind==="bunk"?[h*.35,h*.88]:[h*.72];
        for(const level of levels){
          box(g,w,.18,d,wood,0,level-.36,0);
          box(g,w*.96,.35,d*.96,white,0,level-.1,0,.12);
          box(g,w*.99,.17,d*.7,cloth,0,level+.11,d*.12,.11);
          box(g,w*1.01,.06,d*.24,accent,0,level+.22,d*.29,.04);
          box(g,w*.72,.22,d*.16,white,0,level+.23,-d*.34,.1);
          box(g,w*.35,.25,d*.1,accent,w*.14,level+.34,-d*.24,.1);
        }
        for(const x of [-1,1])for(const z of [-1,1])box(g,.14,h,.14,wood,x*(w/2-.08),h/2,z*(d/2-.08));
        box(g,w,.65,.12,wood,0,h-.32,-d/2+.07);
        if(f.kind==="bunk")for(let y=.35;y<h;y+=.65)box(g,.9,.07,.1,darkwood,w*.25,y,d/2);
        break;
      }
      case "desk":
        legs(h-.15);box(g,w,.16,d,wood,0,h-.08,0);
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
      case "lamp":
        cyl(g,Math.min(w,d)*.32,Math.min(w,d)*.35,.07,metal,0,.04,0);
        cyl(g,.035,.035,h*.65,ink,0,h*.35,0);cyl(g,Math.min(w,d)*.22,Math.min(w,d)*.43,h*.38,white,0,h*.79,0);break;
      case "plant":
        cyl(g,w*.25,w*.2,h*.32,mat("#c9aa85"),0,h*.16,0);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;oval(g,Math.cos(a)*w*.24,h*(.55+(i%2)*.14),Math.sin(a)*d*.24,w*.13,h*.27,d*.14,green);}break;
      case "mirror":
        box(g,w,h,Math.max(.06,d),wood,0,h/2,0);box(g,w*.9,h*.92,.025,mat("#a8bfcc",.1),0,h/2,d/2+.015);break;
      case "art":
        box(g,w,h,Math.max(d,.04),wood,0,h/2,0);box(g,w*.9,h*.9,.025,white,0,h/2,d/2+.02);
        box(g,w*.45,h*.52,.012,cloth,-w*.12,h*.5,d/2+.04);oval(g,w*.17,h*.6,d/2+.06,w*.18,h*.17,.015,accent);break;
      case "lights":
        box(g,w,.025,.03,ink,0,h/2,0);for(let x=-w*.45;x<w*.5;x+=.35)oval(g,x,.02,0,.055,.075,.055,white);break;
      case "pillow":box(g,w,h,d,cloth,0,h/2,0,Math.min(h/2,.15));break;
      default:
        box(g,w,h,d,cloth,0,h/2,0,.09);box(g,w*1.02,.08,d*1.02,accent,0,h-.04,0,.04);box(g,w*.25,.08,.015,ink,0,h*.6,d/2+.01);
    }
    g.traverse(o=>{o.userData.itemId=f.id;});g.userData.itemId=f.id;return g;
  }
  function dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());fabric.dispose();}
  return {build,box,mat,dispose};
}
