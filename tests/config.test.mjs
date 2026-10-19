import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateConfig } from '../src/config.js';
const defaults=JSON.parse(await readFile(new URL('../public/scene-config.json',import.meta.url),'utf8'));
test('the published config survives import/export without changes',()=>{assert.deepEqual(validateConfig(defaults),defaults);});
test('untrusted imported URLs cannot execute script or open local files',()=>{
  for(const link of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///etc/passwd','//evil.example']){
    const data=structuredClone(defaults);data.posters[0].link=link;assert.throws(()=>validateConfig(data),/https/);
  }
});
test('import constrains placement and rejects ambiguous poster identities',()=>{
  const data=structuredClone(defaults);data.posters[0].size=999;data.posters[0].y=Infinity;data.posters[0].title='a'.repeat(1000);
  const safe=validateConfig(data);assert.equal(safe.posters[0].size,1.5);assert.equal(safe.posters[0].y,2);assert.equal(safe.posters[0].title.length,100);
  data.posters[1].id=data.posters[0].id;assert.throws(()=>validateConfig(data),/Повторяется/);
});
test('invalid wall names and unexpected config structure fail before scene mutation',()=>{
  assert.throws(()=>validateConfig({version:1,posters:[]}));const data=structuredClone(defaults);data.posters[0].wall='../../../';assert.throws(()=>validateConfig(data),/стенка/);
});
