// 各區地標（方塊模型）。位置為示意，會吸附到該區範圍內。
import * as THREE from 'three';

const U = 0.065; // 地標方塊單位（km）

// b.box(x,y,z,w,h,d,色)：x,z 以地標中心為原點，y 從地面起算，單位 U
// b.glow(...)：夜晚會亮的方塊；b.group()：回傳可動畫的群組（座標同單位）
export const LANDMARKS = [
  { name: '蓮池潭・龍虎塔', d: '左營區', at: [22.681, 120.295], desc: '左營蓮池潭上的龍虎塔，從龍口進、虎口出。',
    build(b) {
      b.box(0, 0, 0, 34, 1, 20, 0x3e8ed0);                       // 潭水
      for (const [x, c] of [[-5, 0x3aa564], [5, 0xe0902c]]) {      // 龍塔、虎塔
        for (let k = 0; k < 7; k++) { const s = 5 - k * .5; b.box(x, 1 + k * 2.2, -2, s, 1.6, s, k % 2 ? 0xf3d24b : 0xc8402f); b.box(x, 2.4 + k * 2.2, -2, s + 1.2, .5, s + 1.2, 0x2f6b3a); }
        b.box(x, 1, 4, 3, 3, 3, c); b.box(x, 3.6, 5, 2, 1.5, 2, c);  // 龍頭／虎頭
      }
      for (let k = 0; k < 6; k++) b.box(-14 + k * 2, 1, 6 + (k % 2) * 2, 2.4, .6, 1.2, 0xd8382c); // 九曲橋
    } },
  { name: '駁二・大港開唱', d: '鹽埕區', at: [22.620, 120.281], desc: '駁二藝術特區倉庫群，每年春天大港開唱在這一帶舉行。',
    build(b) {
      for (let k = 0; k < 4; k++) { b.box(-12 + k * 7, 0, -6, 6, 5, 10, 0xa8553a); b.box(-12 + k * 7, 5, -6, 6.4, 1, 10.4, 0x4d4d52); }
      b.box(8, 0, 8, 14, 2, 8, 0x26262b);                          // 舞台
      b.box(1.5, 2, 8, 1, 9, 1, 0x888); b.box(14.5, 2, 8, 1, 9, 1, 0x888); b.box(8, 11, 8, 14, 1, 1, 0x888);
      b.box(2.5, 2, 10.5, 2, 4, 2, 0x111); b.box(13.5, 2, 10.5, 2, 4, 2, 0x111);
      const g = b.group(8, 10.4, 8); const cols = [0xff3b6b, 0x3bd1ff, 0xfff04a, 0x9dff5c, 0xb86bff];
      const lights = cols.map((c, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(U * 1.4, U * 1.4, U * 1.4), new THREE.MeshBasicMaterial({ color: c })); m.position.set((k - 2) * U * 2.6, 0, 0); g.add(m); return m; });
      b.anim(t => lights.forEach((m, k) => { m.visible = Math.sin(t * 6 + k * 1.7) > -.2; m.scale.setScalar(1 + .3 * Math.sin(t * 8 + k)); }));
      b.stage = [8, 14];  // 觀眾區
    } },
  { name: '85 大樓', d: '苓雅區', at: [22.612, 120.300], desc: '高雄地標 85 大樓，兩腳撐起中間的高塔。',
    build(b) {
      const c = 0x3d5a73, g = 0x6f8ea6;
      b.box(-4, 0, 0, 4, 22, 6, c); b.box(4, 0, 0, 4, 22, 6, c);
      b.box(0, 22, 0, 12, 6, 6, g); b.box(0, 28, 0, 8, 8, 5, c); b.box(0, 36, 0, 5, 6, 4, g); b.box(0, 42, 0, 1, 8, 1, 0xdddddd);
      b.glow(0, 49.5, 0, 1.2, 1.2, 1.2, 0xff4040);
    } },
  { name: '夢時代摩天輪', d: '前鎮區', at: [22.595, 120.307], desc: '夢時代購物中心頂樓的摩天輪。',
    build(b) {
      b.box(0, 0, 0, 18, 6, 10, 0xe9e3d8); b.box(0, 6, 0, 18, .6, 10, 0xc9473b);
      b.box(-2.5, 6, 0, 1, 9, 1, 0xbbbbbb); b.box(2.5, 6, 0, 1, 9, 1, 0xbbbbbb);
      const g = b.group(0, 15, 0); const cols = [0xff6b6b, 0xffd93b, 0x6bcbff, 0x7bd96b];
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(U * 1.4, U * 1.4, U * 1.4), new THREE.MeshLambertMaterial({ color: k % 2 ? 0xffffff : cols[k / 2 % 4 | 0], emissive: 0x000000 })); m.position.set(Math.cos(a) * U * 8, Math.sin(a) * U * 8, 0); m.userData.glow = true; g.add(m); }
      b.anim(t => { g.rotation.z = t * .25; });
    } },
  { name: '大巨蛋（規劃）', d: '前鎮區', at: [22.588, 120.322], desc: '政見提到在 205 兵工廠用地興建大巨蛋，目前為規劃。',
    build(b) { for (let k = 0; k < 6; k++) { const r = 16 - k * k * .45; b.box(0, k * 1.6, 0, r, 1.6, r, k % 2 ? 0xf4f4f4 : 0xdfe6ec); } b.box(0, 0, 0, 22, .4, 22, 0x6aa84f); } },
  { name: '旗後燈塔・彩虹教堂', d: '旗津區', at: [22.613, 120.266], desc: '旗津旗後山上的白色燈塔，與海邊的彩虹教堂裝置。',
    build(b) {
      b.box(0, 0, 0, 10, 3, 10, 0x6aa84f); b.box(0, 3, 0, 5, 3, 5, 0xffffff); b.box(0, 6, 0, 3, 8, 3, 0xffffff); b.box(0, 14, 0, 3.6, 1, 3.6, 0x333333);
      b.glow(0, 15, 0, 2.2, 2.2, 2.2, 0xffe680);
      const rb = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6]; rb.forEach((c, k) => b.box(10, 0 + k * 1.1, 8, 2, 1.1, 8 - k * 1.2, c));
      const ferry = b.group(-14, .6, 0); ferry.add(boatMesh(0xffffff, 0x1f6fb2)); b.anim(t => { ferry.position.x = (-14 - 10 * (0.5 + 0.5 * Math.sin(t * .3))) * U; ferry.rotation.y = Math.cos(t * .3) > 0 ? 0 : Math.PI; });
    } },
  { name: '打狗英國領事館', d: '鼓山區', at: [22.6195, 120.2675], desc: '西子灣旁山丘上的紅磚洋樓，附近是壽山動物園。',
    build(b) { b.box(0, 0, 0, 12, 4, 10, 0x6aa84f); b.box(0, 4, 0, 9, 4, 6, 0xb2533e); for (let k = 0; k < 4; k++) b.box(-3.4 + k * 2.3, 4, 3.1, 1.2, 3, .3, 0xf1e6d4); b.box(0, 8, 0, 9.6, 1.2, 6.6, 0x7a3b2e); } },
  { name: '六合夜市', d: '新興區', at: [22.632, 120.300], desc: '新興區的觀光夜市。',
    build(b) { for (let k = 0; k < 6; k++) { b.box(-10 + k * 4, 0, -3, 3, 2.4, 2.4, [0xf2c14e, 0xe85d2a, 0x3c9a8f][k % 3]); b.box(-10 + k * 4, 0, 3, 3, 2.4, 2.4, [0x4a74b8, 0xf2c14e, 0xd94f70][k % 3]); b.glow(-10 + k * 4, 4, 0, .9, 1.2, .9, 0xff3a2a); } b.box(0, 3.6, 0, 26, .2, .2, 0x222222); } },
  { name: '高雄車站・愛河', d: '三民區', at: [22.6395, 120.302], desc: '新高雄車站的綠屋頂與舊車站帝冠式建築；愛河流經市區。',
    build(b) { b.box(0, 0, 0, 22, 2, 12, 0xd9dfe3); b.box(0, 2, 0, 18, 1, 10, 0x6aa84f); b.box(0, 3, 0, 12, 1, 7, 0x8cc76b); b.box(-14, 0, 2, 6, 4, 5, 0xefe6d2); b.box(-14, 4, 2, 6.6, 2, 5.6, 0xa13b2b); } },
  { name: '中央公園', d: '前金區', at: [22.6245, 120.2985], desc: '前金區的中央公園，捷運站就在公園裡。',
    build(b) { b.box(0, 0, 0, 14, .5, 10, 0x76b85a); b.box(3, .5, 2, 5, .3, 3, 0x3e8ed0); for (let k = 0; k < 6; k++) { b.box(-5 + (k % 3) * 3, .5, -3 + (k / 3 | 0) * 6, .6, 2, .6, 0x6b4a2b); b.box(-5 + (k % 3) * 3, 2.5, -3 + (k / 3 | 0) * 6, 2.4, 2.4, 2.4, 0x3f8f3a); } } },
  { name: '高雄國際機場', d: '小港區', at: [22.5735, 120.3485], desc: '小港的高雄國際機場；政見提到新航廈與 24 小時營運。',
    build(b) {
      b.box(0, 0, 0, 6, .3, 52, 0x4a4d52); for (let k = 0; k < 9; k++) b.box(0, .3, -22 + k * 5.5, .6, .05, 2.4, 0xffffff);
      b.box(10, 0, 4, 8, 3, 18, 0xdfe6ec); b.box(10, 3, 4, 8.6, .6, 18.6, 0x7fa7c9);
      const p = b.group(0, 1, 26); p.add(planeMesh());
      b.anim(t => { const k = (t * .08) % 1; p.position.set(0, (1 + Math.max(0, k - .45) * 60) * U, (26 - k * 70) * U); p.rotation.x = k > .45 ? -.25 : 0; p.visible = k < .95; });
    } },
  { name: '衛武營', d: '鳳山區', at: [22.6235, 120.3405], desc: '鳳山的衛武營國家藝術文化中心，波浪般的白色屋頂。',
    build(b) { for (let k = 0; k < 9; k++) b.box(-12 + k * 3, 0, 0, 3, 3 + Math.sin(k * .9) * 2 + 2, 14, 0xeef1f3); b.box(0, 0, 0, 30, .4, 18, 0x76b85a); } },
  { name: '澄清湖', d: '鳥松區', at: [22.659, 120.358], desc: '鳥松的澄清湖與九曲橋。',
    build(b) { b.box(0, 0, 0, 26, .6, 18, 0x3e8ed0); for (let k = 0; k < 8; k++) b.box(-10 + k * 2.4, .6, (k % 2) * 2 - 1, 2.6, .5, 1.2, 0xf4e9d4); b.box(9, .6, -5, 1.6, 6, 1.6, 0xc8402f); } },
  { name: '佛陀紀念館', d: '大樹區', at: [22.758, 120.443], desc: '大樹區佛光山的佛陀紀念館與大佛。',
    build(b) {
      b.box(0, 0, 0, 30, 1, 30, 0xe6ddc8); b.box(0, 1, -9, 12, 3, 8, 0xd8c48f);
      b.box(0, 4, -9, 8, 6, 5, 0xd4a537); b.box(0, 10, -9, 5, 4, 4, 0xe0b443); b.box(0, 14, -9, 3, 3, 3, 0xe0b443);
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { b.box(s * 11, 1, -2 + k * 4, 2.4, 6, 2.4, 0x9a6b3c); b.box(s * 11, 7, -2 + k * 4, 1.4, 2, 1.4, 0xd4a537); }
    } },
  { name: '高屏舊鐵橋', d: '大樹區', at: [22.649, 120.442], desc: '跨越高屏溪的舊鐵橋，現為濕地公園的一部分。',
    build(b) { b.box(10, 0, 0, 20, .6, 30, 0x5a9fd6); for (let k = 0; k < 6; k++) { b.box(4 + k * 3.4, 1, 0, 3.4, .6, 2, 0x8a3d2c); b.box(4 + k * 3.4, 1.6, 0, .4, 2.4, 2, 0x8a3d2c); b.box(4 + k * 3.4, 4, 0, 3.4, .4, 2, 0x8a3d2c); } } },
  { name: '中芸漁港', d: '林園區', at: [22.506, 120.386], desc: '林園的中芸漁港。',
    build(b) { b.box(0, 0, 0, 20, .5, 4, 0x9a9a9a); for (let k = 0; k < 3; k++) { const g = b.group(-6 + k * 6, .2, 5); g.add(boatMesh(0xffffff, [0xe85d2a, 0x3c9a8f, 0x4a74b8][k])); b.anim(t => { g.position.y = (.2 + Math.sin(t * 2 + k) * .25) * U; }); } } },
  { name: '紅豆田', d: '大寮區', at: [22.603, 120.405], desc: '大寮以紅豆聞名。',
    build(b) { for (let k = 0; k < 6; k++) b.box(0, 0, -7.5 + k * 3, 20, 1, 1.6, 0x8c2f2a); b.box(0, 0, 0, 22, .3, 20, 0x6b4a2b); } },
  { name: '仁大工業區', d: '仁武區', at: [22.700, 120.338], desc: '仁武、大社一帶的石化工業區。',
    build(b) { b.box(0, 0, 0, 14, 4, 10, 0xb9bec4); b.box(-4, 4, -2, 1.6, 10, 1.6, 0xd94f3a); b.box(2, 4, 2, 1.6, 8, 1.6, 0xeeeeee);
      const smoke = []; const g = b.group(-4, 14, -2);
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(U * 1.6, U * 1.6, U * 1.6), new THREE.MeshLambertMaterial({ color: 0xeeeeee, transparent: true, opacity: .7 })); g.add(m); smoke.push(m); }
      b.anim(t => smoke.forEach((m, k) => { const p = (t * .25 + k / 4) % 1; m.position.set(p * U * 3, p * U * 10, 0); m.scale.setScalar(1 + p * 1.5); m.material.opacity = .7 * (1 - p); })); } },
  { name: '觀音山', d: '大社區', at: [22.740, 120.357], desc: '大社的觀音山，北高雄山湖生態帶的一部分。',
    build(b) { for (let k = 0; k < 5; k++) b.box(0, k * 2, 0, 18 - k * 3.6, 2, 14 - k * 2.8, k > 2 ? 0x4c8a3a : 0x5f9e45); b.box(0, 10, 0, 3, 2, 3, 0xc8402f); } },
  { name: '都會公園・半導體廠', d: '楠梓區', at: [22.728, 120.310], desc: '楠梓的高雄都會公園，旁邊是楠梓園區的半導體廠房。',
    build(b) { for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; b.box(Math.cos(a) * 7 - 6, 0, Math.sin(a) * 7, 2.6, 3.4, 2.6, 0x3f8f3a); }
      b.box(10, 0, 0, 12, 4, 16, 0xf3f5f7); b.box(10, 4, 0, 10, 1.2, 14, 0xc8d1d9); for (let k = 0; k < 4; k++) b.box(5, 5.2, -6 + k * 4, 1, 1.6, 1, 0x9aa4ad); } },
  { name: '橋頭糖廠', d: '橋頭區', at: [22.759, 120.312], desc: '台灣第一座新式機械製糖工廠，現為糖業博物館。',
    build(b) { b.box(0, 0, 0, 14, 5, 8, 0xb2533e); b.box(0, 5, 0, 14.6, 1, 8.6, 0x5a5f66); b.box(9, 0, 0, 2.6, 18, 2.6, 0x9c4a36); b.box(9, 18, 0, 3, 1, 3, 0x333333); } },
  { name: '岡山之眼・螺絲', d: '岡山區', at: [22.792, 120.330], desc: '小崗山上的岡山之眼觀景台；岡山一帶是「世界螺絲之都」。',
    build(b) { for (let k = 0; k < 3; k++) b.box(0, k * 2, 0, 14 - k * 4, 2, 12 - k * 3, 0x5f9e45);
      b.box(2, 6, 0, 2, 2, 2, 0xe9edf0); b.box(6, 8, 0, 8, .6, 3, 0xcfe7f5); b.box(9.6, 8.6, 0, .4, 1.6, 3, 0xcfe7f5);
      b.box(-10, 0, 8, 2, 10, 2, 0xa9b0b7); for (let k = 0; k < 8; k++) b.box(-10, 1 + k * 1.1, 8, 3, .4, 3, 0xc7ccd1); b.box(-10, 10, 8, 5, 2, 5, 0x8e959c); } },
  { name: '蚵仔寮漁港', d: '梓官區', at: [22.726, 120.255], desc: '梓官的蚵仔寮漁港與魚貨直銷。',
    build(b) { b.box(0, 0, 0, 16, 3, 8, 0xdfe6ec); b.box(0, 3, 0, 17, .8, 9, 0x1f6fb2); for (let k = 0; k < 2; k++) { const g = b.group(-5 + k * 9, .2, -9); g.add(boatMesh(0xffffff, 0xe85d2a)); b.anim(t => { g.position.y = (.2 + Math.sin(t * 2.2 + k) * .25) * U; }); } } },
  { name: '虱目魚塭', d: '彌陀區', at: [22.780, 120.255], desc: '彌陀的虱目魚養殖與魚塭。',
    build(b) { const wheels = [];
      for (let k = 0; k < 4; k++) { const x = -6 + (k % 2) * 12, z = -5 + (k >> 1) * 10; b.box(x, 0, z, 11, .3, 9, 0x8a7a5a); b.box(x, .3, z, 9.6, .3, 7.6, 0x4f9cc4); const g = b.group(x, .8, z); const m = new THREE.Mesh(new THREE.BoxGeometry(U * 3, U * .4, U * .4), new THREE.MeshLambertMaterial({ color: 0xffffff })); g.add(m); wheels.push(g); }
      b.anim(t => wheels.forEach(g => g.rotation.y = t * 3)); } },
  { name: '永安天然氣接收站', d: '永安區', at: [22.818, 120.205], desc: '永安海邊的液化天然氣儲槽。',
    build(b) { for (let k = 0; k < 4; k++) { const x = -7 + (k % 2) * 14, z = -6 + (k >> 1) * 12; for (let q = 0; q < 3; q++) b.box(x, q * 3, z, 9 - (q === 2 ? 2 : 0), 3, 9 - (q === 2 ? 2 : 0), 0xf3f5f7); } } },
  { name: '興達港・情人碼頭', d: '茄萣區', at: [22.865, 120.215], desc: '茄萣的興達港與情人碼頭木棧道。',
    build(b) { b.box(0, 0, 0, 22, .6, 3, 0xa0754b); b.box(10, .6, 0, 3, 5, .6, 0xd94f70); b.box(10, 5.6, 0, 1.5, 1.5, .6, 0xd94f70);
      for (let k = 0; k < 2; k++) { const g = b.group(-4 + k * 8, .2, 6); g.add(boatMesh(0xffffff, 0x3c9a8f)); b.anim(t => g.position.y = (.2 + Math.sin(t * 2 + k * 2) * .25) * U); } } },
  { name: '二仁溪', d: '湖內區', at: [22.902, 120.226], desc: '湖內北邊的二仁溪，是高雄與台南的界河。',
    build(b) { b.box(0, 0, 0, 30, .5, 4, 0x4f9cc4); b.box(0, .5, 0, 3, 1.4, 10, 0xb7bcc2); } },
  { name: '路竹科學園區', d: '路竹區', at: [22.836, 120.268], desc: '南科高雄園區（路竹園區）。',
    build(b) { b.box(-6, 0, 0, 10, 4, 14, 0xf3f5f7); b.box(6, 0, -2, 10, 6, 10, 0xe2e8ee); b.box(6, 6, -2, 8, 1, 8, 0x9fb2c4); b.box(-6, 4, 0, 8, .8, 12, 0x9fb2c4); } },
  { name: '大崗山・超峰寺', d: '阿蓮區', at: [22.826, 120.345], desc: '阿蓮的大崗山與山上的超峰寺。',
    build(b) { for (let k = 0; k < 5; k++) b.box(0, k * 2, 0, 18 - k * 3, 2, 14 - k * 2.4, 0x4c8a3a); b.box(0, 10, 0, 5, 2, 3, 0xf0e2c0); b.box(0, 12, 0, 6, 1, 4, 0xc8402f); } },
  { name: '月世界', d: '田寮區', at: [22.880, 120.390], desc: '田寮的泥岩惡地地形，光禿灰白的山丘。',
    build(b) { const r = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(3);
      for (let k = 0; k < 14; k++) { const x = (r() - .5) * 26, z = (r() - .5) * 20, h = 2 + r() * 6; for (let q = 0; q < h; q += 1.5) b.box(x, q, z, 5 - q * .5, 1.5, 4 - q * .4, q % 3 ? 0xb9b5ab : 0xcfcac0); } } },
  { name: '燕巢泥火山', d: '燕巢區', at: [22.791, 120.385], desc: '燕巢的泥火山；燕巢也是芭樂產地。',
    build(b) { for (let k = 0; k < 4; k++) b.box(0, k * 1.2, 0, 12 - k * 3, 1.2, 12 - k * 3, 0x8d8072); b.box(0, 4.8, 0, 1.6, .2, 1.6, 0x5b5148);
      const bub = b.group(0, 5, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(U, U, U), new THREE.MeshLambertMaterial({ color: 0x7a6e62 })); bub.add(m);
      b.anim(t => { const p = (t * .6) % 1; m.position.y = p * U * 3; m.scale.setScalar(1 - p * .7); });
      for (let k = 0; k < 3; k++) b.box(10 + k * 3, 0, 6, 2.2, 2.2, 2.2, 0x9ccc5a); } },
  { name: '旗山車站・香蕉', d: '旗山區', at: [22.888, 120.483], desc: '旗山舊火車站（糖鐵車站）；旗山以香蕉聞名。',
    build(b) { b.box(0, 0, 0, 10, 4, 6, 0xf5f0e4); b.box(0, 4, 0, 10.6, 1, 6.6, 0x6d7b8a); b.box(-3, 5, 0, 2, 3, 2, 0xf5f0e4); b.box(-3, 8, 0, 2.4, 1.6, 2.4, 0x6d7b8a);
      for (let k = 0; k < 5; k++) b.box(9 + k * .6, 1 + k * 1.2, 4, 1.6, 1.2, 1.6, 0xf6d32d); b.box(12, 7, 4, .8, .8, .8, 0x5c7a2a); } },
  { name: '美濃菸樓・油紙傘', d: '美濃區', at: [22.903, 120.545], desc: '美濃客庄的菸樓與油紙傘。',
    build(b) { b.box(0, 0, 0, 8, 5, 6, 0xf1e6d4); b.box(0, 5, 0, 8.6, 1, 6.6, 0x4d4d52); b.box(0, 6, 0, 3, 3, 3, 0xf1e6d4); b.box(0, 9, 0, 4, 1, 4, 0x4d4d52);
      const cols = [0xe85d2a, 0xf2c14e, 0x3c9a8f]; cols.forEach((c, k) => { const x = 8 + k * 5; b.box(x, 0, 6, .4, 4, .4, 0x6b4a2b); b.box(x, 4, 6, 4, .5, 4, c); b.box(x, 4.5, 6, 2, .5, 2, c); }); } },
  { name: '紫竹寺・宋江陣', d: '內門區', at: [22.947, 120.476], desc: '內門南海紫竹寺；內門宋江陣是知名的民俗陣頭。',
    build(b) { b.box(0, 0, 0, 14, 1, 10, 0xd8c8a8); b.box(0, 1, 0, 10, 4, 6, 0xc8402f); b.box(0, 5, 0, 12, 1, 8, 0x2f6b3a); b.box(0, 6, 0, 8, 1.4, 5, 0xf3d24b); b.box(-6, 6.6, 0, 1, 1, 1, 0xf3d24b); b.box(6, 6.6, 0, 1, 1, 1, 0xf3d24b); } },
  { name: '楠梓仙溪', d: '杉林區', at: [22.970, 120.530], desc: '流經杉林的楠梓仙溪。',
    build(b) { for (let k = 0; k < 8; k++) b.box(Math.sin(k * .8) * 4, 0, -18 + k * 5, 5, .5, 5.5, 0x4f9cc4); b.box(8, 0, 0, 6, 3, 5, 0xf1e6d4); b.box(8, 3, 0, 6.6, 1, 5.6, 0x7a3b2e); } },
  { name: '甲仙芋頭', d: '甲仙區', at: [23.083, 120.588], desc: '甲仙以芋頭和芋冰聞名。',
    build(b) { b.box(0, 0, 0, 6, 6, 6, 0x9b7bb5); b.box(0, 6, 0, 4, 2, 4, 0x8a6aa5); b.box(0, 8, 0, 1, 4, 1, 0x4c8a3a); b.box(1.5, 11, 0, 3, .4, 2, 0x5f9e45); b.box(-1.5, 10, 0, 3, .4, 2, 0x5f9e45); } },
  { name: '十八羅漢山・溫泉', d: '六龜區', at: [22.975, 120.632], desc: '六龜的十八羅漢山；寶來、不老一帶有溫泉。',
    build(b) { const r = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(9);
      for (let k = 0; k < 9; k++) { const x = (k % 3 - 1) * 7 + (r() - .5) * 2, z = ((k / 3 | 0) - 1) * 7, h = 5 + r() * 6; for (let q = 0; q < h; q += 2) b.box(x, q, z, 4.5 - q * .35, 2, 4.5 - q * .35, 0x4c7a36); }
      const steam = b.group(14, 1, 6); const ms = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(U * 1.2, U * 1.2, U * 1.2), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .6 })); steam.add(m); return m; });
      b.box(14, 0, 6, 6, .5, 5, 0x7fc8d8);
      b.anim(t => ms.forEach((m, k) => { const p = (t * .3 + k / 3) % 1; m.position.set(0, p * U * 6, 0); m.material.opacity = .6 * (1 - p); })); } },
  { name: '紫蝶幽谷', d: '茂林區', at: [22.886, 120.660], desc: '茂林冬天有大量紫斑蝶聚集過冬。',
    build(b) { b.box(0, 0, 0, 16, 1, 12, 0x3f7a35); const g = b.group(0, 4, 0); const bs = [];
      for (let k = 0; k < 18; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(U * .9, U * .1, U * .5), new THREE.MeshBasicMaterial({ color: k % 3 ? 0x8a5bd8 : 0x5a3fa8 })); g.add(m); bs.push([m, Math.random() * 6, 2 + Math.random() * 6]); }
      b.anim(t => bs.forEach(([m, p, r], k) => { m.position.set(Math.cos(t * .5 + p) * r * U, (Math.sin(t * 1.3 + p) * 2 + 2) * U, Math.sin(t * .7 + p) * r * U); m.scale.z = .3 + Math.abs(Math.sin(t * 14 + k)); })); } },
  { name: '南橫梅山口', d: '桃源區', at: [23.275, 120.830], desc: '桃源區南橫公路與梅山，往玉山國家公園。',
    build(b) { for (let k = 0; k < 7; k++) b.box(0, k * 2.4, 0, 20 - k * 2.8, 2.4, 18 - k * 2.5, k > 4 ? 0x9a9a9a : 0x456f34); b.box(0, 16.8, 0, 2.4, 1, 2.4, 0xffffff);
      for (let k = 0; k < 6; k++) b.box(-9 + k * 3, 1 + k * .4, 10 - (k % 2) * 2, 3, .3, 1.2, 0x5b5f66); } },
  { name: '那瑪夏部落', d: '那瑪夏區', at: [23.240, 120.705], desc: '那瑪夏的原住民族部落。',
    build(b) { for (let k = 0; k < 4; k++) { const x = -8 + k * 5; b.box(x, 0, 0, 4, 3, 4, 0x9c7a54); b.box(x, 3, 0, 4.6, 1, 4.6, 0x5a4636); b.box(x, 4, 0, 2.4, 1, 2.4, 0x5a4636); } b.box(0, 0, 7, 24, .5, 3, 0x4f9cc4); } },
];

function boatMesh(hull, cabin) {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.BoxGeometry(U * 5, U * 1.2, U * 2), new THREE.MeshLambertMaterial({ color: hull })); h.castShadow = true;
  const c = new THREE.Mesh(new THREE.BoxGeometry(U * 2, U * 1.2, U * 1.6), new THREE.MeshLambertMaterial({ color: cabin })); c.position.set(-U * .8, U * 1.2, 0);
  g.add(h, c); return g;
}
function planeMesh() {
  const g = new THREE.Group(); const w = new THREE.MeshLambertMaterial({ color: 0xffffff }), t = new THREE.MeshLambertMaterial({ color: 0x2a6fb5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(U * 1.4, U * 1.4, U * 9), w);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(U * 9, U * .3, U * 2), w);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(U * .3, U * 2, U * 1.4), t); tail.position.set(0, U * 1.5, U * 3.6);
  g.add(body, wing, tail); g.children.forEach(m => m.castShadow = true); return g;
}

// 建立所有地標
export function buildLandmarks(scene, world) {
  const boxes = []; const glows = []; const anims = []; const items = [];
  for (const L of LANDMARKS) {
    const a = world.anchor(L.at[0], L.at[1], L.d);
    const y0 = world.topAt(a.x, a.z);
    const root = new THREE.Group(); root.position.set(a.x, y0, a.z); scene.add(root);
    const item = { ...L, x: a.x, z: a.z, y: y0, di: a.di, root, top: 0 };
    const b = {
      box: (x, y, z, w, h, d, c) => { boxes.push({ item, x, y, z, w, h, d, c }); item.top = Math.max(item.top, y + h); },
      glow: (x, y, z, w, h, d, c) => { glows.push({ item, x, y, z, w, h, d, c }); item.top = Math.max(item.top, y + h); },
      group: (x, y, z) => { const g = new THREE.Group(); g.position.set(x * U, y * U, z * U); root.add(g); return g; },
      anim: fn => anims.push(fn),
    };
    L.build(b);
    if (b.stage) item.stage = { x: a.x + b.stage[0] * U, z: a.z + b.stage[1] * U };
    items.push(item);
  }
  // 靜態方塊合成一個 InstancedMesh
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), boxes.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const owner = [];
  boxes.forEach((q, n) => {
    m4.makeScale(q.w * U, q.h * U, q.d * U);
    m4.setPosition(q.item.x + q.x * U, q.item.y + (q.y + q.h / 2) * U, q.item.z + q.z * U);
    mesh.setMatrixAt(n, m4); mesh.setColorAt(n, col.set(q.c)); owner[n] = q.item;
  });
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const gm = new THREE.InstancedMesh(geo, glowMat, Math.max(1, glows.length));
  glows.forEach((q, n) => { m4.makeScale(q.w * U, q.h * U, q.d * U); m4.setPosition(q.item.x + q.x * U, q.item.y + (q.y + q.h / 2) * U, q.item.z + q.z * U); gm.setMatrixAt(n, m4); gm.setColorAt(n, col.set(q.c)); });
  scene.add(gm);
  const lastLift = new Float32Array(64);
  function applyLift(liftOf) {
    let dirty = false;
    for (const it of items) { if (!it.root) continue; const l = liftOf(it.di); if (l !== lastLift[it.di]) { it.root.position.y = it.y + l; } }
    boxes.forEach((q, n) => { const l = liftOf(q.item.di); if (l === lastLift[q.item.di]) return; mesh.getMatrixAt(n, m4); m4.elements[13] = q.item.y + (q.y + q.h / 2) * U + l; mesh.setMatrixAt(n, m4); dirty = true; });
    glows.forEach((q, n) => { const l = liftOf(q.item.di); if (l === lastLift[q.item.di]) return; gm.getMatrixAt(n, m4); m4.elements[13] = q.item.y + (q.y + q.h / 2) * U + l; gm.setMatrixAt(n, m4); dirty = true; });
    for (const it of items) lastLift[it.di] = liftOf(it.di);
    if (dirty) { mesh.instanceMatrix.needsUpdate = true; gm.instanceMatrix.needsUpdate = true; }
  }
  // 實心方塊的佔地（貼地的草皮、步道不算；水池算，避免走在水上）
  const footprints = () => boxes.filter(q => q.y + q.h > .9 && q.y < 3).map(q => {
    const cx = q.item.x + q.x * U, cz = q.item.z + q.z * U, hw = q.w * U / 2, hd = q.d * U / 2;
    return [cx - hw, cz - hd, cx + hw, cz + hd];
  });
  return {
    items, mesh, owner, applyLift, footprints,
    update: t => anims.forEach(f => f(t)),
    setNight: on => { glowMat.color.setScalar(on ? 1.6 : 1); scene.traverse(o => { if (o.userData.glow && o.material) o.material.emissive.set(on ? o.material.color : 0x000000); }); },
  };
}
