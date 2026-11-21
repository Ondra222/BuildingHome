'use strict';
{
/* ---------- úložiště: IndexedDB (data + fotky), záložně localStorage ---------- */
const DB = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('stavba-domu', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (store, mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode), q = fn(t.objectStore(store));
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
  }));
  return {
    get: (s, k) => tx(s, 'readonly', o => o.get(k)),
    put: (s, k, v) => tx(s, 'readwrite', o => o.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', o => o.delete(k)),
  };
})();

let S = null, idbOk = true, toastT = null;
const urls = {};
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kc = n => new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 0}).format(n || 0) + ' Kč';
const dt = d => d ? new Date(d + 'T12:00').toLocaleDateString('cs-CZ', {day: 'numeric', month: 'numeric', year: 'numeric'}) : '–';
const today = new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);
const stage = id => S.stages.find(s => s.id === id), who = id => S.contacts.find(c => c.id === id);
const cur = () => S.stages.find(s => !s.done);
const spent = f => S.expenses.filter(f || (() => 1)).reduce((a, e) => a + (+e.amount || 0), 0);
const plan = () => S.stages.reduce((a, s) => a + (+s.plan || 0), 0);
const allSteps = () => STEPS.flatMap(p => p.steps.map(s => ({ph: p, id: s[0], t: s[1], n: s[2]})));
const nextStep = () => allSteps().find(s => !S.steps[s.id]);

async function load() {
  let st = null;
  try { st = await DB.get('kv', 'state'); } catch (e) { idbOk = false; }
  if (!st) try { st = JSON.parse(localStorage.getItem('stavba-domu') || 'null'); } catch (e) {}
  S = st || structuredClone(window.SAMPLE);
  S.steps ||= {};
  if (S.sample && !st) for (const s of allSteps()) if (/^p[123]/.test(s.id) || ['p4a', 'p4b', 'p4c'].includes(s.id)) S.steps[s.id] = true;
}
function save() {
  S.savedAt = Date.now();
  const copy = JSON.parse(JSON.stringify(S));
  (idbOk ? DB.put('kv', 'state', copy) : Promise.reject()).catch(() => {
    try { localStorage.setItem('stavba-domu', JSON.stringify(S)); } catch (e) { toast('Data se nepodařilo uložit – zkopírujte si zálohu.'); }
  });
  render();
}

/* ---------- výkres domu ---------- */
function house() {
  const st = p => { const s = S.stages.find(x => x.part === p); if (!s) return 'g'; if (s.done) return 'd'; return s === cur() ? 'n' : 'g'; };
  const f = (p, fill) => ({d: `fill="${fill}"`, n: 'class="nowpart"', g: 'class="ghostpart"'})[st(p)];
  const fas = st('fasada') === 'd', wall = fas ? 'var(--wall2)' : 'var(--wall)';
  let bricks = '';
  if (st('zdi') === 'd' && !fas) for (let y = 142; y < 226; y += 12) bricks += `<line x1="78" x2="322" y1="${y}" y2="${y}" stroke="var(--bg)" stroke-width="1.5" opacity=".7"/>`;
  const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${f('okna', 'var(--glass)')} rx="2"/>` + (st('okna') === 'd' ? `<line x1="${x + w / 2}" x2="${x + w / 2}" y1="${y}" y2="${y + h}" stroke="var(--wall2)" stroke-width="3"/>` : '');
  const done = st('hotovo') === 'd';
  return `<svg class="house" viewBox="0 0 400 290" role="img" aria-label="Výkres domu podle hotových etap">
  <rect x="0" y="242" width="400" height="48" fill="var(--panel)"/>
  <line x1="0" x2="400" y1="242" y2="242" stroke="var(--line)" stroke-width="2"/>
  ${[30, 370].map(x => `<line x1="${x}" x2="${x}" y1="226" y2="248" stroke="var(--acc)" stroke-width="3"/><line x1="${x - 10}" x2="${x + 10}" y1="230" y2="230" stroke="var(--acc)" stroke-width="2"/>`).join('')}
  <rect x="62" y="226" width="276" height="16" ${f('zaklady', 'var(--conc)')}/>
  <rect x="78" y="132" width="244" height="94" ${f('zdi', wall)}/>${bricks}
  ${fas ? '<rect x="78" y="212" width="244" height="14" fill="var(--acc)"/>' : ''}
  <polygon points="58,134 200,48 342,134" ${f('strecha', 'var(--roof)')}/>
  ${st('strecha') === 'd' ? '<polyline points="58,134 200,48 342,134" fill="none" stroke="var(--acc)" stroke-width="3"/><rect x="262" y="62" width="20" height="44" fill="var(--roof)"/>' : ''}
  ${win(102, 152, 44, 40)}${win(254, 152, 44, 40)}<rect x="176" y="160" width="48" height="66" ${f('okna', 'var(--roof)')} rx="2"/>${win(184, 92, 32, 26)}
  ${done ? '<circle cx="370" cy="190" r="24" fill="#5a8f4e"/><circle cx="352" cy="204" r="16" fill="#6fa35f"/><rect x="367" y="205" width="6" height="37" fill="#6b4a2f"/>' : ''}
  <text x="200" y="272" text-anchor="middle" font-size="13" fill="var(--mute)" font-family="Archivo,system-ui,sans-serif">${done ? 'Hotovo – vítejte doma' : (cur() ? 'Probíhá: ' + esc(cur().name) : '')}</text></svg>`;
}

/* ---------- pohledy ---------- */
const TABS = [['prehled', 'Přehled'], ['postup', 'Postup'], ['rozpocet', 'Rozpočet'], ['harmonogram', 'Harmonogram'], ['remeslnici', 'Řemeslníci'], ['denik', 'Deník']];
const view = () => TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'prehled';

function hero() {
  const p = plan(), sp = spent(), all = allSteps(), dn = all.filter(s => S.steps[s.id]).length;
  const unpaid = S.expenses.filter(e => !e.paid), c = cur();
  return `<header class="band"><div class="wrap hero"><div>
  <h1 id="nm" tabindex="0" title="Klepněte pro přejmenování">${esc(S.name)}</h1>
  <div class="mute">${S.stages.filter(s => s.done).length} z ${S.stages.length} etap stavby hotovo${c ? ' · teď: ' + esc(c.name) : ''}</div>
  <div class="stats">
   <div class="stat"><b>${Math.round(dn / all.length * 100)}&nbsp;%</b><span>kroků postupu splněno</span></div>
   <div class="stat"><b>${kc(sp)}</b><span>utraceno z ${kc(p)}</span></div>
   <div class="stat"><b>${c ? dt(c.end) : '–'}</b><span>${c ? 'konec aktuální etapy' : 'vše dokončeno'}</span></div>
   <div class="stat"><b style="${unpaid.length ? 'color:var(--bad)' : ''}">${kc(spent(e => !e.paid))}</b><span>${unpaid.length} ${unpaid.length===1?'nezaplacená faktura':unpaid.length>1&&unpaid.length<5?'nezaplacené faktury':'nezaplacených faktur'}</span></div>
  </div>
  <div class="meter" style="margin-top:16px"><i class="${sp > p ? 'over' : ''}" style="width:${p ? Math.min(100, sp / p * 100) : 0}%"></i></div>
  </div>${house()}</div></header>`;
}

function vPrehled() {
  const c = cur(), ns = nextStep(), last = [...S.diary].sort((a, b) => b.date.localeCompare(a.date))[0];
  const unpaid = S.expenses.filter(e => !e.paid);
  return `<h2>Co je teď na řadě</h2>
  ${ns ? `<div class="stage cur"><div class="mute">Další krok · ${esc(ns.ph.name)}</div><b>${esc(ns.t)}</b>${ns.n ? `<div class="mute">${esc(ns.n)}</div>` : ''}
   <div class="row" style="margin-top:8px;justify-content:flex-start"><button data-step="${ns.id}">Hotovo</button><a href="#postup">Celý postup →</a></div></div>` : ''}
  ${c ? `<div class="stage"><div class="row"><b>${esc(c.name)}</b><span class="tag now">${dt(c.start)} – ${dt(c.end)}</span></div>
   <ul class="tasks">${c.tasks.filter(t => !t.d).map(t => `<li><span>☐ ${esc(t.t)}</span></li>`).join('') || '<li class="mute">Žádné otevřené úkoly.</li>'}</ul>
   <a class="mute" href="#harmonogram">Otevřít harmonogram →</a></div>` : ''}
  ${unpaid.length ? `<h2 style="margin-top:28px">K zaplacení</h2><ul class="list">${unpaid.map(expLi).join('')}</ul>` : ''}
  <h2 style="margin-top:28px">Poslední zápis v deníku</h2>
  ${last ? `<ul class="list">${diaryLi(last)}</ul>` : '<div class="empty">Zatím žádný zápis. <a href="#denik">Přidat první</a></div>'}
  <h2 style="margin-top:36px">Data</h2>
  <p class="mute">Vše se ukládá jen v tomto prohlížeči. ${S.sample ? 'Teď vidíte ukázková data – až začnete naostro, vymažte je (etapy a postup zůstanou).' : 'Pravidelně si stáhněte zálohu.'}</p>
  <div class="row" style="justify-content:flex-start">${S.sample ? '<button id="clr">Vymazat ukázková data</button>' : ''}<button class="ghost" id="exp">Stáhnout zálohu</button><label class="btn ghost" style="margin:0;background:transparent;color:var(--ink);border-color:var(--line)">Obnovit ze zálohy<input type="file" id="imp" accept="application/json,.json" hidden></label></div>`;
}

function vPostup() {
  const ns = nextStep();
  return `<h2>Postup krok za krokem</h2>
  <div class="note">Obecný přehled pro rodinný dům podle stavebního zákona č. 283/2021 Sb. (stav k listopadu 2026). Novela schválená v září 2026 mění povolování od roku 2028. Lhůty, poplatky a potřebné doklady si vždy ověřte na svém stavebním úřadě.</div>
  ${STEPS.map((p, i) => {
    const d = p.steps.filter(s => S.steps[s[0]]).length, all = d === p.steps.length, now = ns && ns.ph === p;
    return `<details class="phase ${all ? 'ok' : now ? 'now' : ''}" ${now ? 'open' : ''}>
    <summary><span class="num">${all ? '✓' : i + 1}</span><b>${esc(p.name)}</b><span class="mute">${d}/${p.steps.length}</span>
    <div class="meter"><i style="width:${d / p.steps.length * 100}%"></i></div></summary>
    <ul class="steps">${p.steps.map(s => `<li class="${S.steps[s[0]] ? 'd' : ''}"><label class="chk"><input type="checkbox" data-st="${s[0]}" ${S.steps[s[0]] ? 'checked' : ''}><b>${esc(s[1])}</b></label>${s[2] ? `<small>${esc(s[2])}</small>` : ''}</li>`).join('')}</ul></details>`;
  }).join('')}`;
}

const expLi = e => { const s = stage(e.stage), w = who(e.who); return `<li class="item" tabindex="0" data-exp="${e.id}"><div><b>${esc(e.desc)}</b> ${e.paid ? '' : '<span class="tag unpaid">nezaplaceno</span>'}<div class="mute">${dt(e.date)}${s ? ' · ' + esc(s.name) : ''}${w ? ' · ' + esc(w.name) : ''}</div></div><div class="amt">${kc(e.amount)}</div></li>`; };

function vRozpocet() {
  const p = plan(), sp = spent(), ex = [...S.expenses].sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="row"><h2>Rozpočet</h2><button id="addExp">+ Výdaj</button></div>
  <p>Utraceno <b>${kc(sp)}</b> z plánovaných <b>${kc(p)}</b> · zbývá <b style="${p - sp < 0 ? 'color:var(--bad)' : ''}">${kc(p - sp)}</b></p>
  <div class="cats">${S.stages.map(s => { const a = spent(e => e.stage === s.id), pl = +s.plan || 0; return `<div class="r"><span>${esc(s.name)}</span><span class="amt" style="${a > pl ? 'color:var(--bad)' : ''}">${kc(a)} <span class="mute">/ ${kc(pl)}</span></span><div class="meter"><i class="${a > pl ? 'over' : ''}" style="width:${pl ? Math.min(100, a / pl * 100) : (a ? 100 : 0)}%"></i></div></div>`; }).join('')}</div>
  <p class="mute">Plán pro každou etapu upravíte v harmonogramu.</p>
  <h2 style="margin-top:28px">Výdaje</h2>
  ${ex.length ? `<ul class="list">${ex.map(expLi).join('')}</ul>` : '<div class="empty">Zatím žádné výdaje.</div>'}`;
}

function vHarm() {
  const ds = S.stages.flatMap(s => [s.start, s.end]).filter(Boolean).map(d => +new Date(d));
  const mn = Math.min(...ds), mx = Math.max(...ds), span = mx - mn || 1, pos = d => (+new Date(d) - mn) / span * 100, t = +new Date(today), c = cur();
  return `<div class="row"><h2>Harmonogram</h2><button id="addStg">+ Etapa</button></div>
  ${ds.length ? `<div class="row mute"><span>${dt(new Date(mn).toISOString().slice(0, 10))}</span><span>${dt(new Date(mx).toISOString().slice(0, 10))}</span></div>` : ''}
  ${S.stages.map(s => `<div class="stage ${s === c ? 'cur' : ''}">
   <div class="row"><label class="chk" style="margin:0"><input type="checkbox" data-sdone="${s.id}" ${s.done ? 'checked' : ''}><b>${esc(s.name)}</b></label>
   <button class="ghost" data-sedit="${s.id}">Upravit</button></div>
   <div class="mute">${dt(s.start)} – ${dt(s.end)} · plán ${kc(s.plan)} · utraceno ${kc(spent(e => e.stage === s.id))}</div>
   ${ds.length && s.start && s.end ? `<div class="gantt"><i class="${s.done ? 'done' : s === c ? 'now' : ''}" style="left:${pos(s.start)}%;width:${Math.max(1.5, pos(s.end) - pos(s.start))}%"></i>${t >= mn && t <= mx ? `<b style="left:${pos(today)}%"></b>` : ''}</div>` : ''}
   <ul class="tasks">${s.tasks.map(k => `<li class="${k.d ? 'd' : ''}"><label class="chk" style="margin:0;flex:1"><input type="checkbox" data-tk="${s.id}|${k.id}" ${k.d ? 'checked' : ''}><span>${esc(k.t)}</span></label><button class="ghost" data-tdel="${s.id}|${k.id}" aria-label="Smazat úkol">×</button></li>`).join('')}</ul>
   <form class="row" data-tadd="${s.id}" style="flex-wrap:nowrap"><input name="t" placeholder="Nový úkol…" aria-label="Nový úkol pro ${esc(s.name)}"><button class="ghost">Přidat</button></form>
  </div>`).join('')}`;
}

function vRem() {
  return `<div class="row"><h2>Řemeslníci a dodavatelé</h2><button id="addCon">+ Kontakt</button></div>
  ${S.contacts.length ? `<div class="grid">${S.contacts.map(c => { const pd = spent(e => e.who === c.id); return `<div class="card" tabindex="0" data-con="${c.id}">
   <div class="row"><b>${esc(c.name)}</b><span class="tag ${c.status === 'Domluveno' ? 'now' : ''}">${esc(c.status)}</span></div>
   <div class="mute">${esc(c.trade)}</div>
   ${c.phone ? `<div><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></div>` : ''}
   ${c.email ? `<div style="overflow-wrap:anywhere"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>` : ''}
   <div class="mute" style="margin-top:6px">Nabídka ${kc(c.price)} · zaplaceno ${kc(pd)}</div>
   ${c.note ? `<div style="margin-top:6px">${esc(c.note)}</div>` : ''}</div>`; }).join('')}</div>` : '<div class="empty">Zatím žádné kontakty.</div>'}`;
}

const photoTag = (p, d) => `<img ${p.src ? `src="${esc(p.src)}"` : `data-pid="${esc(p.id)}"`} alt="Fotka ze stavby ${dt(d.date)}" loading="lazy" data-big>`;
const diaryLi = d => `<li><div class="row"><span class="date">${dt(d.date)}</span><button class="ghost" data-dedit="${d.id}">Upravit</button></div><div style="white-space:pre-wrap">${esc(d.text)}</div>${d.photos.length ? `<div class="photos">${d.photos.map(p => photoTag(p, d)).join('')}</div>` : ''}</li>`;
function vDenik() {
  const ds = [...S.diary].sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="row"><h2>Stavební deník</h2><button id="addDia">+ Zápis</button></div>
  ${ds.length ? `<ul class="list">${ds.map(diaryLi).join('')}</ul>` : '<div class="empty">Zatím žádný zápis.</div>'}`;
}

function render() {
  const v = view(), y = scrollY;
  app.innerHTML = hero() + `<nav><div class="scroll">${TABS.map(t => `<a href="#${t[0]}" class="${t[0] === v ? 'on' : ''}">${t[1]}</a>`).join('')}</div></nav>
  <main class="band"><div class="wrap" style="max-width:900px">${({prehled: vPrehled, postup: vPostup, rozpocet: vRozpocet, harmonogram: vHarm, remeslnici: vRem, denik: vDenik})[v]()}</div></main>
  ${S.sample ? '<p class="mute" style="text-align:center;padding:0 16px 30px">Ukázková data – vymažete je na záložce Přehled.</p>' : ''}`;
  scrollTo(0, y);
  for (const img of app.querySelectorAll('img[data-pid]')) photoUrl(img.dataset.pid).then(u => { if (u) img.src = u; });
}
async function photoUrl(id) {
  if (urls[id]) return urls[id];
  try { const b = await DB.get('photos', id); if (b) return (urls[id] = URL.createObjectURL(b)); } catch (e) {}
  return null;
}

/* ---------- formuláře ---------- */
function form(title, fields, vals, onSave, onDel) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<form class="sheet"><h2>${esc(title)}</h2>${fields.map(f => {
    const v = vals[f.k] ?? '', id = 'f_' + f.k;
    if (f.type === 'check') return `<label class="chk"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}>${f.l}</label>`;
    const inp = f.type === 'select' ? `<select id="${id}" name="${f.k}">${f.opts.map(o => `<option value="${esc(o[0])}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
      : f.type === 'area' ? `<textarea id="${id}" name="${f.k}" rows="5">${esc(v)}</textarea>`
      : f.type === 'file' ? `<input id="${id}" name="${f.k}" type="file" accept="image/*" multiple>`
      : `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" ${f.type === 'number' ? 'inputmode="numeric" min="0" step="1"' : ''} value="${esc(v)}" ${f.req ? 'required' : ''}>`;
    return `<label for="${id}">${f.l}</label>${inp}`;
  }).join('')}
   <div class="row">${onDel ? '<button type="button" class="del" data-x="del">Smazat</button>' : '<span></span>'}<div class="row"><button type="button" class="ghost" data-x="no">Zrušit</button><button>Uložit</button></div></div></form>`;
  document.body.append(m);
  const fm = m.querySelector('form'), close = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m || e.target.dataset.x === 'no') close(); if (e.target.dataset.x === 'del') { close(); onDel(); } });
  m.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  fm.addEventListener('submit', async e => {
    e.preventDefault(); const o = {};
    for (const f of fields) { const el = fm.elements[f.k]; o[f.k] = f.type === 'check' ? el.checked : f.type === 'number' ? (+el.value || 0) : f.type === 'file' ? el.files : el.value.trim(); }
    fm.querySelector('button:not([type])').textContent = 'Ukládám…'; await onSave(o); close();
  });
  setTimeout(() => fm.querySelector('input:not([type=checkbox]),textarea,select')?.focus(), 30);
}
function removeWithUndo(arr, item, label) {
  const i = arr.indexOf(item); arr.splice(i, 1); save();
  toast(label + ' smazáno', () => { arr.splice(i, 0, item); save(); });
}
function toast(msg, undo) {
  document.querySelector('.toast')?.remove(); clearTimeout(toastT);
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Vrátit</button>' : ''}`;
  document.body.append(t); if (undo) t.querySelector('button').onclick = () => { t.remove(); undo(); };
  toastT = setTimeout(() => t.remove(), 6000);
}
const stageOpts = () => S.stages.map(s => [s.id, s.name]), conOpts = () => [['', '–'], ...S.contacts.map(c => [c.id, c.name])];
function editExp(e) {
  const n = !e; e = e || {id: uid(), date: today, desc: '', stage: (cur() || S.stages[0] || {}).id, amount: 0, who: '', paid: true};
  form(n ? 'Nový výdaj' : 'Upravit výdaj', [{k: 'desc', l: 'Popis', req: 1}, {k: 'amount', l: 'Částka (Kč)', type: 'number'}, {k: 'date', l: 'Datum', type: 'date'}, {k: 'stage', l: 'Etapa', type: 'select', opts: stageOpts()}, {k: 'who', l: 'Dodavatel', type: 'select', opts: conOpts()}, {k: 'paid', l: 'Zaplaceno', type: 'check'}], e,
    o => { Object.assign(e, o); if (n) S.expenses.push(e); save(); }, n ? null : () => removeWithUndo(S.expenses, e, 'Výdaj'));
}
function editStage(s) {
  const n = !s; s = s || {id: uid(), name: '', start: '', end: '', plan: 0, done: false, part: '', tasks: []};
  form(n ? 'Nová etapa' : 'Upravit etapu', [{k: 'name', l: 'Název', req: 1}, {k: 'start', l: 'Začátek', type: 'date'}, {k: 'end', l: 'Konec', type: 'date'}, {k: 'plan', l: 'Plánovaný rozpočet (Kč)', type: 'number'}], s,
    o => { Object.assign(s, o); if (n) S.stages.push(s); save(); }, n ? null : () => removeWithUndo(S.stages, s, 'Etapa'));
}
function editCon(c) {
  const n = !c; c = c || {id: uid(), name: '', trade: '', phone: '', email: '', price: 0, status: 'Poptáno', note: ''};
  form(n ? 'Nový kontakt' : 'Upravit kontakt', [{k: 'name', l: 'Jméno / firma', req: 1}, {k: 'trade', l: 'Profese'}, {k: 'phone', l: 'Telefon', type: 'tel'}, {k: 'email', l: 'E-mail', type: 'email'}, {k: 'price', l: 'Nabídnutá cena (Kč)', type: 'number'}, {k: 'status', l: 'Stav', type: 'select', opts: ['Poptáno', 'Nabídka', 'Domluveno', 'Hotovo', 'Odmítnuto'].map(x => [x, x])}, {k: 'note', l: 'Poznámka', type: 'area'}], c,
    o => { Object.assign(c, o); if (n) S.contacts.push(c); save(); }, n ? null : () => removeWithUndo(S.contacts, c, 'Kontakt'));
}
async function shrink(file, max, q) {
  const img = await createImageBitmap(file), k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/jpeg', q));
}
const blobToData = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
function editDia(d) {
  const n = !d; d = d || {id: uid(), date: today, text: '', photos: []};
  form(n ? 'Nový zápis' : 'Upravit zápis', [{k: 'date', l: 'Datum', type: 'date'}, {k: 'text', l: 'Co se dnes dělalo', type: 'area'}, {k: 'files', l: 'Přidat fotky', type: 'file'}], d,
    async o => {
      d.date = o.date; d.text = o.text;
      for (const f of o.files || []) {
        try {
          const b = await shrink(f, 1600, .82);
          if (idbOk) { const id = uid(); await DB.put('photos', id, b); d.photos.push({id}); }
          else d.photos.push({src: await blobToData(await shrink(f, 800, .7))});
        } catch (e) { toast('Fotku se nepodařilo uložit'); }
      }
      if (n) S.diary.push(d); save();
    }, n ? null : () => removeWithUndo(S.diary, d, 'Zápis'));
}

/* ---------- záloha ---------- */
async function exportData() {
  const out = JSON.parse(JSON.stringify(S));
  for (const d of out.diary) for (const p of d.photos) if (p.id) { const b = await DB.get('photos', p.id).catch(() => null); if (b) p.data = await blobToData(b); }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], {type: 'application/json'}));
  a.download = `stavba-zaloha-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importData(file) {
  try {
    const n = JSON.parse(await file.text()); if (!n.stages) throw 0;
    for (const d of n.diary || []) for (const p of d.photos || []) if (p.data) {
      if (idbOk) { await DB.put('photos', p.id, await (await fetch(p.data)).blob()); delete p.data; } else { p.src = p.data; delete p.id; delete p.data; }
    }
    S = n; S.steps ||= {}; save(); toast('Data obnovena ze zálohy');
  } catch (e) { toast('Soubor není platná záloha'); }
}

/* ---------- události ---------- */
app.addEventListener('click', e => {
  const t = e.target, c = t.closest('[data-exp],[data-con]');
  if (t.closest('a')) return;
  if (t.id === 'addExp') return editExp(); if (t.id === 'addStg') return editStage(); if (t.id === 'addCon') return editCon(); if (t.id === 'addDia') return editDia();
  if (t.dataset.step) { S.steps[t.dataset.step] = true; return save(); }
  if (t.dataset.sedit) return editStage(stage(t.dataset.sedit));
  if (t.dataset.dedit) return editDia(S.diary.find(d => d.id === t.dataset.dedit));
  if (t.dataset.tdel) { const [s, k] = t.dataset.tdel.split('|'), st = stage(s); return removeWithUndo(st.tasks, st.tasks.find(x => x.id === k), 'Úkol'); }
  if (t.hasAttribute('data-big')) { const m = document.createElement('div'); m.className = 'modal'; m.style.alignItems = 'center'; m.innerHTML = `<img class="big" src="${esc(t.src)}" alt="">`; m.onclick = () => m.remove(); return document.body.append(m); }
  if (c) return c.dataset.exp ? editExp(S.expenses.find(x => x.id === c.dataset.exp)) : editCon(who(c.dataset.con));
  if (t.id === 'nm') form('Název stavby', [{k: 'name', l: 'Název', req: 1}], S, o => { S.name = o.name; save(); });
  if (t.id === 'clr') {
    const old = JSON.stringify(S);
    Object.assign(S, {sample: false, name: 'Můj dům', expenses: [], contacts: [], diary: [], steps: {}});
    S.stages.forEach(s => Object.assign(s, {done: false, start: '', end: '', plan: 0, tasks: []}));
    save(); toast('Ukázková data vymazána', () => { S = JSON.parse(old); save(); });
  }
  if (t.id === 'exp') exportData();
});
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-exp],[data-con],#nm')) e.target.click(); });
app.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.sdone) { stage(t.dataset.sdone).done = t.checked; save(); }
  if (t.dataset.tk) { const [s, k] = t.dataset.tk.split('|'); stage(s).tasks.find(x => x.id === k).d = t.checked; save(); }
  if (t.dataset.st) { if (t.checked) S.steps[t.dataset.st] = true; else delete S.steps[t.dataset.st]; save(); }
  if (t.id === 'imp' && t.files[0]) importData(t.files[0]);
});
app.addEventListener('submit', e => {
  const f = e.target; if (!f.dataset.tadd) return; e.preventDefault();
  const v = f.elements.t.value.trim(); if (!v) return;
  stage(f.dataset.tadd).tasks.push({id: uid(), t: v, d: false}); save();
});
addEventListener('hashchange', () => { render(); scrollTo(0, app.querySelector('nav').offsetTop); });

load().then(render);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
