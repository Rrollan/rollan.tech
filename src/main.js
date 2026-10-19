import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { SECTIONS } from './sections.js';
import { validateConfig } from './config.js';
import './style.css';

const $ = id => document.getElementById(id);
const canvas = $('world');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, scene, camera, sun, config, defaults, editing = false, selected = 0, currentView = 'about', transition = null;
let dirty = true, down = null, toastTimer, draftTimer, lastFrame = 0;
let yaw = 0, pitch = 0, wasMobile = null;
const posterMeshes = [], hotspotButtons = [];
const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const cameraPosition = new THREE.Vector3(0,1.68,1.14);
const poses = {
  about:{position:[-.08,1.68,1.14],yaw:-.13,pitch:.015,label:'Доска объявлений'},
  project:{position:[-.3,1.78,0],yaw:Math.PI/2,pitch:0,label:'Стенка с проектами'},
  contact:{position:[.3,1.78,0],yaw:-Math.PI/2,pitch:0,label:'Связь — на соседней стенке'},
  services:{position:[.95,1.88,1.14],yaw:0,pitch:0,label:'Услуги — на той же стенке'},
  street:{position:[0,1.65,.70],yaw:Math.PI,pitch:0,label:'А пока — тёплый вечер'}
};
const order = ['project','about','services','contact','street'];
const assetURLs = {
  shelter:new URL('../assets/models/web/shelter.glb',import.meta.url).href,
  house:new URL('../assets/models/web/house.glb',import.meta.url).href,
  cat:new URL('../assets/models/web/cat.glb',import.meta.url).href
};

function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('toast').classList.remove('show'),3500); }
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(()=>{try{localStorage.setItem('rollan-stop-draft-v1',JSON.stringify(config));$('saveNote').textContent='Черновик сохранён в этом браузере. Публикация: скачай настройки и замени public/scene-config.json в репозитории.';}catch{$('saveNote').textContent='Браузер не разрешил сохранить черновик. Скачай настройки, чтобы их не потерять.';}},250);
}
function applyLighting() {renderer.toneMappingExposure=config.lighting.exposure;sun.intensity=config.lighting.sunPower;dirty=true;}

function makeGroundTexture() {
  const c = document.createElement('canvas'); c.width=c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle='#8a8779';ctx.fillRect(0,0,512,512);
  let seed=42; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<24000;i++){const v=90+random()*90;ctx.fillStyle=`rgba(${v},${v-3},${v-10},.16)`;ctx.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}
  ctx.strokeStyle='#666b6060';ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);ctx.strokeRect(256,256,256,256);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(18,18);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function box(w,h,d,color,x,y,z) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.96}));m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
function environment() {
  const sky=new Sky();sky.scale.setScalar(450);const u=sky.material.uniforms;u.turbidity.value=7;u.rayleigh.value=1.5;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.8;
  const sunPosition=new THREE.Vector3(-.82,.14,.55).normalize();u.sunPosition.value.copy(sunPosition);scene.add(sky);
  const pmrem=new THREE.PMREMGenerator(renderer);const envScene=new THREE.Scene();const envSky=sky.clone();envScene.add(envSky);const env=pmrem.fromScene(envScene,.04,.1,500);scene.environment=env.texture;scene.environmentIntensity=.45;pmrem.dispose();
  scene.fog=new THREE.FogExp2('#c5baa1',.009);
  scene.add(new THREE.HemisphereLight('#c6dddf','#9d9174',1.8));
  sun=new THREE.DirectionalLight('#ffdaa1',config.lighting.sunPower);sun.position.set(-12,6,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({map:makeGroundTexture(),roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;scene.add(ground);
  box(180,.12,7,'#4e514b',0,-.025,8.7);
  for(let x=-80;x<80;x+=5) box(2.5,.004,.12,'#cfbf90',x,.041,8.7);
  box(160,.16,.22,'#aaa99a',0,.035,5.1);
  box(160,.16,.22,'#aaa99a',0,.035,12.3);
  box(100,.01,13,'#7c8562',0,-.005,-11);
  const leavesCanvas=document.createElement('canvas');leavesCanvas.width=leavesCanvas.height=128;
  const lc=leavesCanvas.getContext('2d');let treeSeed=74;const rand=()=>{treeSeed=(treeSeed*16807)%2147483647;return treeSeed/2147483647;};
  for(let i=0;i<45;i++){const x=18+rand()*92,y=18+rand()*92;lc.fillStyle=`rgba(${110+rand()*55},${120+rand()*45},${55+rand()*35},${.65+rand()*.35})`;lc.beginPath();lc.ellipse(x,y,3+rand()*5,6+rand()*5,rand()*6.28,0,Math.PI*2);lc.fill();}
  const leafTexture=new THREE.CanvasTexture(leavesCanvas);leafTexture.colorSpace=THREE.SRGBColorSpace;
  const leafMaterial=new THREE.MeshStandardMaterial({map:leafTexture,alphaTest:.4,side:THREE.DoubleSide,roughness:1});
  const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05,1.05),leafMaterial,17*260);const dummy=new THREE.Object3D();let leafIndex=0;
  const trunkGeo=new THREE.CylinderGeometry(.085,.15,3.9,9),trunkMat=new THREE.MeshStandardMaterial({color:'#766853',roughness:1});
  for(let i=0;i<17;i++) {
    const x=(i-8)*5.7,z=i%2===0?-7:17.5;
    const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.position.set(x,1.9,z);scene.add(trunk);
    for(let j=0;j<260;j++){
      const theta=rand()*Math.PI*2,cosPhi=rand()*2-1,r=Math.cbrt(rand());const sinPhi=Math.sqrt(1-cosPhi*cosPhi);
      dummy.position.set(x+Math.cos(theta)*sinPhi*r*1.7,4.2+cosPhi*r*2.25,z+Math.sin(theta)*sinPhi*r*1.5);
      dummy.rotation.set(rand()*Math.PI,rand()*Math.PI,rand()*Math.PI);dummy.scale.setScalar(.5+rand()*.65);dummy.updateMatrix();leaves.setMatrixAt(leafIndex,dummy.matrix);leaves.setColorAt(leafIndex++,new THREE.Color().setHSL(.16+rand()*.08,.24+rand()*.2,.39+rand()*.2));
    }
  }
  leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;scene.add(leaves);
  // A pair of streetlights frames the road rather than cluttering the shelter.
  for(const x of [-8,10]) {box(.10,6,.1,'#666f61',x,3,4.4);box(1.2,.08,.16,'#656c5e',x+.5,5.9,4.4);const bulb=box(.48,.06,.22,'#ffe5a2',x+1,5.85,4.4);bulb.material.emissive.set('#e2b962');bulb.material.emissiveIntensity=1.2;}
}
function normalizeModel(root,target) {
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
  const group=new THREE.Group();group.add(root);
  if(Array.isArray(target)) group.scale.set(target[0]/size.x,target[1]/size.y,target[2]/size.z);
  else group.scale.setScalar(target/size.x);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.envMapIntensity=.5;if(o.material.normalScale)o.material.normalScale.set(.55,.55);}});
  return group;
}
async function loadModels() {
  const shelter=await loader.loadAsync(assetURLs.shelter,e=>{if(e.total)$('loadProgress').style.width=`${10+65*e.loaded/e.total}%`;});
  const root=normalizeModel(shelter.scene,[5.3,3.2,2.65]);scene.add(root);root.name='shelter';
  $('loadProgress').style.width='82%';
  // The close-up shelter renders first. Background assets can arrive afterward.
  loader.loadAsync(assetURLs.house).then(g=>{
    const source=normalizeModel(g.scene,[28,14,9]);
    for(const [x,z,angle] of [[-10,31,Math.PI],[25,28,Math.PI],[-30,-25,0],[9,-28,0]]){const home=source.clone(true);home.position.set(x,0,z);home.rotation.y=angle;home.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(home);}dirty=true;
  }).catch(e=>console.warn('Background house unavailable',e));
  loader.loadAsync(assetURLs.cat).then(g=>{const cat=normalizeModel(g.scene,.58);cat.position.set(1.25,.52,-.46);cat.rotation.y=-.55;scene.add(cat);dirty=true;}).catch(e=>console.warn('Cat unavailable',e));
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=20) {
  let count=0;
  for(const paragraph of text.split('\n')) {
    let line='';
    for(const word of paragraph.split(' ')) {
      const trial=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(trial).width>maxWidth){ctx.fillText(line,x,y);y+=lineHeight;if(++count>=maxLines)return y;line=word;}else line=trial;
    }
    ctx.fillText(line,x,y);y+=lineHeight;if(++count>=maxLines)return y;
  }
  return y;
}
function posterTexture(p,index) {
  const c=document.createElement('canvas');c.width=1024;c.height=1240;const ctx=c.getContext('2d');const dark=new THREE.Color(p.color).getHSL({}).l<.3;
  ctx.fillStyle=p.color;ctx.fillRect(0,0,c.width,c.height);
  const grain=ctx.createLinearGradient(0,0,1024,1240);grain.addColorStop(0,'#fff8dd15');grain.addColorStop(1,'#402c1920');ctx.fillStyle=grain;ctx.fillRect(0,0,1024,1240);
  let seed=170+index;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<5500;i++){ctx.fillStyle=rand()>.5?'#302a1b08':'#fffbea13';ctx.fillRect(rand()*1024,rand()*1240,1+rand()*3,1+rand()*2);}
  const ink=dark?'#e5c688':'#2b332a',muted=dark?'#d2c4aa':'#5c6051';ctx.fillStyle=muted;ctx.font='500 22px "Golos Text", sans-serif';ctx.fillText(`ОБЪЯВЛЕНИЕ № 00${index+1}  /  РОЛЛАН.ТЕХ`,62,89);
  ctx.strokeStyle=dark?'#c5ac6d77':'#7e7c6470';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(62,116);ctx.lineTo(962,116);ctx.stroke();
  ctx.fillStyle=ink;ctx.font='800 76px "Golos Text", sans-serif';let y=wrapText(ctx,p.title,60,233,900,85,5);
  if(p.id==='game'){ctx.font='italic 56px Georgia, serif';ctx.fillStyle='#cba460';ctx.fillText('I M P E R I V M',64,560);y=Math.max(y,650);}
  ctx.fillStyle=muted;ctx.font='400 35px "Golos Text", sans-serif';wrapText(ctx,p.text,65,y+53,875,53,7);
  if(p.id==='about'){
    ctx.save();ctx.translate(690,830);ctx.rotate(-.12);ctx.strokeStyle='#9c4d34';ctx.lineWidth=5;ctx.strokeRect(-175,-51,350,94);ctx.fillStyle='#9c4d34';ctx.font='700 35px "Golos Text",sans-serif';ctx.fillText('ЖИВ. НА СВЯЗИ.',-148,8);ctx.restore();
    ctx.fillStyle='#6c7359';ctx.font='500 46px "Caveat",cursive';ctx.fillText('сложное → понятное',64,920);
  }
  if(p.id==='services'){
    ctx.strokeStyle='#6c735955';ctx.lineWidth=2;ctx.strokeRect(64,760,895,155);ctx.fillStyle='#53654d';ctx.font='500 29px "Golos Text",sans-serif';ctx.fillText('TypeScript   /   React   /   Next.js',91,820);ctx.fillText('Solana   /   Python   /   ИИ-агенты',91,872);
  }
  if(p.id==='contacts'){
    ctx.fillStyle='#8a6b3b';ctx.font='500 56px "Caveat",cursive';ctx.fillText('без менеджеров и «мы перезвоним»',64,832);
  }
  ctx.fillStyle=dark?'#e8cb8e':'#9c4d34';ctx.font='700 54px "Caveat", cursive';wrapText(ctx,p.cta,64,1050,880,60,2);
  ctx.strokeStyle=dark?'#d8b57588':'#61665277';ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(60,1130);ctx.lineTo(964,1130);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=muted;ctx.font='400 23px "Golos Text", sans-serif';ctx.fillText(p.id==='contacts'?'t.me/oderefyu · забирай, не стесняйся':'Приклеено с душой. Открывается по нажатию.',64,1188);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
}
function placePoster(group,p) {
  group.scale.setScalar(p.size);
  if(p.wall==='about'){group.position.set(p.x,p.y,-.96);group.rotation.set(0,0,THREE.MathUtils.degToRad(p.angle));}
  if(p.wall==='project'){group.position.set(-2.0,p.y,p.x*.32);group.rotation.set(0,Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
  if(p.wall==='contact'){group.position.set(1.96,p.y,-p.x*.32);group.rotation.set(0,-Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
}
function rebuildPosters() {
  for(const g of posterMeshes){scene.remove(g);g.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});}
  posterMeshes.length=0;$('hotspots').replaceChildren();hotspotButtons.length=0;
  config.posters.forEach((p,index)=>{
    const group=new THREE.Group();group.userData.poster=index;
    const tex=posterTexture(p,index);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.38,1.45),new THREE.MeshStandardMaterial({map:tex,roughness:.96,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));mesh.userData.poster=index;group.add(mesh);
    const tapeMat=new THREE.MeshStandardMaterial({color:'#c6b990',transparent:true,opacity:.75,roughness:1,side:THREE.DoubleSide});
    for(const x of [-.47,.48]){const tape=new THREE.Mesh(new THREE.PlaneGeometry(.34,.10),tapeMat.clone());tape.position.set(x,.73,.008);tape.rotation.z=x*.18;group.add(tape);}
    placePoster(group,p);scene.add(group);posterMeshes.push(group);
    const button=document.createElement('button');button.className='hotspot';button.setAttribute('aria-label',`Открыть: ${p.title.replaceAll('\n',' ')}`);const label=document.createElement('span');label.textContent='↗';button.append(p.cta.replace(/[→↗]/g,'').trim()||'Подробнее',label);button.addEventListener('click',()=>editing?selectPoster(index):openPoster(index));$('hotspots').append(button);hotspotButtons.push(button);
  });dirty=true;
}
function setView(key,immediate=false) {
  if(!poses[key])key='about';const target={...poses[key]};
  if(innerWidth<700){
    if(key==='about'){target.position=[-.94,1.88,1.14];target.yaw=0;target.pitch=0;}
    if(key==='project')target.position=[.35,1.88,0];
    if(key==='contact')target.position=[-.35,1.88,0];
  }
  currentView=key;
  $('nextPoster').hidden=innerWidth>=700||!['about','services'].includes(key);$('nextPoster').textContent=key==='services'?'← Обо мне':'Услуги →';
  const nearest=target.yaw+Math.round((yaw-target.yaw)/(Math.PI*2))*Math.PI*2;
  transition={start:performance.now(),duration:immediate||reduced.matches?0:1100,from:cameraPosition.clone(),to:new THREE.Vector3(...target.position),yawFrom:yaw,yawTo:nearest,pitchFrom:pitch,pitchTo:target.pitch};
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(key==='services'?'about':key))));
  $('viewLabel').textContent=target.label;$('streetView').textContent=key==='street'?'Вернуться к объявлениям ↶':'Оглянуться на улицу ↶';$('sceneNote').style.opacity=key==='about'&&!editing?'1':'0';dirty=true;
}
function animateCamera(time){if(!transition)return;const t=transition.duration?Math.min(1,(time-transition.start)/transition.duration):1;const e=t*t*(3-2*t);cameraPosition.lerpVectors(transition.from,transition.to,e);yaw=THREE.MathUtils.lerp(transition.yawFrom,transition.yawTo,e);pitch=THREE.MathUtils.lerp(transition.pitchFrom,transition.pitchTo,e);if(t===1)transition=null;dirty=true;}
function updateCamera(){camera.position.copy(cameraPosition);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();}
function projectHotspots(){
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  posterMeshes.forEach((group,i)=>{
    const position=group.localToWorld(new THREE.Vector3(0,-.76,0));const facing=group.localToWorld(new THREE.Vector3(0,0,1)).sub(group.position).normalize();
    const toCamera=camera.position.clone().sub(group.position).normalize();const projected=position.clone().project(camera);const inView=toCamera.dot(facing)>.12&&projected.z<1&&projected.z>0&&Math.abs(projected.x)<.93&&Math.abs(projected.y)<.82;
    const button=hotspotButtons[i];button.hidden=!inView;button.style.left=`${(projected.x*.5+.5)*innerWidth}px`;button.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;
  });
}
function openPoster(index) {
  const p=config.posters[index];if(editing){selectPoster(index);return;}
  const dialog=$('paperDialog'),content=$('paperContent');content.replaceChildren();dialog.classList.toggle('dark',p.section==='game');
  if(p.link){const kicker=document.createElement('div');kicker.className='kicker';kicker.textContent='Объявление с остановки';const h=document.createElement('h3');h.textContent=p.title;const text=document.createElement('p');text.textContent=p.text;const a=document.createElement('a');a.href=p.link;a.target='_blank';a.rel='noopener';a.textContent=p.cta||'Открыть ссылку ↗';content.append(kicker,h,text,a);}
  else{content.innerHTML=SECTIONS[p.section].html;const intro=document.createElement('p');intro.textContent=p.text;intro.className='custom-intro';content.querySelector('h3').textContent=p.title.replaceAll('\n',' ');content.querySelector('h3').after(intro);}
  dialog.showModal();$('lookHint').style.opacity='0';
}
function bindNavigation(){
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('nextPoster').addEventListener('click',()=>setView(currentView==='services'?'about':'services'));
  $('home').addEventListener('click',()=>setView('about'));
  $('streetView').addEventListener('click',()=>setView(currentView==='street'?'about':'street'));
  document.querySelector('.close-paper').addEventListener('click',()=>$('paperDialog').close());
  $('paperDialog').addEventListener('click',e=>{if(e.target===$('paperDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  document.addEventListener('keydown',e=>{
    if($('paperDialog').open||editing||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.key==='Escape')setView('about');if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const i=order.indexOf(currentView);setView(order[(i+(e.key==='ArrowRight'?1:-1)+order.length)%order.length]);}
  });
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    down={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false};transition=null;
    if(editing){
      pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects(posterMeshes,true).find(h=>h.object.userData.poster!==undefined);
      if(hit){
        const index=hit.object.userData.poster,p=config.posters[index];
        selectPoster(index);transition=null;
        down.dragPoster=index;down.startX=p.x;down.startY=p.y;down.hit=hit.point.clone();
        down.plane=p.wall==='about'?new THREE.Plane(new THREE.Vector3(0,0,1),.96):p.wall==='project'?new THREE.Plane(new THREE.Vector3(1,0,0),2):new THREE.Plane(new THREE.Vector3(1,0,0),-1.96);
      }
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>5)down.moved=true;
    if(down.dragPoster!==undefined){
      pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.ray.intersectPlane(down.plane,new THREE.Vector3());
      if(hit){const p=config.posters[down.dragPoster];const horizontal=p.wall==='about'?hit.x-down.hit.x:(hit.z-down.hit.z)/(.32*(p.wall==='project'?1:-1));p.x=THREE.MathUtils.clamp(down.startX+horizontal,-1.9,1.9);p.y=THREE.MathUtils.clamp(down.startY+hit.y-down.hit.y,.95,2.65);placePoster(posterMeshes[down.dragPoster],p);$('posterX').value=p.x;$('posterY').value=p.y;dirty=true;}
      return;
    }
    yaw=down.yaw-dx*.0038;pitch=THREE.MathUtils.clamp(down.pitch-dy*.0028,-.55,.55);$('lookHint').style.opacity='0';dirty=true;
  });
  canvas.addEventListener('pointerup',e=>{if(!down)return;const was=down;down=null;if(was.dragPoster!==undefined){saveDraft();}else if(!was.moved){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(posterMeshes,true).find(h=>h.object.userData.poster!==undefined);if(hit)openPoster(hit.object.userData.poster);}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('lostpointercapture',()=>{down=null;});
}
function selectPoster(index){selected=index;const p=config.posters[index];$('posterSelect').value=String(index);for(const [id,key] of [['posterTitle','title'],['posterText','text'],['posterCta','cta'],['posterLink','link'],['posterWall','wall'],['posterColor','color'],['posterX','x'],['posterY','y'],['posterSize','size'],['posterAngle','angle']])$(id).value=p[key];setView(p.wall);}
function editorSetup(){
  const select=$('posterSelect');function options(){select.replaceChildren();config.posters.forEach((p,i)=>{const option=document.createElement('option');option.value=i;option.textContent=p.title.replaceAll('\n',' ');select.append(option);});select.value=String(selected);}
  options();$('exposure').value=config.lighting.exposure;$('sunPower').value=config.lighting.sunPower;
  const close=()=>{editing=false;$('editor').hidden=true;document.body.classList.remove('editing');$('editToggle').focus();setView(currentView);};
  $('editToggle').addEventListener('click',()=>{editing=true;$('editor').hidden=false;document.body.classList.add('editing');selectPoster(selected);$('posterSelect').focus();});$('closeEditor').addEventListener('click',close);
  select.addEventListener('change',()=>selectPoster(Number(select.value)));
  for(const [id,key,numeric] of [['posterTitle','title'],['posterText','text'],['posterCta','cta'],['posterLink','link'],['posterWall','wall'],['posterColor','color'],['posterX','x',true],['posterY','y',true],['posterSize','size',true],['posterAngle','angle',true]]){
    $(id).addEventListener('input',()=>{
      const candidate=structuredClone(config);candidate.posters[selected][key]=numeric?Number($(id).value):$(id).value;
      try{config=validateConfig(candidate);$(id).setCustomValidity('');rebuildPosters();saveDraft();if(key==='wall')setView(config.posters[selected].wall);if(key==='title')options();}
      catch(error){$(id).setCustomValidity(error.message);$('saveNote').textContent=error.message;}
    });
  }
  for(const [id,key] of [['exposure','exposure'],['sunPower','sunPower']])$(id).addEventListener('input',()=>{config.lighting[key]=Number($(id).value);applyLighting();saveDraft();});
  $('exportConfig').addEventListener('click',()=>{const data=validateConfig(config);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='scene-config.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Настройки скачаны. Это ещё не публикация сайта.');});
  $('importConfig').addEventListener('change',async()=>{const file=$('importConfig').files[0];if(!file)return;try{if(file.size>100000)throw new Error('Файл настроек слишком большой.');const next=validateConfig(JSON.parse(await file.text()));config=next;selected=0;options();applyLighting();rebuildPosters();selectPoster(0);saveDraft();toast('Настройки загружены в черновик.');}catch(e){toast(e.message);}$('importConfig').value='';});
  $('resetDraft').addEventListener('click',()=>{config=structuredClone(defaults);selected=0;try{localStorage.removeItem('rollan-stop-draft-v1');}catch{}options();applyLighting();rebuildPosters();selectPoster(0);$('exposure').value=config.lighting.exposure;$('sunPower').value=config.lighting.sunPower;toast('Вернул опубликованные настройки.');});
}
function resize(){const mobile=innerWidth<700;if(wasMobile!==mobile){wasMobile=mobile;setView(currentView,true);}renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?73:67;camera.updateProjectionMatrix();dirty=true;}
function frame(time){requestAnimationFrame(frame);if(document.hidden)return;animateCamera(time);if(!dirty&&time-lastFrame<1200)return;updateCamera();projectHotspots();renderer.render(scene,camera);lastFrame=time;dirty=false;}
async function init(){
  try{
    const response=await fetch('/scene-config.json');if(!response.ok)throw new Error('Configuration unavailable');defaults=validateConfig(await response.json());config=structuredClone(defaults);
    try{const saved=localStorage.getItem('rollan-stop-draft-v1');if(saved)config=validateConfig(JSON.parse(saved));}catch(e){console.warn('Draft ignored',e);}
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.04,300);
    environment();applyLighting();resize();bindNavigation();setView('about',true);requestAnimationFrame(frame);
    await Promise.all([loadModels(),document.fonts.ready]);rebuildPosters();editorSetup();$('loadProgress').style.width='100%';$('loader').classList.add('done');$('experience').dataset.loaded='true';dirty=true;
    if(new URLSearchParams(location.search).has('edit'))$('editToggle').click();
    window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{dirty=true;});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;});
  }catch(error){console.error(error);$('loader').hidden=true;$('error').hidden=false;}
}
init();
