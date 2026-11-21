// 3D model domu ve WebGL (Three.js r170, uložené ve vendor/, funguje offline).
// Geometrii skládá z návrhu v záložce Projekt: zdi s otvory, okna s rámy a sklem, stropy, střecha s tloušťkou, terén.
import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';

const G = () => window.DESIGN._geo;
const V = (x, y, h) => new THREE.Vector3(x, h, y); // půdorys x, y + výška → Three.js (osa Y nahoru)
const GROUND = -.35;

/* ---------- textury kreslené v canvasu (šedé, barvu dává materiál) ---------- */
const TX = {};
let seed = 7;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
function ctex(key, size, draw) {
  if (TX[key]) return TX[key];
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (TX[key] = t);
}
const noise = (g, s, n, lo, hi, sz = 1.5) => { for (let i = 0; i < n; i++) { const v = lo + rnd() * (hi - lo) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * s, rnd() * s, sz, sz); } };
const T = {
  plaster: () => ctex('plaster', 256, (g, s) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, s, s); noise(g, s, 14000, 222, 255); }),
  roof: () => ctex('roof', 512, (g, s) => { // 3 řady × 3 tašky na metr
    const r = s / 3;
    for (let row = 0; row < 3; row++) for (let i = -1; i < 4; i++) {
      const x = i * r + (row % 2) * r / 2, y = row * r, v = 215 + rnd() * 25 | 0;
      const gr = g.createLinearGradient(0, y, 0, y + r); gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(.82, `rgb(${v - 8},${v - 8},${v - 8})`); gr.addColorStop(1, `rgb(${v - 45},${v - 45},${v - 45})`);
      g.fillStyle = gr; g.fillRect(x, y, r, r); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y, 2, r);
    }
    noise(g, s, 6000, 190, 255, 1);
  }),
  grass: () => ctex('grass', 256, (g, s) => { g.fillStyle = '#808080'; g.fillRect(0, 0, s, s); noise(g, s, 26000, 150, 225, 2); }),
  wood: () => ctex('wood', 256, (g, s) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s); for (let i = 0; i < 8; i++) { const v = 200 + rnd() * 50 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, i * s / 8, s, s / 8 - 2); } noise(g, s, 5000, 170, 240, 1); }),
  paving: () => ctex('paving', 256, (g, s) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, s, s); for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) { const v = 190 + rnd() * 50 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x * s / 2 + (y % 2) * s / 4 + 2, y * s / 4 + 2, s / 2 - 4, s / 4 - 4); } }),
};

/* ---------- materiály ---------- */
function materials(look) {
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const fasc = new THREE.Color(look.roof).multiplyScalar(.75);
  return {
    wall: M({color: look.wall, map: T.plaster(), roughness: .95}),
    inner: M({color: '#f4f2ee', map: T.plaster(), roughness: .95}),
    plinth: M({color: look.plinth, map: T.plaster(), roughness: .9}),
    roof: M({color: look.roof, map: T.roof(), roughness: .72, side: THREE.DoubleSide}),
    fascia: M({color: fasc, roughness: .6}),
    soffit: M({color: '#e7e0d2', map: T.wood(), roughness: .85}),
    frame: M({color: look.frame, roughness: .45}),
    sill: M({color: '#b8bcc0', roughness: .4, metalness: .5}),
    door: M({color: look.door || '#6b4a33', map: T.wood(), roughness: .6}),
    floor: M({color: '#c8a479', map: T.wood(), roughness: .8}),
    slab: M({color: '#a9a9a4', roughness: .95}),
    glass: new THREE.MeshPhysicalMaterial({color: '#a9c7d8', roughness: .05, metalness: .2, transparent: true, opacity: .42, side: THREE.DoubleSide}),
    grass: M({color: '#9cc274', map: T.grass(), roughness: 1}),
    paving: M({color: '#bdb8ae', map: T.paving(), roughness: .9}),
    trunk: M({color: '#6b4c33', roughness: .9}),
    crown: M({color: '#4f7f3f', roughness: .9, flatShading: true}),
  };
}

/* ---------- skládání geometrie ---------- */
class Mesher {
  constructor() { this.b = {}; }
  poly(key, pts, out) {
    let n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0]));
    if (n.lengthSq() < 1e-10) return; n.normalize();
    if (out && n.dot(out) < 0) { pts = pts.slice().reverse(); n.negate(); }
    let h = new THREE.Vector3(0, 1, 0).cross(n); if (h.lengthSq() < 1e-6) h.set(1, 0, 0); else h.normalize();
    const s = new THREE.Vector3().crossVectors(n, h), B = this.b[key] ||= {p: [], n: [], uv: []};
    for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) { B.p.push(q.x, q.y, q.z); B.n.push(n.x, n.y, n.z); B.uv.push(q.dot(h), q.dot(s)); }
  }
  // kvádr podél zdi: s = vzdálenost od začátku, k = kolmo, z = výška; keys = materiály stran {a: k−, b: k+, rest}
  box(w, s0, s1, k0, k1, z0, z1, keys) {
    const {ux, uy, nx, ny} = G().dirs(w), p = (s, k, z) => V(w.x1 + ux * s + nx * k, w.y1 + uy * s + ny * k, z);
    const c = p((s0 + s1) / 2, (k0 + k1) / 2, (z0 + z1) / 2), O = q => q.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / q.length).sub(c);
    const F = (key, q) => this.poly(key, q, O(q)), r = keys.rest || keys.a;
    F(keys.a, [p(s0, k0, z0), p(s1, k0, z0), p(s1, k0, z1), p(s0, k0, z1)]); F(keys.b, [p(s0, k1, z0), p(s1, k1, z0), p(s1, k1, z1), p(s0, k1, z1)]);
    F(keys.top || r, [p(s0, k0, z1), p(s1, k0, z1), p(s1, k1, z1), p(s0, k1, z1)]); F(r, [p(s0, k0, z0), p(s1, k0, z0), p(s1, k1, z0), p(s0, k1, z0)]);
    F(keys.end || r, [p(s0, k0, z0), p(s0, k1, z0), p(s0, k1, z1), p(s0, k0, z1)]); F(keys.end || r, [p(s1, k0, z0), p(s1, k1, z0), p(s1, k1, z1), p(s1, k0, z1)]);
  }
  meshes(M) {
    return Object.entries(this.b).map(([k, B]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      const m = new THREE.Mesh(g, M[k]); m.castShadow = k !== 'glass'; m.receiveShadow = true; m.userData.key = k; return m;
    });
  }
}
// hranol z mnohoúhelníku v rovině zdi (štít) o tloušťce t
function prism(me, key, pts2, w, t, out) { // pts2: [[s, z]] podél linie w
  const {ux, uy, nx, ny} = G().dirs(w), p = (s, k, z) => V(w.x1 + ux * s + nx * k, w.y1 + uy * s + ny * k, z);
  const A = pts2.map(([s, z]) => p(s, -t / 2, z)), Bq = pts2.map(([s, z]) => p(s, t / 2, z)), c = A.concat(Bq).reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / (2 * A.length));
  me.poly(key, A, new THREE.Vector3().subVectors(A[0], Bq[0])); me.poly(key, Bq, new THREE.Vector3().subVectors(Bq[0], A[0]));
  for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length, q = [A[i], A[j], Bq[j], Bq[i]]; me.poly(key, q, q.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(.25).sub(c)); }
}

function build(o) {
  const g = G(), d = g.D(), me = new Mesher(), extra = new THREE.Group(), top = d.floors.length - 1, lim = o.cut ? g.ui.floor : top;
  let z = 0, door = null;
  d.floors.forEach((f, fi) => {
    if (fi > lim) return;
    const ol = g.outline(f), H = f.h, cx = ol ? (ol.bb.x + ol.bb.X) / 2 : 0, cy = ol ? (ol.bb.y + ol.bb.Y) / 2 : 0;
    if (ol) { // podlaha a základová deska / sokl
      me.poly('floor', ol.poly.map(([x, y]) => V(x, y, z + .005)), new THREE.Vector3(0, 1, 0));
      if (fi === 0) { const b = ol.bb, w = {x1: b.x, y1: (b.y + b.Y) / 2, x2: b.X, y2: (b.y + b.Y) / 2, t: b.Y - b.y};
        me.box(w, -.02, b.X - b.x + .02, -(b.Y - b.y) / 2 - .02, (b.Y - b.y) / 2 + .02, GROUND - .05, 0, {a: 'plinth', b: 'plinth', top: 'slab'}); }
    }
    const joined = (x, y, w) => {
      const ot = f.walls.filter(v => v !== w && ((Math.abs(v.x1 - x) < .02 && Math.abs(v.y1 - y) < .02) || (Math.abs(v.x2 - x) < .02 && Math.abs(v.y2 - y) < .02) || g.onWall(v, x, y)));
      if (!ot.length) return 0; const mx = Math.max(...ot.map(v => v.t)); return mx > w.t + .01 ? -mx / 2 : w.t / 2; };
    for (const w of f.walls) {
      const {nx, ny, ux, uy} = g.dirs(w), l = g.L(w), t = w.t / 2, ext = w.kind === 'ext';
      const sd = ext ? ((((w.x1 + w.x2) / 2 - cx) * nx + ((w.y1 + w.y2) / 2 - cy) * ny) >= 0 ? 1 : -1) : 1; // strana ven
      const keys = ext ? (sd > 0 ? {a: 'inner', b: 'wall', rest: 'wall'} : {a: 'wall', b: 'inner', rest: 'wall'}) : {a: 'inner', b: 'inner'};
      const e0 = joined(w.x1, w.y1, w), e1 = joined(w.x2, w.y2, w);
      const ops = f.open.filter(x => x.wall === w.id).map(x => [Math.max(0, x.pos - x.w / 2), Math.min(l, x.pos + x.w / 2), x]).sort((a, b) => a[0] - b[0]);
      let s = 0;
      const seg = (a, b, z0, z1, ea = 0, eb = 0) => { if (b + eb - (a - ea) > .005 && z1 - z0 > .005) me.box(w, a - ea, b + eb, -t, t, z0, z1, keys); };
      for (const [a, b, x] of ops) {
        seg(s, a, z, z + H, s === 0 ? e0 : 0, 0);
        if (x.sill > 0) seg(a, b, z, z + x.sill);
        if (x.sill + x.h < H) seg(a, b, z + x.sill + x.h, z + H);
        const glazed = x.type === 'window' || x.w > 1.25, fw = .07, dep = .09, kc = ext ? sd * (t - .13) : 0, k0 = kc - dep / 2, k1 = kc + dep / 2, z0 = z + x.sill, z1 = z0 + x.h;
        if (glazed || ext) {
          const fk = {a: 'frame', b: 'frame'};
          me.box(w, a, a + fw, k0, k1, z0, z1, fk); me.box(w, b - fw, b, k0, k1, z0, z1, fk); me.box(w, a + fw, b - fw, k0, k1, z1 - fw, z1, fk);
          if (glazed) {
            me.box(w, a + fw, b - fw, k0, k1, z0, z0 + fw, fk);
            const parts = x.w > 1.3 ? Math.round(x.w / .9) : 1;
            for (let i = 1; i < parts; i++) { const m = a + (b - a) * i / parts; me.box(w, m - fw / 2, m + fw / 2, k0, k1, z0 + fw, z1 - fw, fk); }
            const p = (s2, zz) => V(w.x1 + ux * s2 + nx * kc, w.y1 + uy * s2 + ny * kc, zz);
            me.poly('glass', [p(a + fw, z0 + fw), p(b - fw, z0 + fw), p(b - fw, z1 - fw), p(a + fw, z1 - fw)], null);
            if (ext && x.sill > 0) me.box(w, a - .03, b + .03, sd > 0 ? kc - .02 : -t - .06, sd > 0 ? t + .06 : kc + .02, z0 - .04, z0, {a: 'sill', b: 'sill'});
          } else {
            me.box(w, a + fw, b - fw, kc - .03, kc + .03, z0, z1 - fw, {a: 'door', b: 'door'});
            if (fi === 0 && !door) door = {w, s: (a + b) / 2, sd, width: x.w};
          }
        }
        s = b;
      }
      seg(s, l, z, z + H, ops.length ? 0 : e0, e1);
    }
    z += H;
  });
  // střecha
  if (o.roof && !o.inst && lim === top) roof(me, d, z, extra);
  // terén, cesta ke vchodu, stromy
  const ol0 = g.outline(d.floors[0]);
  if (ol0 && !o.site) {
    const b = ol0.bb, size = Math.max(b.X - b.x, b.Y - b.y);
    if (door) {
      const {ux, uy, nx, ny} = g.dirs(door.w), cxp = door.w.x1 + ux * door.s, cyp = door.w.y1 + uy * door.s, hw = Math.max(.7, door.width / 2 + .3), t0 = door.w.t / 2;
      const P = (a, k, zz) => V(cxp + ux * a + nx * k * door.sd, cyp + uy * a + ny * k * door.sd, zz), st = [P(-hw, t0, 0), P(hw, t0, 0), P(hw, t0 + 1.1, 0), P(-hw, t0 + 1.1, 0)];
      const w2 = {x1: cxp - ux * hw + nx * door.sd * t0, y1: cyp - uy * hw + ny * door.sd * t0, x2: cxp + ux * hw + nx * door.sd * t0, y2: cyp + uy * hw + ny * door.sd * t0, t: 0};
      me.box(w2, 0, 2 * hw, 0, 1.1 * door.sd, GROUND, -.02, {a: 'paving', b: 'paving', top: 'paving'});
      me.poly('paving', [P(-.6, t0 + 1.1, GROUND + .01), P(.6, t0 + 1.1, GROUND + .01), P(.6, t0 + 1.1 + size * .6, GROUND + .01), P(-.6, t0 + 1.1 + size * .6, GROUND + .01)], new THREE.Vector3(0, 1, 0));
      void st;
    }
    const trees = [[b.X + size * .32, b.y - size * .12, 1.15], [b.X + size * .38, b.Y - size * .05, .95], [b.x - size * .3, b.y - size * .38, 1.3], [b.x + size * .35, b.y - size * .55, 1]];
    for (const [x, y, k] of trees) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12 * k, .16 * k, 2 * k, 8), materials.cache.trunk); tr.position.copy(V(x, y, GROUND + k)); tr.castShadow = true;
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * k, 1), materials.cache.crown); cr.position.copy(V(x, y, GROUND + 2.6 * k)); cr.scale.set(1, 1.25, 1); cr.castShadow = true;
      extra.add(tr, cr);
    }
  }
  // instalace
  if (o.inst) {
    let zz = 0;
    d.floors.forEach((f, fi) => {
      if (fi > lim) return;
      const line = (pts, c, h) => { const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => V(x, y, zz + h))), m = new THREE.Line(geo, new THREE.LineBasicMaterial({color: c, depthTest: false})); m.renderOrder = 10; extra.add(m); };
      for (const p of f.pipes) line(p.pts, g.DN[p.dn] || g.DN[50], .04);
      for (const c of f.cables) line(c.pts, g.CC[(c.circ || 0) % g.CC.length], f.h - .3);
      for (const e of f.elec) { const k = g.EL[e.type] || g.EL.zas, s = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({color: g.CC[(e.circ || 0) % g.CC.length], depthTest: false}));
        s.position.copy(V(e.x, e.y, zz + (k.z < 0 ? f.h - .35 : k.z))); s.renderOrder = 11; extra.add(s); }
      for (const x of f.fix) { const s = new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .4), new THREE.MeshBasicMaterial({color: '#ffffff', depthTest: false, transparent: true, opacity: .8})); s.position.copy(V(x.x, x.y, zz + .2)); s.renderOrder = 9; extra.add(s); }
      zz += f.h;
    });
  }
  return {me, extra};
}

function roof(me, d, z, extra) {
  const g = G(), ol = g.outline(d.floors[d.floors.length - 1]); if (!ol) return;
  const r = d.roof, b = ol.bb, x0 = b.x - r.over, x1 = b.X + r.over, y0 = b.y - r.over, y1 = b.Y + r.over, k = Math.tan(r.pitch * Math.PI / 180);
  const th = .25, ze = z + .12, along = (x1 - x0) >= (y1 - y0), up = new THREE.Vector3(0, 1, 0), tw = ol.t;
  if (r.type === 'plocha') {
    const w = {x1: x0, y1: (y0 + y1) / 2, x2: x1, y2: (y0 + y1) / 2, t: 0};
    me.box(w, 0, x1 - x0, -(y1 - y0) / 2, (y1 - y0) / 2, z, z + .35, {a: 'fascia', b: 'fascia', top: 'roof', rest: 'fascia'});
    me.box(w, .15, x1 - x0 - .15, -(y1 - y0) / 2 + .15, (y1 - y0) / 2 - .15, z + .35, z + .37, {a: 'roof', b: 'roof'});
    return;
  }
  // povrch střechy jako mnohoúhelníky v půdorysu s výškou; P(a, c, h) – a podél delší strany
  const P = along ? (a, c, h) => [a, c, h] : (a, c, h) => [c, a, h];
  const [a0, a1, c0, c1] = along ? [x0, x1, y0, y1] : [y0, y1, x0, x1], cm = (c0 + c1) / 2, half = (c1 - c0) / 2;
  let polys = [], surf;
  if (r.type === 'sedlova') {
    const R = ze + half * k;
    polys = [[P(a0, c0, ze), P(a1, c0, ze), P(a1, cm, R), P(a0, cm, R)], [P(a0, c1, ze), P(a1, c1, ze), P(a1, cm, R), P(a0, cm, R)]];
    surf = c => ze + (half - Math.abs(c - cm)) * k;
  } else if (r.type === 'valbova') {
    const R = ze + half * k, hip = Math.min(half, (a1 - a0) / 2);
    polys = [[P(a0, c0, ze), P(a1, c0, ze), P(a1 - hip, cm, R), P(a0 + hip, cm, R)], [P(a0, c1, ze), P(a1, c1, ze), P(a1 - hip, cm, R), P(a0 + hip, cm, R)],
      [P(a0, c0, ze), P(a0, c1, ze), P(a0 + hip, cm, R)], [P(a1, c0, ze), P(a1, c1, ze), P(a1 - hip, cm, R)]];
  } else if (r.type === 'stanova') {
    const R = ze + half * k, A = P((a0 + a1) / 2, cm, R);
    polys = [[P(a0, c0, ze), P(a1, c0, ze), A], [P(a1, c0, ze), P(a1, c1, ze), A], [P(a1, c1, ze), P(a0, c1, ze), A], [P(a0, c1, ze), P(a0, c0, ze), A]];
  } else { // pultová, vysoká strana u c0
    const R = ze + (c1 - c0) * k;
    polys = [[P(a0, c0, R), P(a1, c0, R), P(a1, c1, ze), P(a0, c1, ze)]];
    surf = c => ze + (c1 - c) * k;
  }
  const V3 = q => V(q[0], q[1], q[2]), key = (p, q) => [p, q].map(v => v.map(n => n.toFixed(3)).join(',')).sort().join('|'), cnt = {};
  for (const pl of polys) pl.forEach((p, i) => { const kk = key(p, pl[(i + 1) % pl.length]); cnt[kk] = (cnt[kk] || 0) + 1; });
  const ctr = V((x0 + x1) / 2, (y0 + y1) / 2, ze);
  for (const pl of polys) {
    const top = pl.map(V3), bot = pl.map(q => V(q[0], q[1], q[2] - th));
    me.poly('roof', top, up); me.poly('soffit', bot, up.clone().negate());
    pl.forEach((p, i) => { const q = pl[(i + 1) % pl.length]; if (cnt[key(p, q)] > 1) return;
      const quad = [V3(p), V3(q), V(q[0], q[1], q[2] - th), V(p[0], p[1], p[2] - th)], mid = quad.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(.25);
      me.poly('fascia', quad, mid.sub(ctr).setY(0)); });
  }
  // štíty: vyplnění zdi pod střechou
  if (surf) {
    const gable = (la, cA, cB, withRidge) => { // linie zdi v souřadnici a = la, od cA do cB
      const w = along ? {x1: la, y1: cA, x2: la, y2: cB, t: tw} : {x1: cA, y1: la, x2: cB, y2: la, t: tw}, L = Math.abs(cB - cA), dir = Math.sign(cB - cA);
      const hh = c => Math.max(z + .01, surf(c) - th), pts = [[0, z], [L, z], [L, hh(cB)], ...(withRidge ? [[L / 2, hh(cm)]] : []), [0, hh(cA)]];
      prism(me, 'wall', pts.map(([s, h]) => [s, h]), w, tw); void dir;
    };
    const [ba0, ba1, bc0, bc1] = along ? [b.x, b.X, b.y, b.Y] : [b.y, b.Y, b.x, b.X];
    gable(ba0 + tw / 2, bc0, bc1, r.type === 'sedlova'); gable(ba1 - tw / 2, bc0, bc1, r.type === 'sedlova');
    if (r.type === 'pultova') { // vysoká stěna
      const hc = bc0 + tw / 2, w = along ? {x1: ba0, y1: hc, x2: ba1, y2: hc, t: tw} : {x1: hc, y1: ba0, x2: hc, y2: ba1, t: tw};
      prism(me, 'wall', [[0, z], [ba1 - ba0, z], [ba1 - ba0, surf(hc) - th], [0, surf(hc) - th]], w, tw);
    }
  }
  void extra;
}

/* ---------- scéna ---------- */
function makeScene(o) {
  const g = G(), scene = new THREE.Scene(), look = g.look();
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256; const sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#7fadd8'); gr.addColorStop(.55, '#c9def0'); gr.addColorStop(1, '#e4ecee'); sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256);
  const st = new THREE.CanvasTexture(sky); st.colorSpace = THREE.SRGBColorSpace; scene.background = st;
  materials.cache = materials(look);
  const {me, extra} = build(o), group = new THREE.Group();
  for (const m of me.meshes(materials.cache)) {
    if (o.inst && ['wall', 'inner', 'frame', 'door', 'sill', 'plinth'].includes(m.userData.key)) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .22; m.material.depthWrite = false; m.castShadow = false; }
    group.add(m);
  }
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group), c = box.getCenter(new THREE.Vector3()), size = Math.max(4, box.getSize(new THREE.Vector3()).length()); group.add(extra);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(size * 14, 64), materials.cache.grass); ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND - .001; ground.receiveShadow = true;
  ground.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * size * 8; }); scene.add(ground);
  scene.add(new THREE.HemisphereLight('#dbe9ff', '#5d6b48', 1.1));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.6); sun.position.set(c.x - size * .6, c.y + size * 1.1, c.z + size * .8); sun.target.position.copy(c);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -size * 1.6; sc.right = sc.top = size * 1.6; sc.near = .5; sc.far = size * 4;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
  scene.fog = new THREE.Fog('#e4ecee', size * 2.5, size * 9);
  return {scene, c, size, group};
}
function renderer(cv, preserve) {
  const r = new THREE.WebGLRenderer({canvas: cv, antialias: true, preserveDrawingBuffer: !!preserve});
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
const VIEWS = {reset: [-.8, .45], front: [0, .12], side: [Math.PI / 2, .12], top: [0, 1.45]};
function placeCam(cam, c, size, yaw, pitch, dist) {
  const dd = (dist || size * 1.55) * Math.max(1, 1.3 / (cam.aspect || 1.6)); cam.position.set(c.x + dd * Math.cos(pitch) * Math.sin(yaw), c.y + dd * Math.sin(pitch), c.z + dd * Math.cos(pitch) * Math.cos(yaw));
  cam.lookAt(c);
}

export function mount(cv, o) {
  const g = G(), R = renderer(cv); R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  let S = makeScene(o), dirty = true;
  const cam = new THREE.PerspectiveCamera(38, 1, .1, S.size * 10), ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = .09; ctl.maxPolarAngle = Math.PI / 2 - .04; ctl.minDistance = 2; ctl.maxDistance = S.size * 4; ctl.screenSpacePanning = false;
  const saved = g.ui.cam; cam.aspect = (cv.clientWidth || 4) / (cv.clientHeight || 3);
  if (saved) { cam.position.fromArray(saved.p); ctl.target.fromArray(saved.t); } else { ctl.target.copy(S.c); placeCam(cam, S.c, S.size, ...VIEWS.reset); }
  ctl.addEventListener('change', () => { dirty = true; g.ui.cam = {p: cam.position.toArray(), t: ctl.target.toArray()}; });
  const fit = () => { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true; };
  const ro = new ResizeObserver(fit); ro.observe(cv); fit();
  R.setAnimationLoop(() => {
    if (!cv.isConnected) { R.setAnimationLoop(null); ro.disconnect(); ctl.dispose(); R.dispose(); return; }
    if (ctl.update() || dirty) { R.render(S.scene, cam); dirty = false; }
  });
  return {
    setLook(look) { const M = materials.cache, f = new THREE.Color(look.roof).multiplyScalar(.75);
      M.wall.color.set(look.wall); M.roof.color.set(look.roof); M.fascia.color.copy(f); M.frame.color.set(look.frame); M.plinth.color.set(look.plinth); if (look.door) M.door.color.set(look.door);
      S.group.traverse(m => { if (m.isMesh && m.material !== M[m.userData.key] && M[m.userData.key]) { m.material.color.copy(M[m.userData.key].color); } }); dirty = true; },
    rebuild(o2) { S.scene.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); S = makeScene(o2); dirty = true; },
    view(name) { const v = VIEWS[name]; ctl.target.copy(S.c); placeCam(cam, S.c, S.size, ...v); ctl.update(); g.ui.cam = {p: cam.position.toArray(), t: ctl.target.toArray()}; dirty = true; },
  };
}
export function snapshot(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const R = renderer(cv, true), S = makeScene({roof: true, inst: false, cut: false}), cam = new THREE.PerspectiveCamera(34, w / h, .1, S.size * 10);
  placeCam(cam, S.c, S.size * 1.1, -.8, .32); R.setSize(w, h, false); R.render(S.scene, cam);
  const url = cv.toDataURL('image/png'); S.scene.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); R.dispose(); R.forceContextLoss?.();
  return url;
}

/* ---------- dům vložený do fotky pozemku ---------- */
export function mountSite(cv, P, onMove, onEnd) {
  const g = G(), R = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true});
  R.setClearColor(0x000000, 0); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = THREE.SRGBColorSpace;
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene(); materials.cache = materials(g.look());
  const {me, extra} = build({roof: true, inst: false, cut: false, site: true}), house = new THREE.Group();
  for (const m of me.meshes(materials.cache)) house.add(m); house.add(extra);
  const bb = new THREE.Box3().setFromObject(house), c = bb.getCenter(new THREE.Vector3()), size = Math.max(6, bb.getSize(new THREE.Vector3()).length());
  house.position.set(-c.x, -GROUND, -c.z);
  const pivot = new THREE.Group(); pivot.add(house); scene.add(pivot);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size * 4), new THREE.ShadowMaterial({opacity: .4})); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
  scene.add(new THREE.HemisphereLight('#e3eeff', '#6b6a55', 1.15));
  const sun = new THREE.DirectionalLight('#fff3df', 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -size; sc.right = sc.top = size; sc.near = .5; sc.far = size * 5; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const cam = new THREE.PerspectiveCamera(50, 1, .1, 3000), rc = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const apply = () => {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    cam.aspect = w / h; cam.fov = 2 * Math.atan(Math.tan((P.fov || 68) * Math.PI / 360) / cam.aspect) * 180 / Math.PI; cam.updateProjectionMatrix();
    cam.position.set(0, P.camH, 0); cam.rotation.set(-(P.pitch || 0) * Math.PI / 180, 0, 0, 'YXZ');
    pivot.position.set(P.x, 0, P.z); pivot.rotation.y = (P.rot || 0) * Math.PI / 180; pivot.scale.setScalar((P.scale || 100) / 100);
    catcher.position.set(P.x, 0, P.z);
    const a = (P.sun ?? 35) * Math.PI / 180, dd = size * 1.5; sun.position.set(P.x + Math.sin(a) * dd, dd * 1.1, P.z + Math.cos(a) * dd); sun.target.position.set(P.x, 0, P.z);
    R.render(scene, cam);
  };
  const fit = () => { R.setSize(cv.clientWidth, cv.clientHeight, false); apply(); };
  const ro = new ResizeObserver(fit); ro.observe(cv); fit();
  const hit = (cx, cy) => { const r = cv.getBoundingClientRect(); rc.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), cam); return rc.ray.intersectPlane(ground, new THREE.Vector3()); };
  const pts = new Map(); let drag = null, two = null;
  const pair = () => { const [a, b] = [...pts.values()]; return {d: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0])}; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { drag = null; two = {...pair(), scale: P.scale, rot: P.rot}; }
    else { const h = hit(e.clientX, e.clientY); drag = h ? {dx: P.x - h.x, dz: P.z - h.z} : null; } });
  cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (two && pts.size === 2) { const q = pair(); P.scale = Math.max(40, Math.min(250, Math.round(two.scale * q.d / two.d))); P.rot = Math.round(((two.rot - (q.ang - two.ang) * 180 / Math.PI) % 360 + 360) % 360); }
    else if (drag) { const h = hit(e.clientX, e.clientY); if (!h) return; P.x = h.x + drag.dx; P.z = Math.min(-3, h.z + drag.dz); }
    else return;
    apply(); onMove({x: P.x, z: P.z, scale: P.scale, rot: P.rot}); });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) two = null; if (!pts.size) { drag = null; onEnd?.(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) P.rot = Math.round(((P.rot + e.deltaY * .2) % 360 + 360) % 360); else P.scale = Math.max(40, Math.min(250, Math.round(P.scale * Math.exp(-e.deltaY * .001)))); apply(); onMove({scale: P.scale, rot: P.rot}); clearTimeout(cv._wt); cv._wt = setTimeout(() => onEnd?.(), 400); }, {passive: false});
  return {
    update(np) { Object.assign(P, np); apply(); },
    dispose() { ro.disconnect(); scene.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); R.dispose(); R.forceContextLoss?.(); },
    async toBlob(img) { // fotka v plném rozlišení + dům
      const W = img.naturalWidth, H = img.naturalHeight, w0 = cv.clientWidth, h0 = cv.clientHeight, pr = R.getPixelRatio();
      R.setPixelRatio(1); R.setSize(W, H, false); const a0 = cam.aspect; apply.call(null); cam.aspect = W / H; cam.updateProjectionMatrix(); R.render(scene, cam);
      const out = document.createElement('canvas'); out.width = W; out.height = H; const x = out.getContext('2d'); x.drawImage(img, 0, 0, W, H); x.drawImage(cv, 0, 0, W, H);
      R.setPixelRatio(pr); R.setSize(w0, h0, false); cam.aspect = a0; apply();
      return new Promise((ok, no) => out.toBlob(b => b ? ok(b) : no(), 'image/jpeg', .9));
    },
  };
}
