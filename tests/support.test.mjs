import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { normalizeModel, supportHeight } from '../src/world.js';

test('the actual shelter mesh supports the cat above the bench and bottles above the floor', async () => {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(new URL('../assets/models/web/shelter.glb', import.meta.url).pathname);
  const root = new THREE.Group();
  for (const mesh of doc.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(primitive.getAttribute('POSITION').getArray(), 3));
    geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
    root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  }
  const shelter = normalizeModel(root, [5.3, 3.2, 2.65]);
  const support = [[-.12,-.1],[.12,-.1],[-.12,.1],[.12,.1]].map(([x,z]) => supportHeight(shelter,1.33+x,-.72+z,.6,.95));
  assert.ok(support.every(y => y > .75 && y < .81), `Seat samples: ${support}`);
  const base = Math.max(...support) + .012;
  assert.ok(support.every(y => base > y));
  for (const [x,z] of [[-1.12,.66],[-.69,.1],[1.62,.4]]) assert.ok(supportHeight(shelter,x,z,.1,.4) > .2);
});
