// 方塊地形：每個 0.5 km 格子是一根方塊柱，著色器畫出草地／水泥／泥土／石頭與方塊格線
import * as THREE from 'three';
import { TERRAIN } from '../data/terrain.js';

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
  const mesh = new THREE.InstancedMesh(geo, null, N);
  const m4 = new THREE.Matrix4();
  for (const c of cells) {
    const d = D[c.d], top = c.h * V;
    m4.makeScale(B, top + V * 2, B); m4.setPosition(cellX(c.i), (top - V * 2) / 2, cellZ(c.j));
    mesh.setMatrixAt(c.n, m4);
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
  mesh.material = mat;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  // 海
  // 海：單色平面，不做動畫（省效能）
  const seaMat = new THREE.MeshLambertMaterial({ color: 0x4a8fc8 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, V * 0.55, 0); sea.receiveShadow = true;
  scene.add(sea);

  // 城市建築與樹（裝飾）
  const rnd = mulberry(42);
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const tall = { '苓雅區': 1.7, '前鎮區': 1.5, '新興區': 1.3, '前金區': 1.3, '三民區': 1.2, '鳳山區': 1.1, '左營區': 1.1 };
  const bList = [], tList = [];
  for (const c of cells) {
    const d = D[c.d];
    if (d.urban) {
      if (rnd() < .5) {
        const s = B * (.16 + rnd() * .12), hh = V * (.5 + rnd() * rnd() * 2.4 * (tall[d.name] || .8));
        bList.push([cellX(c.i) + (rnd() - .5) * B * .5, c.h * V, cellZ(c.j) + (rnd() - .5) * B * .5, s, hh, s, rnd(), c.n]);
      }
    } else if (aKind[c.n] !== 4 && aKind[c.n] !== 3 && rnd() < (aKind[c.n] === 2 ? .45 : .12)) {
      tList.push([cellX(c.i) + (rnd() - .5) * B * .5, c.h * V, cellZ(c.j) + (rnd() - .5) * B * .5, c.n]);
    }
  }
  const bMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, bList.length);
  const pal = [0xe8e4dc, 0xd7dde3, 0xc9b9a4, 0xf2efe8, 0xa9b6c2, 0xd9c7b2];
  const col = new THREE.Color();
  bList.forEach(([x, y, z, sx, sy, sz, r], n) => { m4.makeScale(sx, sy, sz); m4.setPosition(x, y + sy / 2, z); bMesh.setMatrixAt(n, m4); bMesh.setColorAt(n, col.set(pal[(r * pal.length) | 0])); });
  windowShader(bMat);
  bMesh.castShadow = bMesh.receiveShadow = true; scene.add(bMesh);
  const trunk = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .18, .05), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), tList.length);
  const leaf = new THREE.InstancedMesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshLambertMaterial({ color: 0xffffff }), tList.length);
  tList.forEach(([x, y, z], n) => {
    m4.makeTranslation(x, y + .09, z); trunk.setMatrixAt(n, m4);
    m4.makeTranslation(x, y + .26, z); leaf.setMatrixAt(n, m4);
    leaf.setColorAt(n, col.setHSL(.28 + rnd() * .06, .5, .26 + rnd() * .1));
  });
  trunk.castShadow = leaf.castShadow = true; scene.add(trunk, leaf);
  const decoBy = { b: bList.map(b => b[7]), t: tList.map(t => t[3]) };

  // 選取：抬升＋提亮（只更新變動中的格子）
  const lift = new Float32Array(D.length), goal = new Float32Array(D.length);
  let selected = -1;
  function select(di) { if (selected >= 0) goal[selected] = 0; selected = di; if (di >= 0) goal[di] = 1; }
  const baseB = bList.map((b, n) => { bMesh.getMatrixAt(n, m4); return m4.clone(); });
  const baseT = tList.map((t, n) => { const a = new THREE.Matrix4(), b = new THREE.Matrix4(); trunk.getMatrixAt(n, a); leaf.getMatrixAt(n, b); return [a, b]; });
  const tmp = new THREE.Matrix4();
  function update(dt, t) {
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
    bList.forEach((b, n) => { if (near(b[0], b[2])) { baseB[n].copy(zero); bMesh.setMatrixAt(n, zero); } });
    tList.forEach((q, n) => { if (near(q[0], q[2])) { baseT[n][0].copy(zero); baseT[n][1].copy(zero); trunk.setMatrixAt(n, zero); leaf.setMatrixAt(n, zero); } });
    bMesh.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = leaf.instanceMatrix.needsUpdate = true;
  }
  function setNight(on) { uniforms.uNight.value = on ? 1 : 0; bMat.userData.uNight && (bMat.userData.uNight.value = on ? 1 : 0); }

  const topAt = (x, z) => { const [i, j] = toCell(x, z); const n = cellIndex[idx(Math.max(0, Math.min(W - 1, i)), Math.max(0, Math.min(H - 1, j)))]; return n < 0 ? V * .55 : cells[n].h * V + aLift[n]; };
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

  return { clearAround, liftOf: di => di < 0 ? 0 : lift[di] * .45, D, names, mesh, cells, topAt, districtAt, anchor, randomCell, cellX, cellZ, select, update, setNight, bounds, bMat, proj };
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

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
