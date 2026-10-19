import * as THREE from 'three';
import { SECTIONS } from './sections.js';

export const PAPER_WIDTH = 900;
export const PAPER_HEIGHT = 1240;
const ink = '#343b30', rust = '#8b5138';

function randomSource(initial) {
  let seed = initial;
  return () => ((seed = seed * 16807 % 2147483647) / 2147483647);
}
function canvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  return element;
}
function wrap(context, text, x, y, width, lineHeight) {
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > width) {
        if(y>1080&&y<1300)y=1320;
        context.fillText(line, x, y); y += lineHeight; line = word;
      } else line = next;
    }
    if(y>1080&&y<1300)y=1320;
    context.fillText(line, x, y); y += lineHeight;
  }
  return y;
}

// One printed document supplies the wall, the moving 3D page and the reader.
// The readable view scrolls the same artwork; it never replaces its typography.
export function createPaper(p, index) {
  const draft = canvas(PAPER_WIDTH, 7000), context = draft.getContext('2d');
  const source = document.createElement('div');
  source.innerHTML = SECTIONS[p.section].html;
  let y = 82;
  const links = [];
  context.fillStyle = '#646750'; context.font = '500 19px "Golos Text",sans-serif';
  context.fillText(`ОБЪЯВЛЕНИЕ № ${String(index + 1).padStart(3, '0')}    ·    ПАВЛОДАР`, 59, y);
  context.strokeStyle = '#71705a70'; context.lineWidth = 1.4;
  context.beginPath(); context.moveTo(59, 110); context.lineTo(841, 110); context.stroke();
  y = 216;
  context.fillStyle = p.section === 'game' ? rust : ink;
  for (const title of p.title.split('\n')) {
    let size = 67;
    do {
      context.font = p.section === 'game' ? `bold ${size}px Georgia,serif` : `${size}px "Russo One",sans-serif`;
      if (context.measureText(title).width <= 780) break;
      size -= 2;
    } while (size > 30);
    context.fillText(title, 57, y); y += 85;
  }
  context.fillStyle = '#62644b'; context.font = '400 34px "Golos Text",sans-serif';
  y = wrap(context, p.text, 60, y + 28, 777, 51) + 36;
  context.strokeStyle = '#72735865'; context.beginPath(); context.moveTo(60, y - 18); context.lineTo(838, y - 18); context.stroke();
  for (const node of source.children) {
    if(y>1000&&y<1300)y=1320;
    if (node.matches('h3,.kicker:first-child')) continue;
    if (node.matches('p')) {
      if(p.text.split('\n').includes(node.textContent))continue;
      const handwritten = node.classList.contains('hand');
      context.fillStyle = handwritten ? rust : ink;
      context.font = handwritten ? '700 45px "Caveat",cursive' : '400 36px "Golos Text",sans-serif';
      y = wrap(context, node.textContent, 60, y + 24, 777, handwritten ? 53 : 55) + 24;
    } else if (node.matches('.kicker')) {
      context.font = '500 21px "Golos Text",sans-serif'; context.fillStyle = '#75745b';
      context.fillText(node.textContent.toUpperCase(), 60, y + 18); y += 55;
    } else if (node.matches('ul')) {
      context.font = '400 34px "Golos Text",sans-serif'; context.fillStyle = ink;
      for (const item of node.children) y = wrap(context, `— ${item.textContent}`, 60, y + 15, 777, 51) + 14;
      y += 12;
    } else if (node.matches('.chips')) {
      context.font = '400 29px "Golos Text",sans-serif'; context.fillStyle = '#536347';
      y = wrap(context, Array.from(node.children,item=>item.textContent).join('  /  '), 60, y + 16, 775, 47) + 18;
    } else if (node.matches('.big-links')) {
      for (const link of node.querySelectorAll('a')) {
        if(y<1300&&y+150>1080)y=1320;
        const top = y;
        context.font = '500 29px "Golos Text",sans-serif'; context.fillStyle = '#6c6c52';
        context.fillText(link.querySelector('.bl-name').textContent, 60, y + 30);
        context.font = '500 36px "Golos Text",sans-serif'; context.fillStyle = '#596b45';
        y = wrap(context, `${link.querySelector('.bl-val').textContent}  ↗`, 60, y + 82, 776, 49) + 12;
        context.strokeStyle = '#666f4970'; context.setLineDash([6, 6]);
        context.beginPath(); context.moveTo(60, y); context.lineTo(838, y); context.stroke(); context.setLineDash([]);
        links.push({ href: link.href, label: `${link.querySelector('.bl-name').textContent}: ${link.querySelector('.bl-val').textContent}`, x: 56, y: top, width: 788, height: y - top + 8 });
        y += 34;
      }
    }
  }
  if (p.link) {
    context.font = '500 35px "Golos Text",sans-serif'; context.fillStyle = '#596b45';
    const top = y; y = wrap(context, p.cta, 60, y + 40, 776, 51);
    links.push({ href: p.link, label: p.cta, x: 56, y: top, width: 788, height: y - top + 12 });
    y += 32;
  }
  y += 34;
  context.font = '700 42px "Caveat",cursive'; context.fillStyle = rust;
  context.fillText('Сложное — простыми словами.', 60, y); y += 62;
  context.font = '400 20px "Golos Text",sans-serif'; context.fillStyle = '#73715a';
  context.fillText('rollan.tech    ·    на связи, даже если автобус не пришёл', 60, y);
  context.font='700 44px "Caveat",cursive';context.fillStyle=rust;
  context.fillText(p.section==='contacts'?'Начни с «привет».':'Продолжение — ниже ↓',60,1170);
  context.font='400 18px "Golos Text",sans-serif';context.fillStyle='#73715a';
  context.fillText('rollan.tech   ·   НЕ СРЫВАТЬ. МОЖНО ПОДЕРЖАТЬ.',60,1210);
  const height = Math.max(PAPER_HEIGHT, Math.ceil(y + 75));
  const artwork = canvas(PAPER_WIDTH, height), ctx = artwork.getContext('2d'), random = randomSource(index + 84);
  ctx.fillStyle = p.color; ctx.fillRect(0, 0, PAPER_WIDTH, height);
  const age = ctx.createLinearGradient(0, 0, PAPER_WIDTH, 0);
  age.addColorStop(0, '#725e2928'); age.addColorStop(.13, '#fff8e706'); age.addColorStop(.88, '#fff8e706'); age.addColorStop(1, '#725e2930');
  ctx.fillStyle = age; ctx.fillRect(0, 0, PAPER_WIDTH, height);
  for (let i = 0; i < height * 10; i++) {
    ctx.fillStyle = random() > .5 ? '#473a200c' : '#fff5d516';
    ctx.fillRect(random() * PAPER_WIDTH, random() * height, 1 + random() * 2, .5 + random() * 2);
  }
  for (let foldY = 394; foldY < height; foldY += 804) {
    const fold = ctx.createLinearGradient(0, foldY - 5, 0, foldY + 7);
    fold.addColorStop(0, '#fff8df00'); fold.addColorStop(.45, '#473d2b18'); fold.addColorStop(.55, '#fff7dd38'); fold.addColorStop(1, '#fff8df00');
    ctx.fillStyle = fold; ctx.fillRect(0, foldY - 5, PAPER_WIDTH, 12);
  }
  ctx.drawImage(draft, 0, 0);
  // A single baked warm tint keeps ink and paper identical across render layers.
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#d4d4bf'; ctx.fillRect(0, 0, PAPER_WIDTH, height);
  ctx.globalCompositeOperation = 'source-over';
  const front = canvas(PAPER_WIDTH, PAPER_HEIGHT), frontContext = front.getContext('2d');
  frontContext.beginPath(); frontContext.moveTo(9, 9);
  for (let x = 10; x < 890; x += 13) frontContext.lineTo(x, 6 + random() * 6);
  for (let edgeY = 10; edgeY < 1230; edgeY += 13) frontContext.lineTo(888 + random() * 5, edgeY);
  for (let x = 889; x > 10; x -= 11) frontContext.lineTo(x, 1228 + random() * 6);
  for (let edgeY = 1230; edgeY > 10; edgeY -= 13) frontContext.lineTo(6 + random() * 6, edgeY);
  frontContext.closePath(); frontContext.clip(); frontContext.drawImage(artwork, 0, 0);
  const map = new THREE.CanvasTexture(front); map.colorSpace = THREE.SRGBColorSpace;
  return { map, frontURL: front.toDataURL(), documentURL: artwork.toDataURL(), width: PAPER_WIDTH, pageHeight: PAPER_HEIGHT, height, links, accessibleHTML: source.innerHTML };
}

export function mountPaper(container, paper, title) {
  container.replaceChildren();
  const artwork = document.createElement('div'); artwork.className = 'paper-artwork';
  const image = document.createElement('img'); image.src = paper.documentURL; image.alt = ''; image.draggable = false;
  artwork.append(image);
  for (const link of paper.links) {
    const anchor = document.createElement('a'); anchor.className = 'paper-link';
    anchor.href = link.href; anchor.target = '_blank'; anchor.rel = 'noopener'; anchor.setAttribute('aria-label', link.label);
    Object.assign(anchor.style, { left: `${link.x / paper.width * 100}%`, top: `${link.y / paper.height * 100}%`, width: `${link.width / paper.width * 100}%`, height: `${link.height / paper.height * 100}%` });
    artwork.append(anchor);
  }
  const accessible = document.createElement('div'); accessible.className = 'sr-only';
  const heading = document.createElement('h3'); heading.id = 'sheetTitle'; heading.textContent = title.replaceAll('\n', ' ');
  accessible.innerHTML = paper.accessibleHTML;
  accessible.querySelector('[id="sheetTitle"]')?.removeAttribute('id');
  for (const anchor of accessible.querySelectorAll('a')) anchor.replaceWith(document.createTextNode(anchor.textContent));
  container.append(artwork, heading, accessible); heading.className = 'sr-only';
}
