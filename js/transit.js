// 軌道：環狀輕軌（地面）、捷運紅線北段（高架）、橘線大寮段（地面）。地下段不畫。
// 路線座標為示意，依沿線主要道路與車站位置大略描出，非精確線形。
import * as THREE from 'three';
import { ROUND, unitBox } from './style.js';

const LRT = { name: '環狀輕軌', color: 0x2fa84f, loop: true, kind: 'lrt', desc: '高雄環狀輕軌，繞行前鎮、苓雅、鹽埕、鼓山、三民一圈，全線在地面行駛。',
  pts: [
    [22.5878, 120.3160], [22.5935, 120.3085], [22.5990, 120.3040], [22.6045, 120.3000], [22.6085, 120.2955],
    [22.6140, 120.2895], [22.6185, 120.2855], [22.6200, 120.2825], [22.6205, 120.2780], [22.6215, 120.2742],
    [22.6262, 120.2733], [22.6315, 120.2745], [22.6372, 120.2772], [22.6425, 120.2792], [22.6475, 120.2812],
    [22.6522, 120.2833], [22.6558, 120.2862], [22.6562, 120.2905], [22.6577, 120.2955], [22.6588, 120.3002],
    [22.6575, 120.3045], [22.6555, 120.3095], [22.6530, 120.3150], [22.6490, 120.3180], [22.6440, 120.3205],
    [22.6400, 120.3226], [22.6330, 120.3232], [22.6260, 120.3238], [22.6160, 120.3238], [22.6080, 120.3222],
    [22.6010, 120.3212], [22.5930, 120.3205]] };
const RED = { name: '捷運紅線（高架段）', color: 0xd8342c, kind: 'metro', desc: '紅線從世運站往北到岡山改為高架，左營以南都在地下，地圖上只畫地面以上的部分。',
  ramp: 0, pts: [
    [22.6930, 120.3040], [22.7020, 120.3022], [22.7130, 120.3060], [22.7240, 120.3080], [22.7315, 120.3140],
    [22.7420, 120.3170], [22.7520, 120.3170], [22.7590, 120.3175], [22.7710, 120.3160], [22.7800, 120.3075],
    [22.7860, 120.3048], [22.7930, 120.3010]] };
const ORANGE = { name: '捷運橘線（大寮地面段）', color: 0xf08a24, kind: 'metro', ground: true, desc: '橘線過鳳山國中後出地面，終點大寮站是全線唯一的地面站，其餘都在地下。',
  ramp: 0, pts: [[22.6228, 120.3800], [22.6224, 120.3860], [22.6220, 120.3920]] };

const ELEV = .28;   // 高架高度（km，示意）
const STEP = .05;

function resample(world, line) {
  const raw = line.pts.map(([la, lo]) => { const [x, z] = world.proj(la, lo); return new THREE.Vector2(x, z); });
  if (line.loop) raw.push(raw[0].clone());
  const out = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const a = raw[i], b = raw[i + 1], L = a.distanceTo(b), n = Math.max(1, Math.ceil(L / STEP));
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n));
  }
  if (!line.loop) out.push(raw[raw.length - 1].clone());
  // 累積距離
  const s = [0]; for (let i = 1; i < out.length; i++) s.push(s[i - 1] + out[i].distanceTo(out[i - 1]));
  return { p: out, s, len: s[s.length - 1], loop: !!line.loop };
}
function at(path, d) {  // 依距離取點與方向
  const { p, s, len, loop } = path;
  d = loop ? ((d % len) + len) % len : Math.max(0, Math.min(len, d));
  let lo = 0, hi = s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= d) lo = m; else hi = m; }
  const t = (d - s[lo]) / Math.max(1e-6, s[hi] - s[lo]);
  const pt = p[lo].clone().lerp(p[hi], t), dir = p[hi].clone().sub(p[lo]).normalize();
  return { pt, dir };
}

export function buildTransit(scene, world) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const statics = [];   // {m: Matrix4 base, di, mesh, idx}
  const meshes = {};
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const bucket = (key, color) => (meshes[key] ||= { color, list: [] });
  const items = [], trains = [], clear = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const place = (key, color, x, y, z, ang, sx, sy, sz) => {
    q.setFromAxisAngle(up, ang); sc.set(sx, sy, sz); pos.set(x, y, z); m4.compose(pos, q, sc);
    bucket(key, color).list.push({ m: m4.clone(), di: world.districtAt(x, z) });
  };

  for (const line of [LRT, RED, ORANGE]) {
    const path = resample(world, line);
    line.path = path;
    const elevated = line.kind === 'metro' && !line.ground;
    for (let i = 0; i < path.p.length - 1; i++) {
      const a = path.p[i], b = path.p[i + 1], mx = (a.x + b.x) / 2, mz = (a.y + b.y) / 2;
      const ang = Math.atan2(b.x - a.x, b.y - a.y), L = a.distanceTo(b) + .004;
      const g = world.topAt(mx, mz) - world.liftOf(world.districtAt(mx, mz));
      clear.push({ x: mx, z: mz, r: elevated ? .07 : .09 });
      if (line.kind === 'lrt') {
        place('lrtBed', 0x7fbf5a, mx, g + .006, mz, ang, .11, .012, L);              // 草皮軌道
        place('rail', 0x5b5f66, mx + Math.cos(ang) * .022, g + .014, mz - Math.sin(ang) * .022, ang, .008, .006, L);
        place('rail', 0x5b5f66, mx - Math.cos(ang) * .022, g + .014, mz + Math.sin(ang) * .022, ang, .008, .006, L);
      } else {
        // 起點做坡道（從地下爬上來）
        const k = Math.min(1, path.s[i] / .45), y = elevated ? g + ELEV * (line.ramp === 0 ? k : 1) : g + .01;
        place('deck', 0xcfd4d8, mx, y, mz, ang, .12, .03, L);
        place('rail', 0x5b5f66, mx, y + .02, mz, ang, .1, .006, L);
        place('edge', line.color, mx + Math.cos(ang) * .058, y + .022, mz - Math.sin(ang) * .058, ang, .006, .014, L);
        place('edge', line.color, mx - Math.cos(ang) * .058, y + .022, mz + Math.sin(ang) * .058, ang, .006, .014, L);
        if (elevated && k > .3 && i % 5 === 0) place('pier', 0xb9bec4, mx, (g + y) / 2, mz, ang, .05, y - g, .05);
      }
    }
    // 車站
    for (let n = 0; n < line.pts.length; n += line.kind === 'lrt' ? 2 : 1) {
      const [x, z] = world.proj(...line.pts[n]); const g = world.topAt(x, z) - world.liftOf(world.districtAt(x, z));
      const y = line.kind === 'lrt' || line.ground ? g : g + ELEV * (n === 0 ? 0 : 1);
      if (line.kind === 'metro' && n === 0 && !line.ground) continue;
      if (line === ORANGE && n !== line.pts.length - 1) continue;
      const d = at(path, Math.min(path.len, path.s[Math.min(path.s.length - 1, Math.round(n * (path.s.length - 1) / Math.max(1, line.pts.length - 1)))]));
      const ang = Math.atan2(d.dir.x, d.dir.y);
      place('plat', 0xe9e4da, x, y + .02, z, ang, line.kind === 'lrt' ? .2 : .26, .02, .12);
      place('roof', line.color, x, y + (line.kind === 'lrt' ? .075 : .1), z, ang, line.kind === 'lrt' ? .22 : .3, .012, .14);
    }
    // 列車
    const nTrain = line.kind === 'lrt' ? 4 : line.ground ? 1 : 2;
    const cars = line.kind === 'lrt' ? 5 : 3, carL = line.kind === 'lrt' ? .045 : .075;
    for (let t = 0; t < nTrain; t++) {
      const g = new THREE.Group(); const parts = [];
      for (let c = 0; c < cars; c++) {
        const car = new THREE.Group();
        const body = new THREE.Mesh(ROUND ? unitBox(.3) : geo, mat(0xf4f5f2)); body.scale.set(.05, .04, carL); body.position.y = .028; body.castShadow = true;
        const band = new THREE.Mesh(geo, mat(line.color)); band.scale.set(.052, .01, carL * .98); band.position.y = .018;
        const win = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x263744 })); win.scale.set(.053, .013, carL * .9); win.position.y = .035; win.userData.win = true;
        car.add(body, band, win); g.add(car); parts.push(car);
      }
      scene.add(g);
      trains.push({ line, path, parts, carL, d: path.len * t / nTrain, dir: line.loop ? (t % 2 ? -1 : 1) : (t % 2 ? -1 : 1), sp: line.kind === 'lrt' ? .09 : .2, wait: 0 });
    }
    // 點得到的標籤
    const mid = at(path, path.len * (line.kind === 'lrt' ? .55 : .5)).pt;
    const g0 = world.topAt(mid.x, mid.y);
    items.push({ name: line.name, desc: line.desc, d: '', x: mid.x, z: mid.y, y: g0 + (line.kind === 'metro' && !line.ground ? ELEV : 0), di: Math.max(0, world.districtAt(mid.x, mid.y)), top: 2, transit: true });
  }

  world.clearAround(clear);
  const insts = [];
  for (const [key, b] of Object.entries(meshes)) {
    const im = new THREE.InstancedMesh(geo, mat(b.color), b.list.length);
    b.list.forEach((it, n) => { im.setMatrixAt(n, it.m); insts.push({ im, n, base: it.m, di: it.di }); });
    im.receiveShadow = true; im.castShadow = key === 'deck' || key === 'pier' || key === 'roof';
    scene.add(im); b.im = im;
  }
  items.forEach(it => { it.d = world.D[it.di].name; });

  const last = new Map(), tmp = new THREE.Matrix4();
  function applyLift() {
    const dirty = new Set();
    for (const s of insts) {
      const l = world.liftOf(s.di); if (last.get(s) === l) continue; last.set(s, l);
      tmp.copy(s.base); tmp.elements[13] += l; s.im.setMatrixAt(s.n, tmp); dirty.add(s.im);
    }
    dirty.forEach(im => im.instanceMatrix.needsUpdate = true);
  }
  function yAt(line, path, d, x, z) {
    const g = world.topAt(x, z);
    if (line.kind === 'lrt' || line.ground) return g + .012;
    return g + .02 + ELEV * Math.min(1, d / .45);
  }
  function update(dt) {
    for (const tr of trains) {
      if (tr.wait > 0) { tr.wait -= dt; } else {
        tr.d += tr.dir * tr.sp * dt;
        if (!tr.path.loop && (tr.d > tr.path.len - .06 || tr.d < .06)) { tr.dir *= -1; tr.d = Math.max(.06, Math.min(tr.path.len - .06, tr.d)); tr.wait = 2.5; }
      }
      tr.parts.forEach((car, c) => {
        const dd = tr.d - tr.dir * c * (tr.carL + .004);
        const { pt, dir } = at(tr.path, dd);
        car.position.set(pt.x, yAt(tr.line, tr.path, tr.path.loop ? 1 : Math.max(0, Math.min(tr.path.len, dd)), pt.x, pt.y), pt.y);
        car.rotation.y = Math.atan2(dir.x, dir.y);
        car.visible = tr.path.loop || dd > .02 || tr.line.ground;
      });
    }
  }
  function setNight(on) { trains.forEach(t => t.parts.forEach(c => c.children.forEach(m => { if (m.userData.win) m.material.color.set(on ? 0xffe9a8 : 0x263744); }))); }
  return { items, update, applyLift, setNight };
}
