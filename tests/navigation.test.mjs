import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, PerspectiveCamera } from 'three';
import { Visitor, movementStep, floorHeight, nearestAngle, WALK_BOUNDS } from '../src/navigation.js';

test('walking follows the view and cannot cross a wall or enter the bench', () => {
  let p = new Vector3(0, 1.8, 1);
  for (let i = 0; i < 200; i++) p = movementStep(p, 1, 1, 0, .05);
  assert.equal(p.x, WALK_BOUNDS.right);
  assert.equal(p.z, WALK_BOUNDS.back);
  const turned = movementStep(new Vector3(0, 1.8, 1), 1, 0, Math.PI / 2, .05);
  assert.ok(turned.x < 0);
  assert.ok(Math.abs(turned.z - 1) < 1e-9);
  assert.equal(turned.y, 1.8);
});

test('diagonal input has the same speed; returning to a background tab cannot teleport', () => {
  const start = new Vector3(0, 1.8, 1);
  const straight = movementStep(start, 1, 0, .3, .05).distanceTo(start);
  const diagonal = movementStep(start, 1, 1, .3, .05).distanceTo(start);
  assert.ok(Math.abs(straight - diagonal) < 1e-9);
  assert.ok(movementStep(start, 1, 0, 0, 10).distanceTo(start) <= .05250001);
});

test('the front step changes eye height continuously and camera turns take the short route', () => {
  assert.equal(floorHeight(0), .224);
  assert.equal(floorHeight(1.5), .035);
  for (let z = 1; z < 1.4; z += .001) assert.ok(Math.abs(floorHeight(z + .001) - floorHeight(z)) < .002);
  assert.ok(Math.abs(nearestAngle(Math.PI - .1, -Math.PI + .1) - (Math.PI + .1)) < 1e-9);
});

test('dragging the view requests an immediate new frame, then stops without inertia', t => {
  const names = ['document', 'window', 'innerWidth', 'innerHeight'];
  const old = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => { for (const name of names) { const descriptor = old.get(name); if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  globalThis.document = { addEventListener() {}, getElementById: () => ({ hidden: true, style: {} }) };
  globalThis.window = { addEventListener() {} };
  globalThis.innerWidth = 1000; globalThis.innerHeight = 800;
  const handlers = new Map();
  const canvas = { addEventListener: (name, fn) => handlers.set(name, fn), setPointerCapture() {} };
  const visitor = new Visitor(new PerspectiveCamera(72, 1.25), canvas, {
    pick: () => null, onInteraction() {}, onMode() {}, reduced: { matches: false }
  });
  visitor.position.y = floorHeight(visitor.position.z) + 1.62;
  visitor.update(0, 1 / 60);
  assert.equal(visitor.update(16, 1 / 60), false);
  handlers.get('pointerdown')({ button: 0, pointerType: 'mouse', pointerId: 1, clientX: 500, clientY: 400 });
  handlers.get('pointermove')({ pointerType: 'mouse', pointerId: 1, clientX: 540, clientY: 410 });
  assert.equal(visitor.update(32, 1 / 60), true, 'A look gesture must invalidate the renderer');
  const yaw = visitor.yaw, pitch = visitor.pitch;
  assert.equal(visitor.update(48, 1 / 60), false);
  assert.equal(visitor.yaw, yaw); assert.equal(visitor.pitch, pitch);
});
