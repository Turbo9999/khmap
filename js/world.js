// 方塊地形：每個 0.5 km 格子是一根方塊柱，著色器畫出草地／水泥／泥土／石頭與方塊格線
import * as THREE from 'three';
import { TERRAIN } from '../data/terrain.js';
import { ROUND, unitBox } from './style.js';

export const B = TERRAIN.cell;      // 水平方塊邊長（km）
export const V = 0.3;               // 每層方塊高度
const URBAN = new Set(['鹽埕區','前金區','新興區','苓雅區','三民區','前鎮區','小港區','旗津區','左營區','楠梓區','鳳山區']);
export const REGION_COLOR = { north:'#4fae6a', east:'#5f9e35', core:'#b9b3a6', port:'#a9b1b8' };

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export function buildWorld(scene) {
  const T = TERRAIN, W = T.w, H = T.h;
  const dist = b64(T.d), hgt = b64(T.hgt);
  const names = T.names;
  const idx = (i, j) => j * W + i;
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? 255 : dist[idx(i, j)];
  const cellX = i => T.x0 + (i + .5) * B, cellZ = j => T.y0 + (j + .5) * B;
  const toCell = (x, z) => [Math.floor((x - T.x0) / B), Math.floor((z - T.y0) / B)];
  const k = Math.cos(T.lat0 * Math.PI / 180);
  const proj = (lat, lon) => [(lon - T.lon0) * k * 111.32, -(lat - T.lat0) * 110.57];

  // 各區資訊
  const D = names.map((n, di) => ({ name: n, di, region: T.region[di], urban: URBAN.has(n), cells: [], cx: 0, cz: 0, maxH: 0 }));
  const cells = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const d = dist[idx(i, j)]; if (d === 255) continue;
    const h = hgt[idx(i, j)]; const c = { i, j, d, h, n: cells.length };
    cells.push(c); D[d].cells.push(c); D[d].cx += cellX(i); D[d].cz += cellZ(j); D[d].maxH = Math.max(D[d].maxH, h);
  }
  for (const d of D) { d.cx /= d.cells.length; d.cz /= d.cells.length; d.area = d.cells.length * B * B; }
  const cellIndex = new Int32Array(W * H).fill(-1); cells.forEach(c => cellIndex[idx(c.i, c.j)] = c.n);

  // 每格屬性
  const N = cells.length;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const aTop = new Float32Array(N * 3), aKind = new Float32Array(N), aEdge = new Float32Array(N), aLift = new Float32Array(N), aSel = new Float32Array(N);
  const tint = new THREE.Color(), hsl = {};
  const dJit = D.map((d, di) => ((di * 37) % 11) / 11 - .5);
  let mesh = ROUND ? null : new THREE.InstancedMesh(geo, null, N);
  const m4 = new THREE.Matrix4();
  for (const c of cells) {
    const d = D[c.d], top = c.h * V;
    m4.makeScale(B, top + V * 2, B); m4.setPosition(cellX(c.i), (top - V * 2) / 2, cellZ(c.j));
    if (mesh) mesh.setMatrixAt(c.n, m4);
    let kind = d.urban ? 1 : 0;
    if (!d.urban && c.h >= 15) kind = 3; else if (!d.urban && c.h >= 6) kind = 2;
    // 海邊一格是沙灘
    if (!d.urban && c.h <= 1 && [[1,0],[-1,0],[0,1],[0,-1]].some(([a,b]) => at(c.i+a, c.j+b) === 255 && c.j > 0)) kind = 4;
    aKind[c.n] = kind;
    tint.set(REGION_COLOR[d.region]); tint.getHSL(hsl);
    tint.setHSL(hsl.h + dJit[c.d] * .05, hsl.s, hsl.l + dJit[c.d] * .08);
    aTop.set([tint.r, tint.g, tint.b], c.n * 3);
    let e = 0; // 與他區（或海）相鄰的邊：1=+x 2=-x 4=+z 8=-z
    if (at(c.i + 1, c.j) !== c.d) e |= 1; if (at(c.i - 1, c.j) !== c.d) e |= 2;
    if (at(c.i, c.j + 1) !== c.d) e |= 4; if (at(c.i, c.j - 1) !== c.d) e |= 8;
    aEdge[c.n] = e;
  }
  geo.setAttribute('aTop', new THREE.InstancedBufferAttribute(aTop, 3));
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(aKind, 1));
  geo.setAttribute('aEdge', new THREE.InstancedBufferAttribute(aEdge, 1));
  const liftAttr = new THREE.InstancedBufferAttribute(aLift, 1); liftAttr.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aLift', liftAttr);
  const selAttr = new THREE.InstancedBufferAttribute(aSel, 1); selAttr.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aSel', selAttr);

  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const uniforms = { uB: { value: B }, uV: { value: V }, uOrigin: { value: new THREE.Vector2(T.x0, T.y0) }, uNight: { value: 0 } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aTop; attribute float aKind; attribute float aEdge; attribute float aLift; attribute float aSel;
        varying vec3 vTop; varying float vKind; varying float vEdge; varying float vSel; varying vec3 vW; varying vec3 vON; varying float vTopY;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
        mvPosition.y += aLift;
        vW = (modelMatrix * mvPosition).xyz;
        vTopY = (instanceMatrix * vec4(0.0, 0.5, 0.0, 1.0)).y + aLift;
        vTop = aTop; vKind = aKind; vEdge = aEdge; vSel = aSel; vON = normal;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uB; uniform float uV; uniform vec2 uOrigin; uniform float uNight;
        varying vec3 vTop; varying float vKind; varying float vEdge; varying float vSel; varying vec3 vW; varying vec3 vON; varying float vTopY;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        bool bit(float v, float b){ return mod(floor(v / b), 2.0) > 0.5; }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        vec3 col; float px = uB / 8.0;
        vec2 local = fract((vW.xz - uOrigin) / uB);
        if (vON.y > 0.5) {
          float n = hash(floor(vW.xz / px));
          if (vKind > 0.5 && vKind < 1.5) {           // 水泥路面＋街廓格線
            col = vec3(0.70, 0.69, 0.66) * (0.9 + 0.12 * n);
            vec2 g = abs(local - 0.5);
            if (max(g.x, g.y) > 0.43) col = vec3(0.36, 0.37, 0.39);
          } else if (vKind > 3.5) {                   // 沙灘
            col = vec3(0.90, 0.83, 0.60) * (0.9 + 0.12 * n);
          } else if (vKind > 2.5) {                   // 岩石山頂
            col = mix(vec3(0.55, 0.56, 0.55), vec3(0.95), step(0.82, n)) * (0.9 + 0.1 * n);
          } else {
            vec3 base = vKind > 1.5 ? vTop * vec3(0.62, 0.78, 0.6) : vTop;  // 山林深綠
            col = base * (0.85 + 0.25 * n);
          }
          // 區界
          float w = 0.06;
          if ((bit(vEdge,1.0) && local.x > 1.0 - w) || (bit(vEdge,2.0) && local.x < w) ||
              (bit(vEdge,4.0) && local.y > 1.0 - w) || (bit(vEdge,8.0) && local.y < w)) col = mix(col, vec3(1.0), 0.75);
          col = mix(col, col * 1.25 + vec3(0.12, 0.06, 0.0), vSel);
        } else {
          float d = vTopY - vW.y;
          vec2 sp = vec2(abs(vON.x) > 0.5 ? vW.z : vW.x, vW.y);
          float n = hash(floor(vec2(sp.x / px, sp.y / (uV / 8.0))));
          if (d < uV * 0.28 && vKind < 0.5) col = vTop * 0.85 * (0.85 + 0.25 * n);
          else if (d < uV * 0.28 && vKind > 3.5) col = vec3(0.86, 0.79, 0.56);
          else if (vKind > 0.5 && vKind < 1.5) col = vec3(0.55, 0.54, 0.52) * (0.85 + 0.2 * n);
          else if (d < uV * 3.0) col = vec3(0.53, 0.37, 0.24) * (0.8 + 0.3 * n);
          else col = vec3(0.47, 0.47, 0.47) * (0.8 + 0.3 * n);
          if (fract(vW.y / uV) < 0.06) col *= 0.78;   // 方塊橫線
          float e = abs(vON.x) > 0.5 ? fract((vW.z - uOrigin.y) / uB) : fract((vW.x - uOrigin.x) / uB);
          if (e < 0.03 || e > 0.97) col *= 0.8;
          col = mix(col, col * 1.2, vSel);
        }
        vec4 diffuseColor = vec4(col, opacity);`);
  };
  let rt = null;
  if (!ROUND) {
    mesh.material = mat;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  } else {
    rt = buildRoundTerrain({ T, W, H, dist, hgt, D, at });
    mesh = rt.mesh; scene.add(mesh);
  }
  const groundY = (x, z, c) => rt ? rt.topAt(x, z) : c.h * V;

  // 海
  // 海：單色平面，不做動畫（省效能）
  const seaMat = ROUND ? new THREE.MeshLambertMaterial({ color: 0x5ccbe0, transparent: true, opacity: .8 }) : new THREE.MeshLambertMaterial({ color: 0x4a8fc8 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, V * 0.55, 0); sea.receiveShadow = true;
  scene.add(sea);

  // 城市建築與樹（裝飾）
  const rnd = mulberry(42);
  const bGeo = unitBox(.22);
  const tall = { '苓雅區': 1.7, '前鎮區': 1.5, '新興區': 1.3, '前金區': 1.3, '三民區': 1.2, '鳳山區': 1.1, '左營區': 1.1 };
  const bList = [], tList = [];
  for (const c of cells) {
    const d = D[c.d];
    if (d.urban) {
      if (rnd() < .5) {
        const s = B * (.16 + rnd() * .12), hh = V * (.5 + rnd() * rnd() * 2.4 * (tall[d.name] || .8)) * (ROUND ? .75 : 1);
        const x = cellX(c.i) + (rnd() - .5) * B * .5, z = cellZ(c.j) + (rnd() - .5) * B * .5, y = groundY(x, z, c);
        if (!ROUND || y > V * .55 + .08) bList.push([x, y, z, s, hh, s, rnd(), c.n]);
      }
    } else if (aKind[c.n] !== 4 && aKind[c.n] !== 3 && rnd() < (aKind[c.n] === 2 ? .45 : .12)) {
      const x = cellX(c.i) + (rnd() - .5) * B * .5, z = cellZ(c.j) + (rnd() - .5) * B * .5, y = groundY(x, z, c);
      if (!ROUND || y > V * .55 + .08) tList.push([x, y, z, c.n]);
    }
  }
  const bMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, bList.length);
  const pal = ROUND ? [0xfff3e0, 0xffe1e8, 0xe1f0ff, 0xe6f6e4, 0xfff6c8, 0xf1e6ff] : [0xe8e4dc, 0xd7dde3, 0xc9b9a4, 0xf2efe8, 0xa9b6c2, 0xd9c7b2];
  const col = new THREE.Color();
  bList.forEach(([x, y, z, sx, sy, sz, r], n) => { m4.makeScale(sx, sy, sz); m4.setPosition(x, y + sy / 2, z); bMesh.setMatrixAt(n, m4); bMesh.setColorAt(n, col.set(pal[(r * pal.length) | 0])); });
  windowShader(bMat);
  bMesh.castShadow = bMesh.receiveShadow = true; scene.add(bMesh);
  // 圓潤風：每棟加一個彩色屋頂
  let rMesh = null;
  if (ROUND) {
    const roofs = [0xf28b82, 0x7fb6dd, 0xf6c26b, 0x8fcf9b, 0xc9a0dc, 0xff9e7a];
    rMesh = new THREE.InstancedMesh(unitBox(.35), new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, bList.length));
    bList.forEach(([x, y, z, sx, sy, sz, r], n) => { const th = Math.min(.07, sy * .2); m4.makeScale(sx * 1.14, th, sz * 1.14); m4.setPosition(x, y + sy + th * .3, z); rMesh.setMatrixAt(n, m4); rMesh.setColorAt(n, col.set(roofs[((r * 97) | 0) % roofs.length])); });
    rMesh.castShadow = true; scene.add(rMesh);
  }
  const trunk = new THREE.InstancedMesh(ROUND ? new THREE.CylinderGeometry(.018, .026, .16, 6) : new THREE.BoxGeometry(.05, .18, .05), new THREE.MeshLambertMaterial({ color: ROUND ? 0x9a6b45 : 0x6b4a2b }), tList.length);
  const leaf = new THREE.InstancedMesh(ROUND ? new THREE.IcosahedronGeometry(.125, 1) : new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: false }), tList.length);
  const qq = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  tList.forEach(([x, y, z], n) => {
    m4.makeTranslation(x, y + .09, z); trunk.setMatrixAt(n, m4);
    if (ROUND) { const k = .85 + rnd() * .45; sc.set(k, k * (.9 + rnd() * .25), k); ps.set(x, y + .2 + .06 * k, z); m4.compose(ps, qq, sc); leaf.setMatrixAt(n, m4);
      const pr = rnd(); leaf.setColorAt(n, pr < .1 ? col.set(0xf7b3cf) : pr < .14 ? col.set(0xf6c26b) : col.setHSL(.27 + rnd() * .07, .52, .5 + rnd() * .1)); }
    else { m4.makeTranslation(x, y + .26, z); leaf.setMatrixAt(n, m4); leaf.setColorAt(n, col.setHSL(.28 + rnd() * .06, .5, .26 + rnd() * .1)); }
  });
  trunk.castShadow = leaf.castShadow = true; scene.add(trunk, leaf);
  const decoBy = { b: bList.map(b => b[7]), t: tList.map(t => t[3]) };

  // 選取：抬升＋提亮（只更新變動中的格子）
  const lift = new Float32Array(D.length), goal = new Float32Array(D.length);
  let selected = -1;
  function select(di) { if (rt) { rt.select(di); selected = di; return; } if (selected >= 0) goal[selected] = 0; selected = di; if (di >= 0) goal[di] = 1; }
  const baseB = bList.map((b, n) => { bMesh.getMatrixAt(n, m4); return m4.clone(); });
  const baseT = tList.map((t, n) => { const a = new THREE.Matrix4(), b = new THREE.Matrix4(); trunk.getMatrixAt(n, a); leaf.getMatrixAt(n, b); return [a, b]; });
  const tmp = new THREE.Matrix4();
  function update(dt, t) {
    if (rt) { rt.update(dt); return; }
    let dirty = false, decoDirty = false;
    for (let di = 0; di < D.length; di++) {
      const v = lift[di], g = goal[di]; if (Math.abs(v - g) < .001) continue;
      const nv = v + (g - v) * Math.min(1, dt * 7); lift[di] = Math.abs(nv - g) < .002 ? g : nv;
      for (const c of D[di].cells) { aLift[c.n] = lift[di] * .45; aSel[c.n] = lift[di]; }
      dirty = decoDirty = true;
    }
    if (dirty) { liftAttr.needsUpdate = selAttr.needsUpdate = true; }
    if (decoDirty) {
      decoBy.b.forEach((cn, n) => { if (!baseB[n].elements[0]) return; tmp.copy(baseB[n]); tmp.elements[13] += aLift[cn]; bMesh.setMatrixAt(n, tmp); });
      decoBy.t.forEach((cn, n) => { if (!baseT[n][0].elements[0]) return; const dy = aLift[cn]; tmp.copy(baseT[n][0]); tmp.elements[13] += dy; trunk.setMatrixAt(n, tmp); tmp.copy(baseT[n][1]); tmp.elements[13] += dy; leaf.setMatrixAt(n, tmp); });
      bMesh.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = leaf.instanceMatrix.needsUpdate = true;
    }
  }
  // 地標周圍清掉建築與樹，讓地標露出來
  function clearAround(spots) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const near = (x, z) => spots.some(p => Math.hypot(p.x - x, p.z - z) < p.r);
    bList.forEach((b, n) => { if (near(b[0], b[2])) { baseB[n].copy(zero); bMesh.setMatrixAt(n, zero); if (rMesh) rMesh.setMatrixAt(n, zero); } });
    if (rMesh) rMesh.instanceMatrix.needsUpdate = true;
    tList.forEach((q, n) => { if (near(q[0], q[2])) { baseT[n][0].copy(zero); baseT[n][1].copy(zero); trunk.setMatrixAt(n, zero); leaf.setMatrixAt(n, zero); } });
    bMesh.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = leaf.instanceMatrix.needsUpdate = true;
  }
  // 障礙物格網：建築與地標的佔地，小人不能走進去（0.02 km 一格，外擴一點避免貼牆）
  const GB = .02, blocked = new Set(), kb = (i, j) => (i + 20000) * 50000 + (j + 20000);
  function blockRect(x0, z0, x1, z1) {
    for (let i = Math.floor(x0 / GB); i <= Math.floor(x1 / GB); i++) for (let j = Math.floor(z0 / GB); j <= Math.floor(z1 / GB); j++) blocked.add(kb(i, j));
  }
  function finalizeBlockers(rects = []) {
    blocked.clear();
    bList.forEach((b, n) => { if (!baseB[n].elements[0]) return; const hx = b[3] / 2 + .014, hz = b[5] / 2 + .014; blockRect(b[0] - hx, b[2] - hz, b[0] + hx, b[2] + hz); });
    for (const r of rects) blockRect(r[0] - .012, r[1] - .012, r[2] + .012, r[3] + .012);
  }
  const isBlocked = (x, z) => blocked.has(kb(Math.floor(x / GB), Math.floor(z / GB)));
  // 在某區找一個沒被擋住的點（可指定靠近某處）
  function freePoint(di, near = null, radius = 1.6, r = Math.random) {
    for (let k = 0; k < 24; k++) {
      let x, z;
      if (near) { x = near.x + (r() - .5) * radius * 2; z = near.z + (r() - .5) * radius * 2; }
      else { const c = randomCell(di, r); x = cellX(c.i) + (r() - .5) * B * .9; z = cellZ(c.j) + (r() - .5) * B * .9; }
      if (districtAt(x, z) === di && !isBlocked(x, z)) return { x, z };
    }
    return null;
  }
  function setNight(on) { uniforms.uNight.value = on ? 1 : 0; bMat.userData.uNight && (bMat.userData.uNight.value = on ? 1 : 0); }

  const topAt = rt ? rt.topAt : (x, z) => { const [i, j] = toCell(x, z); const n = cellIndex[idx(Math.max(0, Math.min(W - 1, i)), Math.max(0, Math.min(H - 1, j)))]; return n < 0 ? V * .55 : cells[n].h * V + aLift[n]; };
  const districtAt = (x, z) => { const [i, j] = toCell(x, z); const d = at(i, j); return d === 255 ? -1 : d; };
  // 把經緯度吸附到該區內最近的格子
  function anchor(lat, lon, dname) {
    const [x, z] = proj(lat, lon); const di = names.indexOf(dname);
    if (districtAt(x, z) === di) return { x, z, di };
    let best = null, bd = 1e9;
    for (const c of D[di].cells) { const dx = cellX(c.i) - x, dz = cellZ(c.j) - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = c; } }
    return { x: cellX(best.i), z: cellZ(best.j), di };
  }
  const randomCell = (di, r = Math.random) => { const cs = D[di].cells; return cs[(r() * cs.length) | 0]; };
  const bounds = { minX: T.x0, minZ: T.y0, maxX: T.x0 + W * B, maxZ: T.y0 + H * B };

  return { finalizeBlockers, isBlocked, freePoint, clearAround, liftOf: di => (rt || di < 0) ? 0 : lift[di] * .45, D, names, mesh, cells, topAt, districtAt, anchor, randomCell, cellX, cellZ, select, update, setNight, bounds, bMat, proj };
}

function windowShader(mat) {
  const u = { value: 0 }; mat.userData.uNight = u;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uNight = u;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWb; varying vec3 vNb;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWb = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz; vNb = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying vec3 vWb; varying vec3 vNb;\nfloat hb(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*13758.5453);}')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vNb.y) < 0.5) {
          vec2 q = vec2(abs(vNb.x) > 0.5 ? vWb.z : vWb.x, vWb.y) / vec2(0.045, 0.07);
          vec2 f = fract(q);
          float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.8);
          diffuseColor.rgb *= 1.0 - win * 0.35;
          totalEmissiveRadiance += win * uNight * step(0.45, hb(floor(q))) * vec3(1.0, 0.82, 0.45) * 0.9;
        }`);
  };
}

// ── 圓潤地形：用高度場做出平滑小島（動森風） ──
function buildRoundTerrain({ T, W, H, dist, hgt, D, at }) {
  const S = 2, VW = W * S + 1, VH = H * S + 1, step = B / S, seaY = V * .55, deep = seaY - .22;
  const land = new Float32Array(W * H), hf = new Float32Array(W * H);
  for (let n = 0; n < W * H; n++) if (dist[n] !== 255) { land[n] = 1; hf[n] = hgt[n]; }
  const blur = (src, passes, onlyLand) => {
    let a = src;
    for (let p = 0; p < passes; p++) {
      const b = new Float32Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        let s = 0, c = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
          const n = jj * W + ii; if (onlyLand && !land[n]) continue;
          const w = (di === 0 && dj === 0) ? 2 : 1; s += a[n] * w; c += w;
        }
        b[j * W + i] = c ? s / c : a[j * W + i];
      }
      a = b;
    }
    return a;
  };
  const m = blur(land, 2, false), hb = blur(hf, 3, true);
  const samp = (arr, u, v) => {
    u = Math.max(0, Math.min(W - 1.001, u)); v = Math.max(0, Math.min(H - 1.001, v));
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, n = j * W + i;
    return (arr[n] * (1 - fu) + arr[n + 1] * fu) * (1 - fv) + (arr[n + W] * (1 - fu) + arr[n + W + 1] * fu) * fv;
  };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const vy = new Float32Array(VW * VH), vm = new Float32Array(VW * VH), vd = new Float32Array(VW * VH), vh = new Float32Array(VW * VH), vb = new Uint8Array(VW * VH);
  for (let vj = 0; vj < VH; vj++) for (let vi = 0; vi < VW; vi++) {
    const n = vj * VW + vi, u = vi / S - .5, v = vj / S - .5;
    const mk = samp(m, u, v), h = samp(hb, u, v), t = sm(.36, .64, mk);
    vy[n] = deep + (seaY + .1 + h * V * .78 - deep) * t; vm[n] = mk; vh[n] = h;
    const ci = Math.round(u), cj = Math.round(v); let d = at(ci, cj);
    if (d === 255) for (let k = 0; k < 9 && d === 255; k++) d = at(ci + (k % 3) - 1, cj + ((k / 3) | 0) - 1);
    vd[n] = d === 255 ? -1 : d;
    const a = at(Math.floor(u), Math.floor(v)), b = at(Math.floor(u) + 1, Math.floor(v)), c = at(Math.floor(u), Math.floor(v) + 1), e = at(Math.floor(u) + 1, Math.floor(v) + 1);
    const ds = [a, b, c, e].filter(x => x !== 255); vb[n] = ds.length > 1 && ds.some(x => x !== ds[0]) ? 1 : 0;
  }
  const pos = new Float32Array(VW * VH * 3);
  for (let vj = 0; vj < VH; vj++) for (let vi = 0; vi < VW; vi++) { const n = vj * VW + vi; pos[n * 3] = T.x0 + vi * step; pos[n * 3 + 1] = vy[n]; pos[n * 3 + 2] = T.y0 + vj * step; }
  const index = [];
  for (let vj = 0; vj < VH - 1; vj++) for (let vi = 0; vi < VW - 1; vi++) {
    const a = vj * VW + vi, b = a + 1, c = a + VW, d = c + 1;
    if (Math.max(vm[a], vm[b], vm[c], vm[d]) < .18) continue;
    index.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDist', new THREE.BufferAttribute(vd, 1));
  geo.setIndex(index); geo.computeVertexNormals();
  const nrm = geo.getAttribute('normal');
  const C = hex => new THREE.Color(hex);
  const pal = { north: C(0x93d98f), east: C(0xa9db74), urban: C(0xf4ead6), sand: C(0xf7e4ab), wet: C(0xe3cf92), forest: C(0x62b86c), peak: C(0x8fb59a), cliff: C(0xcaa57e), line: C(0xffffff) };
  const URB = new Set(['鹽埕區','前金區','新興區','苓雅區','三民區','前鎮區','小港區','旗津區','左營區','楠梓區','鳳山區']);
  const cols = new Float32Array(VW * VH * 3), col = new THREE.Color();
  for (let n = 0; n < VW * VH; n++) {
    const d = vd[n], mk = vm[n], h = vh[n], ny = nrm.getY(n);
    if (d < 0 || mk < .5) col.copy(mk < .44 ? pal.wet : pal.sand);
    else {
      const dd = D[d];
      if (URB.has(dd.name)) col.copy(pal.urban);
      else { col.copy(dd.region === 'north' ? pal.north : pal.east); if (h > 5) col.lerp(pal.forest, Math.min(1, (h - 5) / 4)); if (h > 12) col.lerp(pal.peak, Math.min(1, (h - 12) / 4)); }
      if (mk < .62) col.lerp(pal.sand, (.62 - mk) / .12);
      if (ny < .82) col.lerp(pal.cliff, Math.min(1, (.82 - ny) / .2));
      const j = (((d * 37) % 11) / 11 - .5) * .06; col.offsetHSL(0, 0, j);
      if (vb[n]) col.lerp(pal.line, .55);
    }
    const nz = (Math.sin(n * 12.9898) * 43758.5453) % 1; col.offsetHSL(0, 0, nz * .02);
    cols[n * 3] = col.r; cols[n * 3 + 1] = col.g; cols[n * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const uni = { uSel: { value: -1 }, uSelAmt: { value: 0 } };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aDist; uniform float uSel; varying float vSel;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSel = abs(aDist - uSel) < .5 ? 1.0 : 0.0;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSelAmt; varying float vSel;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.12 + vec3(.1, .06, .0), vSel * uSelAmt);');
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = true; mesh.frustumCulled = false;
  const topAt = (x, z) => {
    const u = (x - T.x0) / step, v = (z - T.y0) / step;
    if (u < 0 || v < 0 || u >= VW - 1 || v >= VH - 1) return deep;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, n = j * VW + i;
    return (vy[n] * (1 - fu) + vy[n + 1] * fu) * (1 - fv) + (vy[n + VW] * (1 - fu) + vy[n + VW + 1] * fu) * fv;
  };
  let goal = 0;
  return {
    mesh, topAt,
    select(di) { if (di >= 0) { uni.uSel.value = di; uni.uSelAmt.value = 0; goal = 1; } else goal = 0; },
    update(dt) { uni.uSelAmt.value += (goal - uni.uSelAmt.value) * Math.min(1, dt * 6); },
  };
}

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
