import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { movementStep, floorHeight, nearestAngle, WALK_BOUNDS } from '../src/navigation.js';

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
