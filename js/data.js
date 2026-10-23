// 資料層：有設定 Supabase 就讀資料庫，否則讀 data/seed.json
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export const hasBackend = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let client = null;

export async function getClient() {
  if (!hasBackend) return null;
  if (client) return client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export async function loadSeed() {
  const res = await fetch(new URL('../data/seed.json', import.meta.url));
  return (await res.json()).map((r, i) => ({ id: 'seed-' + i, published: true, ...r }));
}

export async function loadPolicies() {
  if (!hasBackend) return { rows: await loadSeed(), from: 'seed' };
  try {
    const sb = await getClient();
    const { data, error } = await sb.from('policies').select('*').order('sort').order('created_at');
    if (error) throw error;
    if (!data.length) return { rows: await loadSeed(), from: 'seed' };
    return { rows: data, from: 'db' };
  } catch (e) {
    console.warn('讀取資料庫失敗，改用內建資料', e);
    return { rows: await loadSeed(), from: 'seed' };
  }
}

export const REGION_KEYS = {
  _north: '北高雄', _east: '東高雄', _core: '市中心', _port: '港區・南高雄', _city: '全市',
};
export const CATEGORIES = ['交通', '產業', '建設', '生活', '育兒', '長照', '醫療', '防災', '觀光', '農業', '文化', '教育', '青年', '寵物', '運動'];
