export function validateConfig(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.posters) || input.posters.length < 1 || input.posters.length > 20) throw new Error('Нужен файл настроек остановки версии 1.');
  const number = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback;
  const text = (value,max) => typeof value === 'string' ? value.slice(0,max) : '';
  const ids = new Set();
  const posters = input.posters.map((p,i) => {
    if (!p || !['about','project','contact'].includes(p.wall)) throw new Error('Неизвестная стенка объявления.');
    const id = text(p.id,40).replace(/[^a-z0-9_-]/gi,'') || `poster-${i}`;
    if (ids.has(id)) throw new Error('Повторяется номер объявления.');
    ids.add(id);
    let link = text(p.link,1000);
    if (link) {
      try { const url = new URL(link); if (!['https:','http:'].includes(url.protocol)) throw new Error(); link = url.href; }
      catch { throw new Error('Ссылка должна начинаться с https:// или http://.'); }
    }
    return {id,wall:p.wall,section:['about','services','game','contacts'].includes(p.section)?p.section:'about',title:text(p.title,100),text:text(p.text,280),cta:text(p.cta,60),link,color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#f0e6ce',x:number(p.x,-1.9,1.9,0),y:number(p.y,.95,2.65,2),size:number(p.size,.6,1.5,1),angle:number(p.angle,-12,12,0)};
  });
  return {version:1,lighting:{exposure:number(input.lighting?.exposure,.5,1.8,1.05),sunPower:number(input.lighting?.sunPower,0,5,2.6)},posters};
}
