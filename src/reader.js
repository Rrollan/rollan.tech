import { HandLayer } from './hands.js';
const ease = 'cubic-bezier(.22,.75,.22,1)';

export function paperTransform(from, to) {
  return `translate(${from.x + from.width / 2 - to.x - to.width / 2}px,${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${from.width / to.width},${from.height / to.height})`;
}

export class PaperReader {
  constructor({ dialog, reduced, wallBounds, invalidate, onMode, onReturn }) {
    Object.assign(this, { dialog, reduced, wallBounds, invalidate, onMode, onReturn });
    this.wrapper = dialog.querySelector('.held-paper');
    this.sheet = dialog.querySelector('.paper-sheet');
    this.canvas = dialog.querySelector('.hands-world');
    this.active = null;
    this.sequence = 0;
    this.animations = [];
    this.ready = HandLayer.create(this.canvas).then(layer => { this.layer = layer; });
    this.renderNeeded = false;
    dialog.querySelector('.close-paper').addEventListener('click', () => this.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) this.close(); });
    dialog.addEventListener('close', () => { if (this.active) this.finishClose(); });
  }

  animate(element, frames, options) {
    const animation = element.animate(frames, { ...options, fill: 'forwards' });
    this.animations.push(animation);
    return animation;
  }

  stopAnimations(freeze = false) {
    if (freeze) for (const element of [this.wrapper]) {
      const style = getComputedStyle(element);
      element.style.transform = style.transform;
      element.style.opacity = style.opacity;
    }
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
  }

  resetPose() {
    for (const element of [this.wrapper]) {
      element.style.transform = '';
      element.style.opacity = '';
    }
  }

  async open(poster) {
    if (this.active) return;
    this.active = poster;
    const sequence = ++this.sequence;
    await this.ready;
    if (sequence !== this.sequence) return;
    this.resetPose();
    this.dialog.dataset.phase = 'taking';
    this.onMode('taking');
    this.layer.renderer.clear();
    this.dialog.showModal();
    this.sheet.scrollTop = 0;
    const target = this.wrapper.getBoundingClientRect();
    const from = paperTransform(this.wallBounds(poster), target);
    poster.mesh.visible = false;
    this.invalidate();
    this.started = performance.now();
    this.renderNeeded = true;
    if (!this.reduced.matches) {
      const lift = this.animate(this.wrapper, [
        { transform: from, offset: 0 },
        { transform: from, offset: .3, easing: ease },
        { transform: 'translate(0,0) scale(1)', offset: 1 }
      ], { duration: 840, easing: 'linear' });
      try { await lift.finished; } catch { return; }
    }
    if (sequence !== this.sequence) return;
    this.stopAnimations();
    this.resetPose();
    this.dialog.dataset.phase = 'reading';
    this.renderNeeded = true;
    this.onMode('reading');
  }

  async close() {
    if (!this.active || this.dialog.dataset.phase === 'placing') return;
    ++this.sequence;
    this.stopAnimations(true);
    this.returnPose = this.layer?.pose;
    this.dialog.dataset.phase = 'placing';
    this.started = performance.now();
    this.renderNeeded = true;
    this.onMode('placing');
    if (!this.reduced.matches && this.dialog.open) {
      const current = this.wrapper.style.transform;
      this.wrapper.style.transform = 'none';
      const target = this.wrapper.getBoundingClientRect();
      this.wrapper.style.transform = current;
      const toWall = paperTransform(this.wallBounds(this.active), target);
      const place = this.animate(this.wrapper, [
        { transform: current }, { transform: toWall }
      ], { duration: 560, easing: ease });
      try { await place.finished; } catch { return; }
    }
    this.finishClose();
  }

  finishClose() {
    if (!this.active) return;
    ++this.sequence;
    this.active.mesh.visible = true;
    this.active = null;
    this.invalidate();
    this.stopAnimations();
    this.resetPose();
    this.dialog.dataset.phase = 'closed';
    if (this.dialog.open) this.dialog.close();
    this.onReturn();
  }

  resize() {
    if (!this.layer) return;
    this.layer.resize();
    if (this.active && this.dialog.dataset.phase === 'taking') {
      ++this.sequence; this.stopAnimations(); this.resetPose();
      this.dialog.dataset.phase = 'reading'; this.onMode('reading');
    } else if (this.active && this.dialog.dataset.phase === 'placing') this.finishClose();
    this.renderNeeded = true;
  }

  update(time) {
    if (!this.active || !this.dialog.open || !this.layer) return;
    const phase = this.dialog.dataset.phase;
    if (!this.renderNeeded && phase === 'reading') return;
    const duration = phase === 'taking' ? 840 : 560;
    const progress = this.reduced.matches ? 1 : Math.min(1, (time - this.started) / duration);
    this.layer.render(this.wrapper.getBoundingClientRect(), { phase, progress, texture: this.active.mesh.material.map, returnPose: this.returnPose });
    this.renderNeeded = false;
  }
}
