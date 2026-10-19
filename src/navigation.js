import * as THREE from 'three';

// A standing visitor stays clear of the three walls and the bench seat.
export const WALK_BOUNDS = { left: -1.72, right: 1.72, back: -.10, front: 1.54 };
export const WALK_SPEED = 1.4;
export function constrainPosition(position) {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(position.x, WALK_BOUNDS.left, WALK_BOUNDS.right),
    position.y,
    THREE.MathUtils.clamp(position.z, WALK_BOUNDS.back, WALK_BOUNDS.front)
  );
}
export function floorHeight(z) {
  const t = THREE.MathUtils.smoothstep(z, 1.02, 1.28);
  return THREE.MathUtils.lerp(.224, .035, t);
}
export function nearestAngle(from, to) {
  return to + Math.round((from - to) / (2 * Math.PI)) * 2 * Math.PI;
}
export function movementStep(position, forward, side, yaw, dt) {
  const input = new THREE.Vector2(side, forward);
  if (input.length() > 1) input.normalize();
  const speed = WALK_SPEED * Math.min(Math.max(dt, 0), .05);
  const dx = (input.x * Math.cos(yaw) - input.y * Math.sin(yaw)) * speed;
  const dz = (-input.x * Math.sin(yaw) - input.y * Math.cos(yaw)) * speed;
  return constrainPosition(new THREE.Vector3(position.x + dx, position.y, position.z + dz));
}

export class Visitor {
  constructor(camera, canvas, { pick, onPoster, onCat, onInteraction, onMode, reduced }) {
    Object.assign(this, { camera, canvas, pick, onPoster, onCat, onInteraction, onMode, reduced });
    this.position = camera.aspect < .8 ? new THREE.Vector3(-.75,1.84,1.30) : new THREE.Vector3(-.28,1.84,1.19);
    this.yaw = -.09;
    this.pitch = -.065;
    this.fov = 72;
    this.keys = new Set();
    this.mode = 'explore';
    this.pointers = new Map();
    this.walkTarget = null;
    this.motion = null;
    this.saved = null;
    this.joystick = new THREE.Vector2();
    this.viewChanged = true;
    this.bind();
    this.syncCamera();
  }

  get busy() { return this.mode !== 'explore'; }
  get down() { return this.pointers.size > 0; }
  setMode(mode) { this.mode = mode; this.onMode(mode); }
  snapshot() { return { position: this.position.clone(), yaw: this.yaw, pitch: this.pitch, fov: this.fov }; }
  moveCamera(target, duration, complete) {
    this.motion = {
      from: this.snapshot(),
      to: { ...target, position: target.position.clone(), yaw: nearestAngle(this.yaw, target.yaw) },
      start: performance.now(), duration: this.reduced.matches ? 0 : duration, complete
    };
  }

  approach(poster, complete) {
    if (this.busy) return;
    this.saved = this.snapshot();
    this.walkTarget = null;
    this.keys.clear();
    this.clearPointers();
    this.setMode('approach');
    poster.group.updateWorldMatrix(true, false);
    const center = poster.group.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(poster.group.matrixWorld);
    const fov = 62;
    const vertical = poster.height / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    const horizontal = poster.width / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * this.camera.aspect);
    const distance = Math.max(vertical, horizontal) * 1.24;
    const targetPosition = center.clone().addScaledVector(normal, distance);
    // A close-up may lean toward a wall, but never enters its geometry.
    targetPosition.y = center.y - .16;
    const toward = center.clone().sub(targetPosition).normalize();
    const targetYaw = Math.atan2(-toward.x, -toward.z);
    const targetPitch = Math.asin(toward.y);
    this.moveCamera({ position: targetPosition, yaw: targetYaw, pitch: targetPitch, fov }, 720, () => {
      this.setMode('taking');
      complete();
    });
  }

  returnFromPoster() {
    if (!this.saved) return;
    const target = this.saved;
    this.saved = null;
    this.setMode('return');
    this.moveCamera(target, 520, () => this.setMode('explore'));
  }

  goToPoster(poster) { this.onPoster(poster); }

  clearPointers() {
    this.pointers.clear();
    this.joystick.set(0, 0);
    document.getElementById('touchMove').hidden = true;
  }

  syncCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    if (this.camera.fov !== this.fov) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }

  update(time, dt) {
    let changed = this.viewChanged;
    this.viewChanged = false;
    if (this.motion) {
      const motion = this.motion;
      const t = motion.duration ? Math.min(1, (time - motion.start) / motion.duration) : 1;
      // Quintic smoothstep starts and ends at rest, without spring overshoot.
      const e = t * t * t * (t * (t * 6 - 15) + 10);
      this.position.lerpVectors(motion.from.position, motion.to.position, e);
      this.yaw = THREE.MathUtils.lerp(motion.from.yaw, motion.to.yaw, e);
      this.pitch = THREE.MathUtils.lerp(motion.from.pitch, motion.to.pitch, e);
      this.fov = THREE.MathUtils.lerp(motion.from.fov, motion.to.fov, e);
      if (t === 1) {
        this.motion = null;
        motion.complete?.();
      }
      changed = true;
    } else if (!this.busy) {
      const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - this.joystick.y;
      const side = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.joystick.x;
      const turn = Number(this.keys.has('ArrowLeft')) - Number(this.keys.has('ArrowRight'));
      if (turn) { this.yaw += turn * dt * 1.6; changed = true; }
      if (forward || side) {
        this.walkTarget = null;
        this.position.copy(movementStep(this.position, forward, side, this.yaw, dt));
        changed = true;
      } else if (this.walkTarget) {
        const difference = this.walkTarget.clone().sub(this.position);
        difference.y = 0;
        const distance = difference.length();
        if (distance < .006) { this.position.x=this.walkTarget.x;this.position.z=this.walkTarget.z;this.walkTarget = null;changed=true; }
        else {
          this.position.addScaledVector(difference.normalize(), Math.min(distance, dt * WALK_SPEED));
          changed = true;
        }
      }
      const height = floorHeight(this.position.z) + 1.62;
      if (Math.abs(this.position.y - height) > .001) {
        this.position.y = THREE.MathUtils.damp(this.position.y, height, 16, dt);
        changed = true;
      }
    }
    this.syncCamera();
    return changed;
  }

  bind() {
    const moved = () => this.onInteraction();
    const keyDown = e => {
      if (e.key === 'Escape' && this.mode === 'approach') { this.returnFromPoster(); return; }
      if (this.busy || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (/^(Key[WASD]|Arrow(Left|Right|Up|Down))$/.test(e.code)) {
        e.preventDefault(); this.keys.add(e.code); moved();
      }
    };
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.clearPointers(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.keys.clear(); this.clearPointers(); } });

    this.canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 || this.busy) return;
      const hit = this.pick(e.clientX, e.clientY);
      const isMove = e.pointerType === 'touch' && e.clientX < innerWidth * .35 && e.clientY > innerHeight * .72 && !hit?.poster;
      if ([...this.pointers.values()].some(p => p.isMove === isMove)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: false, isMove });
      this.canvas.setPointerCapture(e.pointerId);
      if (isMove) {
        const pad = document.getElementById('touchMove');
        pad.hidden = false; pad.style.left = `${e.clientX}px`; pad.style.top = `${e.clientY}px`;
        document.getElementById('touchMoveKnob').style.transform = 'translate(0,0)';
      }
    });
    this.canvas.addEventListener('pointermove', e => {
      const down = this.pointers.get(e.pointerId);
      if (!down || this.busy) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > (e.pointerType === 'touch' ? 6 : 3)) down.moved = true;
      if (!down.moved) return;
      moved();
      this.walkTarget = null;
      if (down.isMove) {
        this.joystick.set(THREE.MathUtils.clamp(dx / 50, -1, 1), THREE.MathUtils.clamp(dy / 50, -1, 1));
        document.getElementById('touchMoveKnob').style.transform = `translate(${this.joystick.x * 25}px,${this.joystick.y * 25}px)`;
      } else {
        // Hand follows the scene directly; there is no post-release inertia.
        const sensitivity = e.pointerType === 'touch' ? .0042 : .003;
        this.yaw = down.yaw - dx * sensitivity;
        this.pitch = THREE.MathUtils.clamp(down.pitch - dy * sensitivity * .78, -.95, .72);
        this.viewChanged = true;
        this.syncCamera();
      }
    });
    const release = e => {
      const down = this.pointers.get(e.pointerId);
      if (!down) return;
      this.pointers.delete(e.pointerId);
      if (down.isMove) {
        this.joystick.set(0, 0);
        document.getElementById('touchMove').hidden = true;
      }
      if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      if (e.type !== 'pointerup' || down.moved || this.busy) return;
      const hit = this.pick(e.clientX, e.clientY);
      if (hit?.poster) { moved(); this.onPoster(hit.poster); }
      else if (hit?.cat) { moved(); this.onCat(); }
      else if (hit?.floor) {
        moved(); this.walkTarget = constrainPosition(hit.point); this.walkTarget.y = this.position.y;
      }
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', release);
    this.canvas.addEventListener('lostpointercapture', release);
  }
}
