import * as T from "./vendor/three.module.min.js";
import { createModelKit } from "./studio-models.js";

// A scroll-directed studio reveal. Shared furniture keeps the preview close to
// the real planner; this camera, blueprint, and assembly are unique to the home.
export function createShowcase(container) {
  const scene=new T.Scene(),kit=createModelKit();
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setClearColor(0,0);container.appendChild(renderer.domElement);
  const camera=new T.PerspectiveCamera(33,1,.2,120),focus=new T.Vector3(0,1.8,0);
  scene.add(new T.HemisphereLight(0xe7efff,0x343572,2.4));
  const key=new T.DirectionalLight(0xffe4b8,3.7);key.position.set(-7,18,10);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.normalBias=.025;scene.add(key);
  const rim=new T.DirectionalLight(0x8ba6ff,3);rim.position.set(12,6,-7);scene.add(rim);
  const world=new T.Group();scene.add(world);
  const floor=kit.box(world,12,.24,10,kit.mat("#d7b987"),0,-.17,0,.05);
  const walls=new T.Group();world.add(walls);
  kit.box(walls,12,5.8,.15,kit.mat("#faf6ec"),0,2.9,-5);
  // Split the side wall around a real window aperture.
  const plaster=kit.mat("#e2e7f8");
  kit.box(walls,.15,5.8,3,plaster,-6,2.9,-3.5);
  kit.box(walls,.15,5.8,3,plaster,-6,2.9,3.5);
  kit.box(walls,.15,1.7,4,plaster,-6,.85,0);
  kit.box(walls,.15,1.1,4,plaster,-6,5.25,0);
  const sky=kit.mat("#85b6ff",.3);kit.box(walls,.035,2.85,3.8,sky,-6.08,3.22,0);
  for(const z of [-2,0,2])kit.box(walls,.22,3.1,.07,kit.mat("#fffdf4"),-5.94,3.2,z);
  kit.box(walls,.27,.09,4.2,kit.mat("#fffdf4"),-5.9,3.2,0);
  const specs=[
    {kind:"rug",width_ft:4.5,length_ft:5,height:.045,x:1.2,z:1.2,material_color:"#2b43ee"},
    {kind:"bed",width_ft:3.25,length_ft:6.6,height:2.5,x:-3.6,z:.7,material_color:"#fff5d6"},
    {kind:"desk",width_ft:4.2,length_ft:2.2,height:2.6,x:2.4,z:-3.7},
    {kind:"chair",width_ft:1.55,length_ft:1.6,height:2.9,x:2.3,z:-1.4,material_color:"#5062ff"},
    {kind:"dresser",width_ft:2,length_ft:1.8,height:2.3,x:-.5,z:-3.85},
    {kind:"lamp",width_ft:.8,length_ft:.8,height:1.6,x:3.6,z:-3.8,y:2.62},
    {kind:"plant",width_ft:1.2,length_ft:1.2,height:2.2,x:4.7,z:3.7},
    {kind:"art",width_ft:1.7,length_ft:.09,height:2.1,x:1.2,z:-4.84,y:3.25},
    {kind:"pillow",width_ft:1,length_ft:.8,height:.3,x:-3.6,z:-.9,y:2.19,material_color:"#314aff"},
  ];
  const models=specs.map((spec,i)=>{const group=kit.build({...spec,id:`showcase-${i}`},["#f5efdd","#778cf5","#ffdc60"]);group.position.set(spec.x,spec.y||0,spec.z);world.add(group);return group;});
  const blueprint=new T.Group();world.add(blueprint);
  const lines=[];
  function rect(x,z,w,d){lines.push(x,.035,z,x+w,.035,z,x+w,.035,z,x+w,.035,z+d,x+w,.035,z+d,x,.035,z+d,x,.035,z+d,x,.035,z);}
  rect(-6,-5,12,10);specs.slice(0,5).forEach(f=>rect(f.x-f.width_ft/2,f.z-f.length_ft/2,f.width_ft,f.length_ft));
  const geo=new T.BufferGeometry();geo.setAttribute("position",new T.Float32BufferAttribute(lines,3));
  const lineMat=new T.LineBasicMaterial({color:0xc4d6ff,transparent:true});blueprint.add(new T.LineSegments(geo,lineMat));
  const grid=new T.GridHelper(12,12,0x7c91e8,0x384d99);grid.position.y=-.015;blueprint.add(grid);
  const cursor=new T.Group();const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(0,.85);shape.lineTo(.67,.28);shape.lineTo(.33,.24);shape.lineTo(.15,0);shape.closePath();
  const cursorGeo=new T.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false}),cursorMat=kit.mat("#ffdc60");cursor.add(new T.Mesh(cursorGeo,cursorMat));world.add(cursor);
  let progress=0,frame=0,visible=true,dead=false;
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function draw(){
    frame=0;if(dead||!visible)return;
    const reveal=ease((progress-.08)/.53),angle=ease((progress-.04)/.85);
    floor.visible=progress>.04;floor.scale.y=Math.max(.01,reveal);
    walls.visible=reveal>.01;walls.scale.y=Math.max(.001,ease((progress-.17)/.5));
    models.forEach((model,i)=>{const p=ease((progress-.11-i*.035)/.31),f=specs[i];model.visible=p>.001;model.position.y=(f.y||0)+(1-p)*(4+i*.17);model.scale.setScalar(Math.max(.001,p));model.rotation.y=(1-p)*.22;});
    // The desk and chair slide together before the room-view camera settles.
    const arrange=ease((progress-.57)/.2);models[2].position.x=2.4+.8*(1-arrange);models[3].position.x=2.3+.8*(1-arrange);
    blueprint.visible=progress<.7;lineMat.opacity=1-ease((progress-.35)/.3);
    grid.material.transparent=true;grid.material.opacity=lineMat.opacity*.5;
    cursor.visible=progress>.35&&progress<.87;cursor.position.set(models[2].position.x+2,3.2,-2.4);cursor.rotation.set(-.6,0,-.3);cursor.scale.setScalar(.9);
    const azimuth=.68+angle*.2,elevation=1.53-angle*.87,r=30.5;
    camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(azimuth)*Math.cos(elevation)*r);
    camera.lookAt(focus);renderer.render(scene,camera);
  }
  const request=()=>{if(!frame&&!dead)frame=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(()=>{const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();request();});resize.observe(container);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)request();});observer.observe(container);
  function lost(event){event.preventDefault();container.dataset.ready="false";}
  renderer.domElement.addEventListener("webglcontextlost",lost);
  return {progress(value){progress=Math.max(0,Math.min(1,value));request();},destroy(){dead=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();renderer.domElement.removeEventListener("webglcontextlost",lost);geo.dispose();lineMat.dispose();grid.geometry.dispose();grid.material.dispose();cursorGeo.dispose();kit.dispose();renderer.dispose();renderer.domElement.remove();}};
}
