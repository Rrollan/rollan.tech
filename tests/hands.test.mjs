import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { buildNativeHand } from '../src/native-hand.js';

test('the Tripo hand stays within its web geometry budget and animates through its skeleton', async () => {
  const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(new URL('../assets/models/web/hand.glb',import.meta.url).pathname);
  const source=new THREE.Group();let triangles=0;
  for(const data of doc.getRoot().listMeshes())for(const primitive of data.listPrimitives()) {
    const geometry=new THREE.BufferGeometry();
    for(const [semantic,name,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]) {
      const attribute=primitive.getAttribute(semantic);
      if(attribute)geometry.setAttribute(name,new THREE.BufferAttribute(attribute.getArray().slice(),size));
    }
    geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray().slice(),1));
    triangles+=primitive.getIndices().getCount()/3;
    source.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
  }
  assert.ok(triangles<=20000,`Unexpected source/high-poly export: ${triangles} triangles`);
  for(const side of [-1,1]) {
    const hand=buildNativeHand(source,side);hand.object.updateMatrixWorld(true);
    const mesh=hand.object.getObjectByProperty('type','SkinnedMesh');
    assert.equal(mesh.skeleton.bones.length,22);
    const weights=mesh.geometry.getAttribute('skinWeight');
    for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
    const tip=hand.object.getObjectByName('index-3');
    const open=tip.getWorldPosition(new THREE.Vector3());
    assert.ok(hand.object.getObjectByName('wrist').getWorldPosition(new THREE.Vector3()).length()<1e-6);
    hand.grip(1);hand.object.updateMatrixWorld(true);
    assert.ok(tip.getWorldPosition(new THREE.Vector3()).distanceTo(open)>.025);
    mesh.computeBoundingBox();
    assert.ok(mesh.boundingBox.getSize(new THREE.Vector3()).toArray().every(v=>Number.isFinite(v)&&v>0&&v<.6));
    hand.grip(0);hand.object.updateMatrixWorld(true);
    assert.ok(tip.getWorldPosition(new THREE.Vector3()).distanceTo(open)<1e-6);
  }
});
