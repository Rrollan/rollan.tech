import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CatMotion } from '../src/companion.js';

test('petting preserves interleaved mesh data, keeps contact with the seat and restores the cat',()=>{
  const data=new Float32Array([
    -.14,.03,.04, 0,1,0, .25,.75,
    -.13,.20,.06, 0,1,0, .4,.5,
    .14,.12,-.06, 0,1,0, .6,.2
  ]);
  const buffer=new THREE.InterleavedBuffer(data,8);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));
  geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
  geometry.setAttribute('uv',new THREE.InterleavedBufferAttribute(buffer,2,6));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),cat=new THREE.Group();cat.add(mesh);
  cat.position.set(1.33,.79,-.72);cat.rotation.y=-.55;
  const motion=new CatMotion(cat),positions=mesh.geometry.attributes.position;
  for(let step=0;step<=20;step++) {
    motion.pose(step/20);
    for(let i=0;i<positions.count;i++) {
      const original=new THREE.Vector3(...data.slice(i*8,i*8+3));
      const current=new THREE.Vector3().fromBufferAttribute(positions,i);
      assert.ok(current.distanceTo(original)<.04,'Head response must stay soft and local');
      assert.ok(current.y>=.025,'The cat must not sink through the bench');
      assert.equal(mesh.geometry.attributes.uv.getX(i),data[i*8+6]);
      assert.equal(mesh.geometry.attributes.normal.getY(i),1);
    }
  }
  motion.reset();
  for(let i=0;i<positions.count;i++)assert.deepEqual(new THREE.Vector3().fromBufferAttribute(positions,i).toArray(),Array.from(data.slice(i*8,i*8+3)));
});
