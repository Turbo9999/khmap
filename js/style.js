// 畫面風格：'round'（圓潤、動森風）或 'voxel'（方塊）。存在瀏覽器，網址加 ?style=voxel 也可以切換。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let s = 'round';
try { s = localStorage.getItem('khmap-style') || 'round'; } catch (e) {}
const q = new URLSearchParams(location.search).get('style');
if (q === 'round' || q === 'voxel') s = q;
export const STYLE = s;
export const ROUND = s === 'round';
document.documentElement.classList.toggle('round', ROUND);

export function setStyle(v) {
  try { localStorage.setItem('khmap-style', v); } catch (e) {}
  const u = new URL(location.href); u.searchParams.delete('style'); location.href = u.toString();
}

// 單位方塊：圓潤風用圓角
const unitCache = new Map();
export function unitBox(r = .18) {
  if (!ROUND) return new THREE.BoxGeometry(1, 1, 1);
  if (!unitCache.has(r)) unitCache.set(r, new RoundedBoxGeometry(1, 1, 1, 2, r));
  return unitCache.get(r);
}
// 指定尺寸的方塊（小人、配件用）
const sizeCache = new Map();
export function sizedBox(w, h, d, round = .34) {
  if (!ROUND) return new THREE.BoxGeometry(w, h, d);
  const key = [w, h, d, round].map(v => v.toFixed(5)).join(',');
  if (!sizeCache.has(key)) sizeCache.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * round));
  return sizeCache.get(key);
}
// 圓潤風的顏色稍微粉嫩一點
const WHITE = new THREE.Color(0xffffff);
export function tone(hex, k = .2) {
  const c = new THREE.Color(hex);
  if (!ROUND) return c;
  c.lerp(WHITE, k);
  const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 1.08), hsl.l);
  return c;
}

// 圓潤風的可愛臉：圓點眼睛、腮紅、小嘴巴
export function cuteFace({ skin = '#f6d3b3', hair = '#3b2618', glasses = false, sunglasses = false, beard = false, opera = false, eye = '#2b1d14', bangs = true } = {}) {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = opera ? '#fbf3ea' : skin; g.fillRect(0, 0, S, S);
  if (bangs) { g.fillStyle = hair; g.beginPath(); g.ellipse(S / 2, 2, S * .62, S * .26, 0, 0, Math.PI * 2); g.fill(); }
  if (opera) { g.fillStyle = 'rgba(232,80,106,.8)'; g.beginPath(); g.ellipse(S * .27, S * .5, 11, 13, 0, 0, 7); g.ellipse(S * .73, S * .5, 11, 13, 0, 0, 7); g.fill();
    g.strokeStyle = '#1d1d1d'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 22); g.lineTo(26, 18); g.moveTo(54, 22); g.lineTo(38, 18); g.stroke(); }
  // 腮紅
  if (!opera && !beard) { g.fillStyle = 'rgba(255,120,140,.45)'; g.beginPath(); g.ellipse(S * .22, S * .64, 7, 4.5, 0, 0, 7); g.ellipse(S * .78, S * .64, 7, 4.5, 0, 0, 7); g.fill(); }
  // 眼睛
  if (sunglasses) { g.fillStyle = '#151515'; g.beginPath(); g.ellipse(S * .32, S * .48, 10, 8, 0, 0, 7); g.ellipse(S * .68, S * .48, 10, 8, 0, 0, 7); g.fill(); g.fillRect(S * .32, S * .44, S * .36, 3);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(S * .25, S * .42, 4, 3); g.fillRect(S * .61, S * .42, 4, 3); }
  else {
    g.fillStyle = eye; g.beginPath(); g.ellipse(S * .32, S * .5, 5, 6.5, 0, 0, 7); g.ellipse(S * .68, S * .5, 5, 6.5, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(S * .32 + 1.5, S * .5 - 2.5, 1.8, 0, 7); g.arc(S * .68 + 1.5, S * .5 - 2.5, 1.8, 0, 7); g.fill();
    if (glasses) { g.strokeStyle = '#222'; g.lineWidth = 2.5; g.beginPath(); g.arc(S * .32, S * .5, 10, 0, 7); g.moveTo(S * .68 + 10, S * .5); g.arc(S * .68, S * .5, 10, 0, 7); g.moveTo(S * .32 + 10, S * .5); g.lineTo(S * .68 - 10, S * .5); g.stroke(); }
  }
  if (beard) { g.fillStyle = '#f4f4f4'; g.beginPath(); g.ellipse(S / 2, S * .9, S * .42, S * .26, 0, 0, 7); g.fill(); g.fillStyle = '#e9e9e9'; g.fillRect(S * .3, S * .66, S * .4, 5); }
  // 嘴巴
  g.strokeStyle = opera ? '#c0392b' : '#8c3b32'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.arc(S / 2, S * (beard ? .66 : .66), 5, .15 * Math.PI, .85 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
