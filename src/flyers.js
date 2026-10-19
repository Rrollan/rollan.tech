import * as THREE from 'three';

function randomSource(initial) {
  let seed=initial;
  return () => ((seed=seed*16807%2147483647)/2147483647);
}
function lines(ctx,text,x,y,width,height,max=10) {
  let count=0;
  for(const paragraph of text.split('\n')) {
    let line='';
    for(const word of paragraph.split(' ')) {
      const next=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(next).width>width){ctx.fillText(line,x,y);y+=height;count++;line=word;}else line=next;
      if(count>=max)return y;
    }
    ctx.fillText(line,x,y);y+=height;if(++count>=max)return y;
  }
  return y;
}

function paperMap(p,index) {
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1240;
  const ctx=canvas.getContext('2d'),rand=randomSource(index+84);
  // A frayed silhouette gives the page a physical edge, not a rectangular UI card.
  ctx.beginPath();ctx.moveTo(11,10);
  for(let x=12;x<890;x+=13)ctx.lineTo(x,7+rand()*6);
  for(let y=12;y<1228;y+=12)ctx.lineTo(886+rand()*7,y);
  for(let x=888;x>12;x-=10)ctx.lineTo(x,1223+rand()*10);
  for(let y=1228;y>12;y-=14)ctx.lineTo(7+rand()*6,y);
  ctx.closePath();ctx.clip();
  ctx.fillStyle=p.color;ctx.fillRect(0,0,900,1240);
  const age=ctx.createRadialGradient(440,540,180,420,650,850);
  age.addColorStop(0,'#fff8df00');age.addColorStop(.7,'#6b522719');age.addColorStop(1,'#503b2860');ctx.fillStyle=age;ctx.fillRect(0,0,900,1240);
  for(let i=0;i<14000;i++){
    ctx.fillStyle=rand()>.5?'#473a2010':'#fff5d51a';ctx.fillRect(rand()*900,rand()*1240,.5+rand()*2,.5+rand()*2);
  }
  for(const y of [394,804]){
    const fold=ctx.createLinearGradient(0,y-5,0,y+7);fold.addColorStop(0,'#fff8df00');fold.addColorStop(.45,'#473d2b20');fold.addColorStop(.55,'#fff7dd48');fold.addColorStop(1,'#fff8df00');ctx.fillStyle=fold;ctx.fillRect(0,y-5,900,12);
  }
  ctx.fillStyle='#504b3b';ctx.globalAlpha=.8;ctx.font='500 18px "Golos Text",sans-serif';ctx.fillText(`ОБЪЯВЛЕНИЕ № 00${index+1}   ·   НЕ СРЫВАТЬ`,57,82);
  ctx.strokeStyle='#655b4366';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(56,108);ctx.lineTo(843,108);ctx.stroke();
  ctx.fillStyle=p.id==='game'?'#733d2d':'#343529';ctx.globalAlpha=.94;
  let titleY=218;
  const titleLines=p.title.split('\n');
  for(const title of titleLines){
    let font=69;
    do {ctx.font=p.id==='game'?`bold ${font}px Georgia,serif`:`${font}px "Russo One",sans-serif`;if(ctx.measureText(title).width<=786)break;font-=2;}while(font>30);
    ctx.fillText(title,55,titleY);titleY+=86;
  }
  ctx.globalAlpha=.86;ctx.fillStyle='#494c3c';ctx.font='400 35px "Golos Text",sans-serif';
  lines(ctx,p.text,59,titleY+45,778,54,8);
  if(p.id==='about'){
    ctx.save();ctx.translate(570,839);ctx.rotate(-.12);ctx.strokeStyle='#924c3299';ctx.lineWidth=4;ctx.strokeRect(-164,-43,326,82);ctx.fillStyle='#924c32';ctx.font='700 32px "Golos Text",sans-serif';ctx.fillText('ЖИВ · НА СВЯЗИ',-145,10);ctx.restore();
    ctx.fillStyle='#53634a';ctx.font='500 44px "Caveat",cursive';ctx.fillText('Сложное — простыми словами.',58,974);
  }else if(p.id==='services'){
    ctx.fillStyle='#676b5240';ctx.fillRect(57,776,784,160);ctx.fillStyle='#46523b';ctx.font='500 25px "Golos Text",sans-serif';ctx.fillText('TypeScript  /  React  /  Next.js',80,838);ctx.fillText('Solana  /  Python  /  ИИ-агенты',80,893);
    ctx.font='700 45px "Caveat",cursive';ctx.fillStyle='#64553b';ctx.fillText('Соберу, настрою, доведу до ума.',58,1016);
  }else if(p.id==='game'){
    ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#855239';ctx.lineWidth=6;ctx.beginPath();ctx.arc(460,810,143,0,Math.PI*2);ctx.stroke();ctx.font='190px Georgia,serif';ctx.fillStyle='#855239';ctx.textAlign='center';ctx.fillText('I',460,874);ctx.restore();
    ctx.font='700 47px "Caveat",cursive';ctx.fillStyle='#8b5033';ctx.fillText('Не просто идея. Уже можно играть.',57,1030);
  }else if(p.id==='contacts'){
    ctx.fillStyle='#7e5b3e';ctx.font='700 48px "Caveat",cursive';ctx.fillText('Начни с «привет».',59,806);
    ctx.strokeStyle='#6c614c88';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(20,956);ctx.lineTo(880,956);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<5;i++){
      ctx.save();ctx.translate(84+i*164,1181);ctx.rotate(-Math.PI/2);ctx.font='500 21px "Golos Text",sans-serif';ctx.fillStyle='#4b4b3a';ctx.fillText('t.me/oderefyu',0,0);ctx.restore();
      ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(154+i*164,963);ctx.lineTo(154+i*164,1240);ctx.stroke();ctx.setLineDash([]);
    }
  }
  if(p.id!=='contacts'){
    ctx.fillStyle='#914e34';ctx.font='700 49px "Caveat",cursive';lines(ctx,p.cta,58,1144,780,55,1);
    ctx.fillStyle='#65614b';ctx.font='400 18px "Golos Text",sans-serif';ctx.fillText('rollan.tech   ·   Павлодар',58,1200);
  }
  ctx.globalAlpha=1;
  // Patches of rubbed ink make newly drawn text belong to the old wall.
  ctx.globalCompositeOperation='destination-out';
  for(let i=0;i<380;i++){ctx.fillStyle=`rgba(0,0,0,${rand()*.12})`;ctx.fillRect(rand()*900,110+rand()*1100,1+rand()*18,1+rand()*2);}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

function conformPage(group,geometry,shelter,width,height) {
  group.updateWorldMatrix(true,false);
  const normal=new THREE.Vector3(0,0,1).transformDirection(group.matrixWorld);
  const inverse=group.matrixWorld.clone().invert();
  const samples=[];
  const ray=new THREE.Raycaster();
  for(let row=0;row<3;row++){
    const line=[];
    for(let column=0;column<3;column++){
      const point=new THREE.Vector3((column/2-.5)*width,(row/2-.5)*height,0).applyMatrix4(group.matrixWorld);
      ray.set(point.clone().addScaledVector(normal,.42),normal.clone().negate());
      const hit=ray.intersectObject(shelter,true).find(h=>h.distance<.8);
      line.push(hit?hit.point.clone().applyMatrix4(inverse).z+.009:0);
    }
    samples.push(line);
  }
  const positions=geometry.attributes.position;
  const base=new Float32Array(positions.count);
  for(let i=0;i<positions.count;i++){
    const x=THREE.MathUtils.clamp((positions.getX(i)/width+.5)*2,0,2),y=THREE.MathUtils.clamp((positions.getY(i)/height+.5)*2,0,2);
    const xi=Math.min(1,Math.floor(x)),yi=Math.min(1,Math.floor(y));
    const tx=x-xi,ty=y-yi;
    const lower=THREE.MathUtils.lerp(samples[yi][xi],samples[yi][xi+1],tx);
    const upper=THREE.MathUtils.lerp(samples[yi+1][xi],samples[yi+1][xi+1],tx);
    const bend=Math.pow(1-positions.getY(i)/height-.5,3)*.012;
    const point=new THREE.Vector3(positions.getX(i),positions.getY(i),0).applyMatrix4(group.matrixWorld);
    ray.set(point.clone().addScaledVector(normal,.42),normal.clone().negate());
    const hit=ray.intersectObject(shelter,true).find(h=>h.distance<.8);
    const surface=hit?hit.point.clone().applyMatrix4(inverse).z:0;
    base[i]=Math.max(THREE.MathUtils.lerp(lower,upper,ty),surface)+bend+.025;
    positions.setZ(i,base[i]);
  }
  // Paper bridges the deepest cracks and raised scraps. A triangle interpolated
  // between ray samples must not sink back through a plaster peak between them.
  const front=Math.max(...base)+.008;
  for(let i=0;i<positions.count;i++){
    const edge=1-(positions.getY(i)/height+.5);
    base[i]=front+Math.pow(edge,3)*.006;
    positions.setZ(i,base[i]);
  }
  geometry.computeVertexNormals();positions.needsUpdate=true;
  return base;
}

export function createFlyers(scene,shelter,config,anisotropy) {
  return config.posters.map((p,index)=>{
    const width=.83*p.size,height=1.14*p.size;
    const group=new THREE.Group();
    if(p.wall==='about'){group.position.set(p.x,p.y,-1.0);group.rotation.set(0,0,THREE.MathUtils.degToRad(p.angle));}
    if(p.wall==='project'){group.position.set(-2.16,p.y,p.x*.3);group.rotation.set(0,Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
    if(p.wall==='contact'){group.position.set(2.15,p.y,-p.x*.3);group.rotation.set(0,-Math.PI/2,THREE.MathUtils.degToRad(p.angle));}
    const map=paperMap(p,index);map.anisotropy=Math.min(8,anisotropy);
    const geometry=new THREE.PlaneGeometry(width,height,12,16);
    const material=new THREE.MeshStandardMaterial({map,roughness:1,metalness:0,side:THREE.DoubleSide,alphaTest:.45,emissive:'#6e5c37',emissiveIntensity:0});
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);scene.add(group);
    const base=conformPage(group,geometry,shelter,width,height);
    // Tape is translucent, short and wrinkled rather than a floating ribbon.
    for(const x of [-.29,.29]){
      const tape=new THREE.Mesh(new THREE.PlaneGeometry(.19,.067),new THREE.MeshStandardMaterial({color:'#b9b18b',roughness:1,transparent:true,opacity:.52,side:THREE.DoubleSide}));
      tape.position.set(x*p.size,height/2-.011,.015);tape.rotation.z=x*.31;group.add(tape);
      // Place tape against the same conformed upper surface.
      const indexTop=Math.round((x*p.size/width+.5)*12);tape.position.z=base[indexTop]+.002;
    }
    const poster={group,mesh,geometry,base,width,height,p,index,hover:0,targetHover:0};
    mesh.userData.poster=poster;return poster;
  });
}

export function animateFlyers(posters,dt,time,reduced) {
  let changed=false;
  for(const poster of posters){
    const before=poster.hover;
    poster.hover=THREE.MathUtils.damp(poster.hover,poster.targetHover,15,dt);
    if(Math.abs(before-poster.hover)<.0002)continue;
    const position=poster.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const edge=1-(position.getY(i)/poster.height+.5);
      const fold=reduced?0:poster.hover*Math.pow(edge,2)*(.026+Math.sin(time*.002+i*.2)*.003);
      position.setZ(i,poster.base[i]+fold);
    }
    position.needsUpdate=true;poster.geometry.computeVertexNormals();poster.mesh.material.emissiveIntensity=poster.hover*.075;changed=true;
  }
  return changed;
}
