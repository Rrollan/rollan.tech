import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, dedup, prune } from '@gltf-transform/functions';
import sharp from 'sharp';
import { copyFile, mkdir, stat } from 'node:fs/promises';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await mkdir('assets/models/source',{recursive:true});
for(const name of ['shelter','house','cat']) {
  const file=`assets/models/web/${name}.glb`;
  const original=`assets/models/source/${name}-retopologized.glb`;
  try { await stat(original); } catch { await copyFile(file,original); }
  const before=(await stat(file)).size;
  const doc=await io.read(original);
  await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',quality:88,resize:name==='shelter'?[2048,2048]:[1024,1024]}));
  await io.write(file,doc);
  console.log(`${name}: ${(before/1e6).toFixed(2)} MB → ${((await stat(file)).size/1e6).toFixed(2)} MB`);
}
