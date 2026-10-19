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
    this.paperMaterial = new THREE.MeshBasicMaterial({ map:white, side:THREE.DoubleSide, alphaTest:.45, toneMapped:false });
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 12, 16), this.paperMaterial);
    this.paper.renderOrder = -1; this.scene.add(this.paper);
    for (const hand of hands) this.scene.add(hand.object);
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
    for(let row=0;row<=16;row++)for(let col=0;col<=12;col++) {
      const screen=lerpPoint(lerpPoint(quad[0],quad[1],col/12),lerpPoint(quad[2],quad[3],col/12),row/16);
      point.copy(this.worldPoint(screen)); positions.setXYZ(row*13+col,point.x,point.y,0);
    }
    positions.needsUpdate=true;this.paper.geometry.computeBoundingSphere();
    if(this.paperMaterial.map!==texture){this.paperMaterial.map=texture;this.paperMaterial.needsUpdate=true;}
    this.paperMaterial.colorWrite=phase!=='reading';
    const release=smooth((progress-.72)/.28);
    const reach=phase==='taking'?smooth(progress/.24):phase==='placing'?(returnPose?.reach??1)*(1-release):1;
    const grip=phase==='taking'?smooth((progress-.11)/.19):phase==='placing'?(returnPose?.grip??1)*(1-release):1;
    this.pose={reach,grip};
    const pageWidth=Math.hypot(quad[1].x-quad[0].x,quad[1].y-quad[0].y)*this.pixel;
    const size=THREE.MathUtils.clamp(pageWidth/.74,.58,.94);
    for(let i=0;i<this.hands.length;i++) {
      const hand=this.hands[i],side=i===0?-1:1;
      hand.object.visible=true;
      const edge=lerpPoint(quad[i],quad[i+2],i===0?.75:.79);
      const inner=lerpPoint(edge,lerpPoint(quad[1-i],quad[3-i],i===0?.75:.79),.018);
      const target=this.worldPoint(inner,.008);
      target.x+=side*(1-reach)*.12;target.y-=(1-reach)*.4;
      hand.object.scale.set(side*size,size,size);
      hand.object.rotation.set(-.05+(1-reach)*.28,side*.83,side*-.12);
      hand.object.position.set(0,0,0);hand.grip(grip);hand.object.updateMatrixWorld(true);
      hand.contact.getWorldPosition(contact);
      hand.object.position.copy(target).sub(contact);
      this.contactShadows[i].position.copy(this.worldPoint(inner,.001));this.contactShadows[i].visible=reach>.94;
      this.canvas.dataset[`contact${i}`]=`${inner.x.toFixed(1)},${inner.y.toFixed(1)}`;
    }
    this.draw();
  }

  renderPet(screen,progress,reduced) {
    this.paper.visible=false;for(const shadow of this.contactShadows)shadow.visible=false;
    this.hands[0].object.visible=false;
    const hand=this.hands[1];hand.object.visible=true;
    const reach=reduced?1:smooth(progress/.23)*(1-smooth((progress-.78)/.22));
    const stroke=reduced?0:Math.sin(Math.min(1,Math.max(0,(progress-.23)/.55))*Math.PI*4);
    hand.object.position.set(0,0,0);hand.object.scale.setScalar(.72);
    hand.object.rotation.set(-.72,-.5,-1.08);hand.grip(-.35);hand.object.updateMatrixWorld(true);
    hand.object.getObjectByName('middle-3').getWorldPosition(contact);
    const target=this.worldPoint({x:screen.x+stroke*16,y:screen.y+stroke*9},.02);
    target.x+=(1-reach)*.25;target.y-=(1-reach)*.42;
    hand.object.position.copy(target).sub(contact);this.draw();
  }
}
