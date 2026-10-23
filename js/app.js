import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, V } from './world.js';
import { buildLandmarks } from './landmarks.js';
import { buildPeople } from './people.js';
import { loadPolicies, REGION_KEYS } from './data.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const REGION = { north: { name: '北高雄', v: '--north' }, east: { name: '東高雄', v: '--east' }, core: { name: '市中心', v: '--core' }, port: { name: '港區・南高雄', v: '--port' } };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- 場景 ---------- */
// 低階手機：降解析度、關陰影、少一點小人
const LOW = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || innerWidth < 500;
const renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 2));
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const DAY = { sky: 0xbfe3f2, fog: 0xcfe9f5, hemi: 1.05, sun: 1.7 }, NIGHT = { sky: 0x0b1626, fog: 0x0b1626, hemi: .28, sun: .25 };
scene.background = new THREE.Color(DAY.sky);
scene.fog = new THREE.Fog(DAY.fog, 160, 420);
const camera = new THREE.PerspectiveCamera(36, 1, .01, 1200);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: .12, maxPolarAngle: Math.PI * .495, minPolarAngle: 0, rotateSpeed: .9, minDistance: .12, maxDistance: 260, screenSpacePanning: false, zoomSpeed: 3.2, zoomToCursor: true });
// 像地圖一樣：單指／左鍵拖曳＝平移；雙指＝縮放與旋轉；右鍵／Ctrl＋拖曳＝旋轉
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.panSpeed = 1.1;

const hemi = new THREE.HemisphereLight(0xffffff, 0x6b7f6b, DAY.hemi); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, DAY.sun);
sun.castShadow = !LOW; sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);
const moon = new THREE.PointLight(0xffd9a0, 0, 30); scene.add(moon);

const world = buildWorld(scene);
const lm = buildLandmarks(scene, world);
world.clearAround(lm.items.map(it => ({ x: it.x, z: it.z, r: .9 })));
const center = (() => { const b = world.bounds; return new THREE.Vector3((b.minX + b.maxX) / 2 - 4, 0, (b.minZ + b.maxZ) / 2 + 6); })();

/* ---------- 資料 ---------- */
let ROWS = [], byDistrict = {}, people = null;
function indexRows(rows) {
  ROWS = rows.filter(r => r.published !== false);
  byDistrict = {};
  for (const r of ROWS) for (const d of r.districts || []) (byDistrict[d] ||= []).push(r);
}
const itemsOf = name => byDistrict[name] || [];
const regionKey = di => '_' + world.D[di].region;

/* ---------- 標籤 ---------- */
const labelsEl = $('labels');
const dLabels = world.D.map((d, di) => {
  const el = document.createElement('div'); el.className = 'lbl'; el.dataset.di = di;
  el.innerHTML = esc(d.name.replace('區', '')) + '<b></b>';
  el.addEventListener('click', e => { e.stopPropagation(); select(di); });
  labelsEl.appendChild(el); return el;
});
const pins = lm.items.map(it => {
  const el = document.createElement('div'); el.className = 'pin'; el.textContent = it.name;
  el.addEventListener('click', e => { e.stopPropagation(); showLandmark(it); });
  labelsEl.appendChild(el); return el;
});
const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.hidden = true; labelsEl.appendChild(bubble);
let bubbleFor = null, bubbleUntil = 0;
function refreshCounts() { dLabels.forEach((el, di) => { el.querySelector('b').textContent = itemsOf(world.D[di].name).length || ''; }); }

/* ---------- 圖例 ---------- */
function legend() {
  $('legend').innerHTML = Object.entries(REGION).map(([k, r]) => `<span><i style="background:${k === 'core' || k === 'port' ? '#b9b3a6' : css(r.v)};${k === 'port' ? 'border-color:' + css(r.v) + ';border-width:3px' : ''}"></i>${r.name}</span>`).join('');
}

/* ---------- 鏡頭 ---------- */
let fly = null;
const VIEW = new THREE.Vector3(-.32, 1.15, 1).normalize();
function flyTo(target, dist, dur = 1000) {
  const to = target.clone().add(VIEW.clone().multiplyScalar(dist));
  fly = { t0: performance.now() - (reduce ? dur : 0), dur, fT: controls.target.clone(), tT: target.clone(), fP: camera.position.clone(), tP: to };
}
function fitDist() { const b = world.bounds, span = Math.max(b.maxZ - b.minZ, (b.maxX - b.minX) / Math.max(camera.aspect, .55)); return span * (camera.aspect < 1 ? 1.45 : 1.15); }
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', () => { resize(); setSheet && sheet && setSheet(sheet.dataset.state || 'closed'); }); resize();
// 開場先看市區（85 大樓、駁二一帶），山區在後方
const START = new THREE.Vector3(-22, 0, 16);
const startDist = () => fitDist() * (camera.aspect < 1 ? .42 : .5);
controls.target.copy(START); camera.position.copy(START.clone().add(VIEW.clone().multiplyScalar(startDist())));

/* ---------- 面板 ---------- */
const sheet = $('sheet'), shTitle = $('shTitle'), shSub = $('shSub'), shBody = $('shBody'), filtersEl = $('filters');
const desktop = () => innerWidth >= 900;
function setSheet(state) {
  sheet.dataset.state = state;
  sheet.classList.toggle('closed', state === 'closed');
  if (desktop()) { sheet.style.transform = ''; applyOffset(); return; }
  sheet.style.transform = state === 'closed' ? 'translateY(100%)' : state === 'half' ? 'translateY(42%)' : 'translateY(0)';
  applyOffset();
}
// 面板蓋住畫面時，把地圖的焦點往可見區域移（手機往上、桌機往左）
let offTarget = { x: 0, y: 0 }, off = { x: 0, y: 0 };
function applyOffset() {
  const st = sheet.dataset.state;
  if (desktop()) offTarget = { x: st && st !== 'closed' ? 220 : 0, y: 0 };
  else offTarget = { x: 0, y: st === 'half' ? innerHeight * .26 : st === 'full' ? innerHeight * .34 : 0 };
}
function stepOffset(dt) {
  const k = Math.min(1, dt * 6); off.x += (offTarget.x - off.x) * k; off.y += (offTarget.y - off.y) * k;
  if (Math.abs(off.x) < .5 && Math.abs(off.y) < .5 && !offTarget.x && !offTarget.y) { if (camera.view && camera.view.enabled) { camera.clearViewOffset(); } return; }
  camera.setViewOffset(innerWidth, innerHeight, off.x, off.y, innerWidth, innerHeight);
}
setSheet('closed');
$('shX').onclick = () => { setSheet('closed'); clearSelect(); };
// 手機拖曳抽屜
(() => {
  const grab = $('grab'); let y0 = null, base = 0;
  grab.addEventListener('pointerdown', e => { y0 = e.clientY; base = sheet.getBoundingClientRect().top; sheet.classList.add('dragging'); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', e => { if (y0 == null) return; const h = sheet.offsetHeight, top = Math.max(innerHeight - h, base + e.clientY - y0); sheet.style.transform = `translateY(${top - (innerHeight - h)}px)`; });
  grab.addEventListener('pointerup', e => {
    if (y0 == null) return; sheet.classList.remove('dragging'); const dy = e.clientY - y0; y0 = null;
    const st = sheet.dataset.state;
    if (Math.abs(dy) < 6) setSheet(st === 'full' ? 'half' : 'full');
    else if (dy < -40) setSheet('full'); else if (dy > 120 && st === 'half') { setSheet('closed'); clearSelect(); } else if (dy > 40) setSheet(st === 'full' ? 'half' : 'closed'); else setSheet(st);
  });
})();

let activeCat = '全部', current = null;
function card(r) {
  const off = r.kind === 'official';
  const date = r.source_date ? ` · ${esc(r.source_date)}` : '';
  const src = r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source_name || '來源')}${date}</a>` : esc(r.source_name || '');
  const body = r.display === 'link'
    ? (r.body ? `<p>${esc(r.body)}</p>` : '') + `<div class="src">${r.source_url ? `<a class="go" href="${esc(r.source_url)}" target="_blank" rel="noopener">${off ? '看官網原文' : '看新聞'} ↗</a>` : ''}<span>${esc(r.source_name || '')}${date}</span></div>`
    : `<p>${esc(r.body)}</p><div class="src">來源：${src}</div>`;
  return `<article class="card"><div class="meta"><span class="cat">${esc(r.category)}</span>${off ? '<span class="kind-official">官網</span>' : '<span>新聞</span>'}</div><h3>${esc(r.title)}</h3>${body}</article>`;
}
function filtersFor(groups) {
  const cats = [...new Set(groups.flatMap(g => g.items.map(r => r.category)))];
  if (!cats.includes(activeCat)) activeCat = '全部';
  filtersEl.hidden = cats.length < 2;
  filtersEl.innerHTML = ['全部', ...cats].map(c => `<button type="button" class="${c === activeCat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
}
filtersEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; activeCat = b.dataset.c; current && current(); });
function renderGroups(groups, extra = '') {
  filtersFor(groups);
  const f = r => activeCat === '全部' || r.category === activeCat;
  let h = '';
  for (const g of groups) {
    const list = g.items.filter(f);
    h += `<div class="sec">${esc(g.title)}・${list.length}</div>`;
    h += list.length ? `<div class="cards">${list.map(card).join('')}</div>` : `<div class="empty">${esc(g.empty || '這個分類沒有資料。')}</div>`;
  }
  shBody.innerHTML = h + extra + NOTE; shBody.scrollTop = 0;
}
const NOTE = `<div class="note">本站為非官方整理，非賴瑞隆競選團隊製作。政見摘要為自行改寫，完整內容請點來源。地形高度、地標位置與大小都是示意，不代表實際海拔或比例。</div>`;

let selected = -1;
function clearSelect() { selected = -1; world.select(-1); dLabels.forEach(el => el.classList.remove('sel')); history.replaceState(null, '', location.pathname); }
function select(di, { move = true } = {}) {
  selected = di; world.select(di);
  dLabels.forEach((el, k) => el.classList.toggle('sel', k === di));
  const d = world.D[di], rk = regionKey(di);
  shTitle.textContent = d.name;
  const lms = lm.items.filter(it => it.di === di);
  shSub.innerHTML = `<span class="rchip" style="background:${css(REGION[d.region].v)}">${REGION[d.region].name}</span>本區 ${itemsOf(d.name).length} 條・地標：${lms.map(it => esc(it.name)).join('、') || '—'}`;
  current = () => renderGroups([
    { title: '本區政見', items: itemsOf(d.name), empty: `目前沒有專門針對${d.name}的政見資料，下方是涵蓋本區的區域與全市政見。` },
    { title: `${REGION_KEYS[rk]}整體`, items: itemsOf(rk), empty: '這個區域沒有整體性的政見資料。' },
    { title: '全市', items: itemsOf('_city') },
  ]);
  activeCat = '全部'; current();
  setSheet(desktop() ? 'open' : 'half');
  history.replaceState(null, '', '#' + encodeURIComponent(d.name.replace('區', '')));
  if (move) flyTo(new THREE.Vector3(d.cx, d.maxH * V * .5, d.cz), Math.max(5, Math.sqrt(d.area) * 2.6 + 3));
}
function showLandmark(it) {
  select(it.di, { move: false });
  flyTo(new THREE.Vector3(it.x, it.y, it.z), 4.2);
  shSub.innerHTML += `<div style="width:100%;margin-top:4px;color:var(--ink)"><b>${esc(it.name)}</b>：${esc(it.desc)}</div>`;
}
function showCity() {
  clearSelect(); shTitle.textContent = '全市政見'; shSub.textContent = '不限特定區域的承諾';
  current = () => renderGroups([{ title: '全市', items: itemsOf('_city') },
    ...Object.entries(REGION).map(([k, r]) => ({ title: r.name + '整體', items: itemsOf('_' + k), empty: '沒有區域整體的政見資料。' }))]);
  activeCat = '全部'; current(); setSheet(desktop() ? 'open' : 'full');
}
function showList() {
  clearSelect(); shTitle.textContent = '38 區'; shSub.textContent = '數字為本區政見條數；點一區飛過去';
  filtersEl.hidden = true; current = null;
  let h = '';
  for (const k of Object.keys(REGION)) {
    const ds = world.D.map((d, di) => ({ d, di })).filter(x => x.d.region === k);
    h += `<div class="sec">${REGION[k].name}・${ds.length} 區</div><div class="grid">` +
      ds.map(({ d, di }) => `<button type="button" data-di="${di}">${esc(d.name.replace('區', ''))}<small>${itemsOf(d.name).length} 條</small></button>`).join('') + '</div>';
  }
  h += `<div class="sec">地標</div><div class="lm-list">${lm.items.map((it, n) => `<button type="button" data-lm="${n}">${esc(it.name)}</button>`).join('')}</div>`;
  shBody.innerHTML = h + NOTE; shBody.scrollTop = 0; setSheet(desktop() ? 'open' : 'full');
}
shBody.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.di) select(+b.dataset.di);
  if (b.dataset.lm) showLandmark(lm.items[+b.dataset.lm]);
});

/* ---------- 工具列 ---------- */
$('bAll').onclick = () => { clearSelect(); flyTo(center, fitDist()); };
$('bCore').onclick = () => flyTo(new THREE.Vector3(-25.5, .3, 24), 12);
$('bList').onclick = showList;
$('bCity').onclick = showCity;
let night = false;
$('bNight').onclick = () => {
  night = !night; $('bNight').classList.toggle('on', night); $('bNight').setAttribute('aria-pressed', night); $('bNight').textContent = night ? '白天' : '夜晚';
  const S = night ? NIGHT : DAY;
  scene.background.set(S.sky); scene.fog.color.set(S.fog); hemi.intensity = S.hemi; sun.intensity = S.sun;
  world.setNight(night); lm.setNight(night);
};
// 搜尋
const q = $('q'), sugg = $('sugg');
q.addEventListener('input', () => {
  const s = q.value.trim(); if (!s) { sugg.hidden = true; return; }
  const ds = world.D.map((d, di) => ({ t: d.name, di })).filter(x => x.t.includes(s));
  const ls = lm.items.map((it, n) => ({ t: it.name + '（' + it.d + '）', n })).filter(x => x.t.includes(s));
  const ps = ROWS.filter(r => r.title.includes(s) || (r.body || '').includes(s)).slice(0, 6).map(r => ({ t: '政見：' + r.title, r }));
  const all = [...ds, ...ls, ...ps].slice(0, 10);
  sugg.innerHTML = all.length ? all.map((x, k) => `<button type="button" data-k="${k}">${esc(x.t)}</button>`).join('') : '<button type="button" disabled>找不到符合的結果</button>';
  sugg.hidden = false;
  sugg.onclick = e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const x = all[+b.dataset.k];
    sugg.hidden = true; q.value = ''; q.blur();
    if (x.di != null) select(x.di); else if (x.n != null) showLandmark(lm.items[x.n]);
    else { const d = (x.r.districts || [])[0]; const di = world.D.findIndex(v => v.name === d); if (di >= 0) select(di); else showCity(); }
  };
});
q.addEventListener('keydown', e => { if (e.key === 'Escape') { sugg.hidden = true; q.blur(); } });

/* ---------- 點選 ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
// 手勢判斷：只有「一根手指、沒移動、很快放開」才算點擊；雙指縮放放手時不會誤觸點選或放大
const active = new Map(); let gest = null, lastTap = null, tapTimer = 0;
renderer.domElement.addEventListener('pointerdown', e => {
  sugg.hidden = true; if (follow) stopFollow();
  if (!active.size) gest = { t: performance.now(), x: e.clientX, y: e.clientY, multi: false, moved: 0 };
  else gest.multi = true;
  active.set(e.pointerId, [e.clientX, e.clientY]);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!gest || !active.has(e.pointerId)) return;
  gest.moved = Math.max(gest.moved, Math.hypot(e.clientX - gest.x, e.clientY - gest.y));
});
function endPointer(e) {
  if (!active.delete(e.pointerId) || active.size) return;
  const g = gest; gest = null;
  if (!g || g.multi || g.moved > 8 || performance.now() - g.t > 450) { lastTap = null; return; }
  const now = performance.now();
  if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
    clearTimeout(tapTimer); lastTap = null; zoomBy(.4, [e.clientX, e.clientY]); return;   // 點兩下放大
  }
  lastTap = { t: now, x: e.clientX, y: e.clientY };
  const x = e.clientX, y = e.clientY;
  tapTimer = setTimeout(() => tapAt(x, y), e.pointerType === 'touch' ? 260 : 0);
}
renderer.domElement.addEventListener('pointerup', endPointer);
renderer.domElement.addEventListener('pointercancel', e => { active.delete(e.pointerId); if (!active.size) gest = null; });
function tapAt(x, y) {
  ptr.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  $('hint').style.opacity = 0;
  if (people) { const hp = ray.intersectObjects(people.meshes, false)[0]; if (hp) { talk(hp.object.userData.person); return; } }
  const hl = ray.intersectObject(lm.mesh, false)[0];
  const ht = ray.intersectObject(world.mesh, false)[0];
  if (hl && (!ht || hl.distance <= ht.distance + .05)) { showLandmark(lm.owner[hl.instanceId]); return; }
  if (ht) { const c = world.cells[ht.instanceId]; select(c.d, { move: false }); }
}
setTimeout(() => $('hint').style.opacity = 0, 7000);
// 越近看越斜：遠時俯瞰，近到街道高度時幾乎平視
const tiltFor = d => { const k = Math.min(1, Math.max(0, (12 - d) / 11)); return .62 + k * k * .6; };
function tiltDir(d) {
  const off = camera.position.clone().sub(controls.target); const sp = new THREE.Spherical().setFromVector3(off);
  sp.phi = tiltFor(d); sp.radius = 1; return new THREE.Vector3().setFromSpherical(sp);
}
let lastDist = 0;
function autoTilt() {
  const off = camera.position.clone().sub(controls.target); const d = off.length();
  if (lastDist && Math.abs(d - lastDist) / lastDist > .004) {   // 只有在縮放時才調整角度，不跟旋轉打架
    const sp = new THREE.Spherical().setFromVector3(off); sp.phi += (tiltFor(d) - sp.phi) * .18;
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp));
  }
  lastDist = d;
}
// 跟著小人走（第三人稱）
let follow = null;
function startFollow() {
  if (!people) return;
  const t = controls.target; let best = null, bd = 1e9;
  for (const p of people.people) { const dd = p.g.position.distanceToSquared(t) + (selected >= 0 && p.di !== selected ? 1e4 : 0); if (dd < bd) { bd = dd; best = p; } }
  if (!best) return;
  follow = best; best.wait = 0; $('bFollow').classList.add('on'); $('bFollow').textContent = '停止跟隨';
  talk(people.people.indexOf(best));
}
function stopFollow() { follow = null; $('bFollow').classList.remove('on'); $('bFollow').textContent = '跟小人走'; }
$('bFollow').onclick = () => follow ? stopFollow() : startFollow();
$('bStreet').onclick = () => { stopFollow(); zoomBy(1.8 / Math.max(1.8, camera.position.distanceTo(controls.target)), null, true); };
// 雙擊／雙點兩下：往那個位置放大一大步
let useTilt = false;
function zoomBy(factor, at, tilt = false) {
  useTilt = tilt;
  let target = controls.target.clone();
  if (at) { ptr.set(at[0] / innerWidth * 2 - 1, -(at[1] / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera); const h = ray.intersectObject(world.mesh, false)[0]; if (h) target = h.point.clone(); }
  const dist = Math.min(controls.maxDistance, Math.max(controls.minDistance, camera.position.distanceTo(controls.target) * factor));
  const dir = useTilt ? tiltDir(dist) : camera.position.clone().sub(controls.target).normalize();
  fly = { t0: performance.now() - (reduce ? 400 : 0), dur: 400, fT: controls.target.clone(), tT: target, fP: camera.position.clone(), tP: target.clone().add(dir.multiplyScalar(dist)) };
}
$('zin').onclick = () => zoomBy(.45); $('zout').onclick = () => zoomBy(2.2);
// 拖曳模式：移動地圖 ↔ 轉視角
let dragRotate = false;
function setDragMode(rot) {
  dragRotate = rot;
  controls.touches.ONE = rot ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
  controls.mouseButtons.LEFT = rot ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = rot ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  $('zmode').classList.toggle('on', rot); $('zmode').textContent = rot ? '轉' : '移';
  $('zmode').setAttribute('aria-label', rot ? '目前拖曳會旋轉視角，點一下改成移動地圖' : '目前拖曳會移動地圖，點一下改成旋轉視角');
}
$('zmode').onclick = () => setDragMode(!dragRotate);
// 旋轉與傾斜（每按一次）
function orbit(dAz, dPol) {
  const off = camera.position.clone().sub(controls.target); const sp = new THREE.Spherical().setFromVector3(off);
  sp.theta += dAz; sp.phi = Math.min(controls.maxPolarAngle, Math.max(.05, sp.phi + dPol));
  fly = { t0: performance.now() - (reduce ? 350 : 0), dur: 350, fT: controls.target.clone(), tT: controls.target.clone(), fP: camera.position.clone(), tP: controls.target.clone().add(new THREE.Vector3().setFromSpherical(sp)) };
}
// 指北針：點一下轉回正北
$('compass').onclick = () => { const off = camera.position.clone().sub(controls.target); const sp = new THREE.Spherical().setFromVector3(off); orbit(-sp.theta, 0); };
addEventListener('keydown', e => {
  if (e.target.closest('input,textarea')) return;
  const k = { ArrowLeft: [Math.PI / 12, 0], ArrowRight: [-Math.PI / 12, 0], ArrowUp: [0, .12], ArrowDown: [0, -.12] }[e.key];
  if (k) { e.preventDefault(); orbit(...k); } else if (e.key === '+' || e.key === '=') zoomBy(.6); else if (e.key === '-') zoomBy(1.6);
});

function talk(i) {
  const p = people.poke(i); if (!p) return;
  const d = world.D[p.di];
  const pool = [...itemsOf(d.name), ...itemsOf(regionKey(p.di))];
  const r = pool.length ? pool[(Math.random() * pool.length) | 0] : itemsOf('_city')[(Math.random() * itemsOf('_city').length) | 0];
  const lines = r ? [`我住${d.name.replace('區', '')}！聽說要做「${r.title}」`, `${d.name.replace('區', '')}的政見：${r.title}`, `你知道嗎？「${r.title}」`] : [`我住${d.name.replace('區', '')}，這裡還沒有政見資料`];
  bubble.textContent = lines[(Math.random() * lines.length) | 0];
  bubble.hidden = false; bubbleFor = p; bubbleUntil = performance.now() + 4200;
}

/* ---------- 迴圈 ---------- */
const clock = new THREE.Clock(); const v = new THREE.Vector3();
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function tick() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (fly) { const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k); controls.target.lerpVectors(fly.fT, fly.tT, e); camera.position.lerpVectors(fly.fP, fly.tP, e); if (k >= 1) fly = null; }
  stepOffset(dt);
  if (follow) {
    const g = follow.g, back = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
    const tgt = g.position.clone().add(new THREE.Vector3(0, .18, 0));
    controls.target.lerp(tgt, Math.min(1, dt * 5));
    camera.position.lerp(tgt.clone().add(back.multiplyScalar(-.55)).add(new THREE.Vector3(0, .22, 0)), Math.min(1, dt * 3));
  }
  controls.update();
  { const off = camera.position.clone().sub(controls.target); $('needle').style.transform = `rotate(${-Math.atan2(off.x, off.z)}rad)`; }
  // 鏡頭不鑽進地面
  { const gy = world.topAt(camera.position.x, camera.position.z) + .1; if (camera.position.y < gy) camera.position.y = gy; }
  // 陰影跟著鏡頭目標走，近看比較銳利
  const dist = camera.position.distanceTo(controls.target);
  const r = Math.min(90, Math.max(6, dist * .9));
  sun.position.copy(controls.target).add(new THREE.Vector3(-r * .6, r * 1.3, r * .8)); sun.target.position.copy(controls.target);
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: .1, far: r * 4 }); sun.shadow.camera.updateProjectionMatrix();
  world.update(dt, t); lm.applyLift(world.liftOf);
  if (!reduce) lm.update(t);
  people && people.update(dt, t, reduce);
  renderer.render(scene, camera);
  // 區名標籤
  for (let di = 0; di < world.D.length; di++) {
    const d = world.D[di], el = dLabels[di];
    v.set(d.cx, d.maxH * V * .6 + world.liftOf(di) + .3, d.cz).project(camera);
    const show = di === selected || (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && (d.area > dist * dist * .006 || (dist < 14 && dist > 2.5) || Math.hypot(d.cx - controls.target.x, d.cz - controls.target.z) < 2.5));
    el.hidden = !show; if (!show) continue;
    el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  }
  lm.items.forEach((it, n) => {
    const el = pins[n];
    v.set(it.x, it.y + world.liftOf(it.di) + it.top * .05 + .08, it.z).project(camera);
    const show = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && ((dist < 16 && Math.hypot(it.x - controls.target.x, it.z - controls.target.z) < dist * 1.2) || (it.di === selected && dist < 40));
    el.hidden = !show; if (!show) return;
    el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  });
  if (bubbleFor) {
    if (performance.now() > bubbleUntil) { bubble.hidden = true; bubbleFor = null; }
    else { const g = bubbleFor.g.position; v.set(g.x, g.y + .36, g.z).project(camera); bubble.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; bubble.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
  }
  requestAnimationFrame(tick);
}

/* ---------- 鎖住頁面，不讓瀏覽器自己縮放或捲動 ---------- */
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1 && !e.target.closest('#stage')) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
// 手機網址列伸縮時，用實際可見高度
function setVH() { document.documentElement.style.setProperty('--vh', (window.visualViewport ? visualViewport.height : innerHeight) + 'px'); }
setVH(); (window.visualViewport || window).addEventListener('resize', setVH);

/* ---------- 啟動 ---------- */
legend();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', legend);
tick();
loadPolicies().then(({ rows }) => {
  indexRows(rows); refreshCounts();
  people = buildPeople(scene, world, lm, di => 1 + Math.min(6, itemsOf(world.D[di].name).length) + (world.D[di].urban ? 2 : 0), LOW ? 45 : innerWidth < 600 ? 60 : 90);
  const h = decodeURIComponent(location.hash.slice(1));
  if (h) { const di = world.D.findIndex(d => d.name === h || d.name === h + '區'); if (di >= 0) select(di); }
});
