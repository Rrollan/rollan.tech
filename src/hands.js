import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { buildNativeHand } from './native-hand.js';

const handURL = new URL('../assets/models/web/hand.glb', import.meta.url).href;
const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };

export class HandLayer {
  static async create(canvas) {
    const loader = new GLTFLoader();
    const data = await loader.loadAsync(handURL);
    const layer = new HandLayer(canvas, [-1,1].map(side => buildNativeHand(data.scene,side)));
    await layer.renderer.compileAsync(layer.scene, layer.camera);
    layer.renderer.render(layer.scene,layer.camera);layer.renderer.clear();
    return layer;
  }

  constructor(canvas, hands) {
    this.canvas = canvas;
    this.hands = hands;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#f2dfc0', '#575342', 2.15));
    const sun = new THREE.DirectionalLight('#ffdeb0', 2.4); sun.position.set(-3, 4, 5); this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#c7d5da', .65); fill.position.set(3, 1, 2); this.scene.add(fill);
    this.camera = new THREE.PerspectiveCamera(50, 1, .01, 10); this.camera.position.z = 1.3;
    const white = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
    white.colorSpace=THREE.SRGBColorSpace;white.needsUpdate=true;
    this.paperMaterial = new THREE.MeshStandardMaterial({ map:white,roughness: 1, side: THREE.DoubleSide });
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 12, 16), this.paperMaterial);
    this.paper.renderOrder = -1;
    this.scene.add(this.paper);
    for (const hand of hands) this.scene.add(hand.object);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
    const context=shadowCanvas.getContext('2d');const gradient=context.createRadialGradient(32,32,2,32,32,32);
    gradient.addColorStop(0,'#38271b66');gradient.addColorStop(1,'#38271b00');context.fillStyle=gradient;context.fillRect(0,0,64,64);
    const shadowMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
    this.contactShadows=[-1,1].map(()=>{const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.075,.1),shadowMaterial);this.scene.add(shadow);return shadow;});
    this.frames=0;this.canvas.dataset.renderer='webgl-skinned-mesh';this.canvas.dataset.bones=String(hands.reduce((sum,hand)=>sum+hand.skeleton.bones.length,0));
    this.resize();
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.pixel = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(25)) / innerHeight;
  }

  render(rect, { phase, progress, texture, returnPose }) {
    const unit = this.pixel;
    const width = rect.width * unit, height = rect.height * unit;
    const centerX = (rect.x + rect.width / 2 - innerWidth / 2) * unit;
    const centerY = (innerHeight / 2 - rect.y - rect.height / 2) * unit;
    this.paper.position.set(centerX, centerY, 0);
    this.paper.scale.set(width, height, 1);
    if (this.paperMaterial.map !== texture) { this.paperMaterial.map = texture; this.paperMaterial.needsUpdate = true; }
    this.paperMaterial.colorWrite = phase !== 'reading';
    const release = smooth((progress - .55) / .45);
    const reach = phase === 'taking' ? smooth(progress / .3) : phase === 'placing' ? (returnPose?.reach ?? 1) * (1 - release) : 1;
    const grip = phase === 'taking' ? .14 + .86 * smooth((progress - .1) / .24) : phase === 'placing' ? THREE.MathUtils.lerp(returnPose?.grip ?? 1, .14, release) : 1;
    this.pose = { reach, grip };
    for (let i = 0; i < this.hands.length; i++) {
      const side = i === 0 ? -1 : 1;
      const hand = this.hands[i];
      hand.object.position.set(centerX + side * (width / 2 + .025), centerY - height / 2 - .03 - (1 - reach) * .42, .012);
      hand.object.rotation.set((1 - reach) * .18, side * .1, side * .1 + side * (1 - reach) * .08);
      hand.grip(grip);
      this.contactShadows[i].position.set(centerX+side*(width/2-.015),centerY-height/2+.034,.001);
      this.contactShadows[i].visible=reach>.9;
    }
    this.renderer.render(this.scene, this.camera);
    this.canvas.dataset.renderedFrames=String(++this.frames);
    this.canvas.dataset.triangles=String(this.renderer.info.render.triangles);
  }
}
