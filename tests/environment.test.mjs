import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import sharp from 'sharp';
import { createCityBackdrop, CITY_PANEL_HEIGHT } from '../src/environment.js';

test('city art keeps its source proportions and transparent sky stays inside image UVs', async () => {
  const file=new URL('../assets/environment/pavlodar-city-cutout.webp',import.meta.url).pathname;
  const metadata=await sharp(file).metadata();
  const stats=await sharp(file).stats();
  assert.equal(metadata.hasAlpha,true);
  assert.equal(stats.channels[3].min,0);
  assert.equal(stats.channels[3].max,255);
  const city = createCityBackdrop(new THREE.Texture());
  for (const panel of city.children) {
    assert.ok(Math.abs(panel.geometry.parameters.width / panel.material.map.repeat.x / CITY_PANEL_HEIGHT - metadata.width/metadata.height) < 1e-9);
    const uv = panel.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
    assert.equal(panel.material.map.wrapT, THREE.ClampToEdgeWrapping);
  }
});
