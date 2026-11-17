import * as T from "./vendor/three.module.min.js";
import { createModelKit, footprint, libraryKey } from "./studio-models.js";

// Light presets (design-handoff/3d-studio/scene.js, retuned for the clay look). "evening" is golden hour.
// share: the part of the sky/ground fill the room's own light (its environment, renderRoomView) takes over once the room is still.
// Built to stay smooth on weak GPUs and phones: no shadow maps and no ambient-occlusion pass. A sky/ground
// fill tinted by the room, one sun and one window light do the work; each piece's corner shading and
// footprint shadow are baked once (the creases just after it appears); only glass, mirrors and metal see a
// tiny reflection map; night adds the plan's lamps. Changing the preset never rebuilds the room, and the night shaders are
// compiled ahead of time, so the switch is instant.
const LIGHT={
  day:    {win:[.93,.55],share:.5,sun:"#fff0dc",sunI:2.2,elev:36,az:200,hemiSky:"#f2f5ff",hemiGround:"#c2ad94",hemiI:1.5,exposure:.95,sky:"#cfe3f3",glass:.45,fill:"#e6efff",fillI:6,pool:"#fff4e2",poolA:.14,blob:.44,env:1},
  evening:{win:[.95,.38],share:.45,sun:"#ffab5e",sunI:2.7,elev:13,az:214,hemiSky:"#ffd9b3",hemiGround:"#9a7a5c",hemiI:1.1,exposure:1.0,sky:"#f6c68f",glass:.45,fill:"#ffcf9e",fillI:5,pool:"#ffb066",poolA:.2,blob:.46,env:.8},
  night:  {win:[1,0],share:.4,sun:"#9bb3ff",sunI:.3,elev:30,az:200,hemiSky:"#3a4468",hemiGround:"#211b16",hemiI:.5,exposure:1.08,sky:"#1b2440",glass:.95,fill:"#7d9cff",fillI:1.5,pool:"#9bb3ff",poolA:0,blob:.3,env:.3},
};
/** Each floor finish's base colour (its texture, and the light it bounces up). "concrete" is Tile in the UI. */
const FLOOR_TONE={oak:"#c99f6c",walnut:"#7a553a",concrete:"#d4cfcb",carpet:"#c4bcae"};
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

/** A piece's contact shadow: its footprint seen from above (see footprint), with the shared colour and strength. */
function shadowMesh(root,uniforms){
  const s=footprint(root);if(!s)return null;
  const tex=new T.DataTexture(s.data,s.nx,s.nz,T.RedFormat);tex.unpackAlignment=1;tex.magFilter=tex.minFilter=T.LinearFilter;tex.needsUpdate=true;
  const g=new T.BufferGeometry();
  g.setAttribute("position",new T.Float32BufferAttribute([s.x0,0,s.z0,s.x1,0,s.z0,s.x1,0,s.z1,s.x0,0,s.z1],3));
  g.setAttribute("uv",new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4,
    uniforms:{...uniforms,uMap:{value:tex}},
    vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform vec3 uColor;uniform float uOpacity;uniform sampler2D uMap;varying vec2 vUv;void main(){gl_FragColor=vec4(uColor,texture2D(uMap,vUv).r*uOpacity);\n#include <colorspace_fragment>\n}"});
  const mesh=new T.Mesh(g,material);mesh.raycast=()=>{};mesh.renderOrder=1;mesh.position.y=.012;mesh.userData={ownGeometry:true,shadow:true};return mesh;
}

export function createStudioScene(container, options) {
  const brandMark=new Image();brandMark.src="/brand/dormscape-mark.png?v=room-mark";
  const renderer=new T.WebGLRenderer({antialias:true,stencil:true,powerPreference:"high-performance"});
  // The pixel ratio starts at the screen's (capped). While the camera or a piece moves slowly it steps down, so weak GPUs stay
  // smooth; when everything stops, the still frame goes back to the full ratio.
  const full=Math.min(devicePixelRatio||1,LOW?1.5:1.75);let ratio=full,sharpen=0;
  const useRatio=v=>{if(renderer.getPixelRatio()!==v){renderer.setPixelRatio(v);renderer.setSize(width,height,false);sizePost();}};
  renderer.setPixelRatio(ratio);renderer.setClearColor(PAPER);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=LIGHT.day.exposure;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute("aria-label","3D room. Drag empty space to orbit. Drag a piece to move it; hold Shift to lift it. Select an item in Arrange for keyboard editing.");
  canvas.style.cssText="display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px";container.appendChild(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.2,400),kit=createModelKit({renderer,onTexture:()=>{mirrorDirty=true;request();},lite:LOW,
    // A library model just arrived: rebuild the pieces of that kind that were standing in as clay.
    onModel:name=>{if(disposed||!data)return;let stale=false;for(const m of meshes.values())if(libraryKey(m.item)===name){m.key="";stale=true;}if(stale){invalidateBake();sync(data);}}});
  // A sky/ground fill, the sun, and a fill at the window (moonlight at night).
  const hemi=new T.HemisphereLight(LIGHT.day.hemiSky,LIGHT.day.hemiGround,LIGHT.day.hemiI);scene.add(hemi);
  const sun=new T.DirectionalLight(LIGHT.day.sun,LIGHT.day.sunI);scene.add(sun,sun.target);
  const fill=new T.PointLight(LIGHT.day.fill,LIGHT.day.fillI,14,1.3);scene.add(fill);
  // The plan's lamps at night: always LAMPS lights (unused ones at zero), shown only at night, so day pays for none of them.
  const lampRoot=new T.Group(),lamps=Array.from({length:LAMPS},()=>{const p=new T.PointLight("#ffffff",0,10,1.4);lampRoot.add(p);return p;});lampRoot.visible=false;scene.add(lampRoot);
  // Every piece's shadow shares these, so the light preset sets them all at once.
  const shadowUniforms={uColor:{value:new T.Color("#2a1d12")},uOpacity:{value:LIGHT.day.blob}};
  const bandMat=patchMaterial("#2a1d12",.26),groundMat=patchMaterial("#2a1d12",.16),poolMat=patchMaterial(LIGHT.day.pool,LIGHT.day.poolA,true);
  const roomRoot=new T.Group(),itemRoot=new T.Group(),groundRoot=new T.Group();scene.add(roomRoot,itemRoot);roomRoot.add(groundRoot);
  const meshes=new Map(),wallGroups=[],openingGroups=[],openingNodes=new Map(),floorTextures=new Map();
  let mirrorDirty=true,mirrorAt=-1e9;
  let roomKey="",lightKey="",nightKey="",data=null,disposed=false,raf=0,assemblyStart=0,ready=false,light=LIGHT.day,firstWindow=null,glassMat=null,pool=null,envMap=null;
  const tint=new T.Color();
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
  let lastFrame=0,slow=0,chained=false,creaseTimer=0;

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
    // A door or window shows with its wall (no frames floating over a cut-away wall), or always while openings are being edited.
    for(const opening of openingGroups)opening.visible=walls!=="hidden"&&(opening.userData.wall.visible||Boolean(data?.editOpenings));
    for(const v of views)v.mesh.visible=v.wall.visible;
    // Pieces hung on a wall (art, mirrors, curtains, string lights) go with it in the cutaway, like its door and windows.
    for(const m of meshes.values())if(m.wall)m.group.visible=m.wall.visible;
    groundRoot.visible=mode!=="inside";
  }
  /** The wall a hung piece is on: the nearest wall whose length spans the piece's centre (null if none is close). */
  function wallOf(f){
    const cx=f.x_ft+f.footW/2,cz=f.y_ft+f.footD/2;let best=null,gap=1.2;
    for(const wall of wallGroups){const {a,len,dx,dz,normal}=wall.userData,t=(cx-a.x)*dx+(cz-a.y)*dz;if(t<-.5||t>len+.5)continue;
      const g=Math.abs((cx-a.x)*normal.x+(cz-a.y)*normal.y);if(g<gap){gap=g;best=wall;}}
    return best;
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
    // Adaptive resolution: back-to-back frames slower than ~30 fps (orbiting, walking, dragging) step the moving ratio down, never below 1.
    const dt=time-lastFrame;lastFrame=time;
    if(!assemblyStart&&(chained||pointers.size)&&dt>0&&dt<150){
      if(dt>34){if(++slow>=10&&ratio>1){ratio=Math.max(1,ratio-.25);slow=0;}}
      else slow=Math.max(0,slow-1);
    }
    chained=more;
    // Moving draws at that ratio; once everything is still, one sharp frame at the full ratio.
    clearTimeout(sharpen);
    if(more||pointers.size)useRatio(ratio);
    else if(renderer.getPixelRatio()<full)sharpen=setTimeout(()=>{if(!disposed&&!pointers.size){useRatio(full);request();}},180);
    // A piece being dragged: its old shadow is baked in, so the footprint shadows stand in until it's dropped.
    if(drag?.id&&drag.moved&&!bake.dirty)invalidateBake();
    if(!bake.ready&&!assemblyStart&&!tween&&!drag?.moved&&!pointers.size){seatRiders();if(bakeStep()||mirrorDirty)more=true;}
    // The room view (mirrors, the room's light), at most twice a second while textures and models are still arriving.
    else if(mirrorDirty&&bake.ready&&!assemblyStart&&!drag?.moved&&!pointers.size){if(time-mirrorAt>500){mirrorAt=time;seatRiders();cameraUpdate();renderRoomView();}else more=true;}
    renderer.setClearColor(mode==="inside"?ceiling:paper);
    seatRiders();cameraUpdate();camera.updateMatrixWorld();showSelection();
    if(walker&&mode==="inside")walker.setAttribute("transform","translate("+eye.x.toFixed(2)+" "+eye.z.toFixed(2)+") rotate("+(angle*180/Math.PI).toFixed(1)+")");
    const still=post&&!more&&!pointers.size&&!drag?.moved&&!tween&&!assemblyStart&&bake.ready&&!mirrorDirty&&renderer.getPixelRatio()===full;
    if(still){aoFade=options.reduced?1:Math.min(1,aoFade+.25);post.gtao.blendIntensity=aoFade*AO_STRENGTH;post.composer.render();if(aoFade<1)more=true;}
    else{aoFade=0;renderer.render(scene,camera);}
    // Settled: baked, room view current and (on desktop) the AO faded in. Marked on the canvas for tests and screenshots.
    const settled=bake.ready&&!mirrorDirty&&!more&&!pointers.size&&!kit.loading()&&(LOW||(still&&aoFade>=1));if(canvas.dataset.settled!==(settled?"1":""))canvas.dataset.settled=settled?"1":"";
    if(!ready&&data&&width>1&&height>1){ready=true;options.onReady?.();setTimeout(prewarm,0);setTimeout(loadPost,1500);}
    if(more)request();
  }
  /** Compile the other light set's shaders in the background, so switching Day / Night never stalls on a compile. */
  function prewarm(){
    if(disposed)return;const was=lampRoot.visible;lampRoot.visible=!was;
    try{renderer.compileAsync(scene,camera).catch(()=>{});}catch{}finally{lampRoot.visible=was;}
  }
  function clearRoom(){
    for(const g of roomRoot.children)g.traverse(o=>{if(o.userData.ownGeometry)o.geometry?.dispose();if(o.userData.ownMaterial){for(const material of Array.isArray(o.material)?o.material:[o.material])material?.dispose();}});
    roomRoot.clear();groundRoot.clear();roomRoot.add(groundRoot);wallGroups.length=0;views.length=0;openingGroups.length=0;openingNodes.clear();pool=null;glassMat=null;firstWindow=null;
    envMap?.dispose();envMap=null;
  }
  /**
   * What glass, mirrors and metal reflect: the room squeezed into a 64 × 32 panorama (light ceiling, a bright window,
   * the walls, the floor). Tiny on purpose; three blurs it once for rough surfaces.
   */
  function envTexture(wall,floor){
    const c=document.createElement("canvas");c.width=64;c.height=32;const g=c.getContext("2d"),grad=g.createLinearGradient(0,0,0,32);
    grad.addColorStop(0,mixHex(wall,"#ffffff",.8));grad.addColorStop(.45,mixHex(wall,"#ffffff",.3));grad.addColorStop(.52,shade(wall,.8));
    grad.addColorStop(.56,shade(floor,.95));grad.addColorStop(1,shade(floor,.6));
    g.fillStyle=grad;g.fillRect(0,0,64,32);g.fillStyle="rgba(255,255,255,.9)";g.fillRect(12,7,10,8);
    const t=new T.CanvasTexture(c);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;return t;
  }
  // ---------- floors: oak and walnut planks, a speckled tile, soft carpet (drawn once per finish) ----------
  function floorTexture(finish){
    if(floorTextures.has(finish))return floorTextures.get(finish);
    const n=LOW?512:1024,c=document.createElement("canvas");c.width=c.height=n;const g=c.getContext("2d");
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    if(finish==="oak"||finish==="walnut"){
      const base=new T.Color(FLOOR_TONE[finish]),rows=8,ph=n/rows,ink=finish==="oak"?"70,40,15":"30,16,6";
      for(let r=0;r<rows;r++){let x=-rnd()*n*.5;
        while(x<n){const len=n*(.35+rnd()*.4),shade=.9+rnd()*.16;g.fillStyle="#"+base.clone().multiplyScalar(shade).getHexString();g.fillRect(x,r*ph,len,ph);
          g.strokeStyle=`rgba(${ink},.10)`;g.lineWidth=1;
          for(let k=0;k<7;k++){g.beginPath();const y=r*ph+rnd()*ph;g.moveTo(x,y);g.bezierCurveTo(x+len*.3,y+3,x+len*.6,y-3,x+len,y+1);g.stroke();}
          g.fillStyle=`rgba(${ink},.35)`;g.fillRect(x,r*ph,2,ph);x+=len;}
        g.fillStyle=`rgba(${ink},.30)`;g.fillRect(0,r*ph,n,2);}
    }else if(finish==="concrete"){
      // "Tile" in the UI: speckled vinyl tiles like the reference.
      g.fillStyle=FLOOR_TONE.concrete;g.fillRect(0,0,n,n);
      for(let i=0;i<(LOW?15000:60000);i++){const v=rnd(),r=1+rnd()*1.6;g.fillStyle=v>.55?"rgba(255,255,255,.22)":"rgba(80,70,65,.16)";g.fillRect(rnd()*n,rnd()*n,r,r);}
      g.strokeStyle="rgba(110,100,95,.13)";g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*n/4,0);g.lineTo(i*n/4,n);g.stroke();g.beginPath();g.moveTo(0,i*n/4);g.lineTo(n,i*n/4);g.stroke();}
    }else{
      // Carpet: a soft, fine pile.
      g.fillStyle=FLOOR_TONE.carpet;g.fillRect(0,0,n,n);
      for(let i=0;i<(LOW?20000:80000);i++){const v=rnd();g.fillStyle=v>.5?"rgba(255,255,255,.07)":"rgba(70,60,50,.07)";g.fillRect(rnd()*n,rnd()*n,1.4,1.4);}
    }
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(LOW?4:8,renderer.capabilities.getMaxAnisotropy());
    tex.repeat.set(1/6,1/6); // one tile per 6 ft (the floor's UVs are in feet)
    floorTextures.set(finish,tex);return tex;
  }
  // ---------- real surfaces: photographed floors and plaster (public/experience/textures) ----------
  // Each floor's photo spans this many feet. Until it loads the drawn floor stands in, so the room never waits on it.
  const FLOOR_PHOTO={oak:["floor-oak",6.5],walnut:["floor-walnut",6],concrete:["floor-tile",4],carpet:["floor-carpet",3]};
  // The outdoor view behind each window, one photo per light preset.
  // It's drawn only where a window pane is (the panes mark the stencil), so it never shows past the wall round its window.
  const views=[],viewMat=new T.MeshBasicMaterial({color:"#ffffff",transparent:true,stencilWrite:true,stencilRef:1,stencilFunc:T.EqualStencilFunc,
    stencilFail:T.KeepStencilOp,stencilZFail:T.KeepStencilOp,stencilZPass:T.KeepStencilOp});
  const surfaces=new Map(),flatNormal=new T.DataTexture(new Uint8Array([128,128,255,255]),1,1);flatNormal.needsUpdate=true;
  function surface(name,feet,srgb,onLoad){
    const key=name+"|"+feet;if(surfaces.has(key)){const t=surfaces.get(key);if(t.image)onLoad?.(t);else t.userData.waiting.push(onLoad);return t;}
    // KTX2 on desktop, WebP on phones (the kit's loadTexture).
    const t=kit.loadTexture(name,srgb,tex=>{for(const f of tex.userData.waiting)f?.(tex);tex.userData.waiting=[];mirrorDirty=true;request();});
    t.userData.waiting=[onLoad];t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1/feet,1/feet);
    t.anisotropy=Math.min(LOW?4:8,renderer.capabilities.getMaxAnisotropy());surfaces.set(key,t);return t;
  }
  // ---------- baked floor shadows ----------
  // Once the room is still, the pieces' soft shadows are rendered into a floor-sized map from many light directions
  // (half spread over the sky, half from the first window), a few per frame, and the floor multiplies by the result.
  // It costs nothing while you look around; while anything changes (a drag, an edit) it fades out until the next bake
  // finishes, and each piece's own footprint shadow keeps it grounded throughout. No shadow maps run in the normal frame.
  // The walls are baked too (into an atlas, one strip per wall): the pieces' shadows on them, the soft dark where they meet the
  // floor and each other, and the light that comes in through the window. For that window light the walls themselves cast
  // shadows (WALL_LAYER), so it falls only where the opening lets it: a pool on the floor, a patch on the far wall.
  const BAKE_LAYER=3,WALL_LAYER=4,BAKE_N=LOW?24:64,BAKE_STEP=LOW?6:8,BAKE_RES=LOW?512:1024,WALL_W=LOW?512:1024,WALL_H=LOW?128:256;
  const wallBakeTarget=new T.WebGLRenderTarget(WALL_W,WALL_H,{type:T.HalfFloatType,depthBuffer:false});
  const bakeTarget=new T.WebGLRenderTarget(BAKE_RES,BAKE_RES,{type:T.HalfFloatType,depthBuffer:false});
  const depthTarget=new T.WebGLRenderTarget(BAKE_RES,BAKE_RES);
  const depthMat=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});
  const lightCam=new T.OrthographicCamera(-1,1,1,-1,.1,200);lightCam.layers.set(BAKE_LAYER);lightCam.up.set(0,0,1); // never parallel to a light direction (all point up)
  // uWin: how strongly the window light shows (none at night); its base is the brightness where it doesn't reach.
  const bakeUniforms={uBake:{value:bakeTarget.texture},uBakeBounds:{value:new T.Vector4(0,0,1,1)},uBakeOn:{value:0},uWallBake:{value:wallBakeTarget.texture},uWin:{value:new T.Vector2(1,0)}};
  // Plain sums (one + one): every channel, alpha included, is a running total.
  const accumMat=new T.ShaderMaterial({blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneFactor,depthTest:false,depthWrite:false,
    uniforms:{uDepth:{value:depthTarget.texture},uLightVP:{value:new T.Matrix4()},uBounds:{value:new T.Vector4()},uWeight:{value:0},uTexel:{value:1/BAKE_RES},uMask:{value:new T.Vector4(1,0,0,0)}},
    vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader:`#include <packing>
      uniform sampler2D uDepth;uniform mat4 uLightVP;uniform vec4 uBounds,uMask;uniform float uWeight,uTexel;varying vec2 vUv;
      void main(){
        vec4 c=uLightVP*vec4(uBounds.x+vUv.x/uBounds.z,.02,uBounds.y+vUv.y/uBounds.w,1.);vec3 p=c.xyz/c.w*.5+.5;float lit=0.;
        for(int i=0;i<9;i++){vec2 o=vec2(float(i-i/3*3)-1.,float(i/3)-1.)*1.5*uTexel;lit+=p.z-.0015>unpackRGBAToDepth(texture2D(uDepth,p.xy+o))?0.:1./9.;}
        gl_FragColor=lit*uWeight*uMask;}`});
  // The walls' atlas: each wall's inner face drawn flat into its strip (wallAtlasGeometry), carrying where it is in the room.
  // A light pass adds lit × weight to r (g for window light) and the weight to a, so r/a is the share of the light reaching it;
  // the first pass writes the corner shading to b.
  const wallAccumMat=new T.ShaderMaterial({blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneFactor,depthTest:false,depthWrite:false,
    uniforms:{uDepth:{value:depthTarget.texture},uLightVP:{value:new T.Matrix4()},uDir:{value:new T.Vector3()},uWeight:{value:0},uTexel:{value:1/BAKE_RES},uMode:{value:0},uWindow:{value:0}},
    vertexShader:`attribute vec3 aWorld,aNormal;attribute vec4 aShell;varying vec3 vWorld,vNormal;varying vec4 vShell;
      void main(){vWorld=aWorld;vNormal=aNormal;vShell=aShell;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`#include <packing>
      uniform sampler2D uDepth;uniform mat4 uLightVP;uniform vec3 uDir;uniform float uWeight,uTexel,uMode,uWindow;varying vec3 vWorld,vNormal;varying vec4 vShell;
      void main(){
        if(uMode>.5){
          // Soft dark low on the wall (where it meets the floor) and into the inside corners.
          float ao=(1.-.3*exp(-vWorld.y/.8))*(1.-.26*vShell.z*exp(-vShell.x/.9))*(1.-.26*vShell.w*exp(-vShell.y/.9));
          gl_FragColor=vec4(0.,0.,ao,0.);return;}
        float w=max(dot(uDir,vNormal),0.);if(w<=0.){gl_FragColor=vec4(0.);return;}
        // A little way into the room, so a wall never shades itself when the walls cast shadows.
        vec4 c=uLightVP*vec4(vWorld+vNormal*.12,1.);vec3 p=c.xyz/c.w*.5+.5;float lit=0.;
        for(int i=0;i<9;i++){vec2 o=vec2(float(i-i/3*3)-1.,float(i/3)-1.)*1.5*uTexel;lit+=p.z-.0025>unpackRGBAToDepth(texture2D(uDepth,p.xy+o))?0.:1./9.;}
        gl_FragColor=uWindow>.5?vec4(0.,lit*w*uWeight,0.,0.):vec4(lit*w*uWeight,0.,0.,w*uWeight);}`});
  const wallAtlas=new T.Mesh(new T.BufferGeometry(),wallAccumMat);wallAtlas.frustumCulled=false;
  const wallBakeScene=new T.Scene();wallBakeScene.add(wallAtlas);
  const bakeQuad=new T.Mesh(new T.PlaneGeometry(2,2),accumMat);bakeQuad.frustumCulled=false;
  const bakeScene=new T.Scene();bakeScene.add(bakeQuad);const bakeCam=new T.Camera();
  // done: samples taken; ready: the map is current and shown.
  const bake={done:0,ready:false,dirty:true,dirs:[]};
  /** The floor material multiplies its lit colour by the bake (in world x/z), faded in by uBakeOn. */
  function bakeFloor(m){
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,bakeUniforms);
      sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform vec4 uBakeBounds;varying vec2 vBake;")
        .replace("#include <project_vertex>","#include <project_vertex>\nvec4 bakeWorld=modelMatrix*vec4(transformed,1.);vBake=(bakeWorld.xz-uBakeBounds.xy)*uBakeBounds.zw;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform sampler2D uBake;uniform float uBakeOn;varying vec2 vBake;")
        .replace("#include <common>","#include <common>\nuniform vec2 uWin;")
        .replace("#include <opaque_fragment>",`vec4 baked=texture2D(uBake,vBake);
          outgoingLight*=mix(1.,pow(baked.r,2.4)*(uWin.x+uWin.y*baked.g),uBakeOn);
          #include <opaque_fragment>`);};
    m.customProgramCacheKey=()=>"dm-baked-floor";
  }
  /** The walls' material reads its strip of the atlas (the bakeUv attribute; negative on faces that aren't a wall's inside). */
  function bakeWall(m){
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,bakeUniforms);
      sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nattribute vec2 bakeUv;varying vec2 vWallBake;")
        .replace("#include <project_vertex>","#include <project_vertex>\nvWallBake=bakeUv;");
      sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform sampler2D uWallBake;uniform float uBakeOn;uniform vec2 uWin;varying vec2 vWallBake;")
        .replace("#include <opaque_fragment>",`if(vWallBake.x>=0.){vec4 b=texture2D(uWallBake,vWallBake);float wsum=max(b.a,1e-4),lit=b.r/wsum,win=clamp(2.*b.g/wsum,0.,1.);
            outgoingLight*=mix(1.,pow(lit,1.6)*b.b*(uWin.x+uWin.y*win),uBakeOn);}
          #include <opaque_fragment>`);};
    m.customProgramCacheKey=()=>"dm-baked-wall";
  }
  /**
   * The walls flattened into the atlas: per wall a quad over its strip (clip space), with the world position of its inner face,
   * the normal into the room, and for the corner shading the distance from each end and whether that end is an inside corner.
   */
  let wallStrips=[];
  function wallAtlasGeometry(){
    const pos=[],world=[],normal=[],shell=[],idx=[],h=data.settings.ceilingFt;
    for(const s of wallStrips){
      const {a,len,dx,dz,n,u0,u1,cs,ce}=s,base=pos.length/3,x0=u0*2-1,x1=u1*2-1;
      for(const [x,t,y] of [[x0,0,0],[x1,len,0],[x1,len,h],[x0,0,h]]){
        pos.push(x,y/h*2-1,0);world.push(a.x+dx*t,y,a.y+dz*t);normal.push(-n.x,0,-n.y);shell.push(t,len-t,cs,ce);}
      idx.push(base,base+1,base+2,base,base+2,base+3);
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("aWorld",new T.Float32BufferAttribute(world,3));
    g.setAttribute("aNormal",new T.Float32BufferAttribute(normal,3));g.setAttribute("aShell",new T.Float32BufferAttribute(shell,4));g.setIndex(idx);return g;
  }
  /** The light directions: a stratified cosine spread over the sky, and a cone around the light from the first window. */
  function bakeDirections(){
    const dirs=[],win=firstWindow,half=win?BAKE_N/2:0,golden=Math.PI*(3-Math.sqrt(5));
    // Sky light no lower than 45° and window light from 41° to 55° within ±13°: short, soft shadows that pool under things (not long
    // streaks), and a window pool with a soft but readable edge.
    for(let i=0;i<BAKE_N-half;i++){const u=(i+.5)/(BAKE_N-half),r=Math.sqrt(u*.5),a=i*golden;dirs.push(new T.Vector3(r*Math.cos(a),Math.sqrt(1-r*r),r*Math.sin(a)));}
    for(let i=0;i<half;i++){const u=(i+.5)/half,a=i*golden,el=T.MathUtils.degToRad(48+7*Math.sqrt(u)*Math.cos(a)),spread=T.MathUtils.degToRad(13)*Math.sqrt(u)*Math.sin(a);
      const h=Math.atan2(win.n.y,win.n.x)+spread;dirs.push(new T.Vector3(Math.cos(el)*Math.cos(h),Math.sin(el),Math.cos(el)*Math.sin(h)));}
    return dirs;
  }
  // ---------- the room's own light: one view of the room from its middle ----------
  // Once the room is still, it's rendered into a cube from its middle (every wall up, whatever the cutaway hides). Mirrors show
  // that view, box-projected onto the room's bounds. Pre-filtered (PMREM), it is also every surface's environment: it takes over
  // part of the flat sky/ground fill (the preset's `share`), so the light bouncing round the room keeps its colour and direction
  // (warm under a bed from an oak floor, brighter on the side facing the window), and metal, glass and gloss reflect the room
  // itself. Its strength is measured on the GPU (measureCube) and matched to the fill it replaces, so the room's overall
  // brightness never jumps; until the first view, the old drawn gradient stands in at the same size (no shader recompiles).
  const ENV_SIZE=LOW?128:256;
  const mirrorTarget=new T.WebGLCubeRenderTarget(ENV_SIZE,{type:T.HalfFloatType}),mirrorCam=new T.CubeCamera(.3,200,mirrorTarget);
  const pmrem=new T.PMREMGenerator(renderer);let roomEnv=null,seedMean=.3,roomMean=.3; // means until measured
  // A cube's mean luminance, packed into one RGBA8 pixel (half-float readback isn't reliable everywhere).
  const measureTarget=new T.WebGLRenderTarget(1,1),measureMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uCube:{value:null}},
    vertexShader:"void main(){gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader:`uniform samplerCube uCube;
      void main(){vec3 s=vec3(0.);for(int i=0;i<192;i++){float y=1.-2.*(float(i)+.5)/192.,r=sqrt(1.-y*y),a=float(i)*2.39996323;s+=textureCube(uCube,vec3(cos(a)*r,y,sin(a)*r)).rgb;}
        float l=clamp(dot(s/192.,vec3(.2126,.7152,.0722))/16.,0.,.9999);vec4 e=fract(l*vec4(1.,255.,65025.,16581375.));e-=e.yzww*vec4(1./255.,1./255.,1./255.,0.);gl_FragColor=e;}`});
  const measureScene=new T.Scene();{const q=new T.Mesh(new T.PlaneGeometry(2,2),measureMat);q.frustumCulled=false;measureScene.add(q);}
  const measurePixel=new Uint8Array(4);
  // Read back asynchronously (no GPU stall); the strengths follow a frame or two later.
  async function measureCube(texture){
    measureMat.uniforms.uCube.value=texture;const was=renderer.getRenderTarget();renderer.setRenderTarget(measureTarget);renderer.render(measureScene,bakeCam);renderer.setRenderTarget(was);
    try{await renderer.readRenderTargetPixelsAsync(measureTarget,0,0,1,1,measurePixel);}catch{renderer.readRenderTargetPixels(measureTarget,0,0,1,1,measurePixel);}
    return 16*(measurePixel[0]/255+measurePixel[1]/65025+measurePixel[2]/16581375+measurePixel[3]/4228250625);
  }
  /** Pre-filters a cube into the room's environment and sets every strength from its measured brightness. */
  let measuring=0;
  function useEnvCube(texture,seed){
    roomEnv=pmrem.fromCubemap(texture,roomEnv);scene.environment=roomEnv.texture;if(glassMat)glassMat.envMap=roomEnv.texture;
    const job=++measuring;
    measureCube(texture).then(m=>{if(disposed||job!==measuring)return;const mean=Math.max(1e-4,m);if(seed)seedMean=mean;roomMean=mean;applyEnvStrength();request();});
    applyEnvStrength();
  }
  function applyEnvStrength(){kit.setEnv(roomEnv.texture,light.env*reflectScale());if(glassMat)glassMat.envMapIntensity=1.4*reflectScale();balanceFill();}
  // Reflections keep the strength the drawn gradient had; the diffuse part matches the share of the fill it replaces.
  const reflectScale=()=>T.MathUtils.clamp(seedMean/Math.max(1e-4,roomMean),.5,4);
  function balanceFill(){
    const L=light,share=L.share??0,lum=c=>.2126*c.r+.7152*c.g+.0722*c.b;
    hemi.intensity=L.hemiI*(1-share);
    // The fill's light on an average surface is its mean colour × intensity / π; the environment's is its mean radiance × intensity.
    // (× .78: walls see the bright floor and the walls opposite more than the flat fill's average, measured on the test rooms.)
    scene.environmentIntensity=.78*share*L.hemiI*(lum(hemi.color)+lum(hemi.groundColor))/2/Math.PI/Math.max(1e-4,roomMean);
  }
  /** Seeds the environment from the drawn gradient, rendered into a cube the size of the room view's. */
  function seedEnv(gradient){
    const seed=new T.WebGLCubeRenderTarget(ENV_SIZE);seed.fromEquirectangularTexture(renderer,gradient);useEnvCube(seed.texture,true);seed.dispose();
  }
  /** Renders the room view (mirrors, environment): every wall and opening shown, the mirrors and the editing marks hidden. */
  function renderRoomView(){
    mirrorDirty=false;if(!data)return;
    const p=data.outline?.points?.length?data.outline.points:[{x:0,y:0},{x:data.room.lengthFt,y:data.room.widthFt}],h=data.settings.ceilingFt;
    const min=new T.Vector3(Math.min(...p.map(q=>q.x)),0,Math.min(...p.map(q=>q.y))),max=new T.Vector3(Math.max(...p.map(q=>q.x)),h,Math.max(...p.map(q=>q.y)));
    const hidden=[...wallGroups,...openingGroups,...views.map(v=>v.mesh),...[...meshes.values()].filter(m=>m.wall).map(m=>m.group)].filter(o=>!o.visible),extras=[ring,marker,guides,openingGhost].filter(o=>o.visible);
    for(const o of hidden)o.visible=true;for(const o of extras)o.visible=false;
    // The open top stands in for a ceiling, lit only by what bounces up to it (about half what the walls get).
    const clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();renderer.setClearColor(ceiling.clone().multiplyScalar(.45),1);
    kit.showMirrors(false);mirrorCam.position.set((min.x+max.x)/2,Math.min(4.6,h*.55),(min.z+max.z)/2);mirrorCam.update(renderer,scene);kit.showMirrors(true);
    renderer.setClearColor(clear,alpha);for(const o of hidden)o.visible=false;for(const o of extras)o.visible=true;
    kit.setMirrorView(mirrorTarget.texture,mirrorCam.position,min,max);
    useEnvCube(mirrorTarget.texture,false);
  }
  // ---------- ambient occlusion, only while the room is still (desktop) ----------
  // Screen-space AO (three's GTAO) darkens the creases every piece has with its neighbours: where a duvet meets a pillow, under
  // a desk's top, between a chair's slats. It costs a few milliseconds a frame, so it's drawn only on still frames (after the
  // bake and the room view are done) and fades in over four; any movement drops back to the plain render at once. Phones and
  // low-power devices never load it. The window views, glass, the floor's soft patches and the selection ring are left out of
  // its depth/normal pass (they'd ring the room with false shading); the colour pass keeps them, stencil included.
  const AO_STRENGTH=.85;let post=null,postLoading=false,aoFade=0;
  function loadPost(){
    if(LOW||postLoading||disposed)return;postLoading=true;
    import("./vendor/post.min.js").then(m=>{
      if(disposed)return;
      const size=renderer.getDrawingBufferSize(new T.Vector2());
      const target=new T.WebGLRenderTarget(size.x,size.y,{type:T.HalfFloatType,samples:4,stencilBuffer:true});
      const composer=new m.EffectComposer(renderer,target);composer.addPass(new m.RenderPass(scene,camera));
      const gtao=new m.GTAOPass(scene,camera,width,height,undefined,
        {radius:1.1,distanceExponent:1.5,thickness:1.4,scale:1.15,samples:16,distanceFallOff:1,screenSpaceRadius:false},
        {lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,radiusExponent:1,rings:2,samples:16});
      gtao.blendIntensity=0;
      const render=gtao.render.bind(gtao);gtao.render=(...args)=>{const hidden=aoHide();try{render(...args);}finally{for(const o of hidden)o.visible=true;}};
      composer.addPass(gtao);composer.addPass(new m.OutputPass());
      post={composer,gtao,target};sizePost();request();
    }).catch(()=>{postLoading=false;});
  }
  function sizePost(){if(post){post.composer.setPixelRatio(renderer.getPixelRatio());post.composer.setSize(width,height);}}
  function aoHide(){
    const hidden=[];
    scene.traverse(o=>{if(!o.visible||!o.isMesh)return;if(o===ring||[o.material].flat().some(x=>x.transparent||x===viewMat)){o.visible=false;hidden.push(o);}});
    return hidden;
  }
  /** Something changed: the bake fades out (the pieces' own contact shadows stay) until a fresh one finishes. */
  function invalidateBake(){bake.dirty=true;bake.ready=false;bakeUniforms.uBakeOn.value=0;mirrorDirty=true;showPool();}
  /** The drawn pool of window light stands in only while there's no bake (the bake has the real one). */
  function showPool(){if(pool)pool.visible=light.poolA>0&&!(bake.ready&&firstWindow);}
  /** A few more bake samples; returns true while there's more to do. */
  function bakeStep(){
    if(!data||disposed)return false;
    const r=data.room,pad=1,x0=-pad,z0=-pad,lx=r.lengthFt+2*pad,lz=r.widthFt+2*pad;
    if(bake.dirty){bake.dirty=false;bake.done=0;bake.dirs=bakeDirections();bake.sky=firstWindow?BAKE_N-BAKE_N/2:BAKE_N;bakeUniforms.uWin.value.set(...(firstWindow?light.win:[1,0]));
      bakeUniforms.uBakeBounds.value.set(x0,z0,1/lx,1/lz);accumMat.uniforms.uBounds.value.set(x0,z0,1/lx,1/lz);
      const was=renderer.getRenderTarget(),auto0=renderer.autoClear;renderer.setRenderTarget(bakeTarget);renderer.setClearColor(0x000000,0);renderer.clear(true,false,false);
      // The walls' atlas: cleared, then the corner shading written once.
      wallAtlas.geometry.dispose();wallAtlas.geometry=wallAtlasGeometry();renderer.setRenderTarget(wallBakeTarget);renderer.clear(true,false,false);
      wallAccumMat.uniforms.uMode.value=1;renderer.autoClear=false;renderer.render(wallBakeScene,bakeCam);wallAccumMat.uniforms.uMode.value=0;renderer.autoClear=auto0;renderer.setRenderTarget(was);}
    const center=new T.Vector3(r.lengthFt/2,0,r.widthFt/2),extent=Math.hypot(lx,lz)/2+data.settings.ceilingFt;
    const clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),was=renderer.getRenderTarget(),override=scene.overrideMaterial,auto=renderer.autoClear;
    // Every wall stands while baking, whatever the cutaway hides from this camera (the bake can't depend on where you look from).
    const cut=wallGroups.filter(g=>!g.visible);for(const g of cut)g.visible=true;
    for(let k=0;k<BAKE_STEP&&bake.done<bake.dirs.length;k++,bake.done++){
      const d=bake.dirs[bake.done];
      lightCam.left=lightCam.bottom=-extent;lightCam.right=lightCam.top=extent;lightCam.near=.1;lightCam.far=extent*4;lightCam.updateProjectionMatrix();
      lightCam.position.copy(center).addScaledVector(d,extent*2);lightCam.lookAt(center);lightCam.updateMatrixWorld();
      // Window light is cast twice: once by the pieces alone (their shadows), once with the walls too (where the opening lets it in).
      const windowLight=bake.done>=bake.sky;
      for(const withWalls of windowLight?[false,true]:[false]){
        if(withWalls)lightCam.layers.enable(WALL_LAYER);else lightCam.layers.disable(WALL_LAYER);
        scene.overrideMaterial=depthMat;renderer.setClearColor(0xffffff,1);renderer.setRenderTarget(depthTarget);renderer.autoClear=true;renderer.render(scene,lightCam);
        const vp=new T.Matrix4().multiplyMatrices(lightCam.projectionMatrix,lightCam.matrixWorldInverse);
        accumMat.uniforms.uLightVP.value.copy(vp);wallAccumMat.uniforms.uLightVP.value.copy(vp);wallAccumMat.uniforms.uDir.value.copy(d);
        accumMat.uniforms.uWeight.value=withWalls?1/(bake.dirs.length-bake.sky):1/bake.dirs.length;accumMat.uniforms.uMask.value.set(withWalls?0:1,withWalls?1:0,0,0);
        wallAccumMat.uniforms.uWeight.value=1/bake.dirs.length;wallAccumMat.uniforms.uWindow.value=withWalls?1:0;
        renderer.autoClear=false;renderer.setRenderTarget(bakeTarget);renderer.render(bakeScene,bakeCam);
        renderer.setRenderTarget(wallBakeTarget);renderer.render(wallBakeScene,bakeCam);
      }
    }
    lightCam.layers.disable(WALL_LAYER);for(const g of cut)g.visible=false;
    scene.overrideMaterial=override;renderer.autoClear=auto;renderer.setRenderTarget(was);renderer.setClearColor(clear,alpha);
    if(bake.done>=bake.dirs.length){bake.ready=true;bakeUniforms.uBakeOn.value=data.settings.lighting==="night"?.7:1;showPool();return false;}
    return true;
  }
  /** Box UVs in feet (one unit per foot on every face), so a tiling texture keeps its scale on walls of any size. */
  function feetUV(g,w,h,d){
    const uv=g.attributes.uv,size=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
    for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*size[f][0],uv.getY(i)*size[f][1]);}
    uv.needsUpdate=true;return g;
  }
  const shade=(hex,k)=>"#"+new T.Color(hex).multiplyScalar(k).getHexString();
  const mixHex=(a,b,t)=>"#"+new T.Color(a).lerp(new T.Color(b),t).getHexString();
  /** A box with the lighter cap material on top (walls, cut at the dollhouse edge). */
  function capBox(parent,w,h,d,side,cap,x,y,z){
    const m=new T.Mesh(feetUV(new T.BoxGeometry(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d)),w,h,d),[side,side,cap,side,side,side]);
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
    // Walls: the paint colour over a plaster detail map (and its faint orange-peel normal map on desktop).
    const plaster=surface("wall-plaster",4,true),plasterN=LOW?null:surface("wall-plaster-n",4,false);
    const wallColor=settings.wallColor,wallMat=new T.MeshStandardMaterial({color:wallColor,roughness:.95,map:plaster,...(plasterN?{normalMap:plasterN,normalScale:new T.Vector2(.35,.35)}:{})}),capMat=new T.MeshStandardMaterial({color:shade(wallColor,.9),roughness:.95});
    const trim=new T.MeshStandardMaterial({color:mixHex(wallColor,"#ffffff",.6),roughness:.82}),baseMat=new T.MeshStandardMaterial({color:mixHex(wallColor,"#1f2233",.8),roughness:.82});
    const floorMat=new T.MeshStandardMaterial({map:floorTexture(settings.floor),roughness:settings.floor==="carpet"?1:settings.floor==="concrete"?.86:.78,normalMap:LOW?null:flatNormal});
    // The photographed floor replaces the drawn one when it arrives (same program: map and normal map are there from the start).
    const [photo,feet]=FLOOR_PHOTO[settings.floor]||FLOOR_PHOTO.carpet;
    surface(photo,feet,true,t=>{floorMat.map=t;});
    if(!LOW)surface(photo+"-n",feet,false,t=>{floorMat.normalMap=t;floorMat.normalScale.set(.6,.6);});
    bakeFloor(floorMat);bakeWall(wallMat);
    // Each wall's strip of the bake atlas (a few texels apart), and whether each end is an inside corner (shaded).
    {const lens=pts.map((a,i)=>{const b=pts[(i+1)%N];return Math.hypot(b.x-a.x,b.y-a.y);}),total=lens.reduce((x,y)=>x+y,0)||1,gap=4/WALL_W,span=1-gap*N;
      const inside=pts.map((_,i)=>{const n0=normals[i],n1=normals[(i+1)%N],turn=n0.x*n1.y-n0.y*n1.x;return (area>0?-turn:turn)<0?1:0;});
      let u=gap/2;wallStrips=pts.map((a,i)=>{const b=pts[(i+1)%N],len=lens[i]||1,w=span*lens[i]/total,strip={a,len,dx:(b.x-a.x)/len,dz:(b.y-a.y)/len,n:normals[i],u0:u,u1:u+w,cs:inside[(i-1+N)%N],ce:inside[i]};u+=w+gap;return strip;});}
    // The dollhouse plinth: one slab whose top is the floor, its sides in the wall cap colour.
    const slab=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:PLINTH,bevelEnabled:false}),[floorMat,capMat]);
    slab.name="room-floor";slab.rotation.x=-Math.PI/2;slab.position.y=-PLINTH;slab.userData={ownGeometry:true};roomRoot.add(slab);
    // A ceiling only the window-light bake sees (WALL_LAYER alone): without it, light from outside came in over the top of the
    // window's wall and lit the far wall. No camera that draws the room renders it.
    const lid=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({side:T.DoubleSide}));lid.rotation.x=-Math.PI/2;lid.position.y=h;
    lid.layers.set(WALL_LAYER);lid.name="bake-ceiling";lid.userData={ownGeometry:true,ownMaterial:true};roomRoot.add(lid);
    const owned=new T.Group();owned.userData.ownMaterial=true;owned.material=[wallMat,capMat,trim,baseMat,floorMat];roomRoot.add(owned);
    // Door knobs are the kit's satin metal, so they reflect the room like every other metal.
    const doorMat=kit.veneer(mixHex("#b98b5e",wallColor,.12)),knobMat=kit.mat("#c9c4bd",.35,false,.6),plateMat=kit.mat("#9d9b97",.4,false,.55);
    glassMat=new T.MeshStandardMaterial({color:"#ffffff",transparent:true,opacity:.12,roughness:.04,metalness:0,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.4,
      stencilWrite:true,stencilRef:1,stencilFunc:T.AlwaysStencilFunc,stencilZPass:T.ReplaceStencilOp});
    owned.material.push(glassMat);envMap=envTexture(wallColor,FLOOR_TONE[settings.floor]||FLOOR_TONE.carpet);seedEnv(envMap);
    pts.forEach((a,i)=>{
      const b=pts[(i+1)%N],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.01)return;const dx=(b.x-a.x)/len,dz=(b.y-a.y)/len;
      const group=new T.Group();group.position.set(a.x,0,a.y);group.rotation.y=-Math.atan2(dz,dx);roomRoot.add(group);
      group.userData.normal=normals[i];group.userData.mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};Object.assign(group.userData,{a,len,dx,dz});wallGroups.push(group);
      // Walls sit outside the floor, so pieces against them never clip. The end runs on past a convex corner (or stops short of a reflex one) so caps meet cleanly.
      const next=normals[(i+1)%N],turn=normals[i].x*next.y-normals[i].y*next.x,convex=(area>0?-turn:turn)<0,end=len+(convex?WALL_T:-WALL_T);
      const openings=outline.openings.filter(o=>o.edge===i).sort((a,b)=>a.offset_ft-b.offset_ft);
      let cursor=0;const zc=out*WALL_T/2;
      const segment=(start,stop,low,high)=>{if(stop-start<=.005||high-low<=.005)return;
        const m=capBox(group,stop-start,high-low,WALL_T,wallMat,capMat,(start+stop)/2,(low+high)/2,zc);m.layers.enable(WALL_LAYER);
        // The inside face reads its place in the wall's atlas strip; every other face is marked off (-1).
        const strip=wallStrips[i],g=m.geometry,pos=g.attributes.position,uv=new Float32Array(pos.count*2).fill(-1),face=out>0?5:4;
        for(let k=face*4;k<face*4+4;k++){uv[k*2]=strip.u0+(strip.u1-strip.u0)*T.MathUtils.clamp((pos.getX(k)+(start+stop)/2)/len,0,1);uv[k*2+1]=(pos.getY(k)+(low+high)/2)/h;}
        g.setAttribute("bakeUv",new T.BufferAttribute(uv,2));};
      // Soft shading where the wall meets the floor (it hides with its wall in the cutaway), and a soft shadow on the paper outside the plinth.
      const band=patch(len/2,0,.85,bandMat);band.position.set(len/2,.008,0);group.add(band);
      const outside=patch(len/2+WALL_T,0,1.4,groundMat);outside.position.set(a.x+dx*len/2+normals[i].x*WALL_T,-PLINTH-.01,a.y+dz*len/2+normals[i].y*WALL_T);outside.rotation.y=group.rotation.y;groundRoot.add(outside);
      for(const o of openings){
        // Separate groups let a door/window follow the pointer without rebuilding the room.
        const index=outline.openings.indexOf(o),fixtures=new T.Group();fixtures.name="opening-"+index;
        fixtures.position.copy(group.position);fixtures.rotation.copy(group.rotation);fixtures.userData.wall=group;
        roomRoot.add(fixtures);openingGroups.push(fixtures);openingNodes.set(index,fixtures);
        const left=Math.max(cursor,Math.min(len,o.offset_ft)),right=Math.max(left,Math.min(len,o.offset_ft+o.width_ft));segment(cursor,left,0,h);
        const center=(left+right)/2,span=right-left,depth=WALL_T+.06;
        if(o.kind==="window"){
          const low=Math.min(3,h*.4),high=Math.min(h-.5,6.5),oh=high-low;segment(left,right,0,low);segment(left,right,high,h);
          if(!firstWindow)firstWindow={x:a.x+dx*center,y:a.y+dz*center,n:normals[i],width:span,dx,dz,low,high};
          // A double-hung window: a lined opening, two sashes (the lower one nearer the room) meeting at a rail, clear glass
          // that reflects the room, painted casing round the inside, a sill and its apron, and the view outside.
          const fr=.12,mid=(low+high)/2+Math.min(.4,oh*.08),inner=-out*.03,deep=out*WALL_T*.35;
          for(const y of [low+fr/2,high-fr/2])kit.box(fixtures,span,fr,depth,trim,center,y,zc,.015);
          for(const x of [left+fr/2,right-fr/2])kit.box(fixtures,fr,oh,depth,trim,x,(low+high)/2,zc,.015);
          const sashes=[[mid,high-fr,deep],[low+fr,mid,deep-out*.12]],st=.11,sd=.1;
          for(const [y0,y1,z] of sashes){
            const sw=span-2*fr,sh=y1-y0;if(sw<.2||sh<.2)continue;
            for(const y of [y0+st/2,y1-st/2])kit.box(fixtures,sw,st,sd,trim,center,y,z,.02);
            for(const x of [center-sw/2+st/2,center+sw/2-st/2])kit.box(fixtures,st,sh,sd,trim,x,(y0+y1)/2,z,.02);
            const glass=new T.Mesh(new T.PlaneGeometry(Math.max(.05,sw-2*st),Math.max(.05,sh-2*st)),glassMat);glass.position.set(center,(y0+y1)/2,z);glass.name="window-pane";glass.renderOrder=1;glass.userData.ownGeometry=true;fixtures.add(glass);
          }
          const cw=.28;
          kit.box(fixtures,span+2*cw,cw,.06,trim,center,high+cw/2,inner,.02);
          for(const x of [left-cw/2,right+cw/2])kit.box(fixtures,cw,oh+cw,.06,trim,x,(low+high+cw)/2,inner,.02);
          kit.box(fixtures,span+.5,.1,.34,trim,center,low-.03,-out*.1,.03);
          kit.box(fixtures,span+2*cw-.1,cw*.8,.05,trim,center,low-.08-cw*.4,inner,.02);
          // The view: a photo some way outside, wide enough that it shifts a little as you move (shown only with its wall).
          const vw=Math.max(span+5,(oh+2.5)*16/9),vh=vw*9/16,view=new T.Mesh(new T.PlaneGeometry(vw,vh),viewMat);
          view.position.set(center,(low+high)/2+.4,out*(WALL_T+2.5));view.rotation.y=out>0?Math.PI:0;view.raycast=()=>{};view.renderOrder=2;view.userData.ownGeometry=true;
          fixtures.add(view);views.push({mesh:view,wall:group});
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
          // A solid-core veneer leaf, the usual dorm door: three butt hinges, a lever handle on a round rose each side, a metal
          // kick plate low on both faces and a peephole.
          const leafH=doorHeight-.05,latch=direction*(leafWidth-.28);
          const leaf=kit.box(hinge,leafWidth,leafH,.14,doorMat,direction*leafWidth/2,leafH/2,0,.02);leaf.name="door-leaf";
          for(const y of [.75,leafH/2+.3,leafH-.75])kit.cyl(hinge,.035,.035,.32,knobMat,0,y,0,10);
          for(const face of [-1,1]){
            kit.box(hinge,leafWidth-.16,.75,.012,plateMat,direction*leafWidth/2,.47,face*.076,.004);
            kit.cyl(hinge,.09,.09,.04,knobMat,latch,3.3,face*.09,18).rotation.x=Math.PI/2;
            kit.cyl(hinge,.03,.03,.14,knobMat,latch,3.3,face*.17,10).rotation.x=Math.PI/2;
            kit.box(hinge,.4,.06,.07,knobMat,latch-direction*.17,3.3,face*.23,.03);
            kit.cyl(hinge,.028,.028,.02,knobMat,direction*leafWidth/2,4.9,face*.075,12).rotation.x=Math.PI/2;
          }
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
    for(const c of outline.closets){const m=capBox(roomRoot,c.width_ft,h*.87,c.depth_ft,new T.MeshStandardMaterial({color:mixHex(wallColor,"#cbb28e",.45),roughness:.88}),capMat,c.x_ft+c.width_ft/2,h*.435,c.y_ft+c.depth_ft/2);m.userData.ownMaterial=true;}
    // Daylight falling in through the first window: a soft, warm pool on the floor (none at night).
    if(firstWindow){const win=firstWindow,depth=Math.max(1.5,Math.min(4.5,Math.min(room.lengthFt,room.widthFt)*.4));
      pool=patch(win.width/2*.9,depth/2,.7,poolMat);pool.position.set(win.x-win.n.x*(depth/2+.15),.011,win.y-win.n.y*(depth/2+.15));pool.rotation.y=-Math.atan2(win.dz,win.dx);roomRoot.add(pool);}
  }
  /** The light preset: sun through the first window (or the reference angle), fill at the window, sky, exposure. No rebuilds, no recompiles. */
  function applyLight(){
    const {room,settings}=data,l=room.lengthFt,w=room.widthFt,h=settings.ceilingFt,win=firstWindow,night=settings.lighting==="night";
    const L=light=LIGHT[settings.lighting]||LIGHT.day;
    renderer.toneMappingExposure=L.exposure;
    // The room colours its fill light: the floor finish tints the light bouncing up (oak warms it, tile cools it), the walls the light
    // from around. Only the hue moves; each preset keeps its brightness.
    const bounce=(color,tone,k)=>{tint.set(tone);const lum=c=>.2126*c.r+.7152*c.g+.0722*c.b;return color.lerp(tint.multiplyScalar(lum(color)/Math.max(1e-4,lum(tint))),k);};
    bounce(hemi.color.set(L.hemiSky),settings.wallColor,.12);bounce(hemi.groundColor.set(L.hemiGround),FLOOR_TONE[settings.floor]||FLOOR_TONE.carpet,.5);hemi.intensity=L.hemiI;
    mirrorDirty=true;
    const el=T.MathUtils.degToRad(L.elev),center=new T.Vector3(l/2,0,w/2);let dir;
    if(win){const a=Math.atan2(win.n.y,win.n.x)-T.MathUtils.degToRad(L.az-180);dir=new T.Vector3(Math.cos(el)*Math.cos(a),Math.sin(el),Math.cos(el)*Math.sin(a));}
    else{const az=T.MathUtils.degToRad(L.az);dir=new T.Vector3(Math.cos(el)*Math.cos(az),Math.sin(el),-Math.cos(el)*Math.sin(az));}
    sun.color.set(L.sun);sun.intensity=L.sunI;sun.position.copy(center).addScaledVector(dir,40);sun.target.position.copy(center);
    fill.color.set(L.fill);fill.intensity=L.fillI;lampRoot.visible=night;
    if(win)fill.position.set(win.x-win.n.x*1.2,Math.min(h-.6,5.6),win.y-win.n.y*1.2);else fill.position.set(l/2,Math.min(h-.6,5.6),w/2);
    if(glassMat){glassMat.opacity=night?.2:.12;glassMat.needsUpdate=true;}
    if(roomEnv)applyEnvStrength();
    const preset=night?"night":settings.lighting==="evening"?"evening":"day";
    viewMat.map=surface("view-"+preset,1,true);viewMat.map.repeat.set(1,1);viewMat.color.set(night?"#c8ccd8":"#ffffff");viewMat.needsUpdate=true;
    shadowUniforms.uOpacity.value=L.blob;bandMat.uniforms.uOpacity.value=night?.2:.26;
    poolMat.uniforms.uColor.value.set(L.pool);poolMat.uniforms.uOpacity.value=L.poolA;showPool();bakeUniforms.uWin.value.set(...(firstWindow?L.win:[1,0]));
    kit.setNight(night);nightKey="";if(bake.ready)bakeUniforms.uBakeOn.value=night?.7:1;
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
  /**
   * One piece: its model turned so its back faces the side the plan gives it, baked once (merged, corner-shaded) with its
   * footprint shadow. `like`, an identical piece built in the same update, lends its bake (they share its geometry).
   * `creases` is the bake's slow last step, left for bakeCreases (phones and low-power devices go without it).
   */
  function buildPiece(f,next,like){
    let inner,creases=like?.creases??null;
    if(like){inner=like.group.children[0].clone();inner.traverse(o=>{if(o.userData.shadow)o.raycast=()=>{};else o.userData.itemId=f.id;});}
    else{
      // Throws resting on a bed are modelled for that bed (seatRiders lines them up with it).
      const back=f.back||0,bed=f.host&&next.items.find(i=>i.id===f.host);
      const spec=bed?{...f,onBed:{w:bed.width_ft,d:bed.length_ft}}:back%2?{...f,width_ft:f.length_ft,length_ft:f.width_ft}:f;
      inner=kit.build(spec,next.palette,{theme:next.theme,dress:next.settings.dressVibe!==false});
      // The shadow is traced from the parts as built, then the bake. A piece on a wall or resting on a bed has no floor of its own to darken toward.
      inner.rotation.y=-back*Math.PI/2;const shadow=!NO_BLOB.has(f.kind)&&!onWall(f)&&shadowMesh(inner,shadowUniforms);
      creases=kit.bake(inner,{floor:!f.host&&!onWall(f)});if(LOW)creases=null;if(shadow)inner.add(shadow);
    }
    const group=new T.Group();group.add(inner);group.userData.itemId=f.id;
    // Pieces hung on a wall cast no baked shadow (a frame's long grazing shadow down the wall reads as a smudge).
      if(!onWall(f))inner.traverse(o=>{if(o.isMesh&&!o.userData.shadow&&![o.material].flat().some(x=>x.transparent))o.layers.enable(BAKE_LAYER);});
    itemRoot.add(group);return {group,restZ:inner.userData.restZ??0,creases};
  }
  /**
   * Crease shading, a piece at a time between frames once the room is still (not assembling, moving or being touched), so
   * opening 3D or editing a piece never waits on it. Pieces sharing a bake share its job; it runs once.
   */
  function bakeCreases(){
    creaseTimer=0;if(disposed)return;
    const m=[...meshes.values()].find(m=>m.creases);if(!m)return;
    if(assemblyStart||tween||pointers.size||keys.size){creaseTimer=setTimeout(bakeCreases,150);return;}
    const job=m.creases;job();for(const other of meshes.values())if(other.creases===job)other.creases=null;
    request();creaseTimer=setTimeout(bakeCreases,0);
  }
  function removePiece(m){itemRoot.remove(m.group);m.group.traverse(o=>{if(o.userData.ownGeometry)o.geometry.dispose();if(o.userData.shadow){o.material.uniforms.uMap.value.dispose();o.material.dispose();}});}
  /** Throw pillows and a throw blanket resting on a bed follow it: turned with its frame, at its head or across its foot. */
  const seat=new T.Vector3();
  function seatRiders(){
    for(const m of meshes.values()){
      const host=m.item.host&&meshes.get(m.item.host);if(!host||drag?.id===m.item.id)continue;
      const inner=host.group.children[0];host.group.updateMatrixWorld();inner.localToWorld(seat.set(0,0,m.restZ));
      m.group.position.x=seat.x;m.group.position.z=seat.z;m.group.rotation.y=host.group.rotation.y+inner.rotation.y;
    }
  }
  function sync(next){
    const first=!data,before=data;if(drag?.openingIndex!==undefined&&data?.outline!==next.outline)cancelDrag();data=next;
    // The room shell rebuilds only when its shape or finishes change; the light preset is applied on its own.
    const {lighting,dressVibe,...shell}=next.settings;
    const key=JSON.stringify([next.room.lengthFt,next.room.widthFt,next.outline,shell]);
    if(key!==roomKey){roomKey=key;buildRoom();lightKey="";}
    const ids=new Set(),dress=dressVibe!==false,built=new Map();
    for(const f of next.items){
      const bed=f.host&&next.items.find(i=>i.id===f.host);
      ids.add(f.id);const key=JSON.stringify([f.kind,f.width_ft,f.length_ft,f.height,f.material_color,f.product,f.bare,f.bed_mode,f.built_in,f.back,NO_BLOB.has(f.kind)||onWall(f),next.palette,dress,dress?next.theme:null,bed&&[bed.width_ft,bed.length_ft]]);let m=meshes.get(f.id);
      if(!m||m.key!==key){if(m)removePiece(m);m={...buildPiece(f,next,built.get(key)),key,item:f};built.set(key,m);meshes.set(f.id,m);}
      m.item=f;m.wall=onWall(f)?wallOf(f):null;
      if(drag?.id!==f.id){m.group.position.set(f.x_ft+f.footW/2,f.elevation,f.y_ft+f.footD/2);m.group.rotation.y=-f.rotation_deg*Math.PI/180;}
    }
    for(const [id,m]of meshes)if(!ids.has(id)){removePiece(m);meshes.delete(id);}
    // A new bake whenever what casts shadows or where it stands changes.
    const layout=JSON.stringify([roomKey,next.items.map(f=>[f.id,f.kind,f.x_ft,f.y_ft,f.footW,f.footD,f.height,f.elevation,f.rotation_deg,f.back]),[...meshes.values()].map(m=>m.key)]);
    if(layout!==bake.layout){bake.layout=layout;invalidateBake();}
    if(!creaseTimer)creaseTimer=setTimeout(bakeCreases,0);
    seatRiders();
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
    renderer.setSize(width,height,false);sizePost();camera.aspect=width/height;camera.updateProjectionMatrix();
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
    destroy(){disposed=true;cancelAnimationFrame(raf);clearTimeout(sharpen);clearTimeout(creaseTimer);resize.disconnect();document.removeEventListener("visibilitychange",visible);
      for(const [name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("webglcontextlost",onContextLost);
      clearGuides();openingGhost.geometry.dispose();openingGhost.material.dispose();lineMat.dispose();marker.geometry.dispose();ring.geometry.dispose();ring.material.dispose();marker.material.dispose();
      for(const m of meshes.values())removePiece(m);clearRoom();floorTextures.forEach(t=>t.dispose());
      for(const material of [bandMat,groundMat,poolMat,depthMat,accumMat,viewMat])material.dispose();bakeTarget.dispose();depthTarget.dispose();wallBakeTarget.dispose();wallAccumMat.dispose();wallAtlas.geometry.dispose();if(post){post.gtao.dispose();post.composer.dispose();post.target.dispose();}pmrem.dispose();roomEnv?.dispose();mirrorTarget.dispose();measureTarget.dispose();measureMat.dispose();bakeQuad.geometry.dispose();for(const t of surfaces.values())t.dispose();kit.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  };
}
