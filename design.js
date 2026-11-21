'use strict';
// Projekt domu: půdorys, kanalizace, elektro, 3D model, orientační cena a tisk výkresů.
// Souřadnice v metrech, osa y v půdorysu míří dolů. Vše bez knihoven, funguje offline.
window.DESIGN = (() => {
const B = () => window.BH, S = () => B().S, D = () => S().design;
const esc = s => B().esc(s), kc = n => B().kc(n);
const uid = () => Math.random().toString(36).slice(2, 9);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const m2 = n => (Math.round(n * 100) / 100).toLocaleString('cs-CZ', {maximumFractionDigits: 2});
const r2 = n => Math.round(n * 100) / 100;

/* ---------- katalogy ---------- */
const WALL = {ext: {l: 'Obvodová zeď', t: .44}, load: {l: 'Nosná vnitřní zeď', t: .3}, part: {l: 'Příčka', t: .15}};
const FIX = {
  wc: {l: 'WC', s: 'WC', dn: 110, w: .4, h: .65}, umyv: {l: 'Umyvadlo', s: 'U', dn: 40, w: .6, h: .45},
  sprcha: {l: 'Sprchový kout', s: 'SP', dn: 50, w: .9, h: .9}, vana: {l: 'Vana', s: 'V', dn: 50, w: 1.7, h: .75},
  drez: {l: 'Kuchyňský dřez', s: 'D', dn: 50, w: .8, h: .5}, pracka: {l: 'Pračka', s: 'PR', dn: 50, w: .6, h: .6},
  mycka: {l: 'Myčka', s: 'MY', dn: 50, w: .6, h: .6}, vpust: {l: 'Podlahová vpust', s: 'VP', dn: 50, w: .2, h: .2},
  stoup: {l: 'Stoupačka / čisticí kus', s: '', dn: 110, w: .2, h: .2},
};
const DN = {110: '#7a4a1f', 75: '#9c6a32', 50: '#b98a4c', 40: '#d0a86c'};
const EL = {
  zas: {l: 'Zásuvka 230 V', z: .3}, zas2: {l: 'Dvojzásuvka 230 V', z: .3}, zas400: {l: 'Zásuvka 400 V (sporák)', z: .3},
  vyp: {l: 'Vypínač', z: 1.2}, svet: {l: 'Světlo (strop)', z: -1}, svetst: {l: 'Světlo (nástěnné)', z: 1.9},
  data: {l: 'Datová / TV zásuvka', z: .3}, rozv: {l: 'Rozvaděč', z: 1.5},
};
const CC = ['#ef5f0d', '#2a7fd4', '#2f9e5b', '#c23b9b', '#9a7a00', '#6a4fc9', '#d43a2a', '#138a8a', '#5a5f57'];
const PRICES = [ // klíč, popis, jednotka, skupina, výchozí cena (Kč vč. 12 % DPH, materiál + práce)
  ['zemni', 'Zemní práce – ornice, výkopy, odvoz', 'm²', 'zaklady', 900],
  ['pasy', 'Základové pasy – beton, bednění, výztuž', 'bm', 'zaklady', 4500],
  ['deska', 'Základová deska, hydroizolace, radon', 'm²', 'zaklady', 2800],
  ['obvod', 'Obvodové zdivo vč. práce', 'm²', 'zdi', 3300],
  ['nosne', 'Vnitřní nosné zdivo', 'm²', 'zdi', 2200],
  ['pricky', 'Příčky', 'm²', 'zdi', 1300],
  ['preklady', 'Překlady nad otvory', 'ks', 'zdi', 2500],
  ['venec', 'Ztužující věnec', 'bm', 'zdi', 1700],
  ['strop', 'Stropní konstrukce', 'm²', 'zdi', 3300],
  ['strecha', 'Střecha – krov, krytina, klempířina', 'm²', 'strecha', 3000],
  ['okna', 'Okna a prosklené dveře vč. montáže', 'm²', 'okna', 9000],
  ['vchod', 'Vchodové dveře', 'ks', 'okna', 45000],
  ['kan110', 'Kanalizace DN 110', 'bm', 'kan', 750],
  ['kan50', 'Kanalizace DN 40–75', 'bm', 'kan', 450],
  ['zarpr', 'Připojení zařizovacího předmětu', 'ks', 'kan', 1800],
  ['vyvod', 'Elektro vývod (zásuvka, světlo, vypínač) vč. kabelu', 'ks', 'el', 1800],
  ['rozv', 'Rozvaděč osazený', 'ks', 'el', 28000],
  ['revize', 'Výchozí revize elektro', 'ks', 'el', 6000],
];
const GROUPS = {zaklady: 'Zemní práce a základy', zdi: 'Zdivo, věnce a stropy', strecha: 'Střecha', okna: 'Okna a vchodové dveře', kan: 'Kanalizace', el: 'Elektroinstalace'};
const ROOF = {sedlova: 'Sedlová', valbova: 'Valbová', stanova: 'Stanová', pultova: 'Pultová', plocha: 'Plochá'};
const ROOFP = [ // předvolby tvaru střechy
  {k: 'sedlova', l: 'Sedlová', type: 'sedlova', pitch: 40, ic: 'M8 25L32 4L56 25Z'},
  {k: 'bungalov', l: 'Bungalov', type: 'valbova', pitch: 22, ic: 'M6 25L20 15H44L58 25Z'},
  {k: 'valbova', l: 'Valbová', type: 'valbova', pitch: 35, ic: 'M6 25L22 8H42L58 25Z'},
  {k: 'stanova', l: 'Stanová', type: 'stanova', pitch: 30, ic: 'M6 25L32 7L58 25Z'},
  {k: 'pultova', l: 'Pultová', type: 'pultova', pitch: 8, ic: 'M8 25V12L56 19V25Z'},
  {k: 'plocha', l: 'Plochá', type: 'plocha', pitch: 0, ic: 'M9 25V20H55V25Z'},
];
const LOOK = {wall: '#f2efe8', roof: '#3a3d40', frame: '#f5f5f5', plinth: '#5b5d5c'};
const LOOKS = [
  ['wall', 'Omítka', [['#f2efe8', 'Bílá'], ['#efe4c8', 'Krémová'], ['#e2cfa6', 'Písková'], ['#d8d7d2', 'Světle šedá'], ['#9fb1bd', 'Modrošedá'], ['#b9b48f', 'Olivová'], ['#c98b6b', 'Terakota'], ['#4b4e51', 'Antracit']]],
  ['roof', 'Střecha', [['#3a3d40', 'Antracit'], ['#1f2022', 'Černá'], ['#9c3b26', 'Cihlová'], ['#7a2e22', 'Višňová'], ['#5a3a28', 'Hnědá'], ['#7b7f82', 'Šedá'], ['#8e5a3a', 'Měděná']]],
  ['frame', 'Okna', [['#f5f5f5', 'Bílá'], ['#3b3e42', 'Antracit'], ['#1e1e1e', 'Černá'], ['#a8743f', 'Zlatý dub'], ['#6e4a2e', 'Ořech']]],
  ['plinth', 'Sokl', [['#5b5d5c', 'Tmavě šedá'], ['#3a3c3e', 'Antracit'], ['#8d8a82', 'Kamenná'], ['#b5a48a', 'Pískovec']]],
];
const look = () => ({...LOOK, ...(D().look || {})});
const roofPreset = r => r.preset || (r.type === 'valbova' && r.pitch <= 25 ? 'bungalov' : r.type);
const roofLabel = r => (ROOFP.find(x => x.k === roofPreset(r)) || {l: ROOF[r.type]}).l;

/* ---------- výchozí a ukázkový návrh ---------- */
const defCirc = () => [['Světla', 'B10'], ['Zásuvky obytné místnosti', 'B16'], ['Zásuvky kuchyň', 'B16'], ['Koupelna', 'B16'], ['Sporák 400 V', 'B16/3'], ['Pračka, technická m.', 'B16']].map(([n, j], i) => ({id: i + 1, name: n, jistic: j}));
const empty = () => ({floors: [{id: uid(), name: '1. NP', h: 3.0, walls: [], open: [], rooms: [], fix: [], pipes: [], elec: [], cables: []}],
  roof: {type: 'sedlova', pitch: 35, over: .5}, circuits: defCirc(), prices: {}, reserve: 10, meta: {investor: '', place: '', author: ''}});
function sample() {
  const d = empty(), f = d.floors[0];
  const W = (x1, y1, x2, y2, kind) => { const w = {id: uid(), x1, y1, x2, y2, kind, t: WALL[kind].t}; f.walls.push(w); return w; };
  const n = W(0, 0, 13, 0, 'ext'), e = W(13, 0, 13, 10, 'ext'), s = W(13, 10, 0, 10, 'ext'), wl = W(0, 10, 0, 0, 'ext');
  const lw = W(7.5, 0, 7.5, 10, 'load'), a = W(0, 6, 7.5, 6, 'part'), b = W(4, 6, 4, 10, 'part'), c = W(7.5, 2.5, 13, 2.5, 'part');
  const dd = W(10, 0, 10, 2.5, 'part'), g = W(9, 2.5, 9, 10, 'part'), h = W(9, 5.5, 13, 5.5, 'part');
  const O = (w, pos, type, wd, ht, sill, o = {}) => f.open.push({id: uid(), wall: w.id, pos, type, w: wd, h: ht, sill, ...o});
  O(n, 2, 'window', 1.5, 1.5, .9); O(n, 5.2, 'window', 1.5, 1.5, .9); O(n, 8.75, 'door', 1, 2.1, 0); O(n, 11.5, 'window', .6, .6, 1.5);
  O(e, 4, 'window', .9, .9, 1.2); O(e, 7.75, 'window', 1.5, 1.5, .9);
  O(s, 2, 'window', 1.5, 1.5, .9); O(s, 7.25, 'window', 1.5, 1.5, .9); O(s, 11, 'window', 1.5, 1.5, .9);
  O(wl, 7, 'door', 2.4, 2.2, 0);
  O(lw, 1.25, 'door', .8, 1.97, 0); O(c, .75, 'door', .8, 1.97, 0, {flip: true}); O(dd, 1.25, 'door', .7, 1.97, 0);
  O(g, 1.5, 'door', .8, 1.97, 0); O(g, 5.25, 'door', .8, 1.97, 0); O(lw, 8, 'door', .8, 1.97, 0, {flip: true}); O(a, 2, 'door', .8, 1.97, 0, {flip: true});
  const R = (name, x1, y1, x2, y2) => { const i = v => (v === 0 || v === 13 || v === 10) ? .22 : .075;
    f.rooms.push({id: uid(), name, x: x1 + i(x1), y: y1 + i(y1), w: r2(x2 - x1 - i(x1) - i(x2)), h: r2(y2 - y1 - i(y1) - i(y2))}); };
  R('Obývací pokoj s kuchyní', 0, 0, 7.5, 6); R('Ložnice', 0, 6, 4, 10); R('Pokoj', 4, 6, 7.5, 10); R('Zádveří', 7.5, 0, 10, 2.5);
  R('Technická místnost', 10, 0, 13, 2.5); R('Chodba', 7.5, 2.5, 9, 10); R('Koupelna s WC', 9, 2.5, 13, 5.5); R('Pokoj', 9, 5.5, 13, 10);
  const X = (type, x, y, rot = 0) => f.fix.push({id: uid(), type, x, y, rot});
  X('wc', 12.45, 3.05, 90); X('umyv', 9.8, 2.85); X('sprcha', 12.25, 4.7); X('drez', 5, .55); X('mycka', 5.8, .55); X('pracka', 11, .55); X('stoup', 12.7, 3.4);
  const P = (dn, pts) => f.pipes.push({id: uid(), dn, pts});
  P(110, [[12.45, 3.4], [12.7, 3.4], [13.9, 3.4]]); P(50, [[12.25, 4.7], [12.7, 4.7], [12.7, 3.4]]); P(40, [[9.8, 2.85], [9.8, 3.4], [12.45, 3.4]]);
  P(110, [[5, .55], [5, 1.3], [12.7, 1.3], [12.7, 3.4]]); P(50, [[11, .55], [11, 1.3]]);
  const E = (type, x, y, circ, rot = 0) => f.elec.push({id: uid(), type, x, y, circ, rot});
  E('rozv', 12.6, .4, 0, 180);
  E('svet', 2.5, 3, 1); E('svet', 5.5, 2, 1); E('svet', 2, 8, 1); E('svet', 5.75, 8, 1); E('svet', 8.75, 1.25, 1); E('svet', 11.5, 1.25, 1);
  E('svet', 8.25, 6, 1); E('svet', 11, 4, 1); E('svet', 11, 7.75, 1);
  E('vyp', 7.25, 1.9, 1, 90); E('vyp', 1.4, 6.3, 1); E('vyp', 7.25, 7.4, 1, 90); E('vyp', 8.1, .35, 1); E('vyp', 9.6, 3.6, 1, 270); E('vyp', 9.25, 6.6, 1, 270);
  E('zas2', .3, 2, 2, 270); E('zas2', .3, 5, 2, 270); E('data', 3, 5.7, 2, 0); E('zas2', 3.6, 5.7, 2, 0);
  E('zas2', .3, 8, 2, 270); E('zas', 3.7, 8.5, 2, 90); E('zas2', 5.75, 9.7, 2, 0); E('zas2', 12.7, 8, 2, 90); E('zas', 10, 9.7, 2);
  E('zas2', 4, .35, 3, 180); E('zas2', 6.6, .35, 3, 180); E('zas', 5.8, .35, 3, 180); E('zas400', 4.6, .35, 5, 180);
  E('zas', 9.25, 2.8, 4, 180); E('svetst', 9.8, 2.75, 4, 180); E('zas', 11, .3, 6, 180); E('zas', 12.7, 1.6, 6, 90);
  d.meta.investor = 'Ukázkový investor'; d.meta.place = 'Horní Lhota, parc. č. 123/4';
  return d;
}
function ensure() {
  const s = S(); if (!s.design) s.design = s.sample ? sample() : empty();
  const d = s.design; d.prices ||= {}; d.meta ||= {}; d.circuits ||= defCirc(); d.roof ||= {type: 'sedlova', pitch: 35, over: .5};
  for (const f of d.floors) for (const k of ['walls', 'open', 'rooms', 'fix', 'pipes', 'elec', 'cables']) f[k] ||= [];
  if (ui.floor >= d.floors.length) ui.floor = 0;
}

/* ---------- geometrie ---------- */
const L = w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
const dirs = w => { const l = L(w) || 1, ux = (w.x2 - w.x1) / l, uy = (w.y2 - w.y1) / l; return {ux, uy, nx: -uy, ny: ux, l}; };
const plen = pts => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const wallOf = (f, id) => f.walls.find(w => w.id === id);
function outline(f) {
  const ws = f.walls.filter(w => w.kind === 'ext'); if (!ws.length) return null;
  const t = ws.reduce((a, w) => a + w.t, 0) / ws.length, eq = (a, b) => Math.abs(a[0] - b[0]) < .02 && Math.abs(a[1] - b[1]) < .02;
  const left = ws.slice(1), pts = [[ws[0].x1, ws[0].y1], [ws[0].x2, ws[0].y2]];
  while (left.length) { const end = pts[pts.length - 1], i = left.findIndex(w => eq([w.x1, w.y1], end) || eq([w.x2, w.y2], end)); if (i < 0) break;
    const w = left.splice(i, 1)[0]; pts.push(eq([w.x1, w.y1], end) ? [w.x2, w.y2] : [w.x1, w.y1]); }
  const xs = ws.flatMap(w => [w.x1, w.x2]), ys = ws.flatMap(w => [w.y1, w.y2]);
  const bb = {x: Math.min(...xs) - t / 2, y: Math.min(...ys) - t / 2, X: Math.max(...xs) + t / 2, Y: Math.max(...ys) + t / 2};
  let poly, A, P;
  if (!left.length && pts.length > 3 && eq(pts[0], pts[pts.length - 1])) {
    poly = pts.slice(0, -1); A = Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    P = poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
  } else { poly = [[bb.x + t / 2, bb.y + t / 2], [bb.X - t / 2, bb.y + t / 2], [bb.X - t / 2, bb.Y - t / 2], [bb.x + t / 2, bb.Y - t / 2]]; A = (bb.X - bb.x - t) * (bb.Y - bb.y - t); P = 2 * (bb.X - bb.x + bb.Y - bb.y - 2 * t); }
  return {poly, A, P, t, outer: A + P * t / 2 + t * t, bb, closed: poly !== null && !left.length};
}
function bbox(f) {
  const xs = [], ys = [];
  for (const w of f.walls) { xs.push(w.x1 - w.t / 2, w.x2 + w.t / 2, w.x1 + w.t / 2, w.x2 - w.t / 2); ys.push(w.y1 - w.t / 2, w.y2 + w.t / 2, w.y1 + w.t / 2, w.y2 - w.t / 2); }
  for (const r of f.rooms) { xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.h); }
  for (const p of [...f.fix, ...f.elec]) { xs.push(p.x); ys.push(p.y); }
  for (const p of [...f.pipes, ...f.cables]) for (const q of p.pts) { xs.push(q[0]); ys.push(q[1]); }
  if (!xs.length) return {x: 0, y: 0, X: 10, Y: 8};
  return {x: Math.min(...xs), y: Math.min(...ys), X: Math.max(...xs), Y: Math.max(...ys)};
}
const roofH = (d, bb) => { const r = d.roof, w = bb.X - bb.x + 2 * r.over, h = bb.Y - bb.y + 2 * r.over, k = Math.tan(r.pitch * Math.PI / 180);
  return r.type === 'plocha' ? .3 : r.type === 'pultova' ? Math.min(w, h) * k : Math.min(w, h) / 2 * k; };

/* ---------- výpočet výměr a ceny ---------- */
function calc() {
  const d = D(), q = {}, add = (k, v) => q[k] = (q[k] || 0) + v, last = d.floors.length - 1;
  let zast = 0, uzit = 0, H = 0;
  const rooms = [];
  d.floors.forEach((f, i) => {
    const o = outline(f), byK = k => f.walls.filter(w => w.kind === k), len = ws => ws.reduce((a, w) => a + L(w), 0);
    for (const k of ['ext', 'load', 'part']) { const ws = byK(k), oa = f.open.filter(x => ws.some(w => w.id === x.wall)).reduce((a, x) => a + x.w * x.h, 0);
      add(k === 'ext' ? 'obvod' : k === 'load' ? 'nosne' : 'pricky', Math.max(0, len(ws) * f.h - oa)); }
    if (i === 0) { zast = o ? o.outer : 0; add('zemni', zast); add('deska', zast); add('pasy', len(byK('ext')) + len(byK('load'))); }
    add('venec', len(byK('ext')) + len(byK('load')));
    if (o && (i < last || d.roof.type === 'plocha')) add('strop', o.outer);
    for (const x of f.open) { const w = wallOf(f, x.wall); if (!w) continue; add('preklady', 1);
      if (w.kind === 'ext') { if (x.type === 'door' && x.w <= 1.25) add('vchod', 1); else add('okna', x.w * x.h); } }
    for (const r of f.rooms) { uzit += r.w * r.h; rooms.push({f: f.name, n: r.name, a: r.w * r.h}); }
    for (const p of f.pipes) add(+p.dn >= 110 ? 'kan110' : 'kan50', plen(p.pts));
    add('zarpr', f.fix.filter(x => x.type !== 'stoup').length);
    add('vyvod', f.elec.filter(x => x.type !== 'rozv').length); add('rozv', f.elec.filter(x => x.type === 'rozv').length);
    H += f.h;
  });
  if (q.vyvod) add('revize', 1);
  const top = d.floors[last], ot = outline(top);
  let roofA = 0, rh = 0;
  if (ot) { const r = d.roof, w = ot.bb.X - ot.bb.x + 2 * r.over, h = ot.bb.Y - ot.bb.y + 2 * r.over;
    roofA = r.type === 'plocha' ? w * h : w * h / Math.cos(r.pitch * Math.PI / 180); rh = roofH(d, ot.bb); add('strecha', roofA); }
  const items = PRICES.map(([k, l, u, g, p]) => { const qty = r2(q[k] || 0), price = d.prices[k] ?? p; return {k, l, u, g, qty, price, sum: qty * price}; });
  const sum = g => items.filter(i => g.includes(i.g)).reduce((a, i) => a + i.sum, 0);
  const hruba = sum(['zaklady', 'zdi', 'strecha', 'okna']), inst = sum(['kan', 'el']), rez = (d.reserve || 0) / 100;
  const obest = zast * (H + .3) + (ot ? (d.roof.type === 'plocha' ? zast * .3 : (ot.bb.X - ot.bb.x) * (ot.bb.Y - ot.bb.y) * rh / 2) : 0);
  return {items, hruba, inst, rez, total: (hruba + inst) * (1 + rez), zast, uzit, obest, roofA, rh, H, rooms, sum};
}

/* ---------- stav editoru ---------- */
const ui = {tab: 'stavba', tool: 'select', floor: 0, V: null, draft: null, wallKind: 'ext', dn: 110, fix: 'wc', el: 'zas', circ: 1, undo: [],
  r3: {yaw: -.75, pitch: .55, zoom: 1, roof: true, inst: false, cut: false}};
const F = () => D().floors[ui.floor];
function mut(fn) { ui.undo.push(JSON.stringify(D())); if (ui.undo.length > 40) ui.undo.shift(); fn(); B().save(); }
function undo() { const s = ui.undo.pop(); if (s) { S().design = JSON.parse(s); ensure(); B().save(); } }

/* ---------- symboly a výkres ---------- */
function elSym(e, sc = 1) {
  const c = CC[(e.circ ?? 0) % CC.length], st = `stroke="${c}" stroke-width=".035" fill="none"`, t = e.type;
  let g = '';
  if (t === 'svet' || t === 'svetst') g = `<circle r=".16" ${st}/><path d="M-.113-.113L.113.113M.113-.113L-.113.113" ${st}/>${t === 'svetst' ? `<path d="M-.2-.2H.2" ${st}/>` : ''}`;
  else if (t === 'vyp') g = `<circle r=".08" fill="${c}"/><path d="M0 0L.13-.2L.2-.15" ${st}/>`;
  else if (t === 'rozv') g = `<rect x="-.3" y="-.1" width=".6" height=".2" fill="${c}"/><text y=".07" font-size=".14" text-anchor="middle" fill="#fff" font-weight="800">R</text>`;
  else if (t === 'data') g = `<path d="M-.15.05H.15L0-.18Z" ${st}/>`;
  else g = `<path d="M-.16 0A.16.16 0 0 1 .16 0Z" ${st}/><path d="M0-.16V-.26" ${st}/>${t === 'zas2' ? `<path d="M-.1-.2V-.28M.1-.2V-.28" ${st}/>` : ''}${t === 'zas400' ? `<path d="M-.1-.12L.1-.12M-.1-.06L.1-.06" ${st}/>` : ''}`;
  const lab = t === 'rozv' ? '' : `<text x=".2" y=".28" font-size=".17" fill="${c}" transform="rotate(${-(e.rot || 0)} .2 .28)">${e.circ || ''}</text>`;
  return `<g transform="translate(${e.x} ${e.y}) rotate(${e.rot || 0}) scale(${sc})">${g}${lab}</g>`;
}
function fixSym(x) {
  const k = FIX[x.type] || FIX.wc, w = k.w, h = k.h, st = 'stroke="var(--ink)" stroke-width=".02" fill="var(--bg)"';
  let g = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx=".04" ${st}/>`;
  if (x.type === 'wc') g += `<ellipse cy=".08" rx=".15" ry=".2" ${st}/>`;
  else if (x.type === 'umyv' || x.type === 'drez') g += `<ellipse rx="${w * .35}" ry="${h * .3}" ${st}/>`;
  else if (x.type === 'sprcha') g += `<path d="M${-w / 2} ${-h / 2}L${w / 2} ${h / 2}M${w / 2} ${-h / 2}L${-w / 2} ${h / 2}" stroke="var(--ink)" stroke-width=".015"/>`;
  else if (x.type === 'vana') g += `<rect x="${-w / 2 + .08}" y="${-h / 2 + .08}" width="${w - .16}" height="${h - .16}" rx=".2" ${st}/>`;
  else if (x.type === 'pracka' || x.type === 'mycka') g += `<circle r=".2" ${st}/>`;
  else if (x.type === 'stoup') g = `<circle r=".1" fill="${DN[110]}"/>`;
  return `<g transform="translate(${x.x} ${x.y}) rotate(${x.rot || 0})">${g}${k.s ? `<text y="${h / 2 + .2}" font-size=".16" text-anchor="middle" fill="var(--mute)" transform="rotate(${-(x.rot || 0)} 0 ${h / 2 + .2})">${k.s}</text>` : ''}</g>`;
}
function openSym(f, o) {
  const w = wallOf(f, o.wall); if (!w) return '';
  const {ux, uy, nx, ny} = dirs(w), cx = w.x1 + ux * o.pos, cy = w.y1 + uy * o.pos, hw = o.w / 2, ht = w.t / 2 + .005;
  const pt = (a, b) => [cx + ux * a + nx * b, cy + uy * a + ny * b], P = (a, b) => pt(a, b).map(v => +v.toFixed(3)).join(',');
  let s = `<polygon points="${P(-hw, -ht)} ${P(hw, -ht)} ${P(hw, ht)} ${P(-hw, ht)}" fill="var(--bg)"/>`;
  const ln = (a, b, c, d2, sw = .02, col = 'var(--ink)') => { const p = pt(a, b), q = pt(c, d2); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${col}" stroke-width="${sw}"/>`; };
  s += ln(-hw, -ht, -hw, ht) + ln(hw, -ht, hw, ht);
  if (o.type === 'window') s += ln(-hw, 0, hw, 0, .02) + ln(-hw, -w.t / 6, hw, -w.t / 6, .012) + ln(-hw, w.t / 6, hw, w.t / 6, .012);
  else {
    const sd = o.flip ? -1 : 1, hd = o.hand ? -1 : 1, hx = -hw * hd, hy = ht * sd, ex = hw * hd;
    const hinge = pt(hx, hy), leaf = pt(hx, hy + o.w * sd), end = pt(ex, hy);
    const sweep = (sd * hd > 0) ? 0 : 1;
    s += `<line x1="${hinge[0]}" y1="${hinge[1]}" x2="${leaf[0]}" y2="${leaf[1]}" stroke="var(--ink)" stroke-width=".03"/>`;
    s += `<path d="M${leaf[0]} ${leaf[1]}A${o.w} ${o.w} 0 0 ${sweep} ${end[0]} ${end[1]}" fill="none" stroke="var(--ink)" stroke-width=".012" stroke-dasharray=".06 .04"/>`;
  }
  return s;
}
// Půdorys jako SVG. layer: stavba | odpady | elektro; print = bez interakce, s kótami.
function planInner(f, layer, print) {
  const dim = layer === 'stavba', o = [];
  for (const r of f.rooms) {
    o.push(`<g data-k="rooms" data-id="${r.id}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${dim ? 'var(--panel)' : 'none'}" ${print ? '' : 'stroke="var(--line)" stroke-width=".02" stroke-dasharray=".1 .08"'}/>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" font-size="${r2(Math.min(.32, r.w * 1.6 / Math.max(6, r.name.length)))}" text-anchor="middle" fill="var(--ink)" ${dim ? '' : 'opacity=".55"'}>${esc(r.name)}</text>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + .36}" font-size="${Math.min(.26, r.w / 8)}" text-anchor="middle" fill="var(--mute)">${m2(r.w * r.h)} m²</text></g>`);
  }
  o.push(`<g opacity="${dim ? 1 : .4}">`);
  for (const w of f.walls) o.push(`<line data-k="walls" data-id="${w.id}" x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="${w.kind === 'part' ? 'var(--conc)' : 'var(--ink)'}" stroke-width="${w.t}" stroke-linecap="square"/>`);
  for (const x of f.open) o.push(`<g data-k="open" data-id="${x.id}">${openSym(f, x)}</g>`);
  o.push('</g>');
  const ol = outline(f), cx0 = ol ? (ol.bb.x + ol.bb.X) / 2 : 0, cy0 = ol ? (ol.bb.y + ol.bb.Y) / 2 : 0;
  if (dim) for (const w of f.walls) if (w.kind === 'ext') {
    const {ux, uy, nx, ny, l} = dirs(w), sd = ((w.x1 + w.x2) / 2 - cx0) * nx + ((w.y1 + w.y2) / 2 - cy0) * ny >= 0 ? 1 : -1, off = (w.t / 2 + .28) * sd, mx = (w.x1 + w.x2) / 2 + nx * off, my = (w.y1 + w.y2) / 2 + ny * off;
    let a = Math.atan2(uy, ux) * 180 / Math.PI; if (a > 90 || a <= -90) a += 180;
    o.push(`<text x="${mx}" y="${my}" font-size=".22" text-anchor="middle" dominant-baseline="middle" fill="var(--mute)" transform="rotate(${a} ${mx} ${my})">${m2(l)}</text>`);
  }
  if (layer === 'odpady') {
    for (const p of f.pipes) { const c = DN[p.dn] || DN[50], pts = p.pts.map(q => q.join(',')).join(' ');
      let li = 0, lb = 0; p.pts.slice(1).forEach((q, i) => { const d2 = Math.hypot(q[0] - p.pts[i][0], q[1] - p.pts[i][1]); if (d2 > lb) { lb = d2; li = i; } });
      const a = p.pts[li], b = p.pts[li + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90 || ang <= -90) ang += 180;
      o.push(`<g data-k="pipes" data-id="${p.id}"><polyline points="${pts}" fill="none" stroke="transparent" stroke-width=".3"/><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${p.dn >= 110 ? .08 : .05}" stroke-linejoin="round"/>
      <text x="${mx}" y="${my - .12}" font-size=".17" text-anchor="middle" fill="${c}" transform="rotate(${ang} ${mx} ${my})">DN ${p.dn} · ${m2(plen(p.pts))} m · 2 %</text></g>`); }
    for (const x of f.fix) o.push(`<g data-k="fix" data-id="${x.id}">${fixSym(x)}</g>`);
  }
  if (layer === 'elektro') {
    for (const c of f.cables) o.push(`<g data-k="cables" data-id="${c.id}"><polyline points="${c.pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="transparent" stroke-width=".3"/><polyline points="${c.pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${CC[(c.circ || 0) % CC.length]}" stroke-width=".025" stroke-dasharray=".12 .06"/></g>`);
    for (const e of f.elec) o.push(`<g data-k="elec" data-id="${e.id}">${elSym(e)}<circle cx="${e.x}" cy="${e.y}" r=".3" fill="transparent"/></g>`);
  }
  return o.join('');
}
function overallDims(f) {
  const ol = outline(f); if (!ol) return '';
  const {x, y, X, Y} = ol.bb, s = 'stroke="var(--ink)" stroke-width=".015"', tk = (a, b) => `<path d="M${a - .1} ${b + .1}L${a + .1} ${b - .1}" ${s}/>`;
  return `<line x1="${x}" y1="${y - .9}" x2="${X}" y2="${y - .9}" ${s}/>${tk(x, y - .9)}${tk(X, y - .9)}<text x="${(x + X) / 2}" y="${y - 1}" font-size=".26" text-anchor="middle" fill="var(--ink)">${m2(X - x)}</text>
  <line x1="${x - .9}" y1="${y}" x2="${x - .9}" y2="${Y}" ${s}/>${tk(x - .9, y)}${tk(x - .9, Y)}<text x="${x - 1}" y="${(y + Y) / 2}" font-size=".26" text-anchor="middle" fill="var(--ink)" transform="rotate(-90 ${x - 1} ${(y + Y) / 2})">${m2(Y - y)}</text>`;
}

/* ---------- pohled záložky ---------- */
const TABS = [['stavba', 'Půdorys'], ['odpady', 'Odpady'], ['elektro', 'Elektro'], ['3d', '3D model'], ['pozemek', 'Na pozemku'], ['cena', 'Cena'], ['vykresy', 'Výkresy']];
const TOOLS = {
  stavba: [['select', 'Vybrat'], ['wall-ext', 'Obvodová zeď'], ['wall-load', 'Nosná zeď'], ['wall-part', 'Příčka'], ['window', 'Okno'], ['door', 'Dveře'], ['room', 'Místnost']],
  odpady: [['select', 'Vybrat'], ['pipe', 'Potrubí'], ['fix', 'Předmět']],
  elektro: [['select', 'Vybrat'], ['el', 'Prvek'], ['cable', 'Kabel']],
};
const HINT = {
  select: 'Klepněte na prvek a upravte ho. Tažením posouváte výkres, kolečkem nebo dvěma prsty přibližujete.',
  wall: 'Klepnutím zadejte začátek a pak další body zdi. Body se přichytávají k rastru 5 cm, ke koncům zdí a k pravému úhlu. Klepnutím na první bod nebo „Ukončit“ kreslení skončí.',
  window: 'Klepněte na zeď, kam okno patří. Rozměry upravíte hned potom.', door: 'Klepněte na zeď, kam dveře patří. Rozměry a směr otevírání upravíte hned potom.',
  room: 'Klepněte na dva protilehlé rohy místnosti (světlý prostor mezi zdmi).',
  pipe: 'Klepejte body trasy potrubí od zařizovacího předmětu ke stoupačce nebo ven z domu. „Ukončit“ trasu uloží.',
  fix: 'Vyberte předmět a klepněte do půdorysu.', el: 'Vyberte prvek a okruh a klepněte do půdorysu. U zdi se prvek sám přichytí na její líc.',
  cable: 'Klepejte body trasy kabelu. „Ukončit“ trasu uloží.',
};
function view() {
  ensure();
  const d = D(), t = ui.tab;
  let body = '';
  if (TOOLS[t]) {
    if (!TOOLS[t].some(x => x[0] === ui.tool)) ui.tool = 'select';
    const opts = t === 'odpady' ? (ui.tool === 'pipe' ? sel('dn', Object.keys(DN).reverse().map(k => [k, 'DN ' + k]), ui.dn) : ui.tool === 'fix' ? sel('fix', Object.entries(FIX).map(([k, v]) => [k, v.l]), ui.fix) : '')
      : t === 'elektro' ? ((ui.tool === 'el' ? sel('el', Object.entries(EL).map(([k, v]) => [k, v.l]), ui.el) : '') + (ui.tool !== 'select' ? sel('circ', d.circuits.map(c => [String(c.id), c.id + ' – ' + c.name]), String(ui.circ)) : '') + '<button class="ghost" data-dz="circs">Okruhy…</button>') : '';
    body = `${floorBar()}
    <div class="dztools" role="toolbar">${TOOLS[t].map(([k, l]) => `<button class="${ui.tool === k ? '' : 'ghost'}" data-tool="${k}" aria-pressed="${ui.tool === k}">${l}</button>`).join('')}</div>
    ${opts ? `<div class="dztools">${opts}</div>` : ''}
    <div class="dzhint mute" id="dzhint">${HINT[ui.tool.startsWith('wall') ? 'wall' : ui.tool]}</div>
    <div class="dzcanvas"><svg id="dzsvg" xmlns="http://www.w3.org/2000/svg" aria-label="Půdorys ${esc(F().name)}"></svg>
     <div class="dzfloat"><button class="ghost" data-dz="fit" title="Přizpůsobit">⤢</button><button class="ghost" data-dz="zin" aria-label="Přiblížit">+</button><button class="ghost" data-dz="zout" aria-label="Oddálit">−</button></div>
     <div class="dzread" id="dzread" ${ui.draft ? '' : 'hidden'}><span id="dzlen"></span><button data-dz="finish">Ukončit</button><button class="ghost" data-dz="cancel">Zrušit</button></div></div>
    ${t === 'stavba' ? summaryStavba() : t === 'odpady' ? summaryOdpady() : summaryElektro()}`;
  } else if (t === '3d') {
    const act = roofPreset(d.roof);
    body = `<div class="roofs" role="group" aria-label="Tvar střechy">${ROOFP.map(r => `<button class="roofb ${act === r.k ? 'on' : ''}" data-roofp="${r.k}" aria-pressed="${act === r.k}">
      <svg viewBox="0 0 64 40" aria-hidden="true"><rect x="12" y="24" width="40" height="14" fill="currentColor" opacity=".25"/><path d="${r.ic}" fill="currentColor"/></svg><span>${r.l}</span></button>`).join('')}</div>
    <div class="dzform">${d.roof.type === 'plocha' ? '' : `<label>Sklon střechy (°)<input data-roof="pitch" inputmode="decimal" value="${d.roof.pitch}"></label>`}<label>Přesah střechy (m)<input data-roof="over" inputmode="decimal" value="${d.roof.over}"></label></div>
    ${floorBar(true)}<div class="dz3d"><canvas id="dz3d" aria-label="3D model domu"></canvas>
     <div class="dzfloat3">${[['reset', 'Výchozí'], ['front', 'Zepředu'], ['side', 'Z boku'], ['top', 'Shora']].map(([k, l]) => `<button class="ghost" data-view="${k}">${l}</button>`).join('')}</div></div>
    <h3 class="dzh3">Barvy domu</h3>
    <div class="looks">${LOOKS.map(([k, l, opts]) => { const v = look()[k]; return `<div class="lookrow"><b>${l}</b><div class="sws">${opts.map(([c, n]) => `<button class="swb ${c === v ? 'on' : ''}" data-look="${k}" data-c="${c}" style="--c:${c}" title="${n}" aria-label="${l}: ${n}" aria-pressed="${c === v}"></button>`).join('')}<label class="swb pick" title="Vlastní barva" style="--c:${v}"><input type="color" data-lookc="${k}" value="${v}" aria-label="${l}: vlastní barva"></label></div></div>`; }).join('')}</div>
    <div class="dztools">${[['roof', 'Zobrazit střechu'], ['inst', 'Instalace (skryje střechu)'], ['cut', 'Jen do vybraného podlaží']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-r3="${k}" ${ui.r3[k] ? 'checked' : ''}>${l}</label>`).join('')}</div>
    <p class="mute">Tažením otáčíte, pravým tlačítkem nebo dvěma prsty posouváte, kolečkem nebo roztažením prstů přibližujete. Tvar a sklon střechy se promítne i do ceny a výkresů.</p>`;
  } else if (t === 'cena') body = vCena();
  else if (t === 'pozemek') body = vSite();
  else body = vVykresy();
  return `<div class="dz" id="dz"><div class="row"><h2 style="margin:0">Projekt domu</h2>
   <button class="ghost" data-dz="undo" ${ui.undo.length ? '' : 'disabled'}>↶ Zpět</button></div>
  <div class="seg" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? 'on' : ''}" data-dtab="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}
function sel(k, opts, v, label) {
  const s = `<select data-sel="${k}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(v) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  return label ? `<label>${label}${s}</label>` : s;
}
function floorBar(all) {
  const d = D();
  return `<div class="dztools">${d.floors.map((f, i) => `<button class="${i === ui.floor ? '' : 'ghost'}" data-floor="${i}">${esc(f.name)}</button>`).join('')}
  ${all ? '' : `<button class="ghost" data-dz="fedit">Upravit podlaží</button><button class="ghost" data-dz="fadd">+ Podlaží</button>`}</div>`;
}
function summaryStavba() {
  const f = F(), o = outline(f), area = f.rooms.reduce((a, r) => a + r.w * r.h, 0);
  return `<div class="dzsum"><div><b>${o ? m2(o.outer) : '–'} m²</b><span>zastavěná plocha podlaží</span></div><div><b>${m2(area)} m²</b><span>podlahová plocha místností</span></div>
  <div><b>${f.walls.length}</b><span>zdí · ${f.open.filter(x => x.type === 'window').length} oken · ${f.open.filter(x => x.type === 'door').length} dveří</span></div></div>
  ${f.rooms.length ? `<table class="dzt"><thead><tr><th>Místnost</th><th class="amt">Plocha</th></tr></thead><tbody>${f.rooms.map(r => `<tr><td>${esc(r.name)}</td><td class="amt">${m2(r.w * r.h)} m²</td></tr>`).join('')}</tbody></table>` : ''}
  ${!f.walls.length ? `<div class="empty">Zatím prázdný půdorys. Začněte obvodovou zdí${D().floors.length === 1 ? ', nebo <button class="ghost" data-dz="loadsample">načtěte ukázkový dům</button>' : ''}.</div>` : ''}`;
}
function summaryOdpady() {
  const f = F(), by = {}; for (const p of f.pipes) by[p.dn] = (by[p.dn] || 0) + plen(p.pts);
  return `<table class="dzt"><thead><tr><th>Potrubí</th><th class="amt">Délka</th></tr></thead><tbody>${Object.entries(by).sort((a, b) => b[0] - a[0]).map(([k, v]) => `<tr><td><i class="sw" style="background:${DN[k]}"></i>DN ${k}</td><td class="amt">${m2(v)} m</td></tr>`).join('') || '<tr><td colspan="2" class="mute">Zatím žádné potrubí.</td></tr>'}</tbody></table>
  <table class="dzt"><thead><tr><th>Zařizovací předmět</th><th>Odpad</th><th class="amt">Počet</th></tr></thead><tbody>${Object.entries(FIX).map(([k, v]) => { const n = f.fix.filter(x => x.type === k).length; return n ? `<tr><td>${v.l}</td><td>DN ${v.dn}</td><td class="amt">${n}</td></tr>` : ''; }).join('') || '<tr><td colspan="3" class="mute">Zatím žádné předměty.</td></tr>'}</tbody></table>
  <div class="note">Orientační pravidla: WC DN 110, vana, sprcha, pračka a dřez DN 50, umyvadlo DN 40. Spád připojovacího potrubí obvykle 2–3 %, ležatá kanalizace pod deskou alespoň 1–2 %. Konečný návrh dělá projektant podle ČSN EN 12056 a ČSN 75 6760.</div>`;
}
function summaryElektro() {
  const f = F(), d = D();
  return `<table class="dzt"><thead><tr><th>Okruh</th><th>Jistič</th><th class="amt">Prvků</th></tr></thead><tbody>${d.circuits.map(c => `<tr><td><i class="sw" style="background:${CC[c.id % CC.length]}"></i>${c.id} – ${esc(c.name)}</td><td>${esc(c.jistic)}</td><td class="amt">${d.floors.reduce((a, fl) => a + fl.elec.filter(e => +e.circ === c.id).length, 0)}</td></tr>`).join('')}</tbody></table>
  <table class="dzt"><thead><tr><th>Prvek</th><th>Výška osazení</th><th class="amt">Počet</th></tr></thead><tbody>${Object.entries(EL).map(([k, v]) => { const n = f.elec.filter(e => e.type === k).length; return n ? `<tr><td>${v.l}</td><td>${v.z < 0 ? 'strop' : m2(v.z) + ' m'}</td><td class="amt">${n}</td></tr>` : ''; }).join('') || '<tr><td colspan="3" class="mute">Zatím žádné prvky.</td></tr>'}</tbody></table>
  <div class="note">Obvyklé výšky: zásuvky 30 cm, v kuchyni nad linkou 110 cm, vypínače 120 cm. V koupelně platí zóny podle ČSN 33 2000-7-701. Projekt elektro a revizi musí zpracovat osoba s oprávněním.</div>`;
}
function vCena() {
  const c = calc(), d = D();
  const rows = Object.entries(GROUPS).map(([g, gl]) => { const its = c.items.filter(i => i.g === g);
    return `<tr class="grp"><th colspan="3">${gl}</th><th class="amt">${kc(c.sum([g]))}</th></tr>${its.map(i => `<tr><td>${i.l}</td><td class="amt">${m2(i.qty)} ${i.u}</td>
    <td class="amt"><input class="pr" data-price="${i.k}" inputmode="numeric" value="${i.price}" aria-label="Jednotková cena – ${esc(i.l)}"></td><td class="amt">${kc(i.sum)}</td></tr>`).join('')}`; }).join('');
  const per = c.uzit ? c.hruba / c.uzit : 0;
  return `<div class="dzsum"><div><b>${kc(c.hruba * (1 + c.rez))}</b><span>hrubá stavba vč. rezervy ${d.reserve} %</span></div><div><b>${kc(c.inst * (1 + c.rez))}</b><span>kanalizace a elektro</span></div><div><b>${kc(c.total)}</b><span>celkem</span></div></div>
  <div class="note">Výpočet bere výměry přímo z vašeho výkresu. Výchozí jednotkové ceny jsou hrubý odhad pro rok 2026 (materiál + práce, vč. 12 % DPH) – přepište je podle nabídek řemeslníků. Hrubá stavba tu znamená uzavřenou hrubou stavbu: základy, zdi, stropy, střecha, okna a vchodové dveře.</div>
  <div class="scroll"><table class="dzt cost"><thead><tr><th>Položka</th><th class="amt">Výměra</th><th class="amt">Kč / jedn.</th><th class="amt">Cena</th></tr></thead><tbody>${rows}
  <tr class="grp"><th colspan="3">Rezerva <input class="pr" data-reserve inputmode="numeric" value="${d.reserve}" style="width:64px" aria-label="Rezerva v procentech"> %</th><th class="amt">${kc((c.hruba + c.inst) * c.rez)}</th></tr>
  <tr class="grp tot"><th colspan="3">Celkem</th><th class="amt">${kc(c.total)}</th></tr></tbody></table></div>
  <p class="mute">Zastavěná plocha ${m2(c.zast)} m² · podlahová plocha místností ${m2(c.uzit)} m² · obestavěný prostor ${m2(c.obest)} m³ · střecha ${m2(c.roofA)} m².
  ${per ? `Hrubá stavba vychází na ${kc(per)} za m² podlahové plochy; běžně uváděné rozpětí je zhruba 10–25 tisíc Kč/m².` : ''}</p>
  <div class="row" style="justify-content:flex-start"><button data-dz="toplan">Převést do plánu rozpočtu</button><button class="ghost" data-dz="resetprices">Výchozí ceny</button></div>
  <p class="mute">Převod nastaví plán etap Zemní práce a základy, Hrubá stavba, Střecha, Okna a dveře a Instalace (vč. rezervy).</p>`;
}
/* ---------- dům na fotce pozemku ---------- */
const SITE = [['rot', 'Natočení domu', 0, 359, 1, '°'], ['scale', 'Velikost', 40, 250, 1, ' %'], ['pitch', 'Náklon fotoaparátu', -15, 45, .5, '°'], ['camH', 'Výška fotoaparátu', .5, 40, .1, ' m'], ['fov', 'Šířka záběru', 40, 100, 1, '°'], ['sun', 'Směr slunce', 0, 359, 1, '°']];
function siteDefaults() { const o = outline(D().floors[0]), sz = o ? Math.max(o.bb.X - o.bb.x, o.bb.Y - o.bb.y) : 12;
  return {x: 0, z: -(sz * 1.6 + 8), rot: 25, scale: 100, pitch: 4, camH: 1.6, fov: 68, sun: 35}; }
const siteVal = (k, v) => k === 'camH' ? m2(v) : Math.round(v);
function vSite() {
  const s = D().site;
  return `<p>Stoupněte si na místo, odkud chcete dům vidět (třeba z cesty před pozemkem), a vyfoťte pozemek na šířku. Dům se do fotky vloží i se stínem. Prstem nebo myší ho posunete, dvěma prsty otočíte a zvětšíte.</p>
  <div class="row" style="justify-content:flex-start;margin-bottom:12px"><label class="btn" style="margin:0">Vyfotit pozemek<input type="file" accept="image/*" capture="environment" data-sitefile hidden></label>
  <label class="btn ghost" style="margin:0;background:transparent;color:var(--ink);border-color:var(--line)">Vybrat fotku z galerie<input type="file" accept="image/*" data-sitefile hidden></label></div>
  ${s && s.photo ? `<div class="site" id="site"><img id="siteimg" alt="Fotka pozemku"><canvas id="sitecv" aria-label="Dům vložený do fotky pozemku"></canvas><div class="sitebusy" id="sitebusy">Připravuji model…</div></div>
  <div class="sitectl">${SITE.map(([k, l, mn, mx, st, u]) => `<label>${l} <output id="so_${k}">${siteVal(k, s[k])}${u}</output><input type="range" data-site="${k}" min="${mn}" max="${mx}" step="${st}" value="${s[k]}"></label>`).join('')}</div>
  <p class="mute">Tip: nejdřív nastavte náklon a šířku záběru tak, aby stín a základy seděly na terén, pak dům posuňte a zvětšete. Výška fotoaparátu se hodí pro fotky z okna nebo z dronu.</p>
  <div class="row" style="justify-content:flex-start"><button data-dz="sitesave">Uložit obrázek</button><button class="ghost" data-dz="sitediary">Uložit do deníku</button><button class="ghost" data-dz="sitereset">Výchozí umístění</button><button class="del" data-dz="sitedel">Odebrat fotku</button></div>`
  : '<div class="empty">Zatím žádná fotka pozemku.</div>'}`;
}
let siteCtl = null;
async function mountSite(root) {
  const img = root.querySelector('#siteimg'), cv = root.querySelector('#sitecv'), s = D().site; if (!img) return;
  const u = await B().photoUrl(s.photo) || s.src; if (!u) { document.getElementById('sitebusy').textContent = 'Fotku se nepodařilo načíst.'; return; }
  img.src = u; await img.decode().catch(() => {});
  const ar = img.naturalWidth / img.naturalHeight, st = root.querySelector('#site').style; st.aspectRatio = String(ar); st.width = `min(100%, calc(72vh * ${ar}))`;
  try {
    const m = await import('./house3d.js'); if (!cv.isConnected) return;
    siteCtl?.dispose(); siteCtl = m.mountSite(cv, s, p => { Object.assign(s, p); for (const k of ['rot', 'scale']) { const el = root.querySelector(`[data-site="${k}"]`); if (el) { el.value = s[k]; root.querySelector('#so_' + k).textContent = siteVal(k, s[k]) + SITE.find(x => x[0] === k)[5]; } } }, () => B().persist());
    document.getElementById('sitebusy').remove();
  } catch (e) { document.getElementById('sitebusy').textContent = 'Tento prohlížeč neumí 3D (WebGL), dům do fotky vložit nejde.'; console.warn(e); }
}
async function siteFile(file) {
  try {
    const blob = await B().shrink(file, 2200, .88), d = D(), old = d.site?.photo, keep = d.site ? {...d.site} : siteDefaults();
    if (B().idbOk) { const id = 'site-' + B().uid(); await B().DB.put('photos', id, blob); d.site = {...keep, photo: id, src: undefined}; if (old) B().DB.del('photos', old).catch(() => {}); }
    else { const r = new FileReader(); d.site = {...keep, photo: 'inline', src: await new Promise(ok => { r.onload = () => ok(r.result); r.readAsDataURL(blob); })}; }
    B().save();
  } catch (e) { B().toast('Fotku se nepodařilo načíst'); }
}
function vVykresy() {
  const m = D().meta;
  return `<p>Z návrhu se sestaví sada výkresů na A4 na šířku: technická zpráva, půdorysy, kanalizace, elektro, 3D pohled a výkaz výměr s cenou. Tisk uložíte jako PDF.</p>
  <div class="dzform"><label>Investor<input data-meta="investor" value="${esc(m.investor)}"></label><label>Místo stavby<input data-meta="place" value="${esc(m.place)}"></label><label>Vypracoval<input data-meta="author" value="${esc(m.author)}"></label></div>
  <div class="row" style="justify-content:flex-start;margin:14px 0"><button data-dz="print">Vytisknout / uložit PDF</button></div>
  <div class="note">Je to návrh a podklad pro projektanta, ne dokumentace pro povolení stavby. Projektovou dokumentaci k žádosti o povolení musí zpracovat a podepsat autorizovaná osoba (ČKAIT nebo ČKA); elektro a kanalizaci navrhuje projektant příslušné profese.</div>
  <div class="pv" id="pv">${printDoc(true)}</div>`;
}

/* ---------- tisk ---------- */
function stamp(title, n, scale) {
  const d = D(), m = d.meta;
  return `<table class="stamp"><tr><td>Stavba</td><td colspan="3"><b>${esc(S().name)}</b></td></tr><tr><td>Místo</td><td colspan="3">${esc(m.place || '–')}</td></tr>
  <tr><td>Investor</td><td>${esc(m.investor || '–')}</td><td>Vypracoval</td><td>${esc(m.author || '–')}</td></tr>
  <tr><td>Výkres</td><td><b>${esc(title)}</b></td><td>Č. výkresu</td><td><b>${n}</b></td></tr><tr><td>Měřítko</td><td>${scale || '–'}</td><td>Datum</td><td>${new Date().toLocaleDateString('cs-CZ')}</td></tr></table>`;
}
function sheetPlan(f, layer, title, n) {
  const bb = bbox(f), pad = 1.6, w = bb.X - bb.x + 2 * pad, h = bb.Y - bb.y + 2 * pad;
  const sc = [50, 100, 200, 500].find(s => w * 1000 / s <= 270 && h * 1000 / s <= 150) || 500;
  let leg = '';
  if (layer === 'odpady') leg = `<div class="leg">${Object.keys(DN).reverse().map(k => `<span><i class="sw" style="background:${DN[k]}"></i>DN ${k}</span>`).join('')}<span>spád 2 % ve směru toku</span></div>`;
  if (layer === 'elektro') leg = `<div class="leg">${D().circuits.map(c => `<span><i class="sw" style="background:${CC[c.id % CC.length]}"></i>${c.id} ${esc(c.name)} (${esc(c.jistic)})</span>`).join('')}</div>
   <div class="leg">${Object.entries(EL).map(([k, v]) => `<span><svg viewBox="-.35 -.35 .7 .7" width="16" height="16">${elSym({type: k, x: 0, y: 0, circ: 0}).replace(/<text[^>]*>[^<]*<\/text>/, '')}</svg>${v.l}</span>`).join('')}</div>`;
  return `<section class="psheet"><h3>${esc(title)} – ${esc(f.name)}</h3>
  <svg viewBox="${bb.x - pad} ${bb.y - pad} ${w} ${h}" style="width:${w * 1000 / sc}mm;height:${h * 1000 / sc}mm" xmlns="http://www.w3.org/2000/svg" font-family="Archivo,sans-serif">${planInner(f, layer, true)}${layer === 'stavba' ? overallDims(f) : ''}</svg>
  ${leg}${stamp(title + ' – ' + f.name, n, '1:' + sc)}</section>`;
}
function printDoc(preview) {
  const d = D(), c = calc(); let n = 1; const out = [];
  out.push(`<section class="psheet"><h3>Technická zpráva (souhrn návrhu)</h3><div class="cols">
  <table class="dzt"><tbody><tr><td>Počet nadzemních podlaží</td><td class="amt">${d.floors.length}</td></tr><tr><td>Zastavěná plocha</td><td class="amt">${m2(c.zast)} m²</td></tr>
  <tr><td>Podlahová plocha místností</td><td class="amt">${m2(c.uzit)} m²</td></tr><tr><td>Obestavěný prostor (odhad)</td><td class="amt">${m2(c.obest)} m³</td></tr>
  <tr><td>Konstrukční výška podlaží</td><td class="amt">${d.floors.map(f => m2(f.h)).join(' / ')} m</td></tr><tr><td>Střecha</td><td class="amt">${roofLabel(d.roof)}${d.roof.type === 'plocha' ? '' : ', sklon ' + d.roof.pitch + '°'}, přesah ${m2(d.roof.over)} m</td></tr>
  <tr><td>Výška hřebene nad terénem (odhad)</td><td class="amt">${m2(c.H + .3 + c.rh)} m</td></tr><tr><td>Obvodové zdi</td><td class="amt">tl. ${[...new Set(d.floors.flatMap(f => f.walls.filter(w => w.kind === 'ext').map(w => m2(w.t * 100))))].join(', ') || '–'} cm</td></tr></tbody></table>
  <table class="dzt"><thead><tr><th>Podlaží</th><th>Místnost</th><th class="amt">Plocha</th></tr></thead><tbody>${c.rooms.map(r => `<tr><td>${esc(r.f)}</td><td>${esc(r.n)}</td><td class="amt">${m2(r.a)} m²</td></tr>`).join('')}</tbody></table></div>
  <p class="small">Návrh zpracovaný stavebníkem jako podklad pro projektanta. Nenahrazuje projektovou dokumentaci pro povolení stavby, kterou zpracovává autorizovaná osoba.</p>${stamp('Technická zpráva', n++)}</section>`);
  for (const f of d.floors) out.push(sheetPlan(f, 'stavba', 'Půdorys', n++));
  for (const f of d.floors) if (f.pipes.length || f.fix.length) out.push(sheetPlan(f, 'odpady', 'Kanalizace', n++));
  for (const f of d.floors) if (f.elec.length || f.cables.length) out.push(sheetPlan(f, 'elektro', 'Elektroinstalace', n++));
  out.push(`<section class="psheet"><h3>3D pohled</h3><img class="p3d" data-p3d alt="3D pohled na dům">${stamp('3D pohled', n++)}</section>`);
  out.push(`<section class="psheet"><h3>Výkaz výměr a orientační cena</h3><table class="dzt cost small"><thead><tr><th>Položka</th><th class="amt">Výměra</th><th class="amt">Kč/jedn.</th><th class="amt">Cena</th></tr></thead><tbody>
  ${Object.entries(GROUPS).map(([g, gl]) => `<tr class="grp"><th colspan="3">${gl}</th><th class="amt">${kc(c.sum([g]))}</th></tr>${c.items.filter(i => i.g === g && i.qty).map(i => `<tr><td>${i.l}</td><td class="amt">${m2(i.qty)} ${i.u}</td><td class="amt">${kc(i.price)}</td><td class="amt">${kc(i.sum)}</td></tr>`).join('')}`).join('')}
  <tr class="grp"><th colspan="3">Rezerva ${d.reserve} %</th><th class="amt">${kc((c.hruba + c.inst) * c.rez)}</th></tr><tr class="grp tot"><th colspan="3">Celkem orientačně</th><th class="amt">${kc(c.total)}</th></tr></tbody></table>${stamp('Výkaz výměr', n++)}</section>`);
  return out.join('');
}
async function fill3dImages(root) {
  const img = root.querySelectorAll('[data-p3d]'); if (!img.length) return;
  let u = null;
  try { u = (await import('./house3d.js')).snapshot(1600, 900); } catch (e) {}
  if (!u) { const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 900; draw3D(cv, {roof: true, inst: false, cut: false, yaw: -.75, pitch: .45, zoom: 1}, true); u = cv.toDataURL('image/png'); }
  img.forEach(i => i.src = u);
}
function doPrint() {
  document.getElementById('printdoc')?.remove();
  const p = document.createElement('div'); p.id = 'printdoc'; p.innerHTML = printDoc(); document.body.append(p); fill3dImages(p);
  setTimeout(() => print(), 150);
  addEventListener('afterprint', () => p.remove(), {once: true});
}

/* ---------- 3D ---------- */
function faces3D(o) {
  const d = D(), fs = [], P = (x, y, z) => [x, -y, z];
  let roofPass = false; const quad = (a, c, al = 1) => fs.push({v: a, c, a: al, r: roofPass});
  const box = (w, a, b, z0, z1, c, ext0, ext1) => { // úsek zdi mezi vzdálenostmi a..b od začátku, dělený na kusy kvůli řazení ploch
    const {ux, uy, nx, ny} = dirs(w), t = w.t / 2, A = a - ext0, Bq = b + ext1; if (Bq - A < .005) return;
    const p = (s2, k, z2) => P(w.x1 + ux * s2 + nx * k, w.y1 + uy * s2 + ny * k, z2), n = Math.max(1, Math.ceil((Bq - A) / 1.2));
    let cen = p((A + Bq) / 2, 0, (z0 + z1) / 2);
    const out = v => { const m = v.reduce((q, x) => [q[0] + x[0] / 4, q[1] + x[1] / 4, q[2] + x[2] / 4], [0, 0, 0]); return [m[0] - cen[0], m[1] - cen[1], m[2] - cen[2]]; };
    const Q = v => fs.push({v, c, a: 1, r: roofPass, o: out(v)});
    for (let i = 0; i < n; i++) { const s0 = A + (Bq - A) * i / n, s1 = A + (Bq - A) * (i + 1) / n; cen = p((s0 + s1) / 2, 0, (z0 + z1) / 2);
      Q([p(s0, -t, z0), p(s1, -t, z0), p(s1, -t, z1), p(s0, -t, z1)]); Q([p(s0, t, z0), p(s1, t, z0), p(s1, t, z1), p(s0, t, z1)]);
      Q([p(s0, -t, z1), p(s1, -t, z1), p(s1, t, z1), p(s0, t, z1)]); Q([p(s0, -t, z0), p(s1, -t, z0), p(s1, t, z0), p(s0, t, z0)]); }
    cen = p((A + Bq) / 2, 0, (z0 + z1) / 2); Q([p(A, -t, z0), p(A, t, z0), p(A, t, z1), p(A, -t, z1)]); Q([p(Bq, -t, z0), p(Bq, t, z0), p(Bq, t, z1), p(Bq, -t, z1)]);
  };
  let z = 0;
  const top = d.floors.length - 1, lim = o.cut ? ui.floor : top;
  d.floors.forEach((f, fi) => {
    if (fi > lim) return;
    const ol = outline(f), H = f.h;
    if (ol) quad(ol.poly.map(([x, y]) => P(x, y, z + .01)), [178, 176, 168]);
    if (fi === 0 && ol) { const b = ol.bb; box({x1: b.x, y1: (b.y + b.Y) / 2, x2: b.X, y2: (b.y + b.Y) / 2, t: b.Y - b.y}, 0, b.X - b.x, -.3, 0, [140, 142, 136], 0, 0); }
    const joined = (x, y, w) => { // prodloužení konce zdi: do rohu o půl tloušťky, u napojení na silnější zeď jen k jejímu líci
      const ot = f.walls.filter(v => v !== w && ((Math.abs(v.x1 - x) < .02 && Math.abs(v.y1 - y) < .02) || (Math.abs(v.x2 - x) < .02 && Math.abs(v.y2 - y) < .02) || onWall(v, x, y)));
      if (!ot.length) return 0; const mx = Math.max(...ot.map(v => v.t)); return mx > w.t + .01 ? -mx / 2 : w.t / 2; };
    for (const w of f.walls) {
      const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), LK = look(), l = L(w), col = w.kind === 'ext' ? hx(LK.wall) : w.kind === 'load' ? [214, 208, 196] : [242, 240, 234];
      const e0 = joined(w.x1, w.y1, w), e1 = joined(w.x2, w.y2, w);
      const ops = f.open.filter(x => x.wall === w.id).map(x => [Math.max(0, x.pos - x.w / 2), Math.min(l, x.pos + x.w / 2), x]).sort((a, b) => a[0] - b[0]);
      let s = 0;
      ops.forEach(([a, b, x], i) => {
        if (a > s) box(w, s, a, z, z + H, col, s === 0 ? e0 : 0, 0);
        if (x.sill > 0) box(w, a, b, z, z + x.sill, col, 0, 0);
        if (x.sill + x.h < H) box(w, a, b, z + x.sill + x.h, z + H, col, 0, 0);
        const {ux, uy} = dirs(w), q = (sv, zz) => P(w.x1 + ux * sv, w.y1 + uy * sv, zz);
        if (x.type === 'window' || x.w > 1.25) quad([q(a, z + x.sill), q(b, z + x.sill), q(b, z + x.sill + x.h), q(a, z + x.sill + x.h)], [120, 170, 200], .55);
        else if (w.kind === 'ext') quad([q(a, z), q(b, z), q(b, z + x.h), q(a, z + x.h)], [96, 70, 48]);
        s = b;
      });
      if (s < l) box(w, s, l, z, z + H, col, ops.length ? 0 : e0, e1); else if (!ops.length) box(w, 0, l, z, z + H, col, e0, e1);
    }
    z += H;
  });
  roofPass = true;
  if (o.roof && !o.inst && lim === top) {
    const ol = outline(d.floors[top]);
    if (ol) {
      const r = d.roof, b = ol.bb, x0 = b.x - r.over, x1 = b.X + r.over, y0 = b.y - r.over, y1 = b.Y + r.over, rh = roofH(d, b), c = [1, 3, 5].map(i => parseInt(look().roof.slice(i, i + 2), 16)), g = [1, 3, 5].map(i => parseInt(look().wall.slice(i, i + 2), 16));
      const along = (x1 - x0) >= (y1 - y0);
      if (r.type === 'plocha') { box({x1: x0, y1: (y0 + y1) / 2, x2: x1, y2: (y0 + y1) / 2, t: y1 - y0}, 0, x1 - x0, z, z + .3, [90, 94, 90], 0, 0); }
      else if (r.type === 'pultova') {
        const k = along ? [P(x0, y0, z + rh), P(x1, y0, z + rh), P(x1, y1, z), P(x0, y1, z)] : [P(x0, y0, z + rh), P(x0, y1, z + rh), P(x1, y1, z), P(x1, y0, z)]; quad(k, c);
        if (along) { quad([P(b.x, b.y, z), P(b.x, b.y, z + rh), P(b.x, b.Y, z)], g); quad([P(b.X, b.y, z), P(b.X, b.y, z + rh), P(b.X, b.Y, z)], g); quad([P(b.x, b.y, z), P(b.X, b.y, z), P(b.X, b.y, z + rh), P(b.x, b.y, z + rh)], g); }
        else { quad([P(b.x, b.y, z), P(b.x, b.y, z + rh), P(b.X, b.y, z)], g); quad([P(b.x, b.Y, z), P(b.x, b.Y, z + rh), P(b.X, b.Y, z)], g); quad([P(b.x, b.y, z), P(b.x, b.Y, z), P(b.x, b.Y, z + rh), P(b.x, b.y, z + rh)], g); }
      } else if (r.type === 'stanova') {
        const a = P((x0 + x1) / 2, (y0 + y1) / 2, z + rh);
        quad([P(x0, y0, z), P(x1, y0, z), a], c); quad([P(x1, y0, z), P(x1, y1, z), a], c); quad([P(x1, y1, z), P(x0, y1, z), a], c); quad([P(x0, y1, z), P(x0, y0, z), a], c);
      } else if (along) {
        const ym = (y0 + y1) / 2, hip = r.type === 'valbova' ? (y1 - y0) / 2 : 0;
        quad([P(x0, y0, z), P(x1, y0, z), P(x1 - hip, ym, z + rh), P(x0 + hip, ym, z + rh)], c); quad([P(x0, y1, z), P(x1, y1, z), P(x1 - hip, ym, z + rh), P(x0 + hip, ym, z + rh)], c);
        if (hip) { quad([P(x0, y0, z), P(x0, y1, z), P(x0 + hip, ym, z + rh)], c); quad([P(x1, y0, z), P(x1, y1, z), P(x1 - hip, ym, z + rh)], c); }
        else { const bm = (b.y + b.Y) / 2, hh = rh * (b.Y - b.y) / (y1 - y0); quad([P(b.x, b.y, z), P(b.x, b.Y, z), P(b.x, bm, z + hh)], g); quad([P(b.X, b.y, z), P(b.X, b.Y, z), P(b.X, bm, z + hh)], g); }
      } else {
        const xm = (x0 + x1) / 2, hip = r.type === 'valbova' ? (x1 - x0) / 2 : 0;
        quad([P(x0, y0, z), P(x0, y1, z), P(xm, y1 - hip, z + rh), P(xm, y0 + hip, z + rh)], c); quad([P(x1, y0, z), P(x1, y1, z), P(xm, y1 - hip, z + rh), P(xm, y0 + hip, z + rh)], c);
        if (hip) { quad([P(x0, y0, z), P(x1, y0, z), P(xm, y0 + hip, z + rh)], c); quad([P(x0, y1, z), P(x1, y1, z), P(xm, y1 - hip, z + rh)], c); }
        else { const bm = (b.x + b.X) / 2, hh = rh * (b.X - b.x) / (x1 - x0); quad([P(b.x, b.y, z), P(b.X, b.y, z), P(bm, b.y, z + hh)], g); quad([P(b.x, b.Y, z), P(b.X, b.Y, z), P(bm, b.Y, z + hh)], g); }
      }
    }
  }
  const lines = [];
  if (o.inst) { let zz = 0; d.floors.forEach((f, fi) => { if (fi > lim) return;
    for (const p of f.pipes) lines.push({pts: p.pts.map(([x, y]) => P(x, y, zz + .03)), c: DN[p.dn] || DN[50], w: p.dn >= 110 ? 4 : 2.5});
    for (const c of f.cables) lines.push({pts: c.pts.map(([x, y]) => P(x, y, zz + 2.6)), c: CC[(c.circ || 0) % CC.length], w: 1.5});
    for (const e of f.elec) { const k = EL[e.type] || EL.zas; lines.push({dot: P(e.x, e.y, zz + (k.z < 0 ? f.h - .35 : k.z)), c: CC[(e.circ || 0) % CC.length]}); }
    zz += f.h; }); }
  return {fs, lines};
}
function onWall(w, x, y) { const {ux, uy, nx, ny, l} = dirs(w), s = (x - w.x1) * ux + (y - w.y1) * uy, k = (x - w.x1) * nx + (y - w.y1) * ny; return s > .02 && s < l - .02 && Math.abs(k) < w.t / 2 + .02; }
function draw3D(cv, o, print) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, {fs, lines} = faces3D(o);
  const all = fs.flatMap(f => f.v); if (!all.length) { ctx.clearRect(0, 0, W, H); return; }
  const mn = [0, 1, 2].map(i => Math.min(...all.map(v => v[i]))), mx = [0, 1, 2].map(i => Math.max(...all.map(v => v[i])));
  const T = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 3], size = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  const dist = size * (W < H ? 2.3 : 1.7) / o.zoom, cp = Math.cos(o.pitch), C = [T[0] + dist * cp * Math.cos(o.yaw), T[1] + dist * cp * Math.sin(o.yaw), T[2] + dist * Math.sin(o.pitch)];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  const fw = nrm(sub(T, C)), rt = nrm(cross(fw, [0, 0, 1])), up = cross(rt, fw), foc = Math.min(W, H) * 1.6;
  const pr = v => { const p = sub(v, C), zc = dot(p, fw); return [W / 2 + dot(p, rt) / zc * foc, H / 2 - dot(p, up) / zc * foc, zc]; };
  const dark = matchMedia('(prefers-color-scheme: dark)').matches && !print;
  ctx.fillStyle = print ? '#fff' : dark ? '#1e211d' : '#efede7'; ctx.fillRect(0, 0, W, H);
  // terén
  const gr = [[mn[0] - size, mn[1] - size, -.31], [mx[0] + size, mn[1] - size, -.31], [mx[0] + size, mx[1] + size, -.31], [mn[0] - size, mx[1] + size, -.31]].map(pr);
  if (gr.every(p => p[2] > 0)) { ctx.fillStyle = dark ? '#2c3a28' : '#cfdcc0'; ctx.beginPath(); gr.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); }
  const Ld = nrm([.5, .35, .8]);
  const list = fs.map(f => { const pp = f.v.map(pr), cen = f.v.reduce((a, v) => [a[0] + v[0] / f.v.length, a[1] + v[1] / f.v.length, a[2] + v[2] / f.v.length], [0, 0, 0]);
    let n = nrm(cross(sub(f.v[1], f.v[0]), sub(f.v[2], f.v[0]))); if (dot(n, sub(C, cen)) < 0) n = n.map(x => -x);
    return {f, pp, d: Math.hypot(...sub(cen, C)), l: .62 + .38 * Math.max(0, dot(n, Ld)), back: f.o && dot(f.o, sub(C, cen)) <= 0}; }).filter(x => !x.back && x.pp.every(p => p[2] > .05));
  list.sort((a, b) => (a.f.r - b.f.r) || (b.d - a.d));
  for (const {f, pp, l} of list) {
    const [r, g, b] = f.c.map(x => Math.round(x * l));
    ctx.beginPath(); pp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${f.a})`; ctx.fill(); ctx.strokeStyle = f.o ? ctx.fillStyle : `rgba(${r * .6 | 0},${g * .6 | 0},${b * .6 | 0},${f.a})`; ctx.lineWidth = (f.o ? .9 : .6) * (W / 800); ctx.stroke();
  }
  for (const ln of lines) {
    ctx.strokeStyle = ctx.fillStyle = ln.c;
    if (ln.dot) { const p = pr(ln.dot); if (p[2] > 0) { ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 * (W / 800), 0, 7); ctx.fill(); } continue; }
    const pp = ln.pts.map(pr); if (pp.some(p => p[2] <= 0)) continue;
    ctx.lineWidth = ln.w * (W / 800); ctx.beginPath(); pp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
}
let h3 = null;
async function mount3D(cv) {
  h3 = null;
  try { const m = await import('./house3d.js'); if (!cv.isConnected) return; h3 = m.mount(cv, ui.r3); return; }
  catch (e) { console.warn('WebGL 3D nedostupné, použije se jednoduchý model', e); }
  legacy3D(cv);
}
function legacy3D(cv) {
  const fit = () => { const r = cv.getBoundingClientRect(), k = devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; draw3D(cv, ui.r3); };
  fit(); new ResizeObserver(() => fit()).observe(cv);
  const pts = new Map(); let last = null, pin = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY];
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pin = {d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: ui.r3.zoom}; } });
  cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pin && pts.size === 2) { const [a, b] = [...pts.values()]; ui.r3.zoom = Math.max(.3, Math.min(6, pin.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pin.d)); }
    else if (last) { ui.r3.yaw -= (e.clientX - last[0]) * .01; ui.r3.pitch = Math.max(.05, Math.min(1.5, ui.r3.pitch + (e.clientY - last[1]) * .008)); last = [e.clientX, e.clientY]; }
    draw3D(cv, ui.r3); });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pin = null; last = pts.size ? [...pts.values()][0] : null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); ui.r3.zoom = Math.max(.3, Math.min(6, ui.r3.zoom * Math.exp(-e.deltaY * .0015))); draw3D(cv, ui.r3); }, {passive: false});
}

/* ---------- editor půdorysu ---------- */
let svgEl = null;
function fitView(svg) {
  const bb = bbox(F()), r = svg.getBoundingClientRect(), pad = 1.5, w = bb.X - bb.x + 2 * pad, h = bb.Y - bb.y + 2 * pad;
  const s = Math.min(r.width / w, r.height / h) || 40; ui.V = {s, x: bb.x - pad - (r.width / s - w) / 2, y: bb.y - pad - (r.height / s - h) / 2};
}
function applyView(svg) { const r = svg.getBoundingClientRect(), V = ui.V; svg.setAttribute('viewBox', `${V.x} ${V.y} ${r.width / V.s} ${r.height / V.s}`); }
function drawPlan(svg) {
  const f = F(), under = ui.floor > 0 ? D().floors[ui.floor - 1] : null;
  svg.innerHTML = `<defs><pattern id="dzg" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="var(--line)" stroke-width=".015"/></pattern></defs>
  <rect x="-200" y="-200" width="400" height="400" fill="url(#dzg)"/>
  ${under ? `<g opacity=".18" pointer-events="none">${under.walls.map(w => `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="var(--ink)" stroke-width="${w.t}" stroke-linecap="square"/>`).join('')}</g>` : ''}
  <g font-family="Archivo,system-ui,sans-serif">${planInner(f, ui.tab, false)}</g><g id="dzdraft" pointer-events="none"></g>`;
  drawDraft();
}
function drawDraft(cur) {
  const g = svgEl?.querySelector('#dzdraft'); if (!g) return;
  const d = ui.draft, read = document.getElementById('dzread'), lenEl = document.getElementById('dzlen');
  if (read) read.hidden = !d;
  if (!d) { g.innerHTML = cur ? `<circle cx="${cur.x}" cy="${cur.y}" r=".07" fill="var(--acc)"/>` : ''; return; }
  const pts = d.pts.concat(cur ? [cur] : []), c = 'var(--acc)';
  let s = '';
  if (d.kind === 'room') { if (cur) { const x = Math.min(d.pts[0].x, cur.x), y = Math.min(d.pts[0].y, cur.y), w = Math.abs(cur.x - d.pts[0].x), h = Math.abs(cur.y - d.pts[0].y);
    s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--acc)" fill-opacity=".12" stroke="${c}" stroke-width=".03"/>`; if (lenEl) lenEl.textContent = `${m2(w)} × ${m2(h)} m = ${m2(w * h)} m²`; } }
  else {
    const t = d.kind.startsWith('wall') ? WALL[d.kind.slice(5)].t : .05;
    s = `<polyline points="${pts.map(p => p.x + ',' + p.y).join(' ')}" fill="none" stroke="${c}" stroke-opacity="${d.kind.startsWith('wall') ? .45 : .9}" stroke-width="${t}" stroke-linecap="square" stroke-linejoin="miter"/>`;
    if (cur && d.pts.length && lenEl) { const a = d.pts[d.pts.length - 1]; lenEl.textContent = `${m2(Math.hypot(cur.x - a.x, cur.y - a.y))} m` + (d.kind.startsWith('wall') ? '' : ` · celkem ${m2(plen(pts.map(p => [p.x, p.y])))} m`); }
    else if (lenEl) lenEl.textContent = d.kind.startsWith('wall') ? 'Klepněte na další bod' : `${m2(plen(d.pts.map(p => [p.x, p.y])))} m`;
  }
  s += pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r=".07" fill="${c}"/>`).join('');
  g.innerHTML = s;
}
const grid = v => Math.round(v / .05) * .05;
function snap(p, from) {
  const f = F(), tol = 14 / ui.V.s; let best = null, bd = tol;
  const cand = f.walls.flatMap(w => [[w.x1, w.y1], [w.x2, w.y2]]);
  if (ui.tab === 'odpady') for (const x of f.fix) cand.push([x.x, x.y]);
  for (const p2 of [...f.pipes, ...f.cables]) cand.push(...p2.pts);
  if (ui.draft) cand.push(...ui.draft.pts.map(q => [q.x, q.y]));
  for (const c of cand) { const d = Math.hypot(c[0] - p.x, c[1] - p.y); if (d < bd) { bd = d; best = {x: c[0], y: c[1]}; } }
  if (best) return best;
  const q = {x: r2(grid(p.x)), y: r2(grid(p.y))};
  if (from) { const dx = q.x - from.x, dy = q.y - from.y; if (Math.abs(dy) < Math.abs(dx) * .15) q.y = from.y; else if (Math.abs(dx) < Math.abs(dy) * .15) q.x = from.x; }
  return q;
}
function nearestWall(p, max = .7) {
  let best = null, bd = max;
  for (const w of F().walls) { const {ux, uy, nx, ny, l} = dirs(w), s = (p.x - w.x1) * ux + (p.y - w.y1) * uy, k = (p.x - w.x1) * nx + (p.y - w.y1) * ny;
    if (s < 0 || s > l) continue; if (Math.abs(k) < bd) { bd = Math.abs(k); best = {w, s, k}; } }
  return best;
}
function finishDraft() {
  const d = ui.draft; ui.draft = null;
  if (d && (d.kind === 'pipe' || d.kind === 'cable') && d.pts.length > 1) {
    const pts = d.pts.map(p => [p.x, p.y]);
    return mut(() => d.kind === 'pipe' ? F().pipes.push({id: uid(), dn: +ui.dn, pts}) : F().cables.push({id: uid(), circ: +ui.circ, pts}));
  }
  B().render();
}
function tap(p, target) {
  const t = ui.tool, f = F();
  if (t === 'select') { const g = target.closest?.('[data-k]'); if (g) edit(g.dataset.k, g.dataset.id); return; }
  if (t.startsWith('wall')) {
    const last = ui.draft?.pts[ui.draft.pts.length - 1], q = snap(p, last);
    if (!ui.draft) { ui.draft = {kind: t, pts: [q]}; return drawDraft(); }
    if (Math.hypot(q.x - last.x, q.y - last.y) < .04) return finishDraft();
    const first = ui.draft.pts[0], closed = Math.hypot(q.x - first.x, q.y - first.y) < .02;
    const kind = t.slice(5);
    ui.draft.pts.push(q); if (closed) ui.draft = null;
    return mut(() => f.walls.push({id: uid(), x1: last.x, y1: last.y, x2: q.x, y2: q.y, kind, t: WALL[kind].t}));
  }
  if (t === 'window' || t === 'door') {
    const nw = nearestWall(p); if (!nw) return B().toast('Klepněte blíž ke zdi');
    const ext = nw.w.kind === 'ext', o = t === 'window' ? {w: 1.2, h: 1.5, sill: .9} : {w: ext ? 1 : .8, h: ext ? 2.1 : 1.97, sill: 0};
    const pos = r2(Math.max(o.w / 2, Math.min(L(nw.w) - o.w / 2, grid(nw.s)))), x = {id: uid(), wall: nw.w.id, pos, type: t, ...o};
    mut(() => f.open.push(x)); return edit('open', x.id);
  }
  if (t === 'room') {
    const q = {x: r2(grid(p.x)), y: r2(grid(p.y))};
    if (!ui.draft) { ui.draft = {kind: 'room', pts: [q]}; return drawDraft(); }
    const a = ui.draft.pts[0]; ui.draft = null;
    const r = {id: uid(), name: 'Místnost', x: Math.min(a.x, q.x), y: Math.min(a.y, q.y), w: r2(Math.abs(q.x - a.x)), h: r2(Math.abs(q.y - a.y))};
    if (r.w < .3 || r.h < .3) return B().render();
    mut(() => f.rooms.push(r)); return edit('rooms', r.id);
  }
  if (t === 'pipe' || t === 'cable') {
    const last = ui.draft?.pts[ui.draft.pts.length - 1], q = snap(p, last);
    if (!ui.draft) { ui.draft = {kind: t, pts: [q]}; return drawDraft(); }
    if (Math.hypot(q.x - last.x, q.y - last.y) < .04) return finishDraft();
    ui.draft.pts.push(q); return drawDraft();
  }
  if (t === 'fix') { const x = {id: uid(), type: ui.fix, x: r2(grid(p.x)), y: r2(grid(p.y)), rot: 0}; return mut(() => f.fix.push(x)); }
  if (t === 'el') {
    const e = {id: uid(), type: ui.el, x: r2(grid(p.x)), y: r2(grid(p.y)), rot: 0, circ: ui.el === 'rozv' ? 0 : +ui.circ};
    const nw = ui.el === 'svet' ? null : nearestWall(p, .5);
    if (nw) { const {ux, uy, nx, ny} = dirs(nw.w), sd = nw.k >= 0 ? 1 : -1, off = nw.w.t / 2 + .14;
      e.x = r2(nw.w.x1 + ux * nw.s + nx * off * sd); e.y = r2(nw.w.y1 + uy * nw.s + ny * off * sd);
      e.rot = Math.round((Math.atan2(ny * sd, nx * sd) * 180 / Math.PI + 90 + 360) % 360); }
    return mut(() => f.elec.push(e));
  }
}
function mountPlan(svg) {
  svgEl = svg; if (!ui.V || ui.Vfloor !== ui.floor + ui.tab) { fitView(svg); ui.Vfloor = ui.floor + ui.tab; }
  applyView(svg); drawPlan(svg);
  new ResizeObserver(() => applyView(svg)).observe(svg);
  const toM = (cx, cy) => { const r = svg.getBoundingClientRect(); return {x: ui.V.x + (cx - r.left) / ui.V.s, y: ui.V.y + (cy - r.top) / ui.V.s}; };
  const pts = new Map(); let st = null, pin = null;
  const zoomAt = (cx, cy, k) => { const m = toM(cx, cy), s = Math.max(8, Math.min(600, ui.V.s * k)); ui.V.x = m.x - (m.x - ui.V.x) * ui.V.s / s; ui.V.y = m.y - (m.y - ui.V.y) * ui.V.s / s; ui.V.s = s; applyView(svg); };
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pin = {d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: ui.V.s}; st = null; }
    else st = {x: e.clientX, y: e.clientY, vx: ui.V.x, vy: ui.V.y, target: e.target, moved: false};
  });
  svg.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pin && pts.size === 2) { const [a, b] = [...pts.values()], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; zoomAt(mid[0], mid[1], pin.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pin.d / ui.V.s); return; }
    if (st) { const dx = e.clientX - st.x, dy = e.clientY - st.y; if (Math.hypot(dx, dy) > 6) st.moved = true;
      if (st.moved) { ui.V.x = st.vx - dx / ui.V.s; ui.V.y = st.vy - dy / ui.V.s; applyView(svg); } return; }
    if (e.pointerType === 'mouse' && ui.tool !== 'select') { const m = toM(e.clientX, e.clientY), last = ui.draft?.pts[ui.draft.pts.length - 1];
      drawDraft(ui.tool === 'room' ? {x: r2(grid(m.x)), y: r2(grid(m.y))} : ['fix', 'el', 'window', 'door'].includes(ui.tool) ? null : snap(m, last)); }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pin = null; if (st && !st.moved && pts.size === 0) { const s0 = st; st = null; tap(toM(e.clientX, e.clientY), s0.target); } if (!pts.size) st = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', e => { pts.delete(e.pointerId); st = null; pin = null; });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .0015)); }, {passive: false});
}

/* ---------- úpravy prvků ---------- */
const dec = (k, l) => ({k, l, type: 'dec'});
function edit(k, id) {
  const f = F(), it = f[k].find(x => x.id === id); if (!it) return;
  const del = () => mut(() => { f[k].splice(f[k].indexOf(it), 1); if (k === 'walls') f.open = f.open.filter(o => o.wall !== it.id); });
  const S2 = v => String(v);
  if (k === 'walls') return B().form('Zeď', [{k: 'kind', l: 'Druh', type: 'select', opts: Object.entries(WALL).map(([a, b]) => [a, b.l])}, dec('len', 'Délka (m, osa zdi)'), dec('t', 'Tloušťka (m)')],
    {kind: it.kind, len: m2(L(it)), t: m2(it.t)}, o => mut(() => { const {ux, uy} = dirs(it), l = num(o.len);
      if (it.kind !== o.kind && num(o.t) === it.t) it.t = WALL[o.kind].t; else it.t = num(o.t) || it.t; it.kind = o.kind;
      if (l > .05) { it.x2 = r2(it.x1 + ux * l); it.y2 = r2(it.y1 + uy * l); } }), del);
  if (k === 'open') { const w = wallOf(f, it.wall);
    return B().form(it.type === 'window' ? 'Okno' : 'Dveře', [{k: 'type', l: 'Druh', type: 'select', opts: [['window', 'Okno'], ['door', 'Dveře']]}, dec('w', 'Šířka (m)'), dec('h', 'Výška (m)'), dec('sill', 'Parapet (m nad podlahou)'), dec('pos', `Střed od začátku zdi (m, zeď ${m2(L(w))} m)`),
      {k: 'flip', l: 'Otevírání na druhou stranu', type: 'check'}, {k: 'hand', l: 'Pant na druhé straně', type: 'check'}],
      {type: it.type, w: m2(it.w), h: m2(it.h), sill: m2(it.sill), pos: m2(it.pos), flip: it.flip, hand: it.hand},
      o => mut(() => { Object.assign(it, {type: o.type, w: num(o.w) || it.w, h: num(o.h) || it.h, sill: o.type === 'door' ? 0 : num(o.sill), pos: Math.max(0, Math.min(L(w), num(o.pos))), flip: o.flip, hand: o.hand}); }), del); }
  if (k === 'rooms') return B().form('Místnost', [{k: 'name', l: 'Název', req: 1}, dec('w', 'Šířka (m)'), dec('h', 'Hloubka (m)')], {name: it.name, w: m2(it.w), h: m2(it.h)},
    o => mut(() => { it.name = o.name; it.w = num(o.w) || it.w; it.h = num(o.h) || it.h; }), del);
  const rot = {k: 'rot', l: 'Natočení', type: 'select', opts: ['0', '90', '180', '270'].map(x => [x, x + '°'])};
  if (k === 'fix') return B().form('Zařizovací předmět', [{k: 'type', l: 'Předmět', type: 'select', opts: Object.entries(FIX).map(([a, b]) => [a, b.l])}, rot], {type: it.type, rot: S2(it.rot || 0)},
    o => mut(() => { it.type = o.type; it.rot = +o.rot; }), del);
  if (k === 'elec') return B().form('Prvek elektro', [{k: 'type', l: 'Prvek', type: 'select', opts: Object.entries(EL).map(([a, b]) => [a, b.l])}, {k: 'circ', l: 'Okruh', type: 'select', opts: [['0', '– (rozvaděč)'], ...D().circuits.map(c => [S2(c.id), c.id + ' – ' + c.name])]}, rot],
    {type: it.type, circ: S2(it.circ || 0), rot: S2(it.rot || 0)}, o => mut(() => { it.type = o.type; it.circ = +o.circ; it.rot = +o.rot; }), del);
  if (k === 'pipes') return B().form(`Potrubí · ${m2(plen(it.pts))} m`, [{k: 'dn', l: 'Průměr', type: 'select', opts: Object.keys(DN).reverse().map(x => [x, 'DN ' + x])}], {dn: S2(it.dn)}, o => mut(() => { it.dn = +o.dn; }), del);
  if (k === 'cables') return B().form(`Kabel · ${m2(plen(it.pts))} m`, [{k: 'circ', l: 'Okruh', type: 'select', opts: D().circuits.map(c => [S2(c.id), c.id + ' – ' + c.name])}], {circ: S2(it.circ)}, o => mut(() => { it.circ = +o.circ; }), del);
}

/* ---------- události ---------- */
function onClick(e) {
  const t = e.target.closest('button,[data-dtab]'); if (!t) return;
  const d = D(), ds = t.dataset;
  if (ds.roofp) { const r = ROOFP.find(x => x.k === ds.roofp); return mut(() => { Object.assign(d.roof, {type: r.type, pitch: r.pitch, preset: r.k}); }); }
  if (ds.look) return setLook(ds.look, ds.c);
  if (ds.view) return h3?.view(ds.view);
  if (ds.dtab) { ui.tab = ds.dtab; ui.draft = null; return B().render(); }
  if (ds.tool) { ui.tool = ds.tool; ui.draft = null; return B().render(); }
  if (ds.floor) { ui.floor = +ds.floor; ui.draft = null; return B().render(); }
  const a = ds.dz;
  if (a === 'undo') return undo();
  if (a === 'finish') return finishDraft();
  if (a === 'cancel') { ui.draft = null; return B().render(); }
  if (a === 'fit') { fitView(svgEl); applyView(svgEl); }
  if (a === 'zin' || a === 'zout') { const r = svgEl.getBoundingClientRect(), k = a === 'zin' ? 1.3 : 1 / 1.3, cx = ui.V.x + r.width / ui.V.s / 2, cy = ui.V.y + r.height / ui.V.s / 2; ui.V.s *= k; ui.V.x = cx - r.width / ui.V.s / 2; ui.V.y = cy - r.height / ui.V.s / 2; applyView(svgEl); }
  if (a === 'loadsample') { const s = sample(); return mut(() => { S().design.floors = s.floors; ui.V = null; }); }
  if (a === 'fadd') { const lo = d.floors[d.floors.length - 1], nf = {id: uid(), name: (d.floors.length + 1) + '. NP', h: lo.h, walls: lo.walls.filter(w => w.kind !== 'part').map(w => ({...w, id: uid()})), open: [], rooms: [], fix: [], pipes: [], elec: [], cables: []};
    return mut(() => { d.floors.push(nf); ui.floor = d.floors.length - 1; ui.V = null; }); }
  if (a === 'fedit') { const f = F();
    return B().form('Podlaží', [{k: 'name', l: 'Název', req: 1}, dec('h', 'Konstrukční výška (m, podlaha–podlaha)')], {name: f.name, h: m2(f.h)}, o => mut(() => { f.name = o.name; f.h = num(o.h) || f.h; }),
      d.floors.length > 1 ? () => mut(() => { d.floors.splice(ui.floor, 1); ui.floor = 0; }) : null); }
  if (a === 'circs') return B().form('Okruhy (jeden na řádek: název ; jistič)', [{k: 'c', l: 'Okruhy', type: 'area'}], {c: d.circuits.map(c => `${c.name} ; ${c.jistic}`).join('\n')},
    o => mut(() => { d.circuits = o.c.split('\n').map(x => x.trim()).filter(Boolean).map((x, i) => { const [n, j] = x.split(';'); return {id: i + 1, name: n.trim(), jistic: (j || 'B16').trim()}; }); }));
  if (a === 'resetprices') return mut(() => { d.prices = {}; });
  if (a === 'toplan') {
    const c = calc(), s = S(), old = JSON.stringify(s.stages), k = 1 + c.rez, set = (st, v) => { if (st) st.plan = Math.round(v * k / 1000) * 1000; };
    for (const g of ['zaklady', 'zdi', 'strecha', 'okna']) set(s.stages.find(x => x.part === g), c.sum([g]));
    set(s.stages.find(x => /instal/i.test(x.name)), c.sum(['kan', 'el']));
    B().save(); return B().toast('Plán rozpočtu upraven podle návrhu', () => { s.stages = JSON.parse(old); B().save(); });
  }
  if (a === 'print') return doPrint();
  if (a === 'sitereset') { Object.assign(d.site, siteDefaults()); return B().save(); }
  if (a === 'sitedel') { const old = d.site; delete d.site; B().save(); return B().toast('Fotka odebrána', () => { d.site = old; B().save(); }); }
  if (a === 'sitesave' || a === 'sitediary') { if (!siteCtl) return; t.disabled = true;
    siteCtl.toBlob(document.getElementById('siteimg')).then(async blob => { t.disabled = false;
      if (a === 'sitediary') { await B().addDiaryPhoto(blob, 'Vizualizace domu na pozemku'); return B().toast('Uloženo do deníku'); }
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `dum-na-pozemku-${new Date().toISOString().slice(0, 10)}.jpg`; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 5000);
    }).catch(() => { t.disabled = false; B().toast('Obrázek se nepodařilo vytvořit'); }); return; }
}
function onChange(e) {
  const t = e.target, d = D(), ds = t.dataset;
  if (ds.sel) { const k = ds.sel;
    if (k === 'rtype') return mut(() => { d.roof.type = t.value; });
    ui[k] = t.value; return; }
  if (ds.r3) { ui.r3[ds.r3] = t.checked; if (h3) return h3.rebuild(ui.r3); const cv = document.getElementById('dz3d'); if (cv) draw3D(cv, ui.r3); return; }
  if (ds.lookc) return setLook(ds.lookc, t.value);
  if ('sitefile' in ds) { if (t.files[0]) siteFile(t.files[0]); return; }
  if (ds.site) return B().persist();
  if (ds.roof) return mut(() => { d.roof[ds.roof] = Math.max(0, num(t.value)); if (d.roof.pitch > 70) d.roof.pitch = 70; });
  if (ds.price) return mut(() => { d.prices[ds.price] = Math.max(0, Math.round(num(t.value))); });
  if ('reserve' in ds) return mut(() => { d.reserve = Math.max(0, num(t.value)); });
  if (ds.meta) { d.meta[ds.meta] = t.value.trim(); B().persist(); document.getElementById('pv').innerHTML = printDoc(true); fill3dImages(document.getElementById('pv')); fitPreview(); }
}
function setLook(k, c) {
  const d = D(); d.look = {...look(), [k]: c}; B().persist();
  document.querySelectorAll(`[data-look="${k}"]`).forEach(b => { const on = b.dataset.c === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const pk = document.querySelector(`[data-lookc="${k}"]`); if (pk) { pk.value = c; pk.parentElement.style.setProperty('--c', c); }
  if (h3) h3.setLook(d.look); else { const cv = document.getElementById('dz3d'); if (cv) draw3D(cv, ui.r3); }
}
function fitPreview() {
  const pv = document.getElementById('pv'); if (!pv) return;
  const k = Math.min(1, pv.clientWidth / (297 * 96 / 25.4)); pv.style.setProperty('--z', k);
}
function mount(root) {
  ensure(); svgEl = null;
  root.addEventListener('click', onClick); root.addEventListener('change', onChange);
  root.addEventListener('input', e => { const sk = e.target.dataset.site;
    if (sk && D().site) { const v = +e.target.value; D().site[sk] = v; document.getElementById('so_' + sk).textContent = siteVal(sk, v) + SITE.find(x => x[0] === sk)[5]; siteCtl?.update(D().site); return; } if (e.target.dataset.lookc && h3) { e.target.parentElement.style.setProperty('--c', e.target.value); h3.setLook({...look(), [e.target.dataset.lookc]: e.target.value}); } });
  const svg = root.querySelector('#dzsvg'); if (svg) mountPlan(svg);
  const cv = root.querySelector('#dz3d'); if (cv) mount3D(cv);
  if (root.querySelector('#pv')) { fill3dImages(root); fitPreview(); }
  if (root.querySelector('#site')) mountSite(root);
}
addEventListener('keydown', e => { if (e.key === 'Escape' && ui.draft && !document.querySelector('.modal')) { ui.draft = null; B().render(); } });

return {view, mount, empty, sample, calc, ensure, _ui: ui, _geo: {D, outline, dirs, L, onWall, roofH, ui, EL, DN, CC, look}};
})();
