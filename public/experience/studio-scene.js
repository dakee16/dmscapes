import * as T from "./vendor/three.module.min.js";
import { createModelKit } from "./studio-models.js";
export function createStudioScene(container, options) {
  const brandMark=new Image();brandMark.src="/brand/dormscape-mark.png?v=folded-room";
  const renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor("#efeee8");
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute("aria-label","3D room. Drag empty space to orbit. Select an item in Arrange for keyboard editing.");
  canvas.style.cssText="display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px";container.appendChild(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.2,400),kit=createModelKit({onTexture:request});
  const hemi=new T.HemisphereLight("#f3f6ff","#958368",2.3);scene.add(hemi);
  const sun=new T.DirectionalLight("#fff3dc",3.1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const fill=new T.DirectionalLight("#cedcff",1.1);scene.add(fill);
  const shadowOnly=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  const roomRoot=new T.Group(),itemRoot=new T.Group();scene.add(roomRoot,itemRoot);
  const meshes=new Map(),wallGroups=[],openingGroups=[],openingNodes=new Map();let roomKey="",data=null,disposed=false,raf=0,assemblyStart=0,ready=false;
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  const marker=new T.Box3Helper(new T.Box3(),0x2b4eff);marker.visible=false;scene.add(marker);
  const guides=new T.Group();scene.add(guides);
  const openingGhost=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x2b4eff,transparent:true,opacity:.45,depthTest:false}));
  openingGhost.visible=false;openingGhost.renderOrder=10;scene.add(openingGhost);
  const lineMat=new T.LineDashedMaterial({color:0x2b4eff,dashSize:.15,gapSize:.1,transparent:true,opacity:.65});
  const label=document.createElement("div");label.className="dm-studio-scene-label";
  label.style.cssText="position:absolute;pointer-events:none;z-index:2;padding:7px 10px;background:#17172b;color:white;font:12px/1.4 system-ui;border-radius:3px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none;transform:translate(-50%,-100%)";
  container.appendChild(label);
  let width=1,height=1,angle=.7,polar=.94,radius=25,mode="room",walls="auto",target=new T.Vector3(),eye=new T.Vector3();
  let drag=null,pointers=new Map(),pinch=0,tween=null,dragMode=false;
  const onContextLost=e=>{e.preventDefault();options.onError?.("The graphics context was interrupted. Open 2D or retry 3D.");};
  canvas.addEventListener("webglcontextlost",onContextLost);
  const roomPoint=(e,y=0)=>{
    const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(ndc,camera);plane.constant=-y;return ray.ray.intersectPlane(plane,new T.Vector3());
  };
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
  function cameraUpdate(){
    if(mode==="inside"){camera.position.copy(eye);camera.lookAt(eye.x+Math.sin(angle)*8,eye.y+Math.cos(polar)*4,eye.z-Math.cos(angle)*8);}
    else{camera.position.set(target.x+radius*Math.sin(polar)*Math.sin(angle),target.y+radius*Math.cos(polar),target.z+radius*Math.sin(polar)*Math.cos(angle));camera.lookAt(target);}
    for(const wall of wallGroups){
      const normal=wall.userData.normal,mid=wall.userData.mid;
      const outward=(camera.position.x-mid.x)*normal.x+(camera.position.z-mid.y)*normal.y;
      wall.visible=walls!=="hidden"&&(walls==="all"||mode==="inside"||(mode!=="top"&&outward<.1));
    }
    for(const opening of openingGroups)opening.visible=walls!=="hidden";
  }
  function showLabel(){
    const selectedOpening=data?.editOpenings&&openingNodes.get(data?.selectedOpening);
    if(selectedOpening){marker.box.setFromObject(selectedOpening);marker.visible=true;label.style.display="none";return;}
    const m=meshes.get(data?.selectedId);if(!m){marker.visible=false;label.style.display="none";return;}
    marker.box.setFromObject(m.group);marker.visible=true;
    const p=new T.Vector3();marker.box.getCenter(p);p.y=marker.box.max.y+.18;p.project(camera);
    if(Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1){label.style.display="none";return;}
    label.textContent=drag?.id===m.item.id?m.item.label+" · "+(m.group.position.x-m.item.footW/2).toFixed(1)+" × "+(m.group.position.z-m.item.footD/2).toFixed(1)+" ft":m.item.label;
    label.style.display="block";label.style.left=((p.x+1)*width/2)+"px";label.style.top=((-p.y+1)*height/2)+"px";
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
    cameraUpdate();camera.updateMatrixWorld();showLabel();renderer.render(scene,camera);
    if(!ready&&data&&width>1&&height>1){ready=true;options.onReady?.();}
    if(more)request();
  }
  function clearRoom(){
    for(const g of roomRoot.children)g.traverse(o=>{if(o.userData.ownGeometry)o.geometry?.dispose();if(o.userData.ownMaterial){for(const material of Array.isArray(o.material)?o.material:[o.material]){material?.map?.dispose();material?.dispose();}}});
    roomRoot.clear();wallGroups.length=0;openingGroups.length=0;openingNodes.clear();
  }
  function floorTexture(finish){
    const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
    x.fillStyle=({oak:"#c6a277",walnut:"#78543c",concrete:"#a5a6a2",carpet:"#bcb3a5"})[finish]||"#c6a277";x.fillRect(0,0,256,256);
    if(finish==="oak"||finish==="walnut"){
      for(let i=0;i<8;i++){x.fillStyle=i%2?"#ffffff09":"#00000008";x.fillRect(i*32,0,32,256);x.fillStyle="#00000028";x.fillRect(i*32,0,1,256);x.fillRect(i*32,(i%3)*80,32,1);
        for(let j=0;j<7;j++){x.fillStyle="#00000005";x.fillRect(i*32+3+j*4,0,1,256);}}
    }else for(let i=0;i<1200;i++){x.fillStyle=i%2?"#ffffff12":"#00000012";x.fillRect((i*37)%256,(i*73)%256,1,2);}
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(.23,.23);return tex;
  }
  function buildRoom(){
    clearRoom();const {room,settings,outline}=data,l=room.lengthFt,w=room.widthFt,h=settings.ceilingFt;
    const shape=new T.Shape();outline.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();
    // A single closed slab avoids competing cap and floor surfaces.
    const floor=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false}),[
      new T.MeshStandardMaterial({map:floorTexture(settings.floor),roughness:.92}),
      new T.MeshStandardMaterial({color:"#b39a7d",roughness:.95})
    ]);
    floor.name="room-floor";floor.rotation.x=-Math.PI/2;floor.position.y=-.18;
    floor.receiveShadow=true;floor.userData={ownGeometry:true,ownMaterial:true};roomRoot.add(floor);
    let area=0;outline.points.forEach((p,i)=>{const b=outline.points[(i+1)%outline.points.length];area+=p.x*b.y-b.x*p.y;});
    outline.points.forEach((a,i)=>{
      const b=outline.points[(i+1)%outline.points.length],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.01)return;const dx=(b.x-a.x)/len,dz=(b.y-a.y)/len;
      const group=new T.Group();group.position.set(a.x,0,a.y);group.rotation.y=-Math.atan2(dz,dx);roomRoot.add(group);
      group.userData.normal=area>0?{x:dz,y:-dx}:{x:-dz,y:dx};group.userData.mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};wallGroups.push(group);
      // Colorless proxies keep wall shadows stable during camera movement.
      const wallShadow=new T.Group();wallShadow.name="wall-shadow-"+i;
      wallShadow.position.copy(group.position);wallShadow.rotation.copy(group.rotation);roomRoot.add(wallShadow);
      const openings=outline.openings.filter(o=>o.edge===i).sort((a,b)=>a.offset_ft-b.offset_ft);
      let cursor=0;const wall=kit.mat(settings.wallColor);
      const segment=(start,end,low,high)=>{if(end-start<=.005||high-low<=.005)return;
        const mesh=kit.box(group,end-start,high-low,.14,wall,(start+end)/2,(low+high)/2,0,.01);mesh.castShadow=false;
        const shadow=new T.Mesh(mesh.geometry,shadowOnly);shadow.position.copy(mesh.position);shadow.castShadow=true;wallShadow.add(shadow);
      };
      for(const o of openings){
        // Separate groups let a door/window follow the pointer without rebuilding the room.
        const index=outline.openings.indexOf(o),fixtures=new T.Group();fixtures.name="opening-"+index;
        fixtures.position.copy(group.position);fixtures.rotation.copy(group.rotation);
        roomRoot.add(fixtures);openingGroups.push(fixtures);openingNodes.set(index,fixtures);
        const left=Math.max(cursor,Math.min(len,o.offset_ft)),right=Math.max(left,Math.min(len,o.offset_ft+o.width_ft));segment(cursor,left,0,h);
        if(o.kind==="window"){
          const low=Math.min(3,h*.4),high=Math.min(h-.5,6.5);segment(left,right,0,low);segment(left,right,high,h);
          const frame=kit.mat("#fffaf0"),center=(left+right)/2,openingHeight=high-low;
          kit.box(fixtures,right-left+.16,.12,.32,frame,center,low,0);
          kit.box(fixtures,right-left+.16,.1,.22,frame,center,high,0);
          for(const edge of [left,right])kit.box(fixtures,.1,openingHeight,.22,frame,edge,(low+high)/2,0);
          const glass=kit.box(fixtures,Math.max(.05,right-left-.1),openingHeight-.1,.035,kit.mat("#a7cddd",.3),center,(low+high)/2,0,.001);
          glass.name="window-pane";glass.castShadow=false;
          kit.box(fixtures,.065,openingHeight,.12,frame,center,(low+high)/2,0);
          kit.box(fixtures,right-left,.065,.12,frame,center,(low+high)/2,0);
        }else{
          const doorHeight=Math.min(6.7,h-.1),frame=kit.mat("#fffaf0");
          segment(left,right,doorHeight,h);
          for(const edge of [left,right])kit.box(fixtures,.1,doorHeight,.22,frame,edge,doorHeight/2,0);
          kit.box(fixtures,right-left+.1,.1,.22,frame,(left+right)/2,doorHeight,0);
          // Match all four hinge and swing orientations in the 2D plan.
          const swing=o.swing??0,endHinge=Boolean(swing&1),inward=area>0?1:-1;
          const side=(swing&2)?-inward:inward,hinge=new T.Group(),leafWidth=Math.max(.1,right-left-.12);
          hinge.position.x=endHinge?right-.06:left+.06;
          hinge.rotation.y=(endHinge?1:-1)*side*Math.PI/2;
          fixtures.add(hinge);const direction=endHinge?-1:1;
          const leaf=kit.box(hinge,leafWidth,doorHeight-.1,.09,kit.mat("#b88d61"),direction*leafWidth/2,doorHeight/2,0,.015);
          leaf.name="door-leaf";
          kit.box(hinge,leafWidth*.73,doorHeight*.61,.018,kit.mat("#cfae85"),direction*leafWidth/2,doorHeight*.57,.054,.005);
          for(const face of [-1,1])kit.box(hinge,.19,.05,.08,kit.mat("#485063",.25),direction*(leafWidth-.2),3,face*.09,.012);
        }
        const height=o.kind==="door"?Math.min(6.7,h-.1):Math.min(h-.5,6.5)-Math.min(3,h*.4),bottom=o.kind==="door"?0:Math.min(3,h*.4);
        const hitbox=kit.box(fixtures,right-left,height,.4,kit.mat("#2b4eff"),(left+right)/2,bottom+height/2,0);
        hitbox.visible=false;
        // Raycasting still uses this invisible box, including the open doorway and top-view edge.
        fixtures.traverse(mesh=>{if(mesh.isMesh)mesh.userData.openingIndex=index;});
        cursor=right;
      }
      segment(cursor,len,0,h);let sk=0;
      for(const o of openings.filter(o=>o.kind==="door")){if(o.offset_ft>sk)kit.box(group,o.offset_ft-sk,.2,.18,kit.mat("#fffaf0"),(sk+o.offset_ft)/2,.1,0);sk=o.offset_ft+o.width_ft;}
      if(sk<len)kit.box(group,len-sk,.2,.18,kit.mat("#fffaf0"),(sk+len)/2,.1,0);
    });
    for(const c of outline.closets)kit.box(roomRoot,c.width_ft,h*.87,c.depth_ft,kit.mat("#cbb28e"),c.x_ft+c.width_ft/2,h*.435,c.y_ft+c.depth_ft/2);
    sun.position.set(l*.2,h*2.2,w*.4);sun.target.position.set(l/2,0,w/2);fill.position.set(l,h,w);
    const span=Math.max(l,w);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,far:h*5+span});sun.shadow.camera.updateProjectionMatrix();
    sun.intensity=settings.lighting==="evening"?.6:3.1;hemi.intensity=settings.lighting==="evening"?1.3:2.3;
    fill.color.set(settings.lighting==="evening"?"#ffbe76":"#cedcff");renderer.setClearColor(settings.lighting==="evening"?"#252838":"#efeee8");
  }
  function sync(next){
    const first=!data;if(drag?.openingIndex!==undefined&&data?.outline!==next.outline)cancelDrag();data=next;const key=JSON.stringify([next.room.lengthFt,next.room.widthFt,next.outline,next.settings]);
    if(key!==roomKey){roomKey=key;buildRoom();}
    const ids=new Set();
    for(const f of next.items){
      ids.add(f.id);const key=JSON.stringify([f.kind,f.width_ft,f.length_ft,f.height,f.material_color,f.product,f.bare,next.palette]);let m=meshes.get(f.id);
      if(!m||m.key!==key){if(m)itemRoot.remove(m.group);const group=kit.build(f,next.palette);itemRoot.add(group);m={group,key,item:f};meshes.set(f.id,m);}
      m.item=f;
      if(drag?.id!==f.id){m.group.position.set(f.x_ft+f.footW/2,f.elevation,f.y_ft+f.footD/2);m.group.rotation.y=-f.rotation_deg*Math.PI/180;}
    }
    for(const [id,m]of meshes)if(!ids.has(id)){itemRoot.remove(m.group);meshes.delete(id);}
    if(first){target.set(next.room.lengthFt/2,1,next.room.widthFt/2);preset("room",true);if(!options.reduced)assemblyStart=performance.now();}
    request();
  }
  function preset(value,immediate=false){
    if(!data)return;mode=value;cancelDrag();
    if(value==="inside"){eye.set(data.interior.x,Math.min(data.settings.ceilingFt-.5,4.8),data.interior.y);angle=0;polar=Math.PI/2;tween=null;request();return;}
    const l=data.room.lengthFt,w=data.room.widthFt,h=data.settings.ceilingFt,aspect=width/height;
    const vfov=camera.fov*Math.PI/180,hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
    const to=new T.Vector3(l/2,value==="top"?0:h*.38,w/2);
    const r=value==="top"?Math.max(l/aspect,w)*.56/Math.tan(vfov/2):Math.hypot(l/2,w/2,h/2)*1.08/Math.sin(Math.min(vfov,hfov)/2);
    const toA=value==="top"?0:.7,toP=value==="top"?.001:.94;
    if(immediate||options.reduced){angle=toA;polar=toP;radius=r;target.copy(to);tween=null;}
    else tween={start:performance.now(),a:angle,p:polar,r:radius,from:target.clone(),to,toA,toP,toR:r};request();
  }
  function focus(id){
    const m=meshes.get(id);if(!m)return;mode="room";const to=m.group.position.clone();to.y+=m.item.height/2;
    tween={start:performance.now(),a:angle,p:polar,r:radius,from:target.clone(),to,toA:angle,toP:.95,toR:Math.max(6,m.item.footW*2.5,m.item.footD*2.5)};
    if(options.reduced){target.copy(to);radius=tween.toR;polar=.95;tween=null;}request();
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
    const id=hit(e),m=meshes.get(id),movable=m&&m.item.movable&&!m.item.locked&&mode!=="inside"&&(e.pointerType!=="touch"||dragMode);
    options.onSelect?.(id);const p=roomPoint(e,m?.item.elevation||0);
    drag={pointerId:e.pointerId,id:movable?id:null,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,
      origin:m?m.group.position.clone():null,offset:p&&m?p.clone().sub(m.group.position):null,x:m?.item.x_ft,y:m?.item.y_ft};
  }
  function distance(){const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
  function move(e){
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const d=distance();if(pinch&&d>0)radius=Math.max(4,Math.min(180,radius*pinch/d));pinch=d;request();return;}
    if(!drag||e.pointerId!==drag.pointerId)return;
    if(drag.openingIndex!==undefined){
      drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;
      if(drag.moved){const p=wallPoint(e,drag.height),next=p&&options.previewOpening?.(drag.openingIndex,p.x,p.z);
        drag.nextOpening=next??null;const node=openingNodes.get(drag.openingIndex);
        if(node)positionOpening(node,next??drag.opening,drag.opening.offset_ft);request();}return;
    }
    const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
    drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4;
    if(drag.id&&drag.moved){
      const m=meshes.get(drag.id),p=roomPoint(e,m.item.elevation);
      if(p&&drag.offset){const x=p.x-drag.offset.x-m.item.footW/2,y=p.z-drag.offset.z-m.item.footD/2,q=options.constrain?.(drag.id,x,y)||{x,y};
        drag.x=q.x;drag.y=q.y;m.group.position.set(q.x+m.item.footW/2,m.item.elevation,q.y+m.item.footD/2);
        for(const child of meshes.values())if(child.item.parent_id===drag.id)child.group.position.set(child.item.x_ft+q.x-m.item.x_ft+child.item.footW/2,child.item.elevation,child.item.y_ft+q.y-m.item.y_ft+child.item.footD/2);
        drawGuides(m);}
    }else if(drag.moved){tween=null;angle-=dx*.007;polar=Math.max(.08,Math.min(mode==="inside"?2.5:1.45,polar+dy*.006));}
    drag.lastX=e.clientX;drag.lastY=e.clientY;request();
  }
  function up(e){
    pointers.delete(e.pointerId);pinch=0;if(drag?.pointerId===e.pointerId){const d=drag;drag=null;clearGuides();if(d.openingIndex!==undefined){const node=openingNodes.get(d.openingIndex);if(node)positionOpening(node,d.opening,d.opening.offset_ft);if(d.moved&&d.nextOpening)options.onOpeningChange?.(d.openingIndex,d.nextOpening);}else if(d.id&&d.moved)options.onMove?.(d.id,d.x,d.y);}
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);request();
  }
  function cancelDrag(){if(drag?.openingIndex!==undefined){const node=openingNodes.get(drag.openingIndex);if(node)positionOpening(node,drag.opening,drag.opening.offset_ft);}openingGhost.visible=false;if(drag?.id){for(const m of meshes.values())m.group.position.set(m.item.x_ft+m.item.footW/2,m.item.elevation,m.item.y_ft+m.item.footD/2);}drag=null;clearGuides();}
  function cancel(e){pointers.delete(e.pointerId);pinch=0;cancelDrag();request();}
  function wheel(e){e.preventDefault();tween=null;radius=Math.max(4,Math.min(180,radius*Math.exp(e.deltaY*.001)));request();}
  function key(e){
    if(e.key==="Escape"){cancelDrag();options.onSelectOpening?.(null);options.onSelect?.(null);request();return;}
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-"].includes(e.key)){
      e.preventDefault();tween=null;if(e.key==="ArrowLeft")angle+=.1;if(e.key==="ArrowRight")angle-=.1;
      if(e.key==="ArrowUp")polar=Math.max(.08,polar-.1);if(e.key==="ArrowDown")polar=Math.min(1.45,polar+.1);
      if(e.key==="+"||e.key==="=")radius=Math.max(4,radius*.9);if(e.key==="-")radius=Math.min(180,radius*1.1);request();}
  }
  const resize=new ResizeObserver(()=>{const r=container.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(data)preset(mode,true);request();});resize.observe(container);
  function droppedOpening(e){
    if(!data?.editOpenings)return null;
    const kind=["door","window"].find(kind=>e.dataTransfer.types.includes(options.openingDragType+"-"+kind));
    if(!kind)return null;e.preventDefault();const p=wallPoint(e,0);
    return p?options.previewOpening?.(kind,p.x,p.z):null;
  }
  const events={dragover:e=>{const opening=droppedOpening(e);e.dataTransfer.dropEffect=opening?"copy":"none";ghostOpening(opening);},dragleave:()=>ghostOpening(null),drop:e=>{const opening=droppedOpening(e);ghostOpening(null);if(opening)options.onOpeningChange?.(null,opening);},pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,keydown:key};
  for(const [name,fn]of Object.entries(events))canvas.addEventListener(name,fn);canvas.addEventListener("wheel",wheel,{passive:false});
  const visible=()=>request();document.addEventListener("visibilitychange",visible);
  return {update:sync,preset:m=>preset(m),focus,zoom:f=>{radius=Math.max(4,Math.min(180,radius*f));request();},
    setWalls:v=>{walls=v;request();},setMoveMode:v=>{dragMode=v;},
    setReduced:v=>{options.reduced=v;if(v){assemblyStart=0;tween=null;for(const m of meshes.values()){m.group.scale.setScalar(1);m.group.position.y=m.item.elevation;}request();}},
    exportPNG(){
      marker.visible=false;guides.visible=false;renderer.render(scene,camera);
      const out=document.createElement("canvas");out.width=canvas.width;out.height=canvas.height;const ctx=out.getContext("2d");ctx.drawImage(canvas,0,0);
      const fs=Math.max(14,out.width*.016);ctx.font="600 "+fs+"px system-ui";const text="dormscape.us · Room concept",tw=ctx.measureText(text).width;
      ctx.fillStyle="#fafaf8";ctx.fillRect(out.width-tw-fs*4.3,out.height-fs*3,tw+fs*3.8,fs*2.2);
      if(brandMark.complete&&brandMark.naturalWidth)ctx.drawImage(brandMark,out.width-tw-fs*3.9,out.height-fs*2.8,fs*1.8,fs*1.8);
      ctx.fillStyle="#2b4eff";ctx.fillText(text,out.width-tw-fs*1.3,out.height-fs*1.5);guides.visible=true;request();return out.toDataURL("image/png");
    },
    destroy(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener("visibilitychange",visible);
      for(const [name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("webglcontextlost",onContextLost);
      clearGuides();openingGhost.geometry.dispose();openingGhost.material.dispose();lineMat.dispose();marker.geometry.dispose();marker.material.dispose();clearRoom();shadowOnly.dispose();kit.dispose();renderer.dispose();renderer.forceContextLoss();label.remove();canvas.remove();}
  };
}
