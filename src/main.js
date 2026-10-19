import * as THREE from 'three';
import { createWorld } from './world.js';
import { createFlyers, animateFlyers } from './flyers.js';
import { Visitor, constrainPosition, floorHeight } from './navigation.js';
import { SECTIONS } from './sections.js';
import { validateConfig } from './config.js';
import './style.css';

const $=id=>document.getElementById(id);
const canvas=$('world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,world,visitor,posters=[];
let loaded=false,lastTime=performance.now(),lastRender=0,dirty=true,hovered=null;
let mouse=null,needPick=false,guideTimer,toastTimer,activePoster=null;
const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();

function toast(text) {
  $('toast').textContent=text;$('toast').classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);
}
function dismissGuide() {
  clearTimeout(guideTimer);$('guide').classList.add('dismissed');
}
function pick(x,y) {
  if(!world)return null;
  ndc.set(x/innerWidth*2-1,-y/innerHeight*2+1);
  raycaster.setFromCamera(ndc,camera);
  const objects=[world.shelter,world.cat,world.ground,world.road,...world.bottles,...posters.map(p=>p.group)];
  const hits=raycaster.intersectObjects(objects,true);
  const hit=hits[0];
  if(!hit)return null;
  if(hit.object.userData.poster)return {poster:hit.object.userData.poster,point:hit.point};
  if(hit.object.userData.cat)return {cat:true,point:hit.point};
  if(hit.object.userData.floor||(hit.point.y<.4&&hit.face.normal.y>.6))return {floor:true,point:hit.point};
  return null;
}
function paperBounds(poster) {
  const box=new THREE.Box3().setFromObject(poster.mesh);
  const points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
  const xs=points.map(p=>(p.x*.5+.5)*innerWidth),ys=points.map(p=>(-.5*p.y+.5)*innerHeight);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
function showReader(poster) {
  if(visitor.mode!=='reading')return;
  const dialog=$('paperDialog'),content=$('paperContent'),p=poster.p;
  content.replaceChildren();dialog.style.setProperty('--reader-paper',p.color);
  if(p.link) {
    const h=document.createElement('h3');h.id='sheetTitle';h.textContent=p.title.replaceAll('\n',' ');
    const paragraph=document.createElement('p');paragraph.textContent=p.text;
    const link=document.createElement('a');link.href=p.link;link.target='_blank';link.rel='noopener';link.textContent=p.cta;
    content.append(h,paragraph,link);
  } else content.innerHTML=SECTIONS[p.section].html;
  const from=paperBounds(poster);
  dialog.showModal();
  const to=dialog.getBoundingClientRect();
  if(!reduced.matches)dialog.animate([
    {opacity:.25,transform:`translate(${from.x+from.width/2-to.x-to.width/2}px,${from.y+from.height/2-to.y-to.height/2}px) scale(${Math.min(1.2,from.width/to.width)},${Math.min(1.2,from.height/to.height)}) rotate(-.8deg)`},
    {opacity:1,transform:'translate(0,0) scale(1) rotate(0deg)'}
  ],{duration:470,easing:'cubic-bezier(.16,1,.3,1)'});
  $('experience').dataset.reading=p.id;
}
function approach(poster) {
  if(!loaded||visitor.busy)return;
  activePoster=poster;
  for(const item of posters)item.targetHover=item===poster?1:0;
  dismissGuide();canvas.style.cursor='default';
  visitor.approach(poster,()=>showReader(poster));
}
function bindReader() {
  const dialog=$('paperDialog');
  document.querySelector('.close-paper').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    delete $('experience').dataset.reading;
    if(activePoster)activePoster.targetHover=0;
    visitor.returnFromPoster();
    activePoster=null;dirty=true;
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
}
function keyboardLinks() {
  const nav=$('keyboardLinks');
  for(const poster of posters){
    const button=document.createElement('button');button.textContent=poster.p.title.replaceAll('\n',' ');
    button.addEventListener('click',()=>approach(poster));
    nav.append(button);
  }
}
function resize() {
  renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();dirty=true;needPick=true;
}
function frame(time) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
  if(document.hidden||!visitor)return;
  const moved=visitor.update(time,dt);
  if(moved){dirty=true;needPick=true;}
  if(loaded&&needPick&&mouse&&!visitor.down&&!visitor.busy){
    const hit=pick(mouse.x,mouse.y);hovered=hit?.poster||null;
    for(const poster of posters)poster.targetHover=poster===hovered?1:0;
    canvas.style.cursor=hovered||hit?.cat?'pointer':hit?.floor?'crosshair':'grab';needPick=false;
  }
  if(loaded&&animateFlyers(posters,dt,time,reduced.matches)){dirty=true;renderer.shadowMap.needsUpdate=true;}
  if(visitor.walkTarget&&world?.walkMarker){
    const marker=world.walkMarker;marker.visible=true;
    const target=constrainPosition(visitor.walkTarget);marker.position.set(target.x,floorHeight(target.z)+.007,target.z);
    marker.material.opacity=.3+.12*Math.sin(time*.004);dirty=true;
  }else if(world?.walkMarker?.visible){world.walkMarker.visible=false;dirty=true;}
  if(!dirty&&time-lastRender<800)return;
  renderer.render(scene,camera);lastRender=time;dirty=false;
  $('experience').dataset.camera=`${visitor.position.x.toFixed(3)},${visitor.position.y.toFixed(3)},${visitor.position.z.toFixed(3)}`;
}
async function init() {
  try {
    const response=await fetch('/scene-config.json');if(!response.ok)throw new Error('Configuration unavailable');
    // Public visits always use published data. The former browser-local editor is gone.
    const config=validateConfig(await response.json());
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=config.lighting.exposure;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.04,350);
    visitor=new Visitor(camera,canvas,{
      pick,onPoster:approach,onCat:()=>toast('Тсс… он на перерыве.'),onInteraction:dismissGuide,
      onMode:mode=>{ $('experience').dataset.mode=mode;dirty=true; },reduced
    });
    resize();requestAnimationFrame(frame);
    const fonts=Promise.all([
      document.fonts.load('400 24px "Russo One"','Роллан разработчик ABC'),
      document.fonts.load('700 24px "Golos Text"','Роллан разработчик ABC'),
      document.fonts.load('400 24px "Golos Text"','Роллан разработчик ABC'),
      document.fonts.load('700 24px "Caveat"','Роллан разработчик ABC')
    ]).catch(()=>{});
    world=await createWorld(renderer,scene,config,value=>{$('loadProgress').style.width=`${value}%`;});
    await fonts;
    posters=createFlyers(scene,world.shelter,config,renderer.capabilities.getMaxAnisotropy());
    const marker=new THREE.Mesh(new THREE.RingGeometry(.085,.095,32),new THREE.MeshBasicMaterial({color:'#e2cc8e',transparent:true,opacity:.45,depthWrite:false}));
    marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);world.walkMarker=marker;
    $('experience').dataset.catSupport=world.catSupport.toFixed(4);
    $('experience').dataset.catBase=world.catBaseY.toFixed(4);
    $('loadProgress').style.width='100%';loaded=true;renderer.shadowMap.needsUpdate=true;dirty=true;
    keyboardLinks();bindReader();$('loader').hidden=true;$('experience').dataset.loaded='true';visitor.setMode('explore');
    if(matchMedia('(pointer:coarse)').matches)$('guide').textContent='Потяни, чтобы оглядеться · Коснись пола, чтобы подойти · Нажми на листок';
    $('guide').hidden=false;guideTimer=setTimeout(dismissGuide,9000);
    canvas.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'){mouse={x:event.clientX,y:event.clientY};needPick=true;}});
    canvas.addEventListener('pointerleave',()=>{mouse=null;for(const p of posters)p.targetHover=0;});
    window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=performance.now();dirty=true;});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;});
  } catch(error) {
    console.error(error);$('loader').hidden=true;$('error').hidden=false;
  }
}
init();
