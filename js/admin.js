import { hasBackend, getClient, loadSeed, REGION_KEYS, CATEGORIES } from './data.js';
import { TERRAIN } from '../data/terrain.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const msg = (t, err) => { $('msg').innerHTML = t ? `<div class="msg ${err ? 'err' : ''}">${esc(t)}</div>` : ''; };
const RG = { north: '北高雄', east: '東高雄', core: '市中心', port: '港區・南高雄' };
const label = k => REGION_KEYS[k] ? REGION_KEYS[k] + '（整體）' : k;

let sb = null, rows = [], editing = null;

// 範圍選擇：全市、四個區域、38 區
function buildDistrictPicker() {
  let h = `<div class="rg">全市與區域</div>` + Object.keys(REGION_KEYS).map(k => `<label><input type="checkbox" value="${k}"> ${esc(label(k))}</label>`).join('');
  for (const r of Object.keys(RG)) {
    h += `<div class="rg">${RG[r]}</div>` + TERRAIN.names.filter((n, i) => TERRAIN.region[i] === r).map(n => `<label><input type="checkbox" value="${n}"> ${n.replace('區', '')}</label>`).join('');
  }
  $('e_d').innerHTML = h;
  $('fd').innerHTML = `<option value="">全部</option>` + Object.keys(REGION_KEYS).map(k => `<option value="${k}">${esc(label(k))}</option>`).join('') + TERRAIN.names.map(n => `<option>${n}</option>`).join('');
  $('e_cat').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
}

function render() {
  const fd = $('fd').value, fq = $('fq').value.trim();
  const list = rows.filter(r => (!fd || (r.districts || []).includes(fd)) && (!fq || (r.title + r.body).includes(fq)));
  $('count').textContent = `共 ${rows.length} 條，顯示 ${list.length} 條`;
  $('seed').hidden = rows.length > 0;
  $('list').innerHTML = list.map(r => `<div class="item ${r.published ? '' : 'off'}">
      <div><h3>${esc(r.title)}</h3>
        <div class="m">${esc(r.category)}・${r.display === 'link' ? '新聞連結' : '直接顯示'}・${(r.districts || []).map(label).join('、')}${r.published ? '' : '・未發布'}<br>${esc(r.source_name)} ${esc(r.source_date)} ${r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">連結</a>` : ''}</div></div>
      <button class="btn small" type="button" data-id="${r.id}">編輯</button></div>`).join('') || '<p>沒有符合的資料。</p>';
}

async function refresh() {
  const { data, error } = await sb.from('policies').select('*').order('sort').order('created_at');
  if (error) { msg('讀取失敗：' + error.message, true); return; }
  rows = data; render();
}

function openEditor(r) {
  editing = r || null;
  $('dt').textContent = r ? '編輯政見' : '新增政見';
  $('e_title').value = r?.title || ''; $('e_body').value = r?.body || '';
  $('e_cat').value = r?.category || '生活'; $('e_src').value = r?.source_name || ''; $('e_date').value = r?.source_date || '';
  $('e_url').value = r?.source_url || ''; $('e_kind').value = r?.kind || 'news'; $('e_sort').value = r?.sort ?? (rows.length ? Math.max(...rows.map(x => x.sort || 0)) + 1 : 0);
  $('e_pub').checked = r ? !!r.published : true;
  document.querySelectorAll('input[name=disp]').forEach(i => i.checked = i.value === (r?.display || 'full'));
  document.querySelectorAll('#e_d input').forEach(i => i.checked = (r?.districts || []).includes(i.value));
  $('del').hidden = !r; $('del').textContent = '刪除'; $('del').dataset.armed = '';
  $('emsg').innerHTML = '';
  $('dlg').showModal();
}

async function save(e) {
  e.preventDefault();
  const districts = [...document.querySelectorAll('#e_d input:checked')].map(i => i.value);
  if (!districts.length) { $('emsg').innerHTML = '<div class="msg err">請至少勾選一個適用範圍。</div>'; return; }
  const rec = {
    title: $('e_title').value.trim(), body: $('e_body').value.trim(), category: $('e_cat').value,
    source_name: $('e_src').value.trim(), source_date: $('e_date').value.trim(), source_url: $('e_url').value.trim(),
    kind: $('e_kind').value, sort: +$('e_sort').value || 0, published: $('e_pub').checked,
    display: document.querySelector('input[name=disp]:checked').value, districts,
  };
  if (rec.display === 'link' && !rec.source_url) { $('emsg').innerHTML = '<div class="msg err">選「標題＋新聞連結」時需要填來源連結。</div>'; return; }
  $('save').disabled = true;
  const q = editing ? sb.from('policies').update(rec).eq('id', editing.id) : sb.from('policies').insert(rec);
  const { error } = await q; $('save').disabled = false;
  if (error) { $('emsg').innerHTML = `<div class="msg err">儲存失敗：${esc(error.message)}（若是權限錯誤，確認你的 email 在 admins 表裡）</div>`; return; }
  $('dlg').close(); msg(editing ? '已更新。' : '已新增。'); refresh();
}

async function del() {
  const b = $('del');
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '再按一次確認刪除'; return; }
  const { error } = await sb.from('policies').delete().eq('id', editing.id);
  if (error) { $('emsg').innerHTML = `<div class="msg err">刪除失敗：${esc(error.message)}</div>`; return; }
  $('dlg').close(); msg('已刪除。'); refresh();
}

async function importSeed() {
  const seed = (await loadSeed()).map(({ id, ...r }) => r);
  $('seed').disabled = true;
  const { error } = await sb.from('policies').insert(seed);
  $('seed').disabled = false;
  if (error) { msg('匯入失敗：' + error.message, true); return; }
  msg(`已匯入 ${seed.length} 條初始資料。`); refresh();
}

async function afterLogin(session) {
  const email = session.user.email;
  const { data } = await sb.from('admins').select('email').eq('email', email.toLowerCase());
  if (!data?.length) { msg(`${email} 不在管理員名單裡。請在 Supabase 的 admins 表加入這個 email。`, true); $('login').hidden = false; return; }
  $('login').hidden = true; $('app').hidden = false; $('out').hidden = false; msg('');
  refresh();
}

async function main() {
  buildDistrictPicker();
  if (!hasBackend) { $('setup').hidden = false; return; }
  sb = await getClient();
  const { data: { session } } = await sb.auth.getSession();
  if (session) afterLogin(session); else $('login').hidden = false;
  $('lf').addEventListener('submit', async e => {
    e.preventDefault();
    const { data, error } = await sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value });
    if (error) { msg('登入失敗：' + error.message, true); return; }
    afterLogin(data.session);
  });
  $('out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $('fd').onchange = render; $('fq').oninput = render;
  $('add').onclick = () => openEditor(null);
  $('seed').onclick = importSeed;
  $('list').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openEditor(rows.find(r => r.id === b.dataset.id)); });
  $('ef').addEventListener('submit', save);
  $('cancel').onclick = () => $('dlg').close();
  $('del').onclick = del;
}
main();
