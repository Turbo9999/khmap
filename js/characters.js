// 固定角色「○○隆隆」：一般方塊人外型（不模仿真人），各自代表一種市民身分。
// 角色只說「我關心什麼」，內容一律從政見資料庫挑有來源的條目，不另外編台詞。
import * as THREE from 'three';

const P = 0.034 * 1.25;
const text = r => (r.title || '') + (r.body || '');

export const CHARACTERS = [
  { id: 'engineer', name: '工程師隆隆', role: '身穿黑色皮衣，關心科技產業與招商。', at: [22.727, 120.312], d: '楠梓區',
    look: { shirt: '#151515', pants: '#222222', hair: '#3b3b3b', inner: '#7a7a7a', glasses: true },
    match: r => /AI|半導體|招商|算力|科技|研發|園區/.test(text(r)) },
  { id: 'commuter', name: '上班族隆隆', role: '搭捷運輕軌通勤的上班族，在意通勤時間。', at: [22.702, 120.303], d: '左營區',
    look: { shirt: '#f4f4f0', pants: '#24324f', tie: '#c0392b', briefcase: true },
    match: r => r.category === '交通' && /捷運|輕軌|紫線|通勤|延伸線|TOD|生活圈|高架/.test(text(r)) },
  { id: 'worker', name: '勞工隆隆', role: '象徵高雄基層勞工與產業動能。', at: [22.556, 120.352], d: '小港區',
    look: { shirt: '#f08a24', pants: '#3a4a5a', hardhat: '#f2c14e', vest: true },
    match: r => /傳產|扣件|製造|工業|就業|產業升級|在地採購|機械/.test(text(r)) },
  { id: 'vendor', name: '菜販隆隆', role: '傳統市場攤商，關心生計與市場、商圈發展。', at: [22.627, 120.357], d: '鳳山區',
    look: { shirt: '#3c9a8f', pants: '#3a3a3a', apron: '#f4efe4', stall: true },
    match: r => /市場|商圈|攤|在地採購|青創補助/.test(text(r)) },
  { id: 'farmer', name: '農漁民隆隆', role: '在意農漁產銷、冷鏈物流與外銷通路。', at: [22.866, 120.216], d: '茄萣區',
    look: { shirt: '#6f8f4a', pants: '#2b3b2b', strawhat: true, boots: true },
    match: r => r.category === '農業' || /漁|冷鏈|農/.test(text(r)) },
  { id: 'grandpa', name: '阿公隆隆', role: '白髮加鬍子，問敬老卡點數和長輩運動。', at: [22.640, 120.312], d: '三民區',
    look: { shirt: '#a8754b', pants: '#5a4636', hair: '#f2f2f2', beard: true, cane: true },
    match: r => r.category === '長照' || /敬老|樂齡|銀髮|長輩|長者/.test(text(r)) },
  { id: 'rider', name: '機車族隆隆', role: '每天騎車，關心路平、燈亮與人行道。', at: [22.604, 120.316], d: '前鎮區',
    look: { shirt: '#4a74b8', pants: '#2a2a2a', helmet: '#e85d2a', scooter: true }, speed: .45, roam: .7,
    match: r => /人行|道路|路網|號誌|重車|國道|快速|路權|交通/.test(text(r)) && r.category === '交通' },
  { id: 'student', name: '學生隆隆', role: '代表求學族群與通學安全。', at: [22.624, 120.297], d: '前金區',
    look: { shirt: '#ffffff', pants: '#1f3a66', backpack: '#e85d2a' },
    match: r => r.category === '教育' || /通學|校園|學生|雙語|實習/.test(text(r)) },
  { id: 'parent', name: '年輕家長隆隆', role: '推著嬰兒車，關心托育、育兒與親子空間。', at: [22.623, 120.341], d: '鳳山區',
    look: { shirt: '#d94f70', pants: '#3a3a3a', stroller: true },
    match: r => r.category === '育兒' || /托育|兒童|親子|育兒|生育/.test(text(r)) },
  { id: 'petdad', name: '毛爸隆隆', role: '帶著毛小孩，關注寵物友善空間與公園。', at: [22.656, 120.288], d: '鼓山區',
    look: { shirt: '#6aa84f', pants: '#2f3f63', dog: true },
    match: r => r.category === '寵物' || /寵物|毛小孩|毛經濟|公園/.test(text(r)) },
  { id: 'tourist', name: '觀光客隆隆', role: '外地遊客與外國朋友，看高雄好不好玩。', at: [22.613, 120.268], d: '旗津區',
    look: { shirt: '#20b2aa', pants: '#d8c9a8', hair: '#c9a15a', sunglasses: true, camera: true, backpack: '#5a4636' },
    match: r => r.category === '觀光' },
  { id: 'opera', name: '歌仔戲隆隆', role: '穿傳統戲服，代表在地傳統文化與藝文。', at: [22.946, 120.477], d: '內門區',
    look: { shirt: '#c0392b', pants: '#c0392b', operaFace: true, headdress: true, robe: true },
    match: r => r.category === '文化' || /藝陣|傳統|歌仔戲|宗教/.test(text(r)) },
  { id: 'fan', name: '樂迷隆隆', role: '亮粉紅假髮、耳罩式耳機、墨鏡加潮流穿搭，揮著發光應援棒，呼應高雄的演唱會經濟。', at: [22.6205, 120.2825], d: '鹽埕區',
    look: { shirt: '#111111', pants: '#2b2b2b', hair: '#ff3fa4', wig: '#ff3fa4', headphones: true, sunglasses: true, streetwear: true, lightstick: '#ff5ec8' },
    match: r => /演唱會|大港開唱|大港閱冰|巨蛋|舞台|盛事|劇場/.test(text(r)) },
  { id: 'athlete', name: '運動選手隆隆', role: '代表體育與全民運動。', at: [22.701, 120.296], d: '左營區',
    look: { shirt: '#e8e8e8', pants: '#c0392b', headband: '#c0392b', number: true }, speed: .38,
    match: r => r.category === '運動' || /運動|體操|健身|球場/.test(text(r)) },
];

function face(look) {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  const skin = look.operaFace ? '#f6efe6' : '#efc6a0', hair = look.hair || '#2b1d14';
  g.fillStyle = skin; g.fillRect(0, 0, 8, 8);
  g.fillStyle = hair; g.fillRect(0, 0, 8, 2);
  if (look.operaFace) { g.fillStyle = '#e8506a'; g.fillRect(0, 3, 3, 3); g.fillRect(5, 3, 3, 3); g.fillStyle = '#111'; g.fillRect(1, 2, 2, 1); g.fillRect(5, 2, 2, 1); }
  g.fillStyle = '#fff'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
  g.fillStyle = '#3b2618'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
  if (look.glasses) { g.fillStyle = '#111'; g.fillRect(1, 3, 6, 1); g.fillStyle = '#9fd3ff'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1); }
  if (look.sunglasses) { g.fillStyle = '#111'; g.fillRect(1, 3, 6, 1); g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2); }
  g.fillStyle = '#c99872'; g.fillRect(3, 4, 2, 1);
  g.fillStyle = look.operaFace ? '#c0392b' : '#8c3b32'; g.fillRect(2, 6, 4, 1); g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1);
  if (look.beard) { g.fillStyle = '#f2f2f2'; g.fillRect(1, 5, 6, 3); g.fillStyle = '#8c3b32'; g.fillRect(3, 6, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, skin, hair };
}

function build(look) {
  const L = c => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(P * w, P * h, P * d), L(c)); m.castShadow = true; return m; };
  const f = face(look);
  const skinM = L(f.skin), hairM = L(f.hair);
  const head = new THREE.Mesh(new THREE.BoxGeometry(P * 2, P * 2, P * 2), [skinM, skinM, hairM, skinM, new THREE.MeshLambertMaterial({ map: f.tex }), hairM]);
  head.castShadow = true;
  const shirt = look.shirt, pants = look.pants;
  const body = box(2, 3, 1, shirt);
  const limb = (c, len) => { const piv = new THREE.Group(); const m = box(.95, len, .95, c); m.position.y = -P * len / 2; piv.add(m); return piv; };
  const armL = limb(look.robe ? '#f4efe4' : shirt, 3), armR = limb(look.robe ? '#f4efe4' : shirt, 3);
  const legL = limb(look.boots ? '#1d1d1d' : pants, 3), legR = limb(look.boots ? '#1d1d1d' : pants, 3);
  const g = new THREE.Group(), rider = new THREE.Group();
  body.position.y = P * 4.5; head.position.y = P * 7;
  armL.position.set(-P * 1.5, P * 6, 0); armR.position.set(P * 1.5, P * 6, 0);
  legL.position.set(-P * .5, P * 3, 0); legR.position.set(P * .5, P * 3, 0);
  rider.add(body, head, armL, armR, legL, legR); g.add(rider);
  const extra = {};
  const on = (parent, m, x, y, z) => { m.position.set(P * x, P * y, P * z); parent.add(m); return m; };
  if (look.inner) on(rider, box(.8, 2.6, .1, look.inner), 0, 4.6, .52);
  if (look.tie) on(rider, box(.35, 2, .1, look.tie), 0, 4.8, .55);
  if (look.vest) { on(rider, box(2.06, .35, 1.06, '#e8eef2'), 0, 4.2, 0); on(rider, box(2.06, .35, 1.06, '#e8eef2'), 0, 5.2, 0); }
  if (look.apron) on(rider, box(1.8, 2.6, .1, look.apron), 0, 3.8, .55);
  if (look.number) on(rider, box(1, 1, .1, '#c0392b'), 0, 4.8, .55);
  if (look.backpack) on(rider, box(1.6, 2, .8, look.backpack), 0, 4.6, -.9);
  if (look.camera) on(rider, box(.9, .6, .5, '#1d1d1d'), 0, 5.6, .75);
  if (look.hardhat) { on(rider, box(2.3, .8, 2.3, look.hardhat), 0, 8.3, 0); on(rider, box(2.6, .2, 2.6, look.hardhat), 0, 7.9, 0); }
  if (look.helmet) { on(rider, box(2.4, 2.2, 2.4, look.helmet), 0, 7.4, -.1); on(rider, box(2, .9, .2, '#1d2a33'), 0, 7, 1.15); }
  if (look.strawhat) { on(rider, box(4, .3, 4, '#d9b36a'), 0, 8.1, 0); on(rider, box(2, .7, 2, '#c9a35a'), 0, 8.5, 0); }
  if (look.headphones) { on(rider, box(.6, 1.2, 1.2, '#111'), -1.2, 7, 0); on(rider, box(.6, 1.2, 1.2, '#111'), 1.2, 7, 0); on(rider, box(2.6, .35, .6, '#e85d2a'), 0, 8.2, 0); }
  if (look.wig) {   // 蓬鬆亮粉紅假髮
    on(rider, box(2.8, 1.4, 2.8, look.wig), 0, 8.3, -.1); on(rider, box(2.4, .8, 2.4, look.wig), 0, 9.3, -.1);
    on(rider, box(.5, 2.4, 2.6, look.wig), -1.35, 7, -.3); on(rider, box(.5, 2.4, 2.6, look.wig), 1.35, 7, -.3); on(rider, box(2.8, 2.6, .5, look.wig), 0, 6.9, -1.3);
    on(rider, box(.8, .8, .8, '#ff8cc8'), -.8, 9.8, .2); on(rider, box(.8, .8, .8, '#ff8cc8'), .7, 9.9, -.5);
  }
  if (look.streetwear) {   // 潮流穿搭：大學外套、亮色拉鍊、球鞋
    on(rider, box(2.1, .4, 1.1, '#ff3fa4'), 0, 3.15, 0); on(rider, box(.25, 3, .1, '#f2e94e'), 0, 4.5, .55);
    on(rider, box(1, .5, .1, '#f2e94e'), .5, 5.2, .56);
    [armL, armR].forEach(a => { const c = box(1, .4, 1, '#ff3fa4'); c.position.y = -P * 2.7; a.add(c); });
    [legL, legR].forEach(l => { const sh = box(1.1, .6, 1.5, '#f4f4f4'); sh.position.set(0, -P * 2.8, P * .2); l.add(sh); });
  }
  if (look.lightstick) {   // 會發光的應援棒
    const grip = box(.35, 1.4, .35, '#222'); grip.position.y = -P * 3.3; armR.add(grip);
    const glowM = new THREE.MeshBasicMaterial({ color: look.lightstick });
    const tip = new THREE.Mesh(new THREE.BoxGeometry(P * .7, P * 2.2, P * .7), glowM); tip.position.y = -P * 5; armR.add(tip);
    const halo = new THREE.Mesh(new THREE.BoxGeometry(P * 1.3, P * 2.8, P * 1.3), new THREE.MeshBasicMaterial({ color: look.lightstick, transparent: true, opacity: .35, depthWrite: false })); halo.position.y = -P * 5; armR.add(halo);
    const light = new THREE.PointLight(look.lightstick, .6, .6); light.position.y = -P * 5; armR.add(light);
    extra.stick = { glowM, halo, light };
  }
  if (look.cap) { on(rider, box(2.2, .6, 2.2, '#f2c14e'), 0, 8.2, 0); on(rider, box(1.6, .2, 1.1, '#f2c14e'), 0, 7.95, -1.4); }
  if (look.headband) on(rider, box(2.1, .4, 2.1, look.headband), 0, 7.6, 0);
  if (look.beard) on(rider, box(2.2, .6, 2.2, '#f2f2f2'), 0, 8.2, 0);
  if (look.headdress) { on(rider, box(2.4, 1.2, 2.4, '#e0b443'), 0, 8.5, 0); on(rider, box(.4, 2.6, .4, '#c0392b'), -.6, 10, -.4); on(rider, box(.4, 2.6, .4, '#c0392b'), .6, 10, -.4); }
  if (look.robe) on(rider, box(2.6, 3.2, 1.6, '#c0392b'), 0, 1.7, 0);
  if (look.briefcase) { const b = box(.5, 1.1, 1.4, '#6b4a2b'); b.position.y = -P * 3.3; armR.add(b); }
  if (look.cane) { const b = box(.25, 4, .25, '#5a4636'); b.position.set(0, -P * 3.6, P * .6); armR.add(b); }
  if (look.stall) { const s = new THREE.Group(); s.add(on(s, box(4, 2, 2, '#a8754b'), 0, 1, 0)); on(s, box(4.2, .2, 2.2, '#3c9a8f'), 0, 4.2, 0); on(s, box(.3, 2.2, .3, '#888'), -1.9, 3.1, 0); on(s, box(.3, 2.2, .3, '#888'), 1.9, 3.1, 0);
    ['#6aa84f', '#e85d2a', '#f2c14e', '#d94f70'].forEach((c, k) => on(s, box(.8, .6, .8, c), -1.4 + k * .95, 2.3, 0)); extra.stall = s; }
  if (look.stroller) { const s = new THREE.Group(); on(s, box(1.8, 1.4, 2.4, '#4a74b8'), 0, 2.2, 0); on(s, box(1.9, 1.4, .3, '#2f5590'), 0, 3.4, -1.1); on(s, box(.9, .9, .9, '#efc6a0'), 0, 3.2, .2);
    [-1, 1].forEach(x => [-1, 1].forEach(z => on(s, box(.4, .8, .8, '#222'), x * .9, .4, z * .9))); s.position.z = P * 2.8; rider.add(s); }
  if (look.scooter) { const s = new THREE.Group(); on(s, box(1.2, 1, 4.2, '#e85d2a'), 0, 1, 0); on(s, box(1, 2.4, .4, '#e85d2a'), 0, 2.4, 1.9); on(s, box(2.2, .3, .3, '#222'), 0, 3.6, 1.9);
    on(s, box(.6, 1, 1, '#222'), 0, .5, 1.8); on(s, box(.6, 1, 1, '#222'), 0, .5, -1.8); g.add(s); rider.position.y = P * 1.2; extra.scooter = s; }
  if (look.dog) { const s = new THREE.Group(); on(s, box(1, .9, 2, '#a0703c'), 0, 1.2, 0); on(s, box(.9, .9, .9, '#a0703c'), 0, 1.9, 1.3); on(s, box(.3, .4, .3, '#5a3a1c'), -.3, 2.5, 1.2); on(s, box(.3, .4, .3, '#5a3a1c'), .3, 2.5, 1.2);
    on(s, box(.3, .3, .7, '#a0703c'), 0, 1.8, -1.2); [-1, 1].forEach(x => [-1, 1].forEach(z => on(s, box(.3, .8, .3, '#8a5c2e'), x * .35, .4, z * .7))); extra.dog = s; }
  return { g, rider, head, armL, armR, legL, legR, extra };
}

export function buildCharacters(scene, world) {
  const list = [];
  for (const C of CHARACTERS) {
    const a = world.anchor(C.at[0], C.at[1], C.d);
    const b = build(C.look);
    b.g.position.set(a.x, world.topAt(a.x, a.z), a.z);
    scene.add(b.g);
    for (const k of ['stall', 'dog']) if (b.extra[k]) { scene.add(b.extra[k]); }
    if (b.extra.stall) b.extra.stall.position.set(a.x + .05, world.topAt(a.x, a.z), a.z + .06);
    const ch = { ...C, ...b, di: a.di, home: { x: a.x, z: a.z }, tx: a.x, tz: a.z, wait: 1 + Math.random() * 2, sp: C.speed || .1, roam: C.roam || .22, ph: Math.random() * 6, hop: 0 };
    b.g.traverse(o => { o.userData.char = list.length; });
    if (b.extra.dog) b.extra.dog.traverse(o => { o.userData.char = list.length; });
    if (b.extra.stall) b.extra.stall.traverse(o => { o.userData.char = list.length; });
    list.push(ch);
  }
  const meshes = []; list.forEach(c => { c.g.traverse(o => o.isMesh && meshes.push(o)); c.extra.dog && c.extra.dog.traverse(o => o.isMesh && meshes.push(o)); c.extra.stall && c.extra.stall.traverse(o => o.isMesh && meshes.push(o)); });

  function pick(c) {
    const f = world.freePoint(c.di, c.home, c.roam);
    if (f) { c.tx = f.x; c.tz = f.z; } else { c.tx = c.home.x; c.tz = c.home.z; }
  }
  function update(dt, t, reduce) {
    for (const c of list) {
      const g = c.g; let swing = 0;
      if (c.extra.stall) { c.wait = 1; g.rotation.y = Math.PI; }   // 菜販顧攤
      else if (c.wait > 0) c.wait -= dt;
      else {
        const dx = c.tx - g.position.x, dz = c.tz - g.position.z, L = Math.hypot(dx, dz);
        if (L < .02) { c.wait = 1.5 + Math.random() * 3; pick(c); }
        else { const s = Math.min(L, c.sp * dt), nx = g.position.x + dx / L * s, nz = g.position.z + dz / L * s;
          if (world.isBlocked(nx, nz) && !world.isBlocked(g.position.x, g.position.z)) { c.wait = .3; pick(c); continue; }
          g.position.x = nx; g.position.z = nz; g.rotation.y = Math.atan2(dx, dz); swing = c.extra.scooter ? 0 : Math.sin(t * 10 + c.ph) * .7; }
      }
      c.armL.rotation.x = c.look.stroller ? -1.2 : swing; c.armR.rotation.x = c.look.stroller ? -1.2 : (c.look.cane ? .3 : -swing);
      c.legL.rotation.x = -swing; c.legR.rotation.x = swing;
      if (c.look.headphones && !reduce) c.head.rotation.z = Math.sin(t * 6) * .12;   // 跟著音樂搖
      if (c.extra.stick) {   // 停下來時舉起應援棒揮舞，顏色輪流變
        const st = c.extra.stick, k = reduce ? 0 : t;
        if (c.wait > 0) { c.armR.rotation.x = -2.8 + Math.sin(k * 7) * .35; c.armR.rotation.z = Math.sin(k * 3.5) * .3; }
        const col = new THREE.Color().setHSL((.9 + Math.sin(k * .8) * .08 + 1) % 1, 1, .62);
        st.glowM.color.copy(col); st.halo.material.color.copy(col); st.light.color.copy(col);
        st.halo.material.opacity = .25 + .15 * Math.sin(k * 9);
      }
      if (c.look.robe && !reduce && c.wait > 0) { c.armL.rotation.z = Math.sin(t * 2) * .5 - .4; c.armR.rotation.z = -Math.sin(t * 2) * .5 + .4; }
      if (c.hop > 0) c.hop -= dt;
      const hop = c.hop > 0 ? Math.sin((1 - c.hop / .6) * Math.PI) * P * 6 : 0;
      g.position.y = world.topAt(g.position.x, g.position.z) + (reduce ? 0 : hop);
      if (c.extra.dog) {   // 狗跟在旁邊
        const d = c.extra.dog, ang = g.rotation.y, tx = g.position.x + Math.cos(ang) * .045, tz = g.position.z - Math.sin(ang) * .045;
        d.position.x += (tx - d.position.x) * Math.min(1, dt * 4); d.position.z += (tz - d.position.z) * Math.min(1, dt * 4);
        d.position.y = world.topAt(d.position.x, d.position.z) + (reduce ? 0 : Math.abs(Math.sin(t * 9)) * P * .6); d.rotation.y = ang;
      }
      if (c.extra.stall) c.extra.stall.position.y = world.topAt(c.extra.stall.position.x, c.extra.stall.position.z);
    }
  }
  function relocate(id, x, z) {
    const c = list.find(c => c.id === id); if (!c) return;
    c.home = { x, z }; c.tx = x; c.tz = z; c.di = world.districtAt(x, z); c.g.position.set(x, world.topAt(x, z), z); c.roam = .12;
  }
  // 家的位置如果剛好在建築或地標裡，挪到最近的空地
  function settle() {
    for (const c of list) {
      if (!world.isBlocked(c.home.x, c.home.z)) continue;
      let best = null;
      for (let r = .03; r < .6 && !best; r += .03) for (let a = 0; a < 16 && !best; a++) {
        const x = c.home.x + Math.cos(a / 16 * 6.283) * r, z = c.home.z + Math.sin(a / 16 * 6.283) * r;
        if (!world.isBlocked(x, z) && world.districtAt(x, z) === c.di) best = { x, z };
      }
      if (best) { c.home = best; c.tx = best.x; c.tz = best.z; c.g.position.set(best.x, world.topAt(best.x, best.z), best.z);
        if (c.extra.stall) c.extra.stall.position.set(best.x + .05, world.topAt(best.x, best.z), best.z + .06); }
    }
  }
  function poke(i) { const c = list[i]; if (!c) return null; c.hop = .6; if (!c.extra.stall) c.wait = Math.max(c.wait, 2.5); return c; }
  return { list, meshes, update, poke, relocate, settle };
}
