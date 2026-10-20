import * as THREE from 'three';
import { createPaper } from './paper.js';

function conformPage(group,geometry,shelter,width,height) {
  group.updateWorldMatrix(true,false);
  const normal=new THREE.Vector3(0,0,1).transformDirection(group.matrixWorld);
  const inverse=group.matrixWorld.clone().invert();
  const samples=[];
  const ray=new THREE.Raycaster();
  for(let row=0;row<3;row++){
    const line=[];
    for(let column=0;column<3;column++){
      const point=new THREE.Vector3((column/2-.5)*width,(row/2-.5)*height,0).applyMatrix4(group.matrixWorld);
      ray.set(point.clone().addScaledVector(normal,.42),normal.clone().negate());
      const hit=ray.intersectObject(shelter,true).find(h=>h.distance<.8);
      line.push(hit?hit.point.clone().applyMatrix4(inverse).z+.009:0);
    }
    samples.push(line);
  }
  const positions=geometry.attributes.position;
  const base=new Float32Array(positions.count);
  for(let i=0;i<positions.count;i++){
    const x=THREE.MathUtils.clamp((positions.getX(i)/width+.5)*2,0,2),y=THREE.MathUtils.clamp((positions.getY(i)/height+.5)*2,0,2);
    const xi=Math.min(1,Math.floor(x)),yi=Math.min(1,Math.floor(y));
    const tx=x-xi,ty=y-yi;
    const lower=THREE.MathUtils.lerp(samples[yi][xi],samples[yi][xi+1],tx);
    const upper=THREE.MathUtils.lerp(samples[yi+1][xi],samples[yi+1][xi+1],tx);
    const bend=Math.pow(1-positions.getY(i)/height-.5,3)*.012;
    const point=new THREE.Vector3(positions.getX(i),positions.getY(i),0).applyMatrix4(group.matrixWorld);
    ray.set(point.clone().addScaledVector(normal,.42),normal.clone().negate());
    const hit=ray.intersectObject(shelter,true).find(h=>h.distance<.8);
    const surface=hit?hit.point.clone().applyMatrix4(inverse).z:0;
    base[i]=Math.max(THREE.MathUtils.lerp(lower,upper,ty),surface)+bend+.025;
    positions.setZ(i,base[i]);
  }
  // Paper bridges the deepest cracks and raised scraps. A triangle interpolated
  // between ray samples must not sink back through a plaster peak between them.
  const front=Math.max(...base)+.008;
  for(let i=0;i<positions.count;i++){
    const edge=1-(positions.getY(i)/height+.5);
    base[i]=front+Math.pow(edge,3)*.006;
    positions.setZ(i,base[i]);
  }
  geometry.computeVertexNormals();positions.needsUpdate=true;
  return base;
}

export function createFlyers(scene,shelter,config,anisotropy) {
  return config.posters.map((p,index)=>{
    const width=.83*p.size,height=1.14*p.size;
    const group=new THREE.Group();
    if(p.wall==='about'){group.position.set(p.x,p.y,-1.0);group.rotation.set(0,0,THREE.MathUtils.degToRad(p.angle));}
    if(p.wall==='project'){group.position.set(-2.16,p.y,p.x*.3);group.rotation.set(0,Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
    if(p.wall==='contact'){group.position.set(2.15,p.y,-p.x*.3);group.rotation.set(0,-Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
    const paper=createPaper(p,index),map=paper.map;map.anisotropy=Math.min(8,anisotropy);
    const geometry=new THREE.PlaneGeometry(width,height,12,16);
    const material=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,alphaTest:.45,toneMapped:false});
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);scene.add(group);
    const base=conformPage(group,geometry,shelter,width,height);
    // Tape is translucent, short and wrinkled rather than a floating ribbon.
    for(const x of [-.29,.29]){
      const tape=new THREE.Mesh(new THREE.PlaneGeometry(.19,.067),new THREE.MeshStandardMaterial({color:'#b9b18b',roughness:1,transparent:true,opacity:.52,side:THREE.DoubleSide}));
      tape.position.set(x*p.size,height/2-.011,.015);tape.rotation.z=x*.31;group.add(tape);
      // Place tape against the same conformed upper surface.
      const indexTop=Math.round((x*p.size/width+.5)*12);tape.position.z=base[indexTop]+.002;
    }
    const poster={group,mesh,geometry,base,width,height,paper,p,index,hover:0,targetHover:0};
    mesh.userData.poster=poster;return poster;
  });
}

export function animateFlyers(posters,dt,time,reduced) {
  let changed=false;
  for(const poster of posters){
    const before=poster.hover;
    poster.hover=THREE.MathUtils.damp(poster.hover,poster.targetHover,15,dt);
    if(Math.abs(before-poster.hover)<.0002)continue;
    const position=poster.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const edge=1-(position.getY(i)/poster.height+.5);
      const fold=reduced?0:poster.hover*Math.pow(edge,2)*(.026+Math.sin(time*.002+i*.2)*.003);
      position.setZ(i,poster.base[i]+fold);
    }
    position.needsUpdate=true;poster.geometry.computeVertexNormals();changed=true;
  }
  return changed;
}
