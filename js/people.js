// 方塊小人：有臉、會走路、會跳。點他會說出一條在地政見。
import * as THREE from 'three';

const P = 0.034; // 小人單位
const SKIN = ['#f1c9a5', '#e0ac85', '#c98e65', '#f6d7bd'];
const HAIR = ['#2b1d14', '#4a3222', '#111111', '#7a4b2a', '#c9a15a', '#6b6b6b'];
const SHIRT = ['#e85d2a', '#3c9a8f', '#4a74b8', '#f2c14e', '#ffffff', '#d94f70', '#6f9e3c', '#8a5bb5'];
const PANTS = ['#2f3f63', '#3a3a3a', '#5a4636', '#2b5d7a'];

function faceTexture(r) {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  const skin = SKIN[(r() * SKIN.length) | 0], hair = HAIR[(r() * HAIR.length) | 0];
  g.fillStyle = skin; g.fillRect(0, 0, 8, 8);
  g.fillStyle = hair; g.fillRect(0, 0, 8, 2); if (r() < .5) { g.fillRect(0, 2, 1, 2); g.fillRect(7, 2, 1, 2); }
  g.fillStyle = '#ffffff'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
  g.fillStyle = r() < .3 ? '#2a6fb5' : '#3b2618'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
  if (r() < .25) { g.fillStyle = '#222'; g.fillRect(1, 3, 6, 1); g.fillStyle = '#ffffff'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1); } // 眼鏡
  g.fillStyle = shade(skin, -.18); g.fillRect(3, 4, 2, 1);                // 鼻子
  g.fillStyle = '#8c3b32'; g.fillRect(2, 6, 4, 1); if (r() < .6) { g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1); } // 笑
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, skin, hair };
}
function solid(color) { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 8, 8); return c; }
function shade(hex, k) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); }

function makePerson(r) {
  const f = faceTexture(r);
  const skinM = new THREE.MeshLambertMaterial({ color: f.skin }), hairM = new THREE.MeshLambertMaterial({ color: f.hair });
  const head = new THREE.Mesh(new THREE.BoxGeometry(P * 2, P * 2, P * 2), [skinM, skinM, hairM, skinM, new THREE.MeshLambertMaterial({ map: f.tex }), hairM]);
  const shirt = new THREE.MeshLambertMaterial({ color: SHIRT[(r() * SHIRT.length) | 0] });
  const pants = new THREE.MeshLambertMaterial({ color: PANTS[(r() * PANTS.length) | 0] });
  const body = new THREE.Mesh(new THREE.BoxGeometry(P * 2, P * 3, P * 1), shirt);
  const limb = (m, len) => { const piv = new THREE.Group(); const mesh = new THREE.Mesh(new THREE.BoxGeometry(P * .95, P * len, P * .95), m); mesh.position.y = -P * len / 2; piv.add(mesh); return piv; };
  const armL = limb(shirt, 3), armR = limb(shirt, 3), legL = limb(pants, 3), legR = limb(pants, 3);
  const g = new THREE.Group();
  body.position.y = P * 4.5; head.position.y = P * 7;
  armL.position.set(-P * 1.5, P * 6, 0); armR.position.set(P * 1.5, P * 6, 0);
  legL.position.set(-P * .5, P * 3, 0); legR.position.set(P * .5, P * 3, 0);
  g.add(body, head, armL, armR, legL, legR);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { g, head, armL, armR, legL, legR };
}

export function buildPeople(scene, world, landmarks, weightOf, count = 80) {
  let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const people = [];
  const pool = []; world.D.forEach((d, di) => { const w = weightOf(di); for (let k = 0; k < w; k++) pool.push(di); });
  const stage = landmarks.items.find(it => it.stage);
  for (let n = 0; n < count; n++) {
    const p = makePerson(r);
    let di, x, z, mode = 'walk';
    if (stage && n < 9) { di = stage.di; mode = 'fan'; x = stage.stage.x + (r() - .5) * .45; z = stage.stage.z + .12 + r() * .35; }
    else { di = pool[(r() * pool.length) | 0]; const c = world.randomCell(di, r); x = world.cellX(c.i) + (r() - .5) * .3; z = world.cellZ(c.j) + (r() - .5) * .3; }
    p.g.position.set(x, world.topAt(x, z), z);
    p.g.traverse(o => { o.userData.person = people.length; });
    scene.add(p.g);
    people.push({ ...p, di, mode, tx: x, tz: z, wait: r() * 2, sp: .12 + r() * .1, ph: r() * 6, jump: 0, home: { x, z } });
    if (mode === 'fan') p.g.rotation.y = Math.PI;
  }
  const meshes = []; people.forEach(p => p.g.traverse(o => o.isMesh && meshes.push(o)));

  function pickTarget(p) {
    if (p.mode === 'fan') return;
    const c = world.randomCell(p.di);
    // 走近一點的格子，避免一路橫越整個山區
    const nx = world.cellX(c.i), nz = world.cellZ(c.j);
    const dx = nx - p.g.position.x, dz = nz - p.g.position.z, L = Math.hypot(dx, dz), lim = 1.6;
    p.tx = L > lim ? p.g.position.x + dx / L * lim : nx; p.tz = L > lim ? p.g.position.z + dz / L * lim : nz;
    if (world.districtAt(p.tx, p.tz) !== p.di) { p.tx = nx; p.tz = nz; }
  }
  function update(dt, t, reduce) {
    for (const p of people) {
      const g = p.g; let swing = 0;
      if (p.mode === 'fan') {
        p.jump = Math.max(0, Math.sin(t * 7 + p.ph)) * P * 2.5;
        p.armL.rotation.x = p.armR.rotation.x = -2.6 + Math.sin(t * 7 + p.ph) * .3;
      } else if (p.wait > 0) { p.wait -= dt; p.armL.rotation.x = p.armR.rotation.x = 0; }
      else {
        const dx = p.tx - g.position.x, dz = p.tz - g.position.z, L = Math.hypot(dx, dz);
        if (L < .03) { p.wait = .8 + Math.random() * 3; pickTarget(p); }
        else { const s = Math.min(L, p.sp * dt); g.position.x += dx / L * s; g.position.z += dz / L * s; const want = Math.atan2(dx, dz); g.rotation.y += ((want - g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8); swing = Math.sin(t * 10 + p.ph) * .7; }
        p.armL.rotation.x = swing; p.armR.rotation.x = -swing;
      }
      p.legL.rotation.x = -swing; p.legR.rotation.x = swing;
      if (p.hop > 0) { p.hop -= dt; }
      const hop = p.hop > 0 ? Math.sin((1 - p.hop / .6) * Math.PI) * P * 6 : 0;
      const ground = world.topAt(g.position.x, g.position.z);
      g.position.y += ((ground + (reduce ? 0 : p.jump + hop)) - g.position.y) * Math.min(1, dt * 14);
    }
  }
  function poke(i) { const p = people[i]; if (!p) return null; p.hop = .6; p.wait = Math.max(p.wait, 2.5); return p; }
  return { people, meshes, update, poke, P };
}
