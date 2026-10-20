import test from 'node:test';
import assert from 'node:assert/strict';
import { petGesture } from '../src/pet-gesture.js';

test('petting reaches contact, makes two eased strokes, then releases without a jump',()=>{
  assert.equal(petGesture(0).reach,0);
  assert.ok(petGesture(.25).reach>.99);
  assert.equal(petGesture(.25).stage,'touching');
  assert.equal(petGesture(.5).stage,'stroking');
  assert.equal(petGesture(1).reach,0);
  assert.equal(petGesture(1).stage,'withdrawing');
  assert.ok(petGesture(.29).stroke<.001);
  assert.ok(petGesture(.405).stroke>.99);
  assert.ok(petGesture(.52).stroke<.001);
  assert.ok(petGesture(.635).stroke>.99);
  assert.ok(petGesture(.75).stroke<.001);

  let previous=petGesture(0).stroke;
  for(let t=.002;t<=.76;t+=.002) {
    const current=petGesture(t).stroke;
    assert.ok(Math.abs(current-previous)<.03,'Stroke position stays temporally continuous');
    previous=current;
  }
});

test('reduced-motion petting keeps one calm contact without repeated strokes',()=>{
  for(let t=0;t<=1;t+=.05)assert.equal(petGesture(t,true).stroke,0);
  assert.ok(petGesture(.5,true).contact>.99);
  assert.equal(petGesture(0,true).reach,0);
  assert.equal(petGesture(1,true).reach,0);
});
