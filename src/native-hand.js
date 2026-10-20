import * as THREE from 'three';

// Joint centers calibrated to the generated Tripo mesh, in its original units.
// All vertices, UVs, normals, nails, sleeve folds and PBR maps remain that asset.
const wrist = new THREE.Vector3(-.06, .445, .02);
const chains = [
  { name:'index', points:[[-.14,.72,-.13],[-.15,.84,-.195],[-.155,.91,-.175],[-.16,.965,-.15]], bend:[.28,.32,.18] },
  { name:'middle', points:[[-.22,.69,-.10],[-.255,.795,-.13],[-.275,.86,-.08],[-.28,.90,-.06]], bend:[.34,.32,.14] },
  { name:'ring', points:[[-.275,.66,-.075],[-.30,.73,-.12],[-.31,.79,-.08],[-.30,.805,-.03]], bend:[.25,.22,.1] },
  { name:'pinky', points:[[-.30,.645,-.055],[-.34,.685,-.09],[-.35,.73,-.03],[-.335,.75,.02]], bend:[.22,.18,.09] },
  { name:'thumb', points:[[-.015,.57,-.015],[.025,.67,-.04],[.02,.77,-.10],[0,.85,-.09]], bend:[0,0,0] }
];

export function buildNativeHand(source, side) {
  const scale = .42 / .98065185546875;
  const transform = new THREE.Matrix4().makeRotationY(Math.PI)
    .multiply(new THREE.Matrix4().makeRotationZ(-.5))
    .multiply(new THREE.Matrix4().makeScale(scale,scale,scale))
    .multiply(new THREE.Matrix4().makeTranslation(-wrist.x,-wrist.y,-wrist.z));
  const object = new THREE.Group();
  const forearm = new THREE.Bone();forearm.name='forearm';forearm.position.y=-.2;object.add(forearm);
  const wristBone = new THREE.Bone();wristBone.name='wrist';wristBone.position.y=.2;forearm.add(wristBone);
  const bones=[forearm,wristBone],segments=[],fingers=[];
  for(const chain of chains) {
    const points=chain.points.map(p=>new THREE.Vector3(...p).applyMatrix4(transform));
    const ids=[];let parent=wristBone,previous=new THREE.Vector3();
    for(let i=0;i<points.length;i++) {
      const bone=new THREE.Bone();bone.name=`${chain.name}-${i}`;
      bone.position.copy(points[i]).sub(previous);parent.add(bone);
      ids.push(bones.length);bones.push(bone);parent=bone;previous=points[i];
    }
    for(let i=0;i<points.length-1;i++) segments.push({
      start:points[i],delta:points[i+1].clone().sub(points[i]),
      id:ids[i],next:ids[i+1],previous:ids[Math.max(0,i-1)],sourceY:chain.points[0][1]
    });
    fingers.push({chain,bones:ids.map(id=>bones[id])});
  }
  const skeleton=new THREE.Skeleton(bones);
  source.updateWorldMatrix(true,true);
  const meshes=[];
  source.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
  const point=new THREE.Vector3();
  for(const sourceMesh of meshes) {
    const geometry=sourceMesh.geometry.clone().applyMatrix4(sourceMesh.matrixWorld);
    const position=geometry.attributes.position;
    const sourceY=new Float32Array(position.count);
    for(let i=0;i<position.count;i++)sourceY[i]=position.getY(i);
    geometry.applyMatrix4(transform);
    // Continue the existing textured sleeve below the first-person crop.
    // Its exported forearm ends halfway down; exposing that cap looks detached.
    const sleeveDirection=new THREE.Vector3(0,-1,0).transformDirection(transform);
    for(let i=0;i<position.count;i++) {
      const extension=.95*(1-THREE.MathUtils.smoothstep(sourceY[i],.03,.28));
      if(extension){point.fromBufferAttribute(position,i).addScaledVector(sleeveDirection,extension);position.setXYZ(i,point.x,point.y,point.z);}
    }
    const indices=new Uint16Array(position.count*4),weights=new Float32Array(position.count*4);
    for(let i=0;i<position.count;i++) {
      point.fromBufferAttribute(position,i);
      let closest=null,best=Infinity,along=0;
      if(sourceY[i]>.52)for(const segment of segments) {
        const dx=point.x-segment.start.x,dy=point.y-segment.start.y,dz=point.z-segment.start.z;
        const t=THREE.MathUtils.clamp((dx*segment.delta.x+dy*segment.delta.y+dz*segment.delta.z)/segment.delta.lengthSq(),0,1);
        const distance=Math.hypot(dx-segment.delta.x*t,dy-segment.delta.y*t,dz-segment.delta.z*t);
        if(distance<best){best=distance;closest=segment;along=t;}
      }
      const wristWeight=THREE.MathUtils.smoothstep(sourceY[i],.405,.515);
      let amount=0,id=1,other=1,mix=0;
      if(closest) {
        amount=THREE.MathUtils.smoothstep(sourceY[i],closest.sourceY-.04,closest.sourceY+.025)
          *THREE.MathUtils.smoothstep(.04-best,0,.025);
        id=closest.id;other=closest.next;
        mix=.5*THREE.MathUtils.smoothstep(along,.82,1);
        if(along<.18){other=closest.previous;mix=.5*(1-THREE.MathUtils.smoothstep(along,0,.18));}
      }
      indices.set([0,1,id,other],i*4);
      weights.set([1-wristWeight,wristWeight*(1-amount),wristWeight*amount*(1-mix),wristWeight*amount*mix],i*4);
    }
    geometry.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));
    const material=sourceMesh.material.clone();
    material.roughness=Math.max(.78,material.roughness);material.metalness=0;
    material.normalScale?.set(.5,.5);
    const mesh=new THREE.SkinnedMesh(geometry,material);mesh.frustumCulled=false;
    object.add(mesh);object.updateMatrixWorld(true);mesh.bind(skeleton);
  }
  // Both hands use one downloaded mesh and shared texture maps.
  object.scale.x=side===-1?-1:1;
  function grip(amount) {
    wristBone.rotation.set(.045*amount,0,0);
    for(const finger of fingers)for(let i=0;i<finger.bones.length;i++) {
      const bone=finger.bones[i];
      if(finger.chain.name==='thumb')bone.rotation.set(i<2?.08*amount:0,i===0?.25*amount:i===1?.1*amount:0,0);
      else bone.rotation.set(-(finger.chain.bend[i]??0)*amount,0,0);
    }
  }
  const contact = new THREE.Object3D();
  contact.name = 'thumb-pad-contact';
  fingers.find(finger=>finger.chain.name==='thumb').bones[3].add(contact);
  contact.position.set(0,-.006,-.003);
  const petContact = new THREE.Object3D();
  petContact.name = 'index-pad-contact';
  fingers.find(finger=>finger.chain.name==='index').bones[3].add(petContact);
  petContact.position.set(0,-.004,-.004);
  return {object,grip,skeleton,contact,petContact};
}
