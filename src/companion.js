import * as THREE from 'three';
import { petGesture } from './pet-gesture.js';

const smooth = value => { const t=THREE.MathUtils.clamp(value,0,1);return t*t*(3-2*t); };
const vertex=new THREE.Vector3(),moved=new THREE.Vector3();
const orientation=new THREE.Quaternion(),origin=new THREE.Vector3();

export class CatMotion {
  constructor(cat) {
    this.cat=cat;this.parts=[];cat.updateWorldMatrix(true,true);
    const toRoot=cat.matrixWorld.clone().invert();
    const physical=new THREE.Matrix4().makeScale(cat.scale.x,cat.scale.y,cat.scale.z);
    cat.traverse(mesh=>{
      if(!mesh.isMesh)return;
      mesh.geometry=mesh.geometry.clone();
      const matrix=physical.clone().multiply(toRoot).multiply(mesh.matrixWorld);
      const positions=mesh.geometry.attributes.position;
      const base=new Float32Array(positions.count*3);
      for(let i=0;i<positions.count;i++)base.set([positions.getX(i),positions.getY(i),positions.getZ(i)],i*3);
      const physicalPositions=new Float32Array(base.length),headWeights=new Float32Array(positions.count),earWeights=new Float32Array(positions.count);
      for(let i=0;i<positions.count;i++) {
        vertex.fromArray(base,i*3).applyMatrix4(matrix);vertex.toArray(physicalPositions,i*3);
        headWeights[i]=(1-smooth((vertex.x+.10)/.11))*smooth((vertex.y-.025)/.075);
        earWeights[i]=headWeights[i]*smooth((vertex.y-.16)/.04);
      }
      this.parts.push({mesh,positions,base,physicalPositions,headWeights,earWeights,inverse:matrix.clone().invert()});
    });
  }
  pose(gesture,reduced=false) {
    if(typeof gesture==='number')gesture=petGesture(gesture,reduced);
    const response=gesture.contact;
    const tilt=response*(-.025+(gesture.stroke-.5)*.012),cos=Math.cos(tilt),sin=Math.sin(tilt);
    const earFlick=reduced?0:.003*smooth((gesture.progress-.74)/.035)*(1-smooth((gesture.progress-.84)/.06));
    for(const part of this.parts) {
      for(let i=0;i<part.positions.count;i++) {
        vertex.fromArray(part.physicalPositions,i*3);
        const head=part.headWeights[i];
        moved.copy(vertex);
        const x=vertex.x+.035,y=vertex.y-.10;
        moved.x=-.035+x*cos-y*sin;moved.y=.10+x*sin+y*cos+.003*response;
        moved.z+=response*.002;
        vertex.lerp(moved,head);
        vertex.y+=Math.max(0,vertex.y-.025)*.006*response;
        vertex.z+=part.earWeights[i]*earFlick;
        vertex.applyMatrix4(part.inverse);part.positions.setXYZ(i,vertex.x,vertex.y,vertex.z);
      }
      part.positions.needsUpdate=true;
    }
  }
  reset() {
    for(const part of this.parts){
      for(let i=0;i<part.positions.count;i++)part.positions.setXYZ(i,part.base[i*3],part.base[i*3+1],part.base[i*3+2]);
      part.positions.needsUpdate=true;
    }
  }
  contactPoint(stroke,pressure) {
    // This short path lies across the forehead, rather than sliding in screen space.
    const arch=4*stroke*(1-stroke);
    const point=new THREE.Vector3(-.105+.07*stroke,.356+.006*arch,.052+.003*arch);
    point.y+=.003*pressure;
    const response=pressure,tilt=response*(-.025+(stroke-.5)*.012),cos=Math.cos(tilt),sin=Math.sin(tilt);
    const x=point.x+.035,y=point.y-.10;
    const movedPoint=new THREE.Vector3(-.035+x*cos-y*sin,.10+x*sin+y*cos+.003*response,point.z+.002*response);
    const weight=(1-smooth((point.x+.10)/.11))*smooth((point.y-.025)/.075);
    point.lerp(movedPoint,weight);
    this.cat.getWorldQuaternion(orientation);this.cat.getWorldPosition(origin);
    return point.applyQuaternion(orientation).add(origin);
  }
}

export class Companion {
  constructor({cat,visitor,reader,camera,host,reduced,invalidate,onMessage}) {
    Object.assign(this,{cat,visitor,reader,camera,host,reduced,invalidate,onMessage});
    this.motion=new CatMotion(cat);this.active=false;this.count=0;
  }
  interact() {
    if(this.visitor.busy||this.active)return;
    this.preparePurr();
    this.active=true;this.state='approaching';this.host.dataset.catState='approaching';
    this.visitor.focusOnCat(this.cat,()=>{
      if(!this.active)return;
      this.state='petting';this.host.dataset.catState='petting';this.started=performance.now();
      this.reader.canvas.hidden=false;this.host.append(this.reader.canvas);
      this.reader.layer.resize();this.reader.layer.renderer.clear();
      this.purr();
    });
  }
  preparePurr() {
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;
      this.audio??=new Audio();this.audio.resume().catch(()=>{});
    } catch { /* Visual interaction remains available without audio. */ }
  }
  purr() {
    if(!this.audio)return;
    const context=this.audio,duration=4.4;
    const buffer=context.createBuffer(1,context.sampleRate*duration,context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) {
      const t=i/context.sampleRate;
      data[i]=(Math.random()*2-1)*(.3+.7*Math.pow(Math.sin(t*25*Math.PI),2));
    }
    const source=context.createBufferSource();source.buffer=buffer;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;
    const gain=context.createGain(),now=context.currentTime;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.09,now+.4);gain.gain.setValueAtTime(.09,now+duration-.5);gain.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(filter).connect(gain).connect(context.destination);source.start();this.voice=source;
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  update(time) {
    if(!this.active||this.state!=='petting')return false;
    const progress=Math.min(1,(time-this.started)/(this.reduced.matches?1900:4300));
    const gesture=petGesture(progress,this.reduced.matches);
    this.host.dataset.catPetStage=gesture.stage;
    this.motion.pose(gesture,this.reduced.matches);
    const position=this.motion.contactPoint(gesture.stroke,gesture.pressure).project(this.camera);
    this.reader.layer.renderPet({x:(position.x*.5+.5)*innerWidth,y:(-.5*position.y+.5)*innerHeight},gesture);
    if(progress===1)this.finish();
    return true;
  }
  finish(cancelled=false) {
    if(!this.active)return;
    this.active=false;this.state='sleeping';this.motion.reset();this.voice?.stop();this.voice=null;
    this.reader.layer.renderer.clear();this.reader.dialog.append(this.reader.canvas);
    this.host.dataset.catState='sleeping';
    if(!cancelled){this.host.dataset.catPets=String(++this.count);this.onMessage('Мр-р. Теперь ты свой.');}
    this.invalidate();this.visitor.returnFromPoster();
  }
}
