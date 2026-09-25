import * as T from "./vendor/three.module.min.js";

/** Kept separate from the furniture renderer: construction has its own gestures. */
export function createBuilderShell(draft) {
  const root=new T.Group(),walls=[],openings=[],corners=[],closets=[];
  const materials=new Map();
  const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.8}));return materials.get(color);};
  const box=(parent,w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const points=draft.points,height=draft.settings.ceilingFt;
  let area=0;points.forEach((p,i)=>{const b=points[(i+1)%points.length];area+=p.x*b.y-b.x*p.y;});
  if(draft.closed&&points.length>=3){
    const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();
    const floor=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:false}),mat(({oak:"#c9a77b",walnut:"#805c43",concrete:"#a8aaa6",carpet:"#c4bcae"})[draft.settings.floor]));
    floor.name="builder-floor";floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;root.add(floor);
  }
  const count=draft.closed?points.length:Math.max(0,points.length-1);
  for(let i=0;i<count;i++){
    const a=points[i],b=points[(i+1)%points.length],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.01)continue;
    const wall=new T.Group();wall.position.set(a.x,0,a.y);wall.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);wall.userData={kind:"wall",index:i,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},normal:{x:(b.y-a.y)/len*(area>=0?1:-1),y:-(b.x-a.x)/len*(area>=0?1:-1)}};root.add(wall);walls.push(wall);
    const edgeOpenings=draft.openings.map((o,index)=>({...o,index})).filter(o=>o.edge===i).sort((a,b)=>a.offset_ft-b.offset_ft);
    const segment=(start,end,low,high)=>{if(end-start<.001||high-low<.001)return;box(wall,end-start,high-low,.16,draft.settings.wallColor,(start+end)/2,(high+low)/2,0);};
    let cursor=0;
    for(const o of edgeOpenings){
      const left=o.offset_ft,right=left+o.width_ft,door=o.kind==="door",bottom=door?0:Math.min(3,height*.4),top=door?Math.min(6.7,height-.1):Math.min(6.5,height-.5);
      segment(cursor,left,0,height);segment(left,right,top,height);if(!door)segment(left,right,0,bottom);cursor=right;
      const fixture=new T.Group();fixture.position.copy(wall.position);fixture.rotation.copy(wall.rotation);fixture.userData={kind:"opening",index:o.index};root.add(fixture);openings.push(fixture);
      for(const x of [left,right])box(fixture,.10,top-bottom,.24,"#fffaf0",x,(top+bottom)/2,0);
      box(fixture,o.width_ft+.1,.10,.24,"#fffaf0",(left+right)/2,top,0);
      if(door){
        const swing=o.swing??0,end=!!(swing&1),side=(area>=0?1:-1)*((swing&2)?-1:1),hinge=new T.Group(),direction=end?-1:1,leaf=o.width_ft-.12;
        hinge.position.x=end?right-.06:left+.06;hinge.rotation.y=(end?1:-1)*side*Math.PI/2;fixture.add(hinge);
        box(hinge,leaf,top-.1,.09,"#c5a176",direction*leaf/2,top/2,0).name="builder-door-leaf";
        box(hinge,.18,.06,.12,"#414654",direction*(leaf-.2),3,.1);
      }else{
        box(fixture,o.width_ft+.14,.10,.30,"#fffaf0",(left+right)/2,bottom,0);
        box(fixture,o.width_ft-.10,top-bottom-.10,.04,"#a8d6e9",(left+right)/2,(top+bottom)/2,0).name="builder-window-pane";
        box(fixture,.06,top-bottom,.12,"#fffaf0",(left+right)/2,(top+bottom)/2,0);
        box(fixture,o.width_ft,.06,.12,"#fffaf0",(left+right)/2,(top+bottom)/2,0);
      }
      // Dedicated picking volume includes the empty doorway and window opening.
      const pick=box(fixture,o.width_ft,top-bottom,.4,"#2b4eff",(left+right)/2,(top+bottom)/2,0);pick.visible=false;
      fixture.traverse(node=>{node.userData.kind="opening";node.userData.index=o.index;});
    }
    segment(cursor,len,0,height);wall.traverse(node=>{node.userData.kind="wall";node.userData.index=i;});
    // A low wall trace stays visible in cutaway and top views.
    const trace=new T.Mesh(new T.BoxGeometry(len,.055,.18),mat("#2b4eff"));trace.position.set((a.x+b.x)/2,.04,(a.y+b.y)/2);trace.rotation.copy(wall.rotation);trace.userData={kind:"wall",index:i};root.add(trace);
  }
  if(draft.closed)for(const [index,c] of (draft.closets??[]).entries()){
    const closet=new T.Group(),h=height*.87,w=c.width_ft,d=c.depth_ft;
    closet.name="builder-closet";closet.position.set(c.x_ft+w/2,0,c.y_ft+d/2);root.add(closet);closets.push(closet);
    // Separate solid panels keep the front free of coplanar faces. All parts stay in the reserved footprint.
    box(closet,w,h,d-.06,"#c5ad8b",0,h/2,-.03);
    for(const side of [-1,1]){
      box(closet,w/2-.025,h-.08,.035,"#e4d2b6",side*w/4,h/2,d/2-.0325);
      box(closet,.025,.28,.025,"#51515f",side*Math.min(.10,w*.15),h*.46,d/2-.0125);
    }
    closet.traverse(node=>{node.userData={kind:"closet",index};});
  }
  points.forEach((p,index)=>{const material=new T.MeshBasicMaterial({color:index===0&&!draft.closed?"#ffdc60":"#2b4eff",depthTest:false});
    const node=new T.Mesh(new T.SphereGeometry(.16,14,10),material);node.position.set(p.x,.10,p.y);node.userData={kind:"corner",index};node.renderOrder=5;root.add(node);corners.push(node);});
  return {root,walls,openings,corners,closets,dispose(){const seen=new Set();root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!seen.has(m)){m.dispose();seen.add(m);}});}};
}

export function createBuilderScene(container,options){
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setClearColor("#eceef3");
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute("aria-label","3D construction grid. Use the tools to draw. Exact coordinates, opening controls, and closet measurements are available beside the canvas.");
  canvas.style.cssText="display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px";container.appendChild(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,400),ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  const hemi=new T.HemisphereLight("#f5f7ff","#9d8f7b",2.6);scene.add(hemi);
  const sun=new T.DirectionalLight("#fff5dd",3.0);sun.position.set(-10,25,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:100});sun.shadow.bias=-.0002;sun.shadow.normalBias=.03;scene.add(sun,sun.target);
  const grid=new T.GridHelper(60,120,"#9faaca","#cbd0df");grid.position.y=-.24;scene.add(grid);
  const major=new T.GridHelper(60,12,"#8699d5","#b2bacf");major.position.y=-.23;scene.add(major);
  const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:"#eceef3",roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.27;ground.receiveShadow=true;scene.add(ground);
  const ghost=new T.Group();scene.add(ghost);const ghostMat=new T.MeshBasicMaterial({color:"#2b4eff",transparent:true,opacity:.36,depthTest:false});
  const selectionBox=new T.Box3Helper(new T.Box3(),"#e1aa00");selectionBox.material.depthTest=false;selectionBox.material.toneMapped=false;selectionBox.renderOrder=10;selectionBox.visible=false;scene.add(selectionBox);
  const label=document.createElement("div");label.style.cssText="position:absolute;pointer-events:none;z-index:3;padding:7px 10px;background:#17172b;color:#fff;font:12px/1.4 monospace;border-radius:3px;transform:translate(-50%,-100%);display:none;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis";container.appendChild(label);
  let data=null,shell=null,shellKey="",disposed=false,raf=0,width=1,height=1,angle=.68,polar=.82,radius=36,view="room",drag=null,pinch=0,lastPoint=null;
  const target=new T.Vector3(0,1.5,0),pointers=new Map();
  const snap=p=>({x:Math.max(-30,Math.min(30,Math.round(p.x/data.snap)*data.snap)),y:Math.max(-30,Math.min(30,Math.round(p.z/data.snap)*data.snap))});
  function request(){if(!disposed&&!raf)raf=requestAnimationFrame(frame);}
  function frame(){raf=0;if(disposed||document.hidden)return;
    camera.position.set(target.x+radius*Math.sin(polar)*Math.sin(angle),target.y+radius*Math.cos(polar),target.z+radius*Math.sin(polar)*Math.cos(angle));camera.lookAt(target);camera.updateMatrixWorld();
    for(const wall of shell?.walls??[]){const {normal,mid}=wall.userData;const front=(camera.position.x-mid.x)*normal.x+(camera.position.z-mid.y)*normal.y>0;wall.visible=view!=="top"&&(!data.cutaway||!front);}
    for(const corner of shell?.corners??[])corner.visible=data.tool==="select"||data.tool==="wall";
    renderer.render(scene,camera);
  }
  function pointer(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(plane,new T.Vector3());}
  function picked(e){pointer(e);const hits=ray.intersectObjects(shell?.root.children??[],true).filter(h=>h.object.userData.kind&&!(h.object.userData.kind==="wall"&&h.object.parent!==shell.root&&!h.object.parent.visible));
    return hits.find(h=>h.object.userData.kind==="corner")??hits.find(h=>["opening","closet"].includes(h.object.userData.kind))??hits[0];}
  function wallPoint(e){const floor=pointer(e);const hit=ray.intersectObjects((shell?.walls??[]).filter(w=>w.visible),true)[0];return hit?.point??floor;}
  function clearGhost(){for(const o of ghost.children)o.geometry?.dispose();ghost.clear();label.style.display="none";}
  function line(a,b){const g=new T.BufferGeometry().setFromPoints([new T.Vector3(a.x,.08,a.y),new T.Vector3(b.x,.08,b.y)]),m=new T.Line(g,ghostMat);m.renderOrder=8;ghost.add(m);}
  function hover(e){if(!data||drag)return;clearGhost();const p=(data.tool==="door"||data.tool==="window")?wallPoint(e):pointer(e);if(!p)return;const q=snap(p);lastPoint=q;
    if(["floor","wall"].includes(data.tool)){
      const dot=new T.Mesh(new T.SphereGeometry(.12,10,8),ghostMat);dot.position.set(q.x,.1,q.y);ghost.add(dot);
      const a=data.anchor??(!data.draft.closed?data.draft.points.at(-1):null);
      if(a&&data.tool==="floor"){const b={x:q.x,y:a.y},c={x:a.x,y:q.y};line(a,b);line(b,q);line(q,c);line(c,a);}else if(a)line(a,q);
      label.textContent=a?(data.tool==="floor"?Math.abs(q.x-a.x).toFixed(1)+" × "+Math.abs(q.y-a.y).toFixed(1)+" ft":Math.hypot(q.x-a.x,q.y-a.y).toFixed(1)+" ft · "+q.x+", "+q.y+" ft"):q.x+", "+q.y+" ft";
    }else if(data.tool==="door"||data.tool==="window"){
      const opening=options.previewOpening(data.tool,{x:p.x,y:p.z});
      if(opening){const a=data.draft.points[opening.edge],b=data.draft.points[(opening.edge+1)%data.draft.points.length],len=Math.hypot(b.x-a.x,b.y-a.y),along=opening.offset_ft+opening.width_ft/2;
        const m=new T.Mesh(new T.BoxGeometry(opening.width_ft,data.tool==="door"?6.6:3.5,.3),ghostMat);m.position.set(a.x+(b.x-a.x)*along/len,data.tool==="door"?3.3:4.7,a.y+(b.y-a.y)*along/len);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);m.renderOrder=9;ghost.add(m);label.textContent="Click to place "+data.tool;
      }else label.textContent="Choose a clear wall";
    }else if(data.tool==="closet"){
      const c=options.previewCloset(-1,{x:p.x,y:p.z});
      if(c){const h=data.draft.settings.ceilingFt*.87,m=new T.Mesh(new T.BoxGeometry(c.width_ft,h,c.depth_ft),ghostMat);m.position.set(c.x_ft+c.width_ft/2,h/2,c.y_ft+c.depth_ft/2);m.renderOrder=9;ghost.add(m);label.textContent=c.width_ft+" × "+c.depth_ft+" ft · Click to place closet";}
      else label.textContent="Keep closets inside the room and clear of each other";
    }else{request();return;}
    const r=canvas.getBoundingClientRect();label.style.display="block";label.style.left=Math.max(90,Math.min(width-90,e.clientX-r.left))+"px";label.style.top=Math.max(35,e.clientY-r.top-18)+"px";request();
  }
  function cancel(){drag=null;pinch=0;clearGhost();if(data)rebuild(true);request();}
  function down(e){if(!data||e.button>2)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>1){drag=null;clearGhost();rebuild(true);return;}
    const hit=picked(e),item=hit?.object.userData;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,orbit:data.tool==="orbit"||e.button!==0||e.altKey,item:data.tool==="select"&&item?{kind:item.kind,index:item.index}:null};
    if(drag.item){options.onSelect(drag.item);const p=pointer(e);if(p&&item.kind==="corner"){const c=data.draft.points[item.index];drag.offset={x:p.x-c.x,y:p.z-c.y};}else if(p&&item.kind==="closet"){const c=data.draft.closets[item.index];drag.offset={x:p.x-c.x_ft-c.width_ft/2,y:p.z-c.y_ft-c.depth_ft/2};}}
    clearGhost();
  }
  function move(e){if(!data)return;if(!pointers.has(e.pointerId)){hover(e);return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)radius=Math.max(5,Math.min(180,radius*pinch/distance));pinch=distance;request();return;}
    if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.moved||=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5;
    if(drag.moved){
      if(drag.orbit||data.tool==="select"&&!drag.item){angle-=dx*.008;polar=Math.max(.08,Math.min(1.45,polar+dy*.006));view="room";}
      else if(drag.item?.kind==="corner"){const p=pointer(e);if(p){p.x-=drag.offset?.x??0;p.z-=drag.offset?.y??0;const q=snap(p);drag.point=q;const node=shell.corners[drag.item.index];node.position.set(q.x,.1,q.y);clearGhost();const points=data.draft.points,n=points.length;if(drag.item.index>0||data.draft.closed)line(points[(drag.item.index-1+n)%n],q);if(drag.item.index<n-1||data.draft.closed)line(q,points[(drag.item.index+1)%n]);}}
      else if(drag.item?.kind==="closet"){const p=pointer(e);if(p){drag.point={x:p.x-(drag.offset?.x??0),y:p.z-(drag.offset?.y??0)};const c=options.previewCloset(drag.item.index,drag.point);if(c){shell.closets[drag.item.index].position.set(c.x_ft+c.width_ft/2,0,c.y_ft+c.depth_ft/2);updateSelection();}}}
      else if(drag.item?.kind==="opening"){const p=wallPoint(e);clearGhost();if(p){drag.point={x:p.x,y:p.z};const opening=options.previewOpening(drag.item.index,drag.point);if(opening){const a=data.draft.points[opening.edge],b=data.draft.points[(opening.edge+1)%data.draft.points.length],len=Math.hypot(b.x-a.x,b.y-a.y),along=opening.offset_ft+opening.width_ft/2,h=opening.kind==="door"?6.5:3;
        const preview=new T.Mesh(new T.BoxGeometry(opening.width_ft,h,.3),ghostMat);preview.position.set(a.x+(b.x-a.x)*along/len,opening.kind==="door"?h/2:4.5,a.y+(b.y-a.y)*along/len);preview.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);preview.renderOrder=8;ghost.add(preview);}}}
    }
    drag.lastX=e.clientX;drag.lastY=e.clientY;request();
  }
  function up(e){const d=drag;pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);pinch=0;if(!d||d.id!==e.pointerId)return;drag=null;
    if(d.moved&&d.item&&d.point){if(d.item.kind==="corner")options.onMoveCorner(d.item.index,d.point);else if(d.item.kind==="opening")options.onMoveOpening(d.item.index,d.point);else if(d.item.kind==="closet")options.onMoveCloset(d.item.index,d.point);rebuild(true);}
    else if(!d.moved&&!d.orbit){if(data.tool==="select")options.onSelect(d.item);else{const p=["door","window"].includes(data.tool)?wallPoint(e):pointer(e);if(p)options.onPoint(["door","window","closet"].includes(data.tool)?{x:p.x,y:p.z}:snap(p));}}
    clearGhost();request();
  }
  function wheel(e){e.preventDefault();radius=Math.max(5,Math.min(180,radius*Math.exp(e.deltaY*.001)));request();}
  function key(e){if(e.key==="Escape"){cancel();options.onCancel?.();}if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-"].includes(e.key)){e.preventDefault();if(e.key==="ArrowLeft")angle+=.1;if(e.key==="ArrowRight")angle-=.1;if(e.key==="ArrowUp")polar=Math.max(.08,polar-.1);if(e.key==="ArrowDown")polar=Math.min(1.45,polar+.1);if(e.key==="+"||e.key==="=")radius=Math.max(5,radius*.9);if(e.key==="-")radius=Math.min(180,radius*1.1);request();}}
  function fit(mode="room"){view=mode;const p=data?.draft.points??[];let l=14,w=12;
    if(p.length>1){const xs=p.map(p=>p.x),ys=p.map(p=>p.y);l=Math.max(4,Math.max(...xs)-Math.min(...xs));w=Math.max(4,Math.max(...ys)-Math.min(...ys));target.set((Math.max(...xs)+Math.min(...xs))/2,mode==="top"?0:(data.draft.settings.ceilingFt*.25),(Math.max(...ys)+Math.min(...ys))/2);}else target.set(0,1.5,0);
    const fov=camera.fov*Math.PI/180,hfov=2*Math.atan(Math.tan(fov/2)*width/height);radius=mode==="top"?Math.max(l/(width/height),w)*.63/Math.tan(fov/2):Math.hypot(l/2,w/2,4)*1.2/Math.sin(Math.min(fov,hfov)/2);angle=mode==="top"?0:.68;polar=mode==="top"?.001:.82;request();}
  function updateSelection(){const selected=data.selection?.kind==="wall"?shell.walls.find(w=>w.userData.index===data.selection.index):data.selection?.kind==="opening"?shell.openings.find(o=>o.userData.index===data.selection.index):data.selection?.kind==="closet"?shell.closets[data.selection.index]:null;selectionBox.visible=!!selected;if(selected)selectionBox.box.setFromObject(selected).expandByScalar(.06);}
  function rebuild(force=false){const key=JSON.stringify(data.draft);if(!force&&key===shellKey)return;shellKey=key;if(shell){scene.remove(shell.root);shell.dispose();}shell=createBuilderShell(data.draft);scene.add(shell.root);updateSelection();}
  const contextLost=e=>{e.preventDefault();options.onError("The graphics connection was interrupted. Your draft is kept. Retry the view or continue using the numeric tools.");};
  const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:e=>{pointers.delete(e.pointerId);cancel();},lostpointercapture:e=>{if(pointers.delete(e.pointerId))cancel();},pointerleave:()=>{if(!drag){clearGhost();request();}},keydown:key,contextmenu:e=>e.preventDefault(),webglcontextlost:contextLost};
  for(const [name,fn]of Object.entries(events))canvas.addEventListener(name,fn);canvas.addEventListener("wheel",wheel,{passive:false});
  const resize=new ResizeObserver(()=>{const r=container.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fit(view);});resize.observe(container);
  const visible=()=>request();document.addEventListener("visibilitychange",visible);
  return {update(next){const first=!data;data=next;rebuild();for(const corner of shell.corners)corner.material.color.set(next.selection?.kind==="corner"&&next.selection.index===corner.userData.index||!next.draft.closed&&corner.userData.index===0?"#ffdc60":"#2b4eff");
    updateSelection();
    clearGhost();canvas.style.cursor=next.tool==="orbit"?"grab":next.tool==="select"?"default":"crosshair";if(first)fit();request();},fit,zoom(factor){radius=Math.max(5,Math.min(180,radius*factor));request();},destroy(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener("visibilitychange",visible);for(const [name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);canvas.removeEventListener("wheel",wheel);shell?.dispose();clearGhost();ghostMat.dispose();selectionBox.geometry.dispose();selectionBox.material.dispose();for(const o of [grid,major,ground]){o.geometry.dispose();o.material.dispose();}renderer.dispose();renderer.forceContextLoss();canvas.remove();label.remove();}};
}
