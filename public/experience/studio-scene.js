import * as T from "./vendor/three.module.min.js";
import { clay, createModelKit } from "./studio-models.js";

// Light presets (design-handoff/3d-studio/scene.js, retuned for the clay look). "evening" is golden hour.
// Built to stay smooth on weak GPUs and phones: no shadow maps, no ambient-occlusion pass and no
// environment map. A sky/ground fill, one sun and one window light do the work; soft contact shadows are
// drawn under each piece and along the walls; night adds the plan's lamps. Changing the preset never
// rebuilds the room, and the night shaders are compiled ahead of time, so the switch is instant.
const LIGHT={
  day:    {sun:"#fff0dc",sunI:2.2,elev:36,az:200,hemiSky:"#f2f5ff",hemiGround:"#c2ad94",hemiI:1.5,exposure:.95,sky:"#cfe3f3",glass:.45,fill:"#e6efff",fillI:6,pool:"#fff4e2",poolA:.14,blob:.44},
  evening:{sun:"#ffab5e",sunI:2.7,elev:13,az:214,hemiSky:"#ffd9b3",hemiGround:"#9a7a5c",hemiI:1.1,exposure:1.0,sky:"#f6c68f",glass:.45,fill:"#ffcf9e",fillI:5,pool:"#ffb066",poolA:.2,blob:.46},
  night:  {sun:"#9bb3ff",sunI:.3,elev:30,az:200,hemiSky:"#3a4468",hemiGround:"#211b16",hemiI:.5,exposure:1.08,sky:"#1b2440",glass:.95,fill:"#7d9cff",fillI:1.5,pool:"#9bb3ff",poolA:0,blob:.3},
};
const PAPER="#f4f3ee",WALL_T=.42,PLINTH=.45,EYE=5.3,WALK_R=.7;
// Phones and low-power devices (coarse pointer on a small screen, ≤4 cores or ≤4 GB): a lower pixel ratio and fewer lamp lights at night.
const LOW=(matchMedia("(pointer: coarse)").matches&&Math.min(screen.width,screen.height)<768)||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
const LAMPS=LOW?2:3;
/** Pieces that hang on a wall: dragging slides them along it and up or down. */
const WALL_KINDS=new Set(["art","lights","curtains","macrame","wall-shelf"]);
const onWall=f=>WALL_KINDS.has(f.kind)||(f.kind==="mirror"&&f.elevation>.5);
/** No contact shadow: flat on the floor, draped over something, or on a wall. */
const NO_BLOB=new Set(["rug","blanket","pillow","desk-mat",...WALL_KINDS]);
/** The local direction of each back side (0 top/-z, 1 right/+x, 2 bottom/+z, 3 left/-x). */
const BACK_DIR=[[0,-1],[1,0],[0,1],[-1,0]];

/** A soft patch on the floor: a rounded rectangle that fades out over its margin, drawn in the shader (contact shadows, wall shading, the window's pool of light). */
function patchMaterial(color,opacity,additive=false){
  return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4,
    blending:additive?T.AdditiveBlending:T.NormalBlending,uniforms:{uColor:{value:new T.Color(color)},uOpacity:{value:opacity}},
    vertexShader:"attribute vec3 aBox;varying vec2 vP;varying vec3 vBox;void main(){vP=position.xz;vBox=aBox;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform vec3 uColor;uniform float uOpacity;varying vec2 vP;varying vec3 vBox;void main(){vec2 q=abs(vP)-vBox.xy;float d=length(max(q,0.0))+min(max(q.x,q.y),0.0);float a=1.0-smoothstep(-vBox.z*.5,vBox.z,d);gl_FragColor=vec4(uColor,a*a*uOpacity);\n#include <colorspace_fragment>\n}"});
}
/** A flat patch, hw × hd (half sizes, ft) plus a fading margin m, centred on its origin. */
function patch(hw,hd,m,material){
  const g=new T.BufferGeometry(),x=hw+m,z=hd+m,box=[hw,hd,m];
  g.setAttribute("position",new T.Float32BufferAttribute([-x,0,-z,x,0,-z,x,0,z,-x,0,z],3));
  g.setAttribute("aBox",new T.Float32BufferAttribute([...box,...box,...box,...box],3));g.setIndex([0,1,2,0,2,3]);
  const mesh=new T.Mesh(g,material);mesh.raycast=()=>{};mesh.renderOrder=1;mesh.userData.ownGeometry=true;return mesh;
}

export function createStudioScene(container, options) {
  const brandMark=new Image();brandMark.src="/brand/dormscape-mark.png?v=folded-room";
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  // The pixel ratio starts at the screen's (capped) and steps down while moving the camera or a piece runs slow, so weak GPUs stay smooth.
  let ratio=Math.min(devicePixelRatio||1,LOW?1.5:1.75);
  renderer.setPixelRatio(ratio);renderer.setClearColor(PAPER);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=LIGHT.day.exposure;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute("aria-label","3D room. Drag empty space to orbit. Drag a piece to move it; hold Shift to lift it. Select an item in Arrange for keyboard editing.");
  canvas.style.cssText="display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px";container.appendChild(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.2,400),kit=createModelKit({onTexture:()=>request()});
  // A sky/ground fill, the sun, and a fill at the window (moonlight at night).
  const hemi=new T.HemisphereLight(LIGHT.day.hemiSky,LIGHT.day.hemiGround,LIGHT.day.hemiI);scene.add(hemi);
  const sun=new T.DirectionalLight(LIGHT.day.sun,LIGHT.day.sunI);scene.add(sun,sun.target);
  const fill=new T.PointLight(LIGHT.day.fill,LIGHT.day.fillI,14,1.3);scene.add(fill);
  // The plan's lamps at night: always LAMPS lights (unused ones at zero), shown only at night, so day pays for none of them.
  const lampRoot=new T.Group(),lamps=Array.from({length:LAMPS},()=>{const p=new T.PointLight("#ffffff",0,10,1.4);lampRoot.add(p);return p;});lampRoot.visible=false;scene.add(lampRoot);
  const blobMat=patchMaterial("#2a1d12",LIGHT.day.blob),bandMat=patchMaterial("#2a1d12",.26),groundMat=patchMaterial("#2a1d12",.16),poolMat=patchMaterial(LIGHT.day.pool,LIGHT.day.poolA,true);
  const roomRoot=new T.Group(),itemRoot=new T.Group(),groundRoot=new T.Group();scene.add(roomRoot,itemRoot);roomRoot.add(groundRoot);
  const meshes=new Map(),wallGroups=[],openingGroups=[],openingNodes=new Map(),floorTextures=new Map();
  let roomKey="",lightKey="",nightKey="",data=null,disposed=false,raf=0,assemblyStart=0,ready=false,light=LIGHT.day,firstWindow=null,glassMat=null,pool=null;
  // Walk in: keys held on the canvas, the on-screen pad, the mini-map's marker, and the "ceiling" colour behind the open top.
  const keys=new Set(),pad={move:0,turn:0},paper=new T.Color(PAPER),ceiling=new T.Color();let lastStep=0,walker=null;
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  const marker=new T.Box3Helper(new T.Box3(),0x2b4eff);marker.visible=false;scene.add(marker);
  const guides=new T.Group();scene.add(guides);
  // The selected piece: a dashed cobalt ring on the floor around its footprint. Nothing else is drawn over the room.
  const ring=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color:0x2b4eff,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  ring.visible=false;ring.renderOrder=3;scene.add(ring);let ringKey="";
  const openingGhost=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x2b4eff,transparent:true,opacity:.45,depthTest:false}));
  openingGhost.visible=false;openingGhost.renderOrder=10;scene.add(openingGhost);
  const lineMat=new T.LineDashedMaterial({color:0x2b4eff,dashSize:.15,gapSize:.1,transparent:true,opacity:.65});
  let width=1,height=1,angle=.7,polar=.94,radius=25,mode="room",walls="auto",target=new T.Vector3(),eye=new T.Vector3();
  let drag=null,pointers=new Map(),pinch=0,tween=null,dragMode=false;
  // Camera memory: Dollhouse, Top and Walk in each keep where you left them. `custom` is true once you've moved the current view;
  // `orbit` holds the dollhouse angles while you walk (walking reuses angle and polar for where you look).
  const saved={room:null,top:null,inside:null},orbit={a:.7,p:.94};let custom=false;
  // Frame pacing for the adaptive pixel ratio.
  let lastFrame=0,slow=0,chained=false;

  const onContextLost=e=>{e.preventDefault();options.onError?.("The graphics context was interrupted. Open 2D or retry 3D.");};
  canvas.addEventListener("webglcontextlost",onContextLost);
  function planeHit(e,pl){
    const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(pl,new T.Vector3());
  }
  const roomPoint=(e,y=0)=>{plane.constant=-y;return planeHit(e,plane);};
  function hit(e){roomPoint(e);return ray.intersectObjects(itemRoot.children,true).find(h=>h.object.userData.itemId)?.object.userData.itemId??null;}
  function openingHit(e){
    roomPoint(e);
    const opening=ray.intersectObjects(openingGroups.filter(g=>g.visible),true).find(h=>h.object.userData.openingIndex!==undefined);
    const item=ray.intersectObjects(itemRoot.children,true).find(h=>h.object.userData.itemId);
    return opening&&(!item||opening.distance<=item.distance)?opening:null;
  }
  function wallPoint(e,height=0){
    const floor=roomPoint(e,height);
    return ray.intersectObjects(wallGroups.filter(g=>g.visible),true)[0]?.point??floor;
  }
  function positionOpening(node,opening,originalOffset=0){
    const a=data.outline.points[opening.edge],b=data.outline.points[(opening.edge+1)%data.outline.points.length],len=Math.hypot(b.x-a.x,b.y-a.y);
    const offset=opening.offset_ft-originalOffset;
    node.position.set(a.x+(b.x-a.x)*offset/len,0,a.y+(b.y-a.y)*offset/len);node.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);
  }
  function ghostOpening(opening){
    openingGhost.visible=!!opening;
    if(opening){positionOpening(openingGhost,{...opening,offset_ft:opening.offset_ft+opening.width_ft/2});
      const door=opening.kind==="door",h=door?Math.min(6.7,data.settings.ceilingFt-.1):3.5;
      openingGhost.position.y=door?h/2:Math.min(3,data.settings.ceilingFt*.4)+h/2;openingGhost.scale.set(opening.width_ft,h,.18);}
    request();
  }
  function request(){if(!raf&&!disposed)raf=requestAnimationFrame(frame);}
  /** The user moved the camera: this view is theirs now, and any preset animation stops. */
  function touched(){custom=true;tween=null;}
  function cameraUpdate(){
    if(mode==="inside"){camera.position.copy(eye);camera.lookAt(eye.x+Math.sin(angle)*8,eye.y+Math.cos(polar)*4,eye.z-Math.cos(angle)*8);}
    else{camera.position.set(target.x+radius*Math.sin(polar)*Math.sin(angle),target.y+radius*Math.cos(polar),target.z+radius*Math.sin(polar)*Math.cos(angle));camera.lookAt(target);}
    for(const wall of wallGroups){
      const normal=wall.userData.normal,mid=wall.userData.mid;
      const outward=(camera.position.x-mid.x)*normal.x+(camera.position.z-mid.y)*normal.y;
      wall.visible=walls!=="hidden"&&(walls==="all"||mode==="inside"||(mode!=="top"&&outward<.1));
    }
    for(const opening of openingGroups)opening.visible=walls!=="hidden";
    groundRoot.visible=mode!=="inside";
  }
  /** A dashed rounded rectangle a little outside a w × d footprint, as flat quads on the floor. */
  function ringGeometry(w,d){
    const hw=w/2+.25,hd=d/2+.25,r=Math.min(.5,hw,hd),path=[];
    for(const [cx,cz,a0] of [[hw-r,hd-r,0],[-hw+r,hd-r,Math.PI/2],[-hw+r,-hd+r,Math.PI],[hw-r,-hd+r,Math.PI*1.5]])
      for(let k=0;k<=6;k++){const a=a0+k/6*Math.PI/2;path.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}
    path.push(path[0]);
    const pos=[],half=.04,dash=.34,gap=.2;let along=0;
    for(let i=1;i<path.length;i++){
      const [ax,az]=path[i-1],[bx,bz]=path[i],len=Math.hypot(bx-ax,bz-az);if(len<1e-6)continue;
      const nx=-(bz-az)/len*half,nz=(bx-ax)/len*half;
      for(let t=0;t<len;){
        const phase=(along+t)%(dash+gap),on=phase<dash,step=Math.max(1e-4,Math.min(len-t,(on?dash:dash+gap)-phase));
        if(on){const x0=ax+(bx-ax)*t/len,z0=az+(bz-az)*t/len,x1=ax+(bx-ax)*(t+step)/len,z1=az+(bz-az)*(t+step)/len;
          pos.push(x0-nx,0,z0-nz,x1-nx,0,z1-nz,x1+nx,0,z1+nz,x0-nx,0,z0-nz,x1+nx,0,z1+nz,x0+nx,0,z0+nz);}
        t+=step;
      }
      along+=len;
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));return g;
  }
  function showSelection(){
    const selectedOpening=data?.editOpenings&&openingNodes.get(data?.selectedOpening);
    if(selectedOpening){marker.box.setFromObject(selectedOpening);marker.visible=true;ring.visible=false;return;}
    marker.visible=false;
    const m=meshes.get(data?.selectedId);if(!m){ring.visible=false;return;}
    const key=m.item.footW+"x"+m.item.footD;if(key!==ringKey){ringKey=key;ring.geometry.dispose();ring.geometry=ringGeometry(m.item.footW,m.item.footD);}
    ring.position.set(m.group.position.x,.09,m.group.position.z);ring.visible=true;
  }
  function frame(time){
    raf=0;if(disposed||document.hidden)return;let more=false;
    if(tween){const q=Math.min(1,(time-tween.start)/400),t=1-Math.pow(1-q,3);
      angle=tween.a+(tween.toA-tween.a)*t;polar=tween.p+(tween.toP-tween.p)*t;radius=tween.r+(tween.toR-tween.r)*t;
      target.copy(tween.from).lerp(tween.to,t);if(q===1)tween=null;else more=true;}
    if(assemblyStart){let index=0,assembling=false;
      for(const m of meshes.values()){const q=Math.min(1,Math.max(0,(time-assemblyStart-index++*15)/550));
        m.group.position.y=m.item.elevation+(options.reduced?0:(1-q)*(1-q)*1.3);m.group.scale.setScalar(.94+.06*q);if(q<1)assembling=true;}
      if(!assembling)assemblyStart=0;else more=true;
    }
    if(mode==="inside"&&data){
      const w=walkInput(),dt=Math.min(.05,Math.max(0,(time-lastStep)/1000));
      if(w.move||w.turn||w.strafe){
        custom=true;angle-=w.turn*1.8*dt;const fx=Math.sin(angle),fz=-Math.cos(angle),speed=4.5*dt;
        const nx=eye.x+(fx*w.move+Math.cos(angle)*w.strafe)*speed,nz=eye.z+(fz*w.move+Math.sin(angle)*w.strafe)*speed,stuck=!walkable(eye.x,eye.z);
        const ok=(x,z)=>walkable(x,z)||stuck&&insideRoom(x,z);
        // Slide along walls and furniture instead of stopping dead.
        if(ok(nx,nz)){eye.x=nx;eye.z=nz;}else if(ok(nx,eye.z))eye.x=nx;else if(ok(eye.x,nz))eye.z=nz;
        more=true;
      }
    }
    lastStep=time;
    // Adaptive resolution: back-to-back frames slower than ~30 fps (orbiting, walking, dragging) step the pixel ratio down, never below 1.
    const dt=time-lastFrame;lastFrame=time;
    if(!assemblyStart&&(chained||pointers.size)&&dt>0&&dt<150){
      if(dt>34){if(++slow>=10&&ratio>1){ratio=Math.max(1,ratio-.25);renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);slow=0;}}
      else slow=Math.max(0,slow-1);
    }
    chained=more;
    renderer.setClearColor(mode==="inside"?ceiling:paper);
    cameraUpdate();camera.updateMatrixWorld();showSelection();
    if(walker&&mode==="inside")walker.setAttribute("transform","translate("+eye.x.toFixed(2)+" "+eye.z.toFixed(2)+") rotate("+(angle*180/Math.PI).toFixed(1)+")");
    renderer.render(scene,camera);
    if(!ready&&data&&width>1&&height>1){ready=true;options.onReady?.();setTimeout(prewarm,0);}
    if(more)request();
  }
  /** Compile the other light set's shaders in the background, so switching Day / Night never stalls on a compile. */
  function prewarm(){
    if(disposed)return;const was=lampRoot.visible;lampRoot.visible=!was;
    try{renderer.compileAsync(scene,camera).catch(()=>{});}catch{}finally{lampRoot.visible=was;}
  }
  function clearRoom(){
    for(const g of roomRoot.children)g.traverse(o=>{if(o.userData.ownGeometry)o.geometry?.dispose();if(o.userData.ownMaterial){for(const material of Array.isArray(o.material)?o.material:[o.material])material?.dispose();}});
    roomRoot.clear();groundRoot.clear();roomRoot.add(groundRoot);wallGroups.length=0;openingGroups.length=0;openingNodes.clear();pool=null;glassMat=null;firstWindow=null;
  }
  // ---------- floors: oak and walnut planks, a speckled tile, soft carpet (drawn once per finish) ----------
  function floorTexture(finish){
    if(floorTextures.has(finish))return floorTextures.get(finish);
    const n=LOW?512:1024,c=document.createElement("canvas");c.width=c.height=n;const g=c.getContext("2d");
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    if(finish==="oak"||finish==="walnut"){
      const base=new T.Color(finish==="oak"?"#c99f6c":"#7a553a"),rows=8,ph=n/rows,ink=finish==="oak"?"70,40,15":"30,16,6";
      for(let r=0;r<rows;r++){let x=-rnd()*n*.5;
        while(x<n){const len=n*(.35+rnd()*.4),shade=.9+rnd()*.16;g.fillStyle="#"+base.clone().multiplyScalar(shade).getHexString();g.fillRect(x,r*ph,len,ph);
          g.strokeStyle=`rgba(${ink},.10)`;g.lineWidth=1;
          for(let k=0;k<7;k++){g.beginPath();const y=r*ph+rnd()*ph;g.moveTo(x,y);g.bezierCurveTo(x+len*.3,y+3,x+len*.6,y-3,x+len,y+1);g.stroke();}
          g.fillStyle=`rgba(${ink},.35)`;g.fillRect(x,r*ph,2,ph);x+=len;}
        g.fillStyle=`rgba(${ink},.30)`;g.fillRect(0,r*ph,n,2);}
    }else if(finish==="concrete"){
      // "Tile" in the UI: speckled vinyl tiles like the reference.
      g.fillStyle="#d4cfcb";g.fillRect(0,0,n,n);
      for(let i=0;i<(LOW?15000:60000);i++){const v=rnd(),r=1+rnd()*1.6;g.fillStyle=v>.55?"rgba(255,255,255,.22)":"rgba(80,70,65,.16)";g.fillRect(rnd()*n,rnd()*n,r,r);}
      g.strokeStyle="rgba(110,100,95,.13)";g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*n/4,0);g.lineTo(i*n/4,n);g.stroke();g.beginPath();g.moveTo(0,i*n/4);g.lineTo(n,i*n/4);g.stroke();}
    }else{
      // Carpet: a soft, fine pile.
      g.fillStyle="#c4bcae";g.fillRect(0,0,n,n);
      for(let i=0;i<(LOW?20000:80000);i++){const v=rnd();g.fillStyle=v>.5?"rgba(255,255,255,.07)":"rgba(70,60,50,.07)";g.fillRect(rnd()*n,rnd()*n,1.4,1.4);}
    }
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(LOW?4:8,renderer.capabilities.getMaxAnisotropy());
    tex.repeat.set(1/6,1/6); // one tile per 6 ft (the floor's UVs are in feet)
    floorTextures.set(finish,tex);return tex;
  }
  const shade=(hex,k)=>"#"+new T.Color(hex).multiplyScalar(k).getHexString();
  const mixHex=(a,b,t)=>"#"+new T.Color(a).lerp(new T.Color(b),t).getHexString();
  /** A box with the lighter cap material on top (walls, cut at the dollhouse edge). */
  function capBox(parent,w,h,d,side,cap,x,y,z){
    const m=new T.Mesh(new T.BoxGeometry(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d)),[side,side,cap,side,side,side]);
    m.position.set(x,y,z);m.userData.ownGeometry=true;parent.add(m);return m;
  }
  function buildRoom(){
    clearRoom();const {room,settings,outline}=data,h=settings.ceilingFt,pts=outline.points,N=pts.length;
    let area=0;pts.forEach((p,i)=>{const b=pts[(i+1)%N];area+=p.x*b.y-b.x*p.y;});
    const out=area>0?-1:1;
    // Each edge's outward normal (in plan x/y); the plinth is the outline grown by the wall thickness.
    const normals=pts.map((a,i)=>{const b=pts[(i+1)%N],len=Math.hypot(b.x-a.x,b.y-a.y)||1,dx=(b.x-a.x)/len,dz=(b.y-a.y)/len;return area>0?{x:dz,y:-dx}:{x:-dz,y:dx};});
    const grown=pts.map((p,i)=>{const n1=normals[(i-1+N)%N],n2=normals[i],k=1+n1.x*n2.x+n1.y*n2.y||1;return {x:p.x+WALL_T*(n1.x+n2.x)/k,y:p.y+WALL_T*(n1.y+n2.y)/k};});
    const shape=new T.Shape();grown.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();
    const wallColor=settings.wallColor,wallMat=clay(new T.MeshStandardMaterial({color:wallColor,roughness:.95}),.035),capMat=clay(new T.MeshStandardMaterial({color:shade(wallColor,.9),roughness:.95}),.035);
    const trim=clay(new T.MeshStandardMaterial({color:mixHex(wallColor,"#ffffff",.6),roughness:.82}),.05),baseMat=clay(new T.MeshStandardMaterial({color:mixHex(wallColor,"#1f2233",.8),roughness:.82}),.05);
    const floorMat=clay(new T.MeshStandardMaterial({map:floorTexture(settings.floor),roughness:settings.floor==="carpet"?1:settings.floor==="concrete"?.86:.78}),.03);
    // The dollhouse plinth: one slab whose top is the floor, its sides in the wall cap colour.
    const slab=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:PLINTH,bevelEnabled:false}),[floorMat,capMat]);
    slab.name="room-floor";slab.rotation.x=-Math.PI/2;slab.position.y=-PLINTH;slab.userData={ownGeometry:true};roomRoot.add(slab);
    const owned=new T.Group();owned.userData.ownMaterial=true;owned.material=[wallMat,capMat,trim,baseMat,floorMat];roomRoot.add(owned);
    const doorMat=clay(new T.MeshStandardMaterial({color:mixHex(wallColor,"#d9a982",.35),roughness:.82}),.05),knobMat=new T.MeshStandardMaterial({color:"#c9c4bd",metalness:.35,roughness:.5});
    glassMat=new T.MeshBasicMaterial({color:light.sky,transparent:true,opacity:light.glass,side:T.DoubleSide,depthWrite:false});
    owned.material.push(doorMat,knobMat,glassMat);
    pts.forEach((a,i)=>{
      const b=pts[(i+1)%N],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.01)return;const dx=(b.x-a.x)/len,dz=(b.y-a.y)/len;
      const group=new T.Group();group.position.set(a.x,0,a.y);group.rotation.y=-Math.atan2(dz,dx);roomRoot.add(group);
      group.userData.normal=normals[i];group.userData.mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};wallGroups.push(group);
      // Walls sit outside the floor, so pieces against them never clip. The end runs on past a convex corner (or stops short of a reflex one) so caps meet cleanly.
      const next=normals[(i+1)%N],turn=normals[i].x*next.y-normals[i].y*next.x,convex=(area>0?-turn:turn)<0,end=len+(convex?WALL_T:-WALL_T);
      const openings=outline.openings.filter(o=>o.edge===i).sort((a,b)=>a.offset_ft-b.offset_ft);
      let cursor=0;const zc=out*WALL_T/2;
      const segment=(start,stop,low,high)=>{if(stop-start<=.005||high-low<=.005)return;capBox(group,stop-start,high-low,WALL_T,wallMat,capMat,(start+stop)/2,(low+high)/2,zc);};
      // Soft shading where the wall meets the floor (it hides with its wall in the cutaway), and a soft shadow on the paper outside the plinth.
      const band=patch(len/2,0,.85,bandMat);band.position.set(len/2,.008,0);group.add(band);
      const outside=patch(len/2+WALL_T,0,1.4,groundMat);outside.position.set(a.x+dx*len/2+normals[i].x*WALL_T,-PLINTH-.01,a.y+dz*len/2+normals[i].y*WALL_T);outside.rotation.y=group.rotation.y;groundRoot.add(outside);
      for(const o of openings){
        // Separate groups let a door/window follow the pointer without rebuilding the room.
        const index=outline.openings.indexOf(o),fixtures=new T.Group();fixtures.name="opening-"+index;
        fixtures.position.copy(group.position);fixtures.rotation.copy(group.rotation);
        roomRoot.add(fixtures);openingGroups.push(fixtures);openingNodes.set(index,fixtures);
        const left=Math.max(cursor,Math.min(len,o.offset_ft)),right=Math.max(left,Math.min(len,o.offset_ft+o.width_ft));segment(cursor,left,0,h);
        const center=(left+right)/2,span=right-left,depth=WALL_T+.06;
        if(o.kind==="window"){
          const low=Math.min(3,h*.4),high=Math.min(h-.5,6.5),oh=high-low;segment(left,right,0,low);segment(left,right,high,h);
          if(!firstWindow)firstWindow={x:a.x+dx*center,y:a.y+dz*center,n:normals[i],width:span,dx,dz,low,high};
          // Frame, a cross of mullions, a sill into the room, and tinted glass.
          const fr=.16;
          for(const y of [low+fr/2,high-fr/2])kit.box(fixtures,span,fr,depth,trim,center,y,zc,.01);
          for(const x of [left+fr/2,right-fr/2])kit.box(fixtures,fr,oh,depth,trim,x,(low+high)/2,zc,.01);
          kit.box(fixtures,.1,oh,WALL_T*.7,trim,center,(low+high)/2,zc,.01);
          kit.box(fixtures,span,.1,WALL_T*.7,trim,center,(low+high)/2+Math.min(.55,oh*.12),zc,.01);
          kit.box(fixtures,span+.3,.12,.42,trim,center,low-.02,-out*.12,.02);
          const glass=new T.Mesh(new T.PlaneGeometry(Math.max(.05,span-fr),Math.max(.05,oh-fr)),glassMat);glass.position.set(center,(low+high)/2,zc);glass.name="window-pane";glass.userData.ownGeometry=true;fixtures.add(glass);
        }else{
          const doorHeight=Math.min(6.7,h-.1);
          segment(left,right,doorHeight,h);
          // A painted frame (casing) and the leaf, swung the way the 2D plan shows, with its knob.
          for(const x of [left-.07,right+.07])kit.box(fixtures,.14,doorHeight+.12,depth,trim,x,(doorHeight+.12)/2,zc,.01);
          kit.box(fixtures,span+.28,.14,depth,trim,center,doorHeight+.05,zc,.01);
          const swing=o.swing??0,endHinge=Boolean(swing&1),inward=area>0?1:-1;
          const side=(swing&2)?-inward:inward,hinge=new T.Group(),leafWidth=Math.max(.1,span-.12);
          hinge.position.x=endHinge?right-.06:left+.06;hinge.rotation.y=(endHinge?1:-1)*side*Math.PI/2;
          fixtures.add(hinge);const direction=endHinge?-1:1;
          const leaf=kit.box(hinge,leafWidth,doorHeight-.05,.14,doorMat,direction*leafWidth/2,(doorHeight-.05)/2,0,.03);leaf.name="door-leaf";
          for(const face of [-1,1])kit.box(hinge,.14,.14,.14,knobMat,direction*(leafWidth-.3),3.3,face*.12,.06);
        }
        const height=o.kind==="door"?Math.min(6.7,h-.1):Math.min(h-.5,6.5)-Math.min(3,h*.4),bottom=o.kind==="door"?0:Math.min(3,h*.4);
        const hitbox=kit.box(fixtures,right-left,height,.4,kit.mat("#2b4eff"),(left+right)/2,bottom+height/2,0);
        hitbox.visible=false;
        // Raycasting still uses this invisible box, including the open doorway and top-view edge.
        fixtures.traverse(mesh=>{if(mesh.isMesh)mesh.userData.openingIndex=index;});
        cursor=right;
      }
      segment(cursor,end,0,h);
      // Dark baseboards along the inside face, broken at doors.
      let sk=0;const board=(s,e)=>{if(e-s>.05)kit.box(group,e-s,.32,.06,baseMat,(s+e)/2,.16,-out*.03,.01);};
      for(const o of openings.filter(o=>o.kind==="door")){board(sk,o.offset_ft);sk=o.offset_ft+o.width_ft;}
      board(sk,len);
    });
    for(const c of outline.closets){const m=capBox(roomRoot,c.width_ft,h*.87,c.depth_ft,clay(new T.MeshStandardMaterial({color:mixHex(wallColor,"#cbb28e",.45),roughness:.88}),.05),capMat,c.x_ft+c.width_ft/2,h*.435,c.y_ft+c.depth_ft/2);m.userData.ownMaterial=true;}
    // Daylight falling in through the first window: a soft, warm pool on the floor (none at night).
    if(firstWindow){const win=firstWindow,depth=Math.max(1.5,Math.min(4.5,Math.min(room.lengthFt,room.widthFt)*.4));
      pool=patch(win.width/2*.9,depth/2,.7,poolMat);pool.position.set(win.x-win.n.x*(depth/2+.15),.011,win.y-win.n.y*(depth/2+.15));pool.rotation.y=-Math.atan2(win.dz,win.dx);roomRoot.add(pool);}
  }
  /** The light preset: sun through the first window (or the reference angle), fill at the window, sky, exposure. No rebuilds, no recompiles. */
  function applyLight(){
    const {room,settings}=data,l=room.lengthFt,w=room.widthFt,h=settings.ceilingFt,win=firstWindow,night=settings.lighting==="night";
    const L=light=LIGHT[settings.lighting]||LIGHT.day;
    renderer.toneMappingExposure=L.exposure;
    hemi.color.set(L.hemiSky);hemi.groundColor.set(L.hemiGround);hemi.intensity=L.hemiI;
    const el=T.MathUtils.degToRad(L.elev),center=new T.Vector3(l/2,0,w/2);let dir;
    if(win){const a=Math.atan2(win.n.y,win.n.x)-T.MathUtils.degToRad(L.az-180);dir=new T.Vector3(Math.cos(el)*Math.cos(a),Math.sin(el),Math.cos(el)*Math.sin(a));}
    else{const az=T.MathUtils.degToRad(L.az);dir=new T.Vector3(Math.cos(el)*Math.cos(az),Math.sin(el),-Math.cos(el)*Math.sin(az));}
    sun.color.set(L.sun);sun.intensity=L.sunI;sun.position.copy(center).addScaledVector(dir,40);sun.target.position.copy(center);
    fill.color.set(L.fill);fill.intensity=L.fillI;lampRoot.visible=night;
    if(win)fill.position.set(win.x-win.n.x*1.2,Math.min(h-.6,5.6),win.y-win.n.y*1.2);else fill.position.set(l/2,Math.min(h-.6,5.6),w/2);
    if(glassMat){glassMat.color.set(L.sky);glassMat.opacity=L.glass;}
    blobMat.uniforms.uOpacity.value=L.blob;bandMat.uniforms.uOpacity.value=night?.2:.26;
    poolMat.uniforms.uColor.value.set(L.pool);poolMat.uniforms.uOpacity.value=L.poolA;if(pool)pool.visible=L.poolA>0;
    kit.setNight(night);nightKey="";
    ceiling.set(settings.wallColor).multiplyScalar(night?.2:settings.lighting==="evening"?.8:.92);
    updateNightLights();
  }
  /** Night: light only from the lamps, string lights and strips in the plan (or a dim room light if there are none). */
  function updateNightLights(){
    const on=data?.settings.lighting==="night";
    const sources=on?[...meshes.values()].filter(m=>["lamp","lights","candle"].includes(m.item.kind)):[];
    const key=on?JSON.stringify(sources.map(m=>[m.item.id,m.item.kind,m.item.x_ft,m.item.y_ft,m.item.rotation_deg,m.item.elevation])):"off";
    if(key===nightKey)return;nightKey=key;
    for(const lamp of lamps)lamp.intensity=0;
    if(!on)return;
    const spots=[];
    for(const m of sources.sort((a,b)=>(a.item.kind==="lamp"?0:1)-(b.item.kind==="lamp"?0:1))){
      const p=m.group.position,lamp=m.item.kind==="lamp",y=m.item.elevation+m.item.height*(lamp?.75:.5),r=-m.item.rotation_deg*Math.PI/180;
      // Wall lights shine from a little way into the room, so they wash the wall instead of burning a spot on it.
      const out=lamp?0:1.2,ox=Math.sin(r)*out,oz=Math.cos(r)*out,color=lamp?"#ffc27a":m.item.product?.color||data.theme?.glow||"#ffb35c";
      spots.push([p.x+ox,y,p.z+oz,lamp?16:7,lamp?10:9,lamp?1.4:1.6,color]);
    }
    if(!spots.length){const r=data.room;spots.push([r.lengthFt/2,data.settings.ceilingFt-.6,r.widthFt/2,5,Math.max(r.lengthFt,r.widthFt)*1.4,1.2,"#ffd9a8"]);}
    spots.slice(0,LAMPS).forEach(([x,y,z,intensity,distance,decay,color],k)=>{const p=lamps[k];p.position.set(x,y,z);p.intensity=intensity;p.distance=distance;p.decay=decay;p.color.set(color);});
  }
  /** One piece: its model turned so its back faces the side the plan gives it, and a soft contact shadow under it. */
  function buildPiece(f,next){
    const back=f.back||0,inner=kit.build(back%2?{...f,width_ft:f.length_ft,length_ft:f.width_ft}:f,next.palette,{theme:next.theme,dress:next.settings.dressVibe!==false});
    inner.rotation.y=-back*Math.PI/2;
    const group=new T.Group();group.add(inner);group.userData.itemId=f.id;
    let blob=null;
    if(!NO_BLOB.has(f.kind)&&!onWall(f)){const w=f.width_ft,d=f.length_ft;blob=patch(w*.46,d*.46,Math.max(.15,Math.min(.6,.12+.18*Math.min(w,d))),blobMat);blob.position.y=.012;group.add(blob);}
    itemRoot.add(group);return {group,blob};
  }
  function removePiece(m){itemRoot.remove(m.group);m.blob?.geometry.dispose();}
  function sync(next){
    const first=!data,before=data;if(drag?.openingIndex!==undefined&&data?.outline!==next.outline)cancelDrag();data=next;
    // The room shell rebuilds only when its shape or finishes change; the light preset is applied on its own.
    const {lighting,dressVibe,...shell}=next.settings;
    const key=JSON.stringify([next.room.lengthFt,next.room.widthFt,next.outline,shell]);
    if(key!==roomKey){roomKey=key;buildRoom();lightKey="";}
    const ids=new Set(),dress=dressVibe!==false;
    for(const f of next.items){
      ids.add(f.id);const key=JSON.stringify([f.kind,f.width_ft,f.length_ft,f.height,f.material_color,f.product,f.bare,f.bed_mode,f.built_in,f.back,NO_BLOB.has(f.kind)||onWall(f),next.palette,dress,dress?next.theme:null]);let m=meshes.get(f.id);
      if(!m||m.key!==key){if(m)removePiece(m);m={...buildPiece(f,next),key,item:f};meshes.set(f.id,m);}
      m.item=f;
      if(drag?.id!==f.id){m.group.position.set(f.x_ft+f.footW/2,f.elevation,f.y_ft+f.footD/2);m.group.rotation.y=-f.rotation_deg*Math.PI/180;}
    }
    for(const [id,m]of meshes)if(!ids.has(id)){removePiece(m);meshes.delete(id);}
    if(lighting!==lightKey){lightKey=lighting;applyLight();}else updateNightLights();
    if(first){target.set(next.room.lengthFt/2,1,next.room.widthFt/2);preset("room",true,true);if(!options.reduced)assemblyStart=performance.now();}
    else if((before.room.lengthFt!==next.room.lengthFt||before.room.widthFt!==next.room.widthFt)&&!custom&&mode!=="inside")preset(mode,true,true);
    request();
  }
  function walkInput(){
    const k=n=>keys.has(n),clamp=v=>Math.max(-1,Math.min(1,v));
    return {move:clamp((k("arrowup")||k("w")?1:0)-(k("arrowdown")||k("s")?1:0)+pad.move),turn:clamp((k("arrowleft")?1:0)-(k("arrowright")?1:0)+pad.turn),strafe:(k("d")?1:0)-(k("a")?1:0)};
  }
  function insideRoom(x,z){
    const p=data.outline.points;let c=false;
    for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)c=!c;}
    return c;
  }
  /** Where you can stand: inside the walls (with a body's width to spare), clear of closets and of anything taller than a rug that sits below head height. */
  function walkable(x,z){
    if(!insideRoom(x,z))return false;
    const p=data.outline.points;
    for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b.x-a.x,dz=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1)));
      if(Math.hypot(a.x+dx*t-x,a.y+dz*t-z)<WALK_R)return false;}
    for(const c of data.outline.closets)if(x>c.x_ft-.35&&x<c.x_ft+c.width_ft+.35&&z>c.y_ft-.35&&z<c.y_ft+c.depth_ft+.35)return false;
    for(const m of meshes.values()){const f=m.item;if(f.height<.6||f.elevation>4.5)continue;
      if(Math.abs(x-m.group.position.x)<f.footW/2+.35&&Math.abs(z-m.group.position.z)<f.footD/2+.35)return false;}
    return true;
  }
  /** Walk in at the most open spot (nearest the door when it's a tie), facing the window, or the middle of the room. */
  function walkStart(){
    const {outline,room}=data,step=.5,cols=Math.ceil(room.lengthFt/step),rows=Math.ceil(room.widthFt/step),free=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)free.push(walkable((i+.5)*step,(j+.5)*step));
    let door={x:data.interior.x,z:data.interior.y};const d=outline.openings.find(o=>o.kind==="door");
    const centre=o=>{const a=outline.points[o.edge],b=outline.points[(o.edge+1)%outline.points.length],t=(o.offset_ft+o.width_ft/2)/(Math.hypot(b.x-a.x,b.y-a.y)||1);return {x:a.x+(b.x-a.x)*t,z:a.y+(b.y-a.y)*t};};
    if(d)door=centre(d);
    let best={x:data.interior.x,z:data.interior.y},score=-Infinity;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      if(!free[j*cols+i])continue;let open=0;
      for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++)if(di*di+dj*dj<=9&&free[(j+dj)*cols+i+di]&&i+di>=0&&i+di<cols)open++;
      const x=(i+.5)*step,z=(j+.5)*step,sc=open-.15*Math.hypot(x-door.x,z-door.z);if(sc>score){score=sc;best={x,z};}
    }
    const win=outline.openings.find(o=>o.kind==="window");let look=win?centre(win):{x:room.lengthFt/2,z:room.widthFt/2};
    if(Math.hypot(look.x-best.x,look.z-best.z)<2)look={x:room.lengthFt/2,z:room.widthFt/2};
    return {...best,angle:Math.atan2(look.x-best.x,-(look.z-best.z))};
  }
  function setMode(value){if(value!==mode){mode=value;options.onMode?.(value);}if(value!=="inside"){keys.clear();pad.move=pad.turn=0;}}
  /** Leave the current view, remembering it if you moved it; walking hands the dollhouse angles back. */
  function leave(next){
    if(next===mode)return;
    saved[mode]=custom?(mode==="inside"?{eye:eye.clone(),angle,polar}:{angle,polar,radius,target:target.clone()}):null;
    if(mode==="inside"){angle=orbit.a;polar=orbit.p;}
    if(next==="inside"){orbit.a=angle;orbit.p=polar;}
  }
  /** Switch to a view. It comes back where you left it, unless `reset` asks for its default framing. */
  function preset(value,immediate=false,reset=false){
    if(!data)return;leave(value);
    const keep=reset?null:saved[value];saved[value]=null;
    setMode(value);cancelDrag();
    camera.fov=value==="inside"?52:30;camera.updateProjectionMatrix();
    if(value==="inside"){
      if(keep&&walkable(keep.eye.x,keep.eye.z)){eye.copy(keep.eye);angle=keep.angle;polar=keep.polar;custom=true;}
      else{const start=walkStart();eye.set(start.x,Math.min(data.settings.ceilingFt-.5,EYE),start.z);angle=start.angle;polar=1.9;custom=false;}
      tween=null;request();return;
    }
    let to,toA,toP,toR;
    if(keep){to=keep.target;toA=keep.angle;toP=keep.polar;toR=keep.radius;custom=true;}
    else{
      const l=data.room.lengthFt,w=data.room.widthFt,h=data.settings.ceilingFt,aspect=width/height;
      const vfov=camera.fov*Math.PI/180,hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
      to=new T.Vector3(l/2,value==="top"?0:h*.38,w/2);
      toR=value==="top"?Math.max((l+2*WALL_T)/aspect,w+2*WALL_T)*.56/Math.tan(vfov/2):Math.hypot(l/2+WALL_T,w/2+WALL_T,h/2)*1.08/Math.sin(Math.min(vfov,hfov)/2);
      toA=value==="top"?0:.7;toP=value==="top"?.001:.94;custom=false;
    }
    // Turn the short way round: orbiting can leave the angle several turns out.
    toA=angle+Math.atan2(Math.sin(toA-angle),Math.cos(toA-angle));
    if(immediate||options.reduced){angle=toA;polar=toP;radius=toR;target.copy(to);tween=null;}
    else tween={start:performance.now(),a:angle,p:polar,r:radius,from:target.clone(),to,toA,toP,toR};request();
  }
  function focus(id){
    const m=meshes.get(id);if(!m)return;leave("room");setMode("room");camera.fov=30;camera.updateProjectionMatrix();custom=true;
    const to=m.group.position.clone();to.y+=m.item.height/2;
    tween={start:performance.now(),a:angle,p:polar,r:radius,from:target.clone(),to,toA:angle,toP:.95,toR:Math.max(8,m.item.footW*3.5,m.item.footD*3.5)};
    if(options.reduced){target.copy(to);radius=tween.toR;polar=.95;tween=null;}request();
  }
  /** The way a piece's front faces in the room (its back is against the wall it hangs on). */
  function facing(f){
    const [x,y]=BACK_DIR[f.back||0],r=f.rotation_deg*Math.PI/180;
    return new T.Vector3(-(x*Math.cos(r)-y*Math.sin(r)),0,-(x*Math.sin(r)+y*Math.cos(r)));
  }
  function clearGuides(){guides.children.forEach(g=>g.geometry.dispose());guides.clear();}
  function drawGuides(m){
    clearGuides();const x=m.group.position.x,z=m.group.position.z;
    for(const points of [[new T.Vector3(0,.04,z),new T.Vector3(data.room.lengthFt,.04,z)],[new T.Vector3(x,.04,0),new T.Vector3(x,.04,data.room.widthFt)]]){
      const line=new T.Line(new T.BufferGeometry().setFromPoints(points),lineMat);line.computeLineDistances();guides.add(line);}
  }
  function down(e){
    if(e.button>1)return;assemblyStart=0;for(const m of meshes.values()){m.group.scale.setScalar(1);m.group.position.y=m.item.elevation;}
    canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){cancelDrag();pinch=distance();return;}
    const opening=data?.editOpenings?openingHit(e):null;
    if(opening){const index=opening.object.userData.openingIndex;options.onSelectOpening?.(index);
      drag={pointerId:e.pointerId,openingIndex:index,startX:e.clientX,startY:e.clientY,moved:false,height:opening.point.y,opening:data.outline.openings[index]};return;}
    options.onSelectOpening?.(null);
    const id=hit(e),m=meshes.get(id),movable=m&&m.item.movable&&!m.item.locked&&mode!=="inside"&&(e.pointerType!=="touch"||dragMode||id===data.selectedId);
    options.onSelect?.(id);
    const base={pointerId:e.pointerId,id:movable?id:null,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,x:m?.item.x_ft,y:m?.item.y_ft};
    // Up and down: Shift lifts any piece straight up or down; a wall piece slides along its wall and up or down. From straight above, both drag on the floor.
    const side=mode!=="top"&&polar>.3,lift=!!(movable&&side&&e.shiftKey),wall=!!(movable&&side&&!lift&&onWall(m.item));
    if(lift||wall){
      const c=new T.Vector3(m.group.position.x,m.item.elevation+m.item.height/2,m.group.position.z);
      const n=lift?new T.Vector3(camera.position.x-c.x,0,camera.position.z-c.z):facing(m.item);if(n.lengthSq()<1e-6)n.set(0,0,1);
      const pl=new T.Plane().setFromNormalAndCoplanarPoint(n.normalize(),c),p=planeHit(e,pl);
      drag={...base,plane:pl,lift,vertical:true,elevation:m.item.elevation,offset:p?p.sub(new T.Vector3(m.group.position.x,m.item.elevation,m.group.position.z)):null};return;
    }
    const p=roomPoint(e,m?.item.elevation||0);
    drag={...base,origin:m?m.group.position.clone():null,offset:p&&m?p.clone().sub(m.group.position):null};
  }
  function distance(){const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
  let hoverAt=0;
  function move(e){
    // A grab cursor over pieces you can move (mouse only, at most every 60 ms).
    if(!pointers.size&&e.pointerType==="mouse"&&data&&e.timeStamp-hoverAt>60){hoverAt=e.timeStamp;
      const m=mode==="inside"?null:meshes.get(hit(e));canvas.style.cursor=m&&m.item.movable&&!m.item.locked?(e.shiftKey?"ns-resize":"grab"):"";}
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const d=distance();if(pinch&&d>0){radius=Math.max(4,Math.min(180,radius*pinch/d));touched();}pinch=d;request();return;}
    if(!drag||e.pointerId!==drag.pointerId)return;
    if(drag.openingIndex!==undefined){
      drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;
      if(drag.moved){const p=wallPoint(e,drag.height),next=p&&options.previewOpening?.(drag.openingIndex,p.x,p.z);
        drag.nextOpening=next??null;const node=openingNodes.get(drag.openingIndex);
        if(node)positionOpening(node,next??drag.opening,drag.opening.offset_ft);request();}return;
    }
    const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
    drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;
    if(drag.id&&drag.moved&&drag.vertical){
      const m=meshes.get(drag.id),p=drag.offset&&planeHit(e,drag.plane);
      if(p){
        const top=Math.max(0,data.settings.ceilingFt-m.item.height),raw=Math.max(0,Math.min(top,p.y-drag.offset.y));
        const elevation=data.snap!==false?Math.min(top,Math.round(raw*4)/4):Math.round(raw*100)/100;
        let q={x:drag.x,y:drag.y};
        if(!drag.lift){const x=p.x-drag.offset.x-m.item.footW/2,y=p.z-drag.offset.z-m.item.footD/2;q=options.constrain?.(drag.id,x,y)||{x,y};}
        drag.x=q.x;drag.y=q.y;drag.elevation=elevation;canvas.style.cursor=drag.lift?"ns-resize":"grabbing";
        m.group.position.set(q.x+m.item.footW/2,elevation,q.y+m.item.footD/2);
        for(const child of meshes.values())if(child.item.parent_id===drag.id)child.group.position.set(child.item.x_ft+q.x-m.item.x_ft+child.item.footW/2,child.item.elevation+elevation-m.item.elevation,child.item.y_ft+q.y-m.item.y_ft+child.item.footD/2);
      }
    }else if(drag.id&&drag.moved){canvas.style.cursor="grabbing";
      const m=meshes.get(drag.id),p=roomPoint(e,m.item.elevation);
      if(p&&drag.offset){const x=p.x-drag.offset.x-m.item.footW/2,y=p.z-drag.offset.z-m.item.footD/2,q=options.constrain?.(drag.id,x,y)||{x,y};
        drag.x=q.x;drag.y=q.y;m.group.position.set(q.x+m.item.footW/2,m.item.elevation,q.y+m.item.footD/2);
        for(const child of meshes.values())if(child.item.parent_id===drag.id)child.group.position.set(child.item.x_ft+q.x-m.item.x_ft+child.item.footW/2,child.item.elevation,child.item.y_ft+q.y-m.item.y_ft+child.item.footD/2);
        drawGuides(m);}
    }else if(drag.moved){touched();angle-=dx*.007;polar=Math.max(.08,Math.min(mode==="inside"?2.5:1.45,polar+dy*.006));}
    drag.lastX=e.clientX;drag.lastY=e.clientY;request();
  }
  function up(e){
    if(drag?.id)canvas.style.cursor="";
    pointers.delete(e.pointerId);pinch=0;
    if(drag?.pointerId===e.pointerId){const d=drag;drag=null;clearGuides();
      if(d.openingIndex!==undefined){const node=openingNodes.get(d.openingIndex);if(node)positionOpening(node,d.opening,d.opening.offset_ft);if(d.moved&&d.nextOpening)options.onOpeningChange?.(d.openingIndex,d.nextOpening);}
      else if(d.id&&d.moved){if(d.vertical)options.onMove?.(d.id,d.x,d.y,d.elevation);else options.onMove?.(d.id,d.x,d.y);}}
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);request();
  }
  function cancelDrag(){if(drag?.openingIndex!==undefined){const node=openingNodes.get(drag.openingIndex);if(node)positionOpening(node,drag.opening,drag.opening.offset_ft);}openingGhost.visible=false;if(drag?.id){for(const m of meshes.values())m.group.position.set(m.item.x_ft+m.item.footW/2,m.item.elevation,m.item.y_ft+m.item.footD/2);}drag=null;clearGuides();}
  function cancel(e){pointers.delete(e.pointerId);pinch=0;cancelDrag();request();}
  function wheel(e){e.preventDefault();touched();radius=Math.max(4,Math.min(180,radius*Math.exp(e.deltaY*.001)));request();}
  const walkKey=e=>{const k=e.key.toLowerCase();return mode==="inside"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)?k:null;};
  function key(e){
    if(e.key==="Escape"){cancelDrag();options.onSelectOpening?.(null);options.onSelect?.(null);request();return;}
    const k=walkKey(e);if(k){e.preventDefault();if(!keys.has(k)){keys.add(k);request();}return;}
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-"].includes(e.key)){
      e.preventDefault();touched();if(e.key==="ArrowLeft")angle+=.1;if(e.key==="ArrowRight")angle-=.1;
      if(e.key==="ArrowUp")polar=Math.max(.08,polar-.1);if(e.key==="ArrowDown")polar=Math.min(1.45,polar+.1);
      if(e.key==="+"||e.key==="=")radius=Math.max(4,radius*.9);if(e.key==="-")radius=Math.min(180,radius*1.1);request();}
  }
  // Resizing keeps the camera where it is; only an untouched default view refits to the new shape.
  const resize=new ResizeObserver(()=>{const r=container.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    if(data&&mode!=="inside"&&!custom&&!tween)preset(mode,true,true);request();});resize.observe(container);
  function droppedOpening(e){
    if(!data?.editOpenings)return null;
    const kind=["door","window"].find(kind=>e.dataTransfer.types.includes(options.openingDragType+"-"+kind));
    if(!kind)return null;e.preventDefault();const p=wallPoint(e,0);
    return p?options.previewOpening?.(kind,p.x,p.z):null;
  }
  const events={dragover:e=>{const opening=droppedOpening(e);e.dataTransfer.dropEffect=opening?"copy":"none";ghostOpening(opening);},dragleave:()=>ghostOpening(null),drop:e=>{const opening=droppedOpening(e);ghostOpening(null);if(opening)options.onOpeningChange?.(null,opening);},pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,keydown:key,keyup:e=>{keys.delete(e.key.toLowerCase());},blur:()=>keys.clear()};
  for(const [name,fn]of Object.entries(events))canvas.addEventListener(name,fn);canvas.addEventListener("wheel",wheel,{passive:false});
  const visible=()=>request();document.addEventListener("visibilitychange",visible);
  return {update:sync,
    // Choosing the view you're already in recentres it; any other view comes back where you left it.
    preset:m=>preset(m,false,m===mode),fit:()=>preset("room",false,true),focus,
    zoom:f=>{if(mode==="inside")return;radius=Math.max(4,Math.min(180,radius*f));touched();request();},
    readCursor(x,y){
      if(!data)return null;
      const bounds=canvas.getBoundingClientRect(),p=roomPoint({clientX:bounds.left+x,clientY:bounds.top+y});
      return p?{x:p.x/data.room.lengthFt,y:p.z/data.room.widthFt}:null;
    },
    projectCursor(x,y){
      if(!data)return null;
      const p=new T.Vector3(x*data.room.lengthFt,.01,y*data.room.widthFt).project(camera);
      return p.z<-1||p.z>1?null:{x:(p.x+1)*width/2,y:(1-p.y)*height/2};
    },
    setWalls:v=>{walls=v;request();},setWalker:el=>{walker=el;request();},setWalkInput:v=>{pad.move=v.move??0;pad.turn=v.turn??0;request();},setMoveMode:v=>{dragMode=v;},
    setReduced:v=>{options.reduced=v;if(v){assemblyStart=0;tween=null;for(const m of meshes.values()){m.group.scale.setScalar(1);m.group.position.y=m.item.elevation;}request();}},
    exportPNG(r){
      // A frame without the selection ring, box or guides; optionally at a set pixel ratio (2 = a 2x image).
      marker.visible=false;guides.visible=false;ring.visible=false;
      const before=renderer.getPixelRatio(),resized=r&&r!==before,setRatio=v=>{renderer.setPixelRatio(v);renderer.setSize(width,height,false);};
      if(resized)setRatio(r);
      renderer.render(scene,camera);
      const out=document.createElement("canvas");out.width=canvas.width;out.height=canvas.height;const ctx=out.getContext("2d");ctx.drawImage(canvas,0,0);
      if(resized)setRatio(before);
      const fs=Math.max(14,out.width*.016);ctx.font="600 "+fs+"px system-ui";const text="dormscape.us · Room concept",tw=ctx.measureText(text).width;
      ctx.fillStyle="#fafaf8";ctx.fillRect(out.width-tw-fs*4.3,out.height-fs*3,tw+fs*3.8,fs*2.2);
      if(brandMark.complete&&brandMark.naturalWidth)ctx.drawImage(brandMark,out.width-tw-fs*3.9,out.height-fs*2.8,fs*1.8,fs*1.8);
      ctx.fillStyle="#2b4eff";ctx.fillText(text,out.width-tw-fs*1.3,out.height-fs*1.5);guides.visible=true;request();return out.toDataURL("image/png");
    },
    destroy(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener("visibilitychange",visible);
      for(const [name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("webglcontextlost",onContextLost);
      clearGuides();openingGhost.geometry.dispose();openingGhost.material.dispose();lineMat.dispose();marker.geometry.dispose();ring.geometry.dispose();ring.material.dispose();marker.material.dispose();
      for(const m of meshes.values())m.blob?.geometry.dispose();clearRoom();floorTextures.forEach(t=>t.dispose());
      for(const material of [blobMat,bandMat,groundMat,poolMat])material.dispose();kit.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  };
}
