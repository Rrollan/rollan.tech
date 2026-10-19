import * as THREE from 'three';

const smooth = value => { const t=THREE.MathUtils.clamp(value,0,1);return t*t*(3-2*t); };
const vertex=new THREE.Vector3(),moved=new THREE.Vector3();

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
  pose(progress,reduced=false) {
    const response=smooth(progress/.25)*(1-smooth((progress-.7)/.3));
    const stroke=reduced?0:Math.sin(progress*Math.PI*5);
    const tilt=response*(-.11+stroke*.025),cos=Math.cos(tilt),sin=Math.sin(tilt);
    const earFlick=reduced?0:response*Math.sin(progress*Math.PI*8)*.004;
    for(const part of this.parts) {
      for(let i=0;i<part.positions.count;i++) {
        vertex.fromArray(part.physicalPositions,i*3);
        const head=part.headWeights[i];
        moved.copy(vertex);
        const x=vertex.x+.035,y=vertex.y-.10;
        moved.x=-.035+x*cos-y*sin;moved.y=.10+x*sin+y*cos+.011*response;
        moved.z+=response*.007;
        vertex.lerp(moved,head);
        vertex.y+=Math.max(0,vertex.y-.025)*.018*response;
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
  headPoint() {
    return new THREE.Vector3(-.07,.29,.025).applyAxisAngle(new THREE.Vector3(0,1,0),this.cat.rotation.y).add(this.cat.position);
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
    const context=this.audio,duration=2.6;
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
    const progress=Math.min(1,(time-this.started)/(this.reduced.matches?1000:3200));
    this.host.dataset.catPetStage=progress<.24?'reaching':progress<.78?'stroking':'withdrawing';
    this.motion.pose(progress,this.reduced.matches);
    const position=this.motion.headPoint().project(this.camera);
    this.reader.layer.renderPet({x:(position.x*.5+.5)*innerWidth,y:(-.5*position.y+.5)*innerHeight},progress,this.reduced.matches);
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
