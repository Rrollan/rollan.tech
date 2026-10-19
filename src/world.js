import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

const shelterURL = new URL('../assets/models/web/shelter.glb', import.meta.url).href;
const catURL = new URL('../assets/models/web/cat.glb', import.meta.url).href;
const cityURL = new URL('../assets/environment/pavlodar-evening-v2.webp', import.meta.url).href;

export function normalizeModel(root, dimensions) {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  const group = new THREE.Group();
  group.add(root);
  if (Array.isArray(dimensions)) group.scale.set(dimensions[0] / size.x, dimensions[1] / size.y, dimensions[2] / size.z);
  else group.scale.setScalar(dimensions / size.x);
  root.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
    object.material.envMapIntensity = .35;
    object.material.normalScale?.set(.5, .5);
  });
  return group;
}

export function supportHeight(surface, x, z, min = 0, max = 1.1) {
  surface.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, max + .02, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObject(surface, true);
  const hit = hits.find(h => h.point.y >= min && h.point.y <= max && h.face.normal.y > .4);
  if (!hit) throw new Error(`No support surface at ${x}, ${z}`);
  return hit.point.y;
}

function concreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#908979'; ctx.fillRect(0, 0, 512, 512);
  let seed = 91;
  const rand = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 28000; i++) {
    const value = Math.floor(60 + rand() * 130);
    ctx.fillStyle = `rgba(${value},${value - 4},${value - 12},.17)`;
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 3, 1 + rand() * 3);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#4f4b3d50';
  ctx.beginPath(); ctx.moveTo(0, 321); ctx.lineTo(146, 290); ctx.lineTo(221, 315); ctx.lineTo(290, 296); ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(28, 28);
  return texture;
}

function makeBottle(color, labelText, angle) {
  const group = new THREE.Group();
  const points = [[0,0],[.027,0],[.033,.008],[.034,.19],[.03,.215],[.014,.246],[.013,.30],[.016,.303],[.016,.312],[.011,.312]].map(([x,y]) => new THREE.Vector2(x,y-.156));
  const glass = new THREE.MeshPhysicalMaterial({ color, roughness: .19, metalness: .12, transparent: true, opacity: .83, transmission: .14, thickness: .006, envMapIntensity: 1 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 20), glass);
  body.castShadow = true; group.add(body);
  const paper = document.createElement('canvas'); paper.width = 256; paper.height = 128;
  const ctx = paper.getContext('2d'); ctx.fillStyle = '#c4bda0'; ctx.fillRect(0,0,256,128);
  ctx.fillStyle = '#5b6041'; ctx.fillRect(0,17,256,3); ctx.fillRect(0,106,256,3);
  ctx.font = 'bold 22px serif'; ctx.textAlign = 'center'; ctx.fillText(labelText,128,66); ctx.font = '15px serif'; ctx.fillText('0,5 л',128,92);
  const texture = new THREE.CanvasTexture(paper); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.0345,.0345,.095,20,1,true), new THREE.MeshStandardMaterial({ map:texture,roughness:1,side:THREE.DoubleSide }));
  label.position.y = -.035; group.add(label);
  group.rotation.set(0,angle,Math.PI/2);
  return group;
}

function addPlaceSign(scene) {
  const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle='#40574b';ctx.fillRect(0,0,1024,128);
  ctx.strokeStyle='#bfbe9c';ctx.lineWidth=3;ctx.strokeRect(8,8,1008,112);
  ctx.fillStyle='#dfdcc5';ctx.font='500 45px "Golos Text",sans-serif';ctx.textAlign='center';ctx.fillText('ЦЕНТРАЛЬНАЯ  /  rollan.tech',512,82);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.225),new THREE.MeshStandardMaterial({map:texture,roughness:.95}));
  sign.position.set(-.2,2.83,-1.01);scene.add(sign);
}

export async function createWorld(renderer, scene, config, progress) {
  scene.background = new THREE.Color('#b9b7ac');
  const sky = new Sky(); sky.scale.setScalar(300);
  Object.assign(sky.material.uniforms.turbidity,{value:8});
  sky.material.uniforms.rayleigh.value=1.3;
  sky.material.uniforms.mieCoefficient.value=.005;
  sky.material.uniforms.sunPosition.value.set(-.86,.13,.5).normalize();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const envScene=new THREE.Scene(); envScene.add(sky);
  const env=pmrem.fromScene(envScene,.05,.1,400);scene.environment=env.texture;scene.environmentIntensity=.38;pmrem.dispose();
  scene.add(sky);
  scene.add(new THREE.HemisphereLight('#e1d6b7','#79694e',1.65));
  const sun=new THREE.DirectionalLight('#ffd196',config.lighting.sunPower);
  sun.position.set(-9,4.5,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:28});
  sun.shadow.normalBias=.012;sun.shadow.bias=-.00015;scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({map:concreteTexture(),roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.005;ground.receiveShadow=true;ground.userData.floor=true;scene.add(ground);
  const asphalt=ground.material.map.clone();asphalt.repeat.set(30,2);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(120,6.5),new THREE.MeshStandardMaterial({map:asphalt,color:'#7a7871',roughness:1}));
  road.rotation.x=-Math.PI/2;road.position.set(0,.002,8.5);road.receiveShadow=true;road.userData.floor=true;scene.add(road);
  const curb=new THREE.Mesh(new THREE.BoxGeometry(120,.12,.18),new THREE.MeshStandardMaterial({color:'#a49b86',roughness:1}));
  curb.position.set(0,.025,5.14);curb.receiveShadow=true;scene.add(curb);
  const roadPaint=new THREE.MeshStandardMaterial({color:'#c2baa1',roughness:1});
  for(let x=-55;x<56;x+=5){
    const dash=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.075),roadPaint);
    dash.rotation.x=-Math.PI/2;dash.position.set(x,.004,8.5);scene.add(dash);
  }

  const loader=new GLTFLoader();
  const [shelterData, catData, panorama] = await Promise.all([
    loader.loadAsync(shelterURL,e=>{if(e.total)progress(10+45*e.loaded/e.total);}),
    loader.loadAsync(catURL),
    new THREE.TextureLoader().loadAsync(cityURL)
  ]);
  progress(68);
  const shelter=normalizeModel(shelterData.scene,[5.3,3.2,2.65]);shelter.name='shelter';scene.add(shelter);shelter.updateWorldMatrix(true,true);
  panorama.colorSpace=THREE.SRGBColorSpace;panorama.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const cityGeometry=new THREE.CylinderGeometry(42,42,90,96,1,true);
  // Continue the border sky/ground beyond the artwork without stretching the buildings.
  const cityUV=cityGeometry.attributes.uv;
  for(let i=0;i<cityUV.count;i++)cityUV.setY(i,(cityUV.getY(i)-.5)*3+.5);
  const city=new THREE.Mesh(cityGeometry,new THREE.MeshBasicMaterial({map:panorama,side:THREE.BackSide,fog:false,toneMapped:false}));
  // The panorama join faces the opaque back wall, outside the visitor's sightline.
  city.position.y=7.2;city.rotation.y=Math.PI;scene.add(city);
  // A tiny overlap covers the distant ground seam, while foreground geometry remains walkable.
  scene.fog=new THREE.FogExp2('#afa28b',.006);
  const cat=normalizeModel(catData.scene,.43);
  cat.rotation.y=-.55;
  cat.position.set(1.33,0,-.72);
  const contactHeights=[[-.12,-.10],[.12,-.1],[-.12,.1],[.12,.1]].map(([dx,dz])=>supportHeight(shelter,cat.position.x+dx,cat.position.z+dz,.60,.95));
  cat.position.y=Math.max(...contactHeights)+.012;
  cat.userData.cat=true;scene.add(cat);
  cat.traverse(o=>{if(o.isMesh)o.userData.cat=true;});

  const bottles=[];
  for(const [x,z,color,text,angle] of [[-1.12,.66,'#435837','ПИВО',.7],[-.69,.1,'#67472c','СВЕТЛОЕ',-1.2],[1.62,.40,'#4b5e3d','ПИВО',2.2]]) {
    const bottle=makeBottle(color,text,angle);
    bottle.position.set(x,supportHeight(shelter,x,z,.1,.4)+.037,z);scene.add(bottle);bottles.push(bottle);
  }
  addPlaceSign(scene);
  progress(83);
  return {shelter,cat,bottles,ground,road,catBaseY:cat.position.y,catSupport:Math.max(...contactHeights)};
}
