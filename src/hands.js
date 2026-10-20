import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNativeHand } from './native-hand.js';

const handURL = new URL('../assets/models/web/hand.glb', import.meta.url).href;
const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const point = new THREE.Vector3(), contact = new THREE.Vector3();
const lerpPoint = (a,b,t) => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

export class HandLayer {
  static async create(canvas) {
    const data = await new GLTFLoader().loadAsync(handURL);
    const layer = new HandLayer(canvas, [-1,1].map(side => buildNativeHand(data.scene,side)));
    await layer.renderer.compileAsync(layer.scene, layer.camera);
    layer.renderer.render(layer.scene,layer.camera); layer.renderer.clear();
    return layer;
  }

  constructor(canvas, hands) {
    this.canvas = canvas; this.hands = hands;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#eee2c8', '#635d48', 2.1));
    const sun = new THREE.DirectionalLight('#ffdeb0', 2); sun.position.set(-3, 4, 5); this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#c7d5da', .7); fill.position.set(3, 1, 2); this.scene.add(fill);
    this.camera = new THREE.PerspectiveCamera(50, 1, .01, 10); this.camera.position.z = 1.3;
    const white = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
    white.colorSpace=THREE.SRGBColorSpace; white.needsUpdate=true;
    this.paperMaterial = new THREE.MeshStandardMaterial({ map:white, side:THREE.DoubleSide, alphaTest:.45, roughness:1, metalness:0 });
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 32), this.paperMaterial);
    this.paper.renderOrder = -1; this.scene.add(this.paper);
    for (const hand of hands) {
      hand.object.traverse(mesh=>{
        if(!mesh.isSkinnedMesh)return;
        mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.material.needsUpdate=true;
      });
      this.scene.add(hand.object);
    }
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
    const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,1,32,32,32);
    gradient.addColorStop(0,'#38271b4a');gradient.addColorStop(1,'#38271b00');context.fillStyle=gradient;context.fillRect(0,0,64,64);
    const shadowMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
    this.contactShadows=[-1,1].map(()=>{const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.045,.055),shadowMaterial);this.scene.add(shadow);return shadow;});
    this.frames=0;this.canvas.dataset.renderer='webgl-skinned-mesh';this.canvas.dataset.bones=String(hands.reduce((sum,hand)=>sum+hand.skeleton.bones.length,0));
    this.resize();
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.pixel = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(25)) / innerHeight;
  }
  worldPoint(screen, z=0) {
    return new THREE.Vector3((screen.x-innerWidth/2)*this.pixel,(innerHeight/2-screen.y)*this.pixel,z);
  }
  draw() {
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.renderedFrames=String(++this.frames);
    this.canvas.dataset.triangles=String(this.renderer.info.render.triangles);
  }
  render(quad, {phase,progress,texture,returnPose}) {
    this.paper.visible=true;
    const positions=this.paper.geometry.attributes.position;
    const flex=(phase==='taking'||phase==='placing')?Math.sin(progress*Math.PI):0;
    for(let row=0;row<=32;row++)for(let col=0;col<=24;col++) {
      const u=col/24,v=row/32;
      const screen=lerpPoint(lerpPoint(quad[0],quad[1],u),lerpPoint(quad[2],quad[3],u),v);
      point.copy(this.worldPoint(screen));
      // A sheet flexes under its own weight as it leaves the wall, then settles flat.
      point.z=.018*flex*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
      positions.setXYZ(row*25+col,point.x,point.y,point.z);
    }
    positions.needsUpdate=true;this.paper.geometry.computeVertexNormals();this.paper.geometry.computeBoundingSphere();
    if(this.paperMaterial.map!==texture){this.paperMaterial.map=texture;this.paperMaterial.needsUpdate=true;}
    this.paperMaterial.colorWrite=phase!=='reading';
    const release=smooth((progress-.72)/.28);
    const reach=phase==='taking'?smooth(progress/.27):phase==='placing'?(returnPose?.reach??1)*(1-release):1;
    const grip=phase==='taking'?smooth((progress-.22)/.31)*.68:phase==='placing'?(returnPose?.grip??.68)*(1-release):.68;
    this.pose={reach,grip};
    const pageWidth=Math.hypot(quad[1].x-quad[0].x,quad[1].y-quad[0].y)*this.pixel;
    const size=THREE.MathUtils.clamp(pageWidth/.74,.58,.94);
    for(let i=0;i<this.hands.length;i++) {
      const hand=this.hands[i],side=i===0?-1:1;
      const gripVisible=i===1&&(phase==='taking'||phase==='placing');
      const appear=phase==='taking'?smooth(progress/.12):phase==='placing'?smooth(progress/.18):0;
      const disappear=smooth((progress-.84)/.16);
      const opacity=gripVisible?appear*(1-disappear):0;
      hand.object.visible=gripVisible&&opacity>.005;
      const edge=lerpPoint(quad[i],quad[i+2],i===0?.75:.79);
      const inner=lerpPoint(edge,lerpPoint(quad[1-i],quad[3-i],i===0?.75:.79),.018);
      const target=this.worldPoint(inner,.008);
      target.x+=side*(1-reach)*.12;target.y-=(1-reach)*.4;
      hand.object.scale.set(side*size*.82,size*.82,size*.82);
      hand.object.rotation.set(-.08+(1-reach)*.22,side*.88,side*-.18);
      hand.object.position.set(0,0,0);hand.grip(grip);hand.object.updateMatrixWorld(true);
      hand.contact.getWorldPosition(contact);
      hand.object.position.copy(target).sub(contact);
      hand.object.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.material.opacity=opacity;});
      this.contactShadows[i].position.copy(this.worldPoint(inner,.001));this.contactShadows[i].visible=gripVisible&&reach>.94&&opacity>.5;
      this.canvas.dataset[`contact${i}`]=`${inner.x.toFixed(1)},${inner.y.toFixed(1)}`;
    }
    this.draw();
  }

  renderPet(screen,gesture) {
    this.paper.visible=false;for(const shadow of this.contactShadows)shadow.visible=false;
    this.hands[0].object.visible=false;
    const hand=this.hands[1];
    const opacity=smooth(gesture.progress/.055)*(1-smooth((gesture.progress-.82)/.18));
    hand.object.visible=opacity>.005;
    hand.object.position.set(0,0,0);hand.object.scale.setScalar(.62);
    hand.object.rotation.set(-.18,-.15,-1.08);hand.grip(-.12);hand.object.updateMatrixWorld(true);
    hand.petContact.getWorldPosition(contact);
    const approachX=Math.min(125,innerWidth*.18),approachY=Math.min(285,innerHeight*.42);
    const lift=gesture.withdraw;
    const target=this.worldPoint({
      x:screen.x+(1-gesture.reach)*approachX+lift*10,
      y:screen.y+(1-gesture.reach)*approachY+lift*22
    },.025+lift*.08);
    hand.object.position.copy(target).sub(contact);
    hand.object.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.material.opacity=opacity;});
    this.canvas.dataset.petContact=`${screen.x.toFixed(1)},${screen.y.toFixed(1)}`;
    this.canvas.dataset.petReach=gesture.reach.toFixed(3);
    this.canvas.dataset.petStroke=gesture.stroke.toFixed(3);
    this.draw();
  }
}
