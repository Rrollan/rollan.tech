import * as THREE from 'three';

// The artwork is 3:1, so each 90 × 30 m section retains that proportion.
// Repeat buildings along flat streets instead of wrapping one image around 360°.
export const CITY_PANEL_HEIGHT = 30;
export const CITY_ART_WIDTH = 90;
export const CITY_PANELS = [
  { width: 120, x: 0, z: 24, yaw: Math.PI },
  { width: 48, x: -40, z: 0, yaw: Math.PI / 2 },
  { width: 48, x: 40, z: 0, yaw: -Math.PI / 2 }
];

export function createCityBackdrop(artwork) {
  const group = new THREE.Group();
  group.name = 'city-streets';
  for (const panel of CITY_PANELS) {
    const map = artwork.clone();
    map.wrapS = THREE.MirroredRepeatWrapping;
    map.repeat.set(panel.width / CITY_ART_WIDTH, 1);
    // The cutout contains only buildings/trees. Sky belongs to the scene and
    // cannot acquire panel seams or stretched pixels from a clamped image edge.
    const material = new THREE.MeshBasicMaterial({ map, fog: false, toneMapped: false, alphaTest: .5 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(panel.width, CITY_PANEL_HEIGHT), material);
    mesh.position.set(panel.x, 7.2, panel.z);
    mesh.rotation.y = panel.yaw;
    group.add(mesh);
  }
  return group;
}
