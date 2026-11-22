// Automatické usazení domu do fotky pozemku: rozbor obrazu přímo v prohlížeči (bez internetu).
// Najde oblohu a terén, odhadne horizont (→ náklon fotoaparátu), volnou plochu, světlo a barevnost fotky.

export function analyze(img) {
  if (!img.naturalWidth) throw new Error('fotka není načtená');
  const W = 200, H = Math.max(40, Math.round(W * img.naturalHeight / img.naturalWidth));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', {willReadFrequently: true}); x.drawImage(img, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data, N = W * H;
  const R = new Float32Array(N), Gc = new Float32Array(N), Bc = new Float32Array(N), Lm = new Float32Array(N);
  for (let i = 0; i < N; i++) { R[i] = px[i * 4] / 255; Gc[i] = px[i * 4 + 1] / 255; Bc[i] = px[i * 4 + 2] / 255; Lm[i] = .3 * R[i] + .59 * Gc[i] + .11 * Bc[i]; }
  // vyhlazená kopie (potlačí texturu trávy)
  const sm = ch => { const o = new Float32Array(N); for (let y = 0; y < H; y++) for (let x0 = 0; x0 < W; x0++) { let t = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x0 + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) { t += ch[yy * W + xx]; n++; } } o[y * W + x0] = t / n; } return o; };
  const sR = sm(R), sG = sm(Gc), sB = sm(Bc);
  // místní kontrast (textura)
  const tex = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let i = y * W + 1; i < y * W + W - 1; i++) tex[i] = Math.abs(Lm[i] - Lm[i - 1]) + Math.abs(Lm[i] - Lm[i + 1]) + Math.abs(Lm[i] - Lm[i - W]) + Math.abs(Lm[i] - Lm[i + W]);
  // obloha: světlá nebo modrá, hladká, souvislá od horního okraje
  const skyLike = i => tex[i] < .09 && ((Bc[i] - R[i] > .05 && Bc[i] > .4) || (Lm[i] > .6 && Bc[i] >= R[i] - .03));
  const sky = flood(W, H, skyLike, Array.from({length: W}, (_, i) => i));
  const skyBottom = new Int16Array(W);
  for (let cx = 0; cx < W; cx++) { let y = 0; while (y < H && sky[y * W + cx]) y++; skyBottom[cx] = y; }
  // terén: barva podobná spodnímu pruhu fotky, souvisle od spodního okraje
  const g0 = Math.floor(H * .85), gm = [0, 0, 0], gs = [0, 0, 0]; let gn = 0;
  for (let y = g0; y < H; y++) for (let i = y * W; i < y * W + W; i++) { gm[0] += R[i]; gm[1] += Gc[i]; gm[2] += Bc[i]; gn++; }
  gm.forEach((v, k) => gm[k] = v / gn);
  for (let y = g0; y < H; y++) for (let i = y * W; i < y * W + W; i++) { gs[0] += (R[i] - gm[0]) ** 2; gs[1] += (Gc[i] - gm[1]) ** 2; gs[2] += (Bc[i] - gm[2]) ** 2; }
  const tol = Math.max(.07, Math.sqrt((gs[0] + gs[1] + gs[2]) / gn) * 2.2);
  // terén roste odspodu přes plynulé barevné přechody (tráva tmavne do dálky), zastaví se o hrany stromů, plotů a staveb
  const near = (i, j) => Math.hypot(sR[i] - sR[j], sG[i] - sG[j], sB[i] - sB[j]) < .035 && Math.hypot(sR[j] - gm[0], sG[j] - gm[1], sB[j] - gm[2]) < tol * 1.8;
  const ground = floodPair(W, H, (i, j) => !sky[j] && near(i, j), Array.from({length: W}, (_, i) => (H - 1) * W + i).filter(i => Math.hypot(sR[i] - gm[0], sG[i] - gm[1], sB[i] - gm[2]) < tol));
  const groundTop = new Int16Array(W);
  for (let cx = 0; cx < W; cx++) { let y = H - 1; while (y > 0 && ground[(y - 1) * W + cx]) y--; groundTop[cx] = ground[(H - 1) * W + cx] ? y : H; }
  // horizont: nejvzdálenější viditelný terén (horní čtvrtina hranice terénu), ne výš než spodek oblohy
  const sortedG = Array.from(groundTop).filter(v => v < H).sort((a, b) => a - b), sortedS = Array.from(skyBottom).sort((a, b) => a - b);
  let hz = sortedG.length > W * .3 ? sortedG[Math.floor(sortedG.length * .25)] : sortedS[Math.floor(W / 2)] + H * .04;
  hz = Math.max(sortedS[Math.floor(W * .5)] * .9, Math.min(H * .8, hz));
  if (!isFinite(hz)) hz = H * .45;
  // volné místo: nejširší úsek sloupců, kde terén sahá až k horizontu
  const open = Array.from(groundTop, v => v <= hz + H * .025);
  let best = null, s = -1;
  for (let cx = 0; cx <= W; cx++) {
    if (cx < W && open[cx]) { if (s < 0) s = cx; continue; }
    if (s >= 0) { const w = cx - s, mid = (s + cx) / 2, score = w * (1 - .5 * Math.abs(mid - W / 2) / W); if (!best || score > best.score) best = {x0: s, x1: cx, score}; s = -1; }
  }
  if (!best || best.x1 - best.x0 < W * .15) best = {x0: W * .2, x1: W * .8};
  // světlo a barevnost
  const avg = (mask, want) => { const m = [0, 0, 0]; let n = 0; for (let i = 0; i < N; i++) if (!!mask[i] === want) { m[0] += R[i]; m[1] += Gc[i]; m[2] += Bc[i]; n++; } return n ? m.map(v => v / n) : null; };
  const skyC = avg(sky, true) || [.75, .82, .9], grC = gm, all = avg(new Uint8Array(N), false);
  const side = f => { let l = 0, n = 0; for (let y = 0; y < hz; y++) for (let cx = f(0); cx < f(1); cx++) { const i = y * W + cx; if (sky[i]) { l += Lm[i]; n++; } } return n ? l / n : 0; };
  const left = side(k => Math.floor(k * W / 3)), right = side(k => Math.floor(W * 2 / 3 + k * W / 3));
  const skySat = Math.max(...skyC) - Math.min(...skyC), mean = all.reduce((a, b) => a + b) / 3;
  let sat = 0; for (let i = 0; i < N; i++) sat += Math.max(R[i], Gc[i], Bc[i]) - Math.min(R[i], Gc[i], Bc[i]); sat /= N;
  const overcast = skySat < .1 && Lm.length && (skyC[0] + skyC[1] + skyC[2]) / 3 > .55;
  return {W, H, horizon: hz / H, free: [best.x0 / W, best.x1 / W], groundTop: Array.from(groundTop, v => v / H), skyC, grC, all, mean, sat, overcast, sunLeft: left > right * 1.04, sunRight: right > left * 1.04, groundShare: ground.reduce((a, b) => a + b, 0) / N};
}

function floodPair(W, H, ok, seeds) {
  const m = new Uint8Array(W * H), st = [];
  for (const i of seeds) { m[i] = 1; st.push(i); }
  while (st.length) { const i = st.pop(), x = i % W;
    for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) if (j >= 0 && j < W * H && !m[j] && ok(i, j)) { m[j] = 1; st.push(j); } }
  return m;
}
function flood(W, H, ok, seeds) {
  const m = new Uint8Array(W * H), st = [];
  for (const i of seeds) if (ok(i)) { m[i] = 1; st.push(i); }
  while (st.length) { const i = st.pop(), x = i % W;
    for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) if (j >= 0 && j < W * H && !m[j] && ok(j)) { m[j] = 1; st.push(j); } }
  return m;
}

const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

// Z rozboru spočítá umístění domu a světlo. house = {w, d} půdorys v metrech, aspect = šířka/výška fotky
export function place(a, house, aspect, prev = {}) {
  const fov = prev.fov || 68, camH = prev.camH || 1.6, th = Math.tan(fov * Math.PI / 360), tv = th / aspect;
  const pitch = Math.atan((2 * a.horizon - 1) * tv) * 180 / Math.PI; // horizont nad středem → fotoaparát míří dolů
  const ray = (u, v) => { // průsečík paprsku s terénem
    const tx = (2 * u - 1) * th, ty = (1 - 2 * v) * tv, p = pitch * Math.PI / 180, yy = ty * Math.cos(p) - Math.sin(p), zz = -ty * Math.sin(p) - Math.cos(p);
    if (yy >= -1e-4) return null; const t = camH / -yy; return {x: t * tx, z: t * zz};
  };
  const span = Math.max(.3, Math.min(.5, (a.free[1] - a.free[0]) * .65)), uc = (a.free[0] + a.free[1]) / 2;
  const diag = Math.hypot(house.w, house.d) * .92, f = 1 / (2 * th);
  let dist = Math.max(9, Math.min(140, diag * f / span));
  // dům stojí na terénu: spodní hrana nesmí vyjet z fotky
  const vAt = D => { let lo = a.horizon + 1e-3, hi = 1.6; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, r = ray(.5, m); if (!r || -r.z > D) lo = m; else hi = m; } return (lo + hi) / 2; };
  while (vAt(Math.max(3, dist - house.d / 2)) > .93 && dist < 140) dist *= 1.12;
  const vb = vAt(dist), g = ray(uc, vb) || {x: 0, z: -dist};
  const rot = uc < .5 ? 32 : -32;
  // světlo podle fotky
  const sun = a.sunLeft ? 300 : a.sunRight ? 60 : 35, warm = (a.all[0] - a.all[2]);
  const light = {sky: hex(a.skyC.map(v => .55 + v * .45)), ground: hex(a.grC.map(v => .35 + v * .65)), exposure: +(Math.max(.75, Math.min(1.35, .7 + a.mean * .8))).toFixed(2),
    sunI: a.overcast ? .7 : 2.5, shadow: a.overcast ? .22 : .42, sunC: hex([1, .96 - Math.max(0, -warm) * .2, .9 - Math.max(0, warm) * .3 + Math.max(0, -warm) * .1]),
    sat: +(Math.max(.75, Math.min(1.1, .6 + a.sat * 1.6))).toFixed(2), blur: .35};
  const gx = g.x * dist / Math.max(1, -g.z);
  return {x: gx, z: -dist, rot: ((rot % 360) + 360) % 360, scale: 100, pitch: Math.round(pitch * 2) / 2, camH, fov, sun, light,
    info: {horizon: Math.round(a.horizon * 100), dist: Math.round(dist), overcast: a.overcast}};
}

// Odhad, když obrázek nejde rozebrat (např. server nepovolí čtení pixelů): horizont uprostřed, volný střed, neutrální světlo
export function fallback() {
  return {horizon: .5, free: [.3, .7], skyC: [.78, .84, .9], grC: [.45, .5, .35], all: [.55, .57, .55], mean: .55, sat: .25, overcast: false, sunLeft: false, sunRight: false, groundShare: .4};
}
