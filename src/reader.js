import { HandLayer } from './hands.js';

export const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
export function rectangleQuad(rect) {
  return [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height }];
}
export function interpolateQuad(from, to, t) {
  return from.map((point, i) => ({ x: point.x + (to[i].x - point.x) * t, y: point.y + (to[i].y - point.y) * t }));
}

export class PaperReader {
  constructor({ dialog, reduced, wallQuad, invalidate, onMode, onReturn }) {
    Object.assign(this, { dialog, reduced, wallQuad, invalidate, onMode, onReturn });
    this.wrapper = dialog.querySelector('.held-paper');
    this.sheet = dialog.querySelector('.paper-sheet');
    this.canvas = dialog.querySelector('.hands-world');
    this.active = null;
    this.ready = HandLayer.create(this.canvas).then(layer => { this.layer = layer; });
    this.renderNeeded = false;
    dialog.querySelector('.close-paper').addEventListener('click', () => this.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) this.close(); });
    dialog.addEventListener('close', () => { if (this.active) this.finishClose(); });
    this.sheet.addEventListener('scroll', () => { dialog.dataset.scrolled = String(this.sheet.scrollTop > 15); }, { passive: true });
  }

  async open(poster) {
    if (this.active) return;
    this.active = poster;
    await this.ready;
    if (this.active !== poster) return;
    this.dialog.dataset.phase = 'taking'; this.dialog.dataset.scrolled = 'false';
    this.onMode('taking'); this.layer.renderer.clear(); this.dialog.showModal(); this.sheet.scrollTop = 0;
    this.from = this.wallQuad(poster); this.to = rectangleQuad(this.wrapper.getBoundingClientRect());
    this.quad = this.from;
    poster.mesh.visible = false; this.invalidate();
    this.started = performance.now(); this.renderNeeded = true;
  }

  close() {
    if (!this.active || ['placing','resetting'].includes(this.dialog.dataset.phase)) return;
    if (this.sheet.scrollTop > 1 && !this.reduced.matches && this.dialog.dataset.phase === 'reading') {
      this.dialog.dataset.phase = 'resetting'; this.scrollFrom = this.sheet.scrollTop;
      this.started = performance.now(); this.onMode('placing'); return;
    }
    this.place();
  }

  place() {
    this.sheet.scrollTop = 0;
    this.returnPose = this.layer?.pose;
    this.from = this.quad; this.to = this.wallQuad(this.active);
    this.dialog.dataset.phase = 'placing'; this.started = performance.now(); this.renderNeeded = true; this.onMode('placing');
  }

  finishClose() {
    if (!this.active) return;
    this.active.mesh.visible = true; this.active = null; this.invalidate();
    this.dialog.dataset.phase = 'closed';
    if (this.dialog.open) this.dialog.close();
    this.layer.renderer.clear(); this.onReturn();
  }

  resize() {
    if (!this.layer) return;
    this.layer.resize();
    if (this.active && this.dialog.dataset.phase === 'taking') {
      this.quad = rectangleQuad(this.wrapper.getBoundingClientRect());
      this.dialog.dataset.phase = 'reading'; this.onMode('reading');
    } else if (this.active && this.dialog.dataset.phase === 'placing') this.finishClose();
    else if (this.active) this.quad = rectangleQuad(this.wrapper.getBoundingClientRect());
    this.renderNeeded = true;
  }

  update(time) {
    if (!this.active || !this.dialog.open || !this.layer) return;
    let phase = this.dialog.dataset.phase;
    if (phase === 'resetting') {
      const progress = Math.min(1, (time - this.started) / 180);
      this.sheet.scrollTop = this.scrollFrom * (1 - smooth(progress));
      if (progress === 1) this.place();
      return;
    }
    if (!this.renderNeeded && phase === 'reading') return;
    const progress = this.reduced.matches ? 1 : Math.min(1, (time - this.started) / (phase === 'taking' ? 980 : 660));
    this.dialog.dataset.liftStage=phase==='taking'?(progress<.27?'reaching':'lifting'):phase;
    if (phase === 'taking') this.quad = interpolateQuad(this.from, this.to, smooth((progress - .27) / .73));
    else if (phase === 'placing') this.quad = interpolateQuad(this.from, this.to, smooth(progress / .77));
    if (phase === 'taking' && progress === 1) {
      this.dialog.dataset.phase = 'reading'; phase = 'reading'; this.sheet.focus({ preventScroll: true }); this.onMode('reading');
    }
    this.layer.render(this.quad, { phase, progress, texture: this.active.mesh.material.map, returnPose: this.returnPose });
    this.renderNeeded = false;
    if (phase === 'placing' && progress === 1) this.finishClose();
  }
}
