import * as THREE from 'three';
import { createWorld } from './world.js';
import { createFlyers, animateFlyers } from './flyers.js';
import { Visitor, constrainPosition, floorHeight } from './navigation.js';
import { mountPaper } from './paper.js';
import { validateConfig } from './config.js';
import { PaperReader } from './reader.js';
import { Companion } from './companion.js';
import './style.css';

const $=id=>document.getElementById(id);
const canvas=$('world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,world,visitor,reader,companion,posters=[];
let loaded=false,lastTime=performance.now(),dirty=true,hovered=null;
let mouse=null,needPick=false,guideTimer,toastTimer,activePoster=null,guideShownAt=0;
let renderedFrames=0,lastRenderAt=0,frameMs=16.7;
const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
raycaster.firstHitOnly=true;

function toast(text) {
  $('toast').textContent=text;$('toast').classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);
}
function dismissGuide(force=false) {
  if(!force&&performance.now()-guideShownAt<4500)return;
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
function paperQuad(poster) {
  poster.mesh.updateWorldMatrix(true,false);
  const positions=poster.geometry.attributes.position;
  return [0,12,positions.count-13,positions.count-1].map(index=>{
    const point=new THREE.Vector3().fromBufferAttribute(positions,index).applyMatrix4(poster.mesh.matrixWorld).project(camera);
    return {x:(point.x*.5+.5)*innerWidth,y:(-.5*point.y+.5)*innerHeight};
  });
}
function showReader(poster) {
  if(visitor.mode!=='taking')return;
  const dialog=$('paperDialog'),content=$('paperContent'),p=poster.p;
  dialog.style.setProperty('--reader-paper',p.color);
  dialog.style.setProperty('--paper-front',`url("${poster.paper.frontURL}")`);
  dialog.dataset.paperFace=p.id;
  mountPaper(content,poster.paper,p.title);
  reader.open(poster);
  $('experience').dataset.reading=p.id;
}
function approach(poster) {
  if(!loaded||visitor.busy)return;
  activePoster=poster;
  for(const item of posters)item.targetHover=item===poster?1:0;
  dismissGuide(true);canvas.style.cursor='default';
  visitor.approach(poster,()=>showReader(poster));
}
function bindReader() {
  reader=new PaperReader({
    dialog:$('paperDialog'),reduced,wallQuad:paperQuad,
    invalidate:()=>{dirty=true;},onMode:mode=>visitor.setMode(mode),
    onReturn:()=>{
      delete $('experience').dataset.reading;
      if(activePoster)activePoster.targetHover=0;
      visitor.returnFromPoster();activePoster=null;dirty=true;
    }
  });
}
function keyboardLinks() {
  const nav=$('keyboardLinks');
  for(const poster of posters){
    const button=document.createElement('button');button.textContent=poster.p.title.replaceAll('\n',' ');
    button.addEventListener('click',()=>approach(poster));
    nav.append(button);
  }
  const catButton=document.createElement('button');catButton.textContent='Погладить кота';
  catButton.addEventListener('click',()=>{dismissGuide(true);companion.interact();});nav.append(catButton);
}
function resize() {
  visitor?.clearPointers();
  renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();dirty=true;needPick=true;
  reader?.resize();
}
function frame(time) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
  if(document.hidden||!visitor)return;
  const moved=visitor.update(time,dt);
  reader?.update(time);
  if(companion?.update(time))dirty=true;
  if(moved){dirty=true;needPick=true;}
  if(loaded&&needPick&&mouse&&!visitor.down&&!visitor.busy){
    const hit=pick(mouse.x,mouse.y);hovered=hit?.poster||null;
    for(const poster of posters)poster.targetHover=poster===hovered?1:0;
    canvas.style.cursor=hovered||hit?.cat?'pointer':hit?.floor?'crosshair':'grab';
    const cue=$('worldCue');
    cue.classList.toggle('visible',!!hit?.cat);
    if(hit?.cat){cue.textContent='Погладить';cue.style.left=`${mouse.x}px`;cue.style.top=`${mouse.y-22}px`;}
    needPick=false;
  }
  if(visitor.busy)$('worldCue').classList.remove('visible');
  if(loaded&&animateFlyers(posters,dt,time,reduced.matches))dirty=true;
  if(visitor.walkTarget&&world?.walkMarker){
    const marker=world.walkMarker;marker.visible=true;
    const target=constrainPosition(visitor.walkTarget);marker.position.set(target.x,floorHeight(target.z)+.007,target.z);
    marker.material.opacity=.3+.12*Math.sin(time*.004);dirty=true;
  }else if(world?.walkMarker?.visible){world.walkMarker.visible=false;dirty=true;}
  if(!dirty)return;
  renderer.render(scene,camera);dirty=false;
  const interval=time-lastRenderAt;
  if(interval>0&&interval<200)frameMs=frameMs*.85+interval*.15;
  lastRenderAt=time;
  $('experience').dataset.renderedFrames=String(++renderedFrames);
  $('experience').dataset.frameMs=frameMs.toFixed(1);
  $('experience').dataset.camera=`${visitor.position.x.toFixed(3)},${visitor.position.y.toFixed(3)},${visitor.position.z.toFixed(3)}`;
}
async function init() {
  try {
    const response=await fetch('/scene-config.json');if(!response.ok)throw new Error('Configuration unavailable');
    // Public visits always use published data. The former browser-local editor is gone.
    const config=validateConfig(await response.json());
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=config.lighting.exposure;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.04,350);
    visitor=new Visitor(camera,canvas,{
      pick,onPoster:approach,onCat:()=>{dismissGuide(true);companion?.interact();},onInteraction:dismissGuide,
      onMode:mode=>{ $('experience').dataset.mode=mode;dirty=true; },reduced
    });
    resize();bindReader();requestAnimationFrame(frame);
    const fonts=Promise.all([
      document.fonts.load('400 24px "Russo One"','Роллан разработчик ABC'),
      document.fonts.load('700 24px "Golos Text"','Роллан разработчик ABC'),
      document.fonts.load('400 24px "Golos Text"','Роллан разработчик ABC'),
      document.fonts.load('700 24px "Caveat"','Роллан разработчик ABC')
    ]).catch(()=>{});
    world=await createWorld(renderer,scene,config,value=>{$('loadProgress').style.width=`${value}%`;});
    await Promise.all([fonts,reader.ready]);
    posters=createFlyers(scene,world.shelter,config,renderer.capabilities.getMaxAnisotropy());
    companion=new Companion({cat:world.cat,visitor,reader,camera,host:$('experience'),reduced,invalidate:()=>{dirty=true;},onMessage:toast});
    visitor.onCancelCat=()=>companion.finish(true);
    const marker=new THREE.Mesh(new THREE.RingGeometry(.085,.095,32),new THREE.MeshBasicMaterial({color:'#e2cc8e',transparent:true,opacity:.45,depthWrite:false}));
    marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);world.walkMarker=marker;
    $('experience').dataset.catSupport=world.catSupport.toFixed(4);
    $('experience').dataset.catBase=world.catBaseY.toFixed(4);
    $('loadProgress').style.width='100%';loaded=true;renderer.shadowMap.needsUpdate=true;dirty=true;
    keyboardLinks();$('loader').hidden=true;$('experience').dataset.loaded='true';visitor.setMode('explore');
    if(matchMedia('(pointer:coarse)').matches)$('guideControls').innerHTML='<span>Коснись пола — подойти<br><small>Потяни пальцем — оглядеться</small></span><span class="guide-divider"></span><span>Нажми на листок<br><small>чтобы взять его в руки</small></span>';
    guideShownAt=performance.now();$('guide').classList.remove('dismissed');$('guide').hidden=false;guideTimer=setTimeout(()=>dismissGuide(true),10000);
    canvas.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'){mouse={x:event.clientX,y:event.clientY};needPick=true;}});
    canvas.addEventListener('pointerleave',()=>{mouse=null;$('worldCue').classList.remove('visible');for(const p of posters)p.targetHover=0;});
    window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=performance.now();dirty=true;});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;});
  } catch(error) {
    console.error(error);$('loader').hidden=true;$('error').hidden=false;
  }
}
init();
