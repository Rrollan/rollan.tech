const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => { const t=clamp(value); return t*t*(3-2*t); };

/** A readable, cancelable reach → touch → two strokes → release gesture. */
export function petGesture(progress, reduced=false) {
  const t=clamp(progress);
  const reach=smooth(t/.23)*(1-smooth((t-.79)/.21));
  const contact=smooth((t-.20)/.07)*(1-smooth((t-.78)/.12));
  let stroke=0;
  if(!reduced&&t>=.29&&t<=.75) {
    const phase=clamp((t-.29)/.46)*2;
    const half=phase-Math.floor(phase);
    stroke=half<=.5?smooth(half*2):1-smooth((half-.5)*2);
  }
  const pressure=contact*(.82+.18*(1-Math.abs(stroke-.5)*2));
  const stage=t<.20?'reaching':t<.29?'touching':t<.75?'stroking':t<.80?'settling':'withdrawing';
  return {progress:t,reach,contact,stroke,pressure,stage};
}
