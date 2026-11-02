/**
 * Generates original SVG illustrations for every catalogue product, plus the logo and hero artwork.
 *   node scripts/generate-product-images.mjs
 * Reads  backend/src/database/catalog.json
 * Writes frontend/public/products/*.svg, frontend/public/logo.svg, frontend/public/hero.svg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'backend/src/database/catalog.json'), 'utf8'));
const outDir = path.join(root, 'frontend/public/products');
fs.mkdirSync(outDir, { recursive: true });

const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- colour helpers ----------
const hex2rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgb2hex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** amt in [-1, 1]: negative mixes with black, positive with white */
const shade = (hex, amt) => rgb2hex(hex2rgb(hex).map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
const lum = (hex) => { const [r, g, b] = hex2rgb(hex).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ink = (c) => (lum(c) > 0.72 ? '#2b3a4a' : shade(c, -0.5));

function labelText(label, cx, cy, maxW, color, maxSize = 26) {
  const words = label.split(' ');
  const half = Math.ceil(words.length / 2);
  const lines = label.length > 9 && words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [label];
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(maxSize, Math.floor(maxW / (longest * 0.68)));
  const lh = size * 1.18;
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  return lines
    .map((l, i) => `<text x="${cx}" y="${y0 + i * lh}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-weight="800" font-size="${size}" letter-spacing=".6" fill="${color}">${esc(l)}</text>`)
    .join('');
}
const sub = (cx, y, color = '#8a919b') =>
  `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="10" letter-spacing="2.2" fill="${color}">SFC SELECT</text>`;

// ---------- packaging ----------
function bag(a, narrow = false) {
  const c = a.color, x0 = narrow ? 128 : 108, x1 = narrow ? 272 : 292, w = x1 - x0;
  const crimps = Array.from({ length: Math.floor(w / 12) }, (_, i) => `<line x1="${x0 + 16 + i * 12}" y1="96" x2="${x0 + 16 + i * 12}" y2="118" stroke="${shade(c, -0.3)}" stroke-opacity=".5" stroke-width="2"/>`).join('');
  return `
  <path d="M${x0 + 8} 104 Q200 88 ${x1 - 8} 104 L${x1 + 2} 318 Q200 337 ${x0 - 2} 318 Z" fill="${c}" stroke="${shade(c, -0.2)}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M${x0 + 8} 104 Q200 88 ${x1 - 8} 104 L${x1 - 6} 124 Q200 108 ${x0 + 6} 124 Z" fill="${shade(c, -0.14)}"/>${crimps}
  <path d="M${x0 + 20} 136 Q${x0 + 14} 226 ${x0 + 17} 306" stroke="#fff" stroke-opacity=".3" stroke-width="11" fill="none" stroke-linecap="round"/>
  <rect x="${x0 + 20}" y="170" width="${w - 40}" height="100" rx="12" fill="#fff" fill-opacity=".95"/>
  <rect x="${x0 + 20}" y="258" width="${w - 40}" height="12" rx="6" fill="${shade(c, -0.1)}"/>
  ${labelText(a.label, 200, 212, w - 64, ink(c))}${sub(200, 246)}`;
}

function bottle(a) {
  const c = a.color, cap = shade(c, -0.55);
  return `
  <rect x="176" y="62" width="48" height="30" rx="7" fill="${cap}"/>
  <rect x="180" y="90" width="40" height="34" fill="${shade(c, 0.35)}" stroke="${shade(c, -0.15)}" stroke-width="3"/>
  <path d="M178 122 Q178 146 144 164 Q124 174 124 200 L124 308 Q124 332 148 332 L252 332 Q276 332 276 308 L276 200 Q276 174 256 164 Q222 146 222 122 Z" fill="${c}" stroke="${shade(c, -0.22)}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M142 196 Q138 250 142 312" stroke="#fff" stroke-opacity=".38" stroke-width="12" fill="none" stroke-linecap="round"/>
  <rect x="134" y="206" width="132" height="88" rx="12" fill="#fff" fill-opacity=".95"/>
  ${labelText(a.label, 200, 242, 112, ink(c), 24)}${sub(200, 280)}`;
}

function carton(a) {
  const c = a.color, acc = a.accent;
  return `
  <rect x="164" y="60" width="72" height="14" rx="3" fill="${shade(c, -0.18)}" stroke="${shade(c, -0.3)}" stroke-width="2"/>
  <path d="M118 124 L160 74 L240 74 L282 124 Z" fill="${shade(c, -0.06)}" stroke="${shade(c, -0.3)}" stroke-width="3" stroke-linejoin="round"/>
  <rect x="118" y="124" width="164" height="206" rx="6" fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="3"/>
  <rect x="118" y="270" width="164" height="60" rx="6" fill="${acc}"/>
  <rect x="118" y="262" width="164" height="14" fill="${acc}"/>
  <path d="M136 140 L136 316" stroke="#fff" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"/>
  <circle cx="200" cy="176" r="24" fill="${acc}" fill-opacity=".16"/>
  <path d="M200 160 C 212 176 214 184 208 192 C 204 197 196 197 192 192 C 186 184 188 176 200 160 Z" fill="${acc}"/>
  ${labelText(a.label, 200, 228, 130, acc, 28)}${sub(200, 300, '#fff')}`;
}

function box(a) {
  const c = a.color;
  return `
  <polygon points="108,104 146,80 306,80 270,104" fill="${shade(c, 0.22)}" stroke="${shade(c, -0.25)}" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="270,104 306,80 306,308 270,332" fill="${shade(c, -0.22)}" stroke="${shade(c, -0.35)}" stroke-width="3" stroke-linejoin="round"/>
  <rect x="108" y="104" width="162" height="228" rx="3" fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="3"/>
  <rect x="108" y="296" width="162" height="36" fill="${shade(c, -0.18)}"/>
  <path d="M124 120 L124 286" stroke="#fff" stroke-opacity=".28" stroke-width="9" stroke-linecap="round"/>
  <rect x="122" y="168" width="134" height="102" rx="12" fill="#fff" fill-opacity=".95"/>
  ${labelText(a.label, 189, 212, 114, ink(c), 24)}${sub(189, 252)}`;
}

function jar(a) {
  const c = a.color, lid = shade(c, -0.45);
  return `
  <rect x="134" y="84" width="132" height="34" rx="9" fill="${lid}"/>
  <path d="M134 98 H266" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
  <rect x="124" y="116" width="152" height="216" rx="30" fill="${c}" stroke="${shade(c, -0.25)}" stroke-width="3"/>
  <path d="M142 150 Q138 236 144 306" stroke="#fff" stroke-opacity=".45" stroke-width="12" fill="none" stroke-linecap="round"/>
  <rect x="124" y="188" width="152" height="94" fill="#fff" fill-opacity=".96"/>
  <rect x="124" y="188" width="152" height="8" fill="${shade(c, -0.1)}"/>
  <rect x="124" y="274" width="152" height="8" fill="${shade(c, -0.1)}"/>
  ${labelText(a.label, 200, 232, 118, ink(c), 28)}`;
}

function can(a) {
  const c = a.color;
  return `
  <rect x="118" y="112" width="164" height="208" fill="${shade(c, -0.05)}"/>
  <ellipse cx="200" cy="320" rx="82" ry="17" fill="${shade(c, -0.25)}"/>
  <rect x="118" y="112" width="164" height="208" fill="url(#cg)"/>
  <rect x="118" y="148" width="164" height="136" fill="${c}"/>
  <rect x="118" y="148" width="164" height="136" fill="url(#cg)"/>
  <rect x="118" y="148" width="164" height="7" fill="#fff" fill-opacity=".85"/>
  <rect x="118" y="277" width="164" height="7" fill="#fff" fill-opacity=".85"/>
  <ellipse cx="200" cy="112" rx="82" ry="17" fill="#cfd5da" stroke="#9aa3ab" stroke-width="2"/>
  <ellipse cx="200" cy="112" rx="62" ry="11" fill="#e4e8eb" stroke="#b7bec4" stroke-width="2"/>
  <rect x="118" y="112" width="164" height="12" fill="#d7dce0" fill-opacity=".0"/>
  <path d="M136 156 L136 276" stroke="#fff" stroke-opacity=".3" stroke-width="10" stroke-linecap="round"/>
  ${labelText(a.label, 200, 214, 136, '#fff', 25)}${sub(200, 262, '#ffffffcc')}
  <defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>`;
}

// ---------- fresh produce & bakery ----------
const fruit = {
  banana: () => {
    const b = (dx, dy, rot, c1, c2) => `<g transform="translate(${dx} ${dy}) rotate(${rot} 200 220)">
      <path d="M108 140 C 120 270, 222 322, 298 262 C 304 257, 298 248, 290 251 C 222 290, 152 250, 136 138 C 132 126, 110 126, 108 140 Z" fill="${c1}" stroke="${c2}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M126 160 C 142 256, 214 290, 280 256" stroke="#fff" stroke-opacity=".4" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="104" y="116" width="34" height="26" rx="6" fill="#7a5a1c"/><circle cx="296" cy="256" r="6" fill="#5a3f10"/></g>`;
    return b(8, -22, -8, '#f9dc4a', '#d9ae1f') + b(-4, 6, 0, '#f6d33a', '#d19f12') + b(-14, 34, 7, '#f3c92b', '#c4920c');
  },
  papaya: () => `
    <g transform="rotate(-14 150 215)"><ellipse cx="150" cy="218" rx="60" ry="104" fill="#f2a03b" stroke="#c97a1b" stroke-width="4"/>
    <path d="M118 140 Q150 100 182 140 Q150 178 118 140 Z" fill="#9ccc65" fill-opacity=".8"/>
    <path d="M122 190 Q116 250 138 306" stroke="#fff" stroke-opacity=".35" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="144" y="104" width="12" height="20" rx="4" fill="#5d7f2e"/></g>
    <g transform="rotate(18 268 240)"><ellipse cx="268" cy="240" rx="50" ry="88" fill="#ef8a2b" stroke="#c97a1b" stroke-width="4"/>
    <ellipse cx="268" cy="240" rx="37" ry="75" fill="#ffb54d"/><ellipse cx="268" cy="240" rx="15" ry="42" fill="#e3671a"/>
    ${[[-6, -26], [5, -12], [-5, 2], [6, 16], [-3, 30], [4, -34], [0, 40]].map(([x, y]) => `<circle cx="${268 + x}" cy="${240 + y}" r="4.2" fill="#2b1a10"/>`).join('')}</g>`,
  pineapple: () => {
    const lines = Array.from({ length: 9 }, (_, i) => `<line x1="${120 + i * 20}" y1="150" x2="${220 + i * 20}" y2="340" stroke="#b9780f" stroke-opacity=".6" stroke-width="3"/><line x1="${280 - i * 20}" y1="150" x2="${180 - i * 20}" y2="340" stroke="#b9780f" stroke-opacity=".6" stroke-width="3"/>`).join('');
    return `<defs><clipPath id="pc"><ellipse cx="200" cy="248" rx="72" ry="94"/></clipPath></defs>
    <path d="M200 168 L158 84 L190 128 L176 58 L204 120 L226 52 L222 124 L256 80 L236 168 Z" fill="#2f8a3b" stroke="#1f6a2b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M200 170 L180 100 L206 140 L214 96 L222 170Z" fill="#43a047"/>
    <ellipse cx="200" cy="248" rx="72" ry="94" fill="#f4b834" stroke="#c2860f" stroke-width="4"/>
    <g clip-path="url(#pc)">${lines}</g>
    <path d="M154 210 Q148 262 160 306" stroke="#fff" stroke-opacity=".4" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  },
  tomato: () => `
    <circle cx="262" cy="262" r="52" fill="#ef5350" stroke="#b71c1c" stroke-width="4"/>
    <path d="M262 214 l8 14 14 -8 -4 16 16 2 -12 10 L262 244 Z" fill="#43a047"/>
    <circle cx="190" cy="222" r="86" fill="#e53935" stroke="#a31515" stroke-width="4"/>
    <path d="M142 190 Q132 232 152 268" stroke="#fff" stroke-opacity=".4" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M190 138 l12 20 22 -12 -8 24 24 8 -24 12 6 22 -20 -10 -12 20 -12 -20 -20 10 6 -22 -24 -12 24 -8 -8 -24 22 12 Z" fill="#43a047" stroke="#2e7d32" stroke-width="2" stroke-linejoin="round"/>
    <rect x="186" y="116" width="8" height="26" rx="3" fill="#2e7d32"/>`,
  carrot: () => {
    const c = (dx, rot, len) => `<g transform="translate(${dx} 0) rotate(${rot} 200 130)">
      <path d="M176 128 Q200 118 224 128 L208 ${128 + len} Q200 ${140 + len} 192 ${128 + len} Z" fill="#f4841f" stroke="#c35f0c" stroke-width="3" stroke-linejoin="round"/>
      ${[0.2, 0.4, 0.6, 0.78].map((t, i) => `<path d="M${188 + i} ${128 + len * t} h${22 - i * 4}" stroke="#c35f0c" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`).join('')}
      <path d="M200 124 C 170 96 176 64 190 54 C 194 82 200 96 200 124 Z M200 124 C 200 90 208 66 224 56 C 226 84 214 104 200 124 Z M200 124 C 186 102 160 98 150 84 C 176 80 194 96 200 124 Z" fill="#43a047" stroke="#2e7d32" stroke-width="2"/></g>`;
    return c(-52, 18, 170) + c(52, -18, 160) + c(0, 0, 190);
  },
  chilli: () => {
    // tapered pepper: a filled crescent between two curves, plus a calyx and stem
    const ch = (x, y, rot, col, dark, len = 210) => `<g transform="translate(${x} ${y}) rotate(${rot})">
      <path d="M0 0 C 26 4, 40 ${len * 0.35}, 26 ${len * 0.7} C 20 ${len * 0.88}, 8 ${len} , 2 ${len + 8} C 4 ${len * 0.8}, -2 ${len * 0.5}, -14 ${len * 0.22} C -20 ${len * 0.08}, -12 -2, 0 0 Z" fill="${col}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-4 14 C 6 ${len * 0.3}, 12 ${len * 0.55}, 6 ${len * 0.8}" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M-18 4 Q0 -14 22 2 Q14 16 0 14 Q-10 14 -18 4 Z" fill="#2f7d32" stroke="#1f5c25" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M2 -4 Q4 -20 14 -26" stroke="#1f5c25" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
    return ch(120, 96, -8, '#3bb04d', '#1f7a2e', 220) + ch(204, 84, 10, '#2e9e3f', '#1b6a28', 230) + ch(168, 108, 28, '#d93a2f', '#9a1d15', 200);
  },
  onion: () => {
    const o = (cx, cy, r, rot = 0) => `<g transform="rotate(${rot} ${cx} ${cy})">
      <path d="M${cx - r * 0.12} ${cy - r * 1.05} Q${cx} ${cy - r * 1.7} ${cx + r * 0.12} ${cy - r * 1.05} Z" fill="#d9c3a5" stroke="#a88c66" stroke-width="2"/>
      <path d="M${cx} ${cy - r * 1.05} C ${cx + r * 0.5} ${cy - r * 0.95}, ${cx + r * 1.15} ${cy - r * 0.2}, ${cx + r * 0.95} ${cy + r * 0.5} C ${cx + r * 0.75} ${cy + r}, ${cx + r * 0.2} ${cy + r * 1.05}, ${cx} ${cy + r * 1.05} C ${cx - r * 0.2} ${cy + r * 1.05}, ${cx - r * 0.75} ${cy + r}, ${cx - r * 0.95} ${cy + r * 0.5} C ${cx - r * 1.15} ${cy - r * 0.2}, ${cx - r * 0.5} ${cy - r * 0.95}, ${cx} ${cy - r * 1.05} Z" fill="#b2477b" stroke="#7d2a55" stroke-width="3"/>
      ${[-0.6, -0.3, 0, 0.3, 0.6].map((k) => `<path d="M${cx} ${cy - r * 1.0} Q${cx + r * k * 1.6} ${cy} ${cx + r * k * 0.4} ${cy + r * 1.03}" stroke="#d38ab0" stroke-opacity=".7" stroke-width="2.4" fill="none"/>`).join('')}
      <path d="M${cx - r * 0.45} ${cy + r * 1.05} l-4 12 M${cx} ${cy + r * 1.06} l0 14 M${cx + r * 0.4} ${cy + r * 1.05} l4 12" stroke="#a88c66" stroke-width="2.5" stroke-linecap="round"/></g>`;
    return o(262, 262, 52, 12) + o(186, 232, 80, -4);
  },
  mango: () => `
    <g transform="rotate(24 200 220)"><path d="M200 120 C 280 118, 318 200, 296 270 C 276 330, 210 348, 160 318 C 106 286, 100 190, 138 146 C 156 126, 178 120, 200 120 Z" fill="#f4a62a" stroke="#c97a14" stroke-width="4"/>
    <path d="M200 120 C 240 124, 270 150, 282 190 C 250 170, 220 150, 200 120 Z" fill="#9cc84a" fill-opacity=".85"/>
    <path d="M150 190 Q132 250 164 308" stroke="#fff" stroke-opacity=".4" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M200 120 C 200 100 206 90 212 84" stroke="#6d4c1c" stroke-width="6" fill="none" stroke-linecap="round"/></g>
    <path d="M214 100 C 250 62 300 66 322 90 C 290 118 244 120 214 100 Z" fill="#43a047" stroke="#2e7d32" stroke-width="3"/><path d="M220 100 Q270 90 316 92" stroke="#2e7d32" stroke-width="3" fill="none"/>`,
};

function eggs() {
  const egg = (cx, cy, rot = 0, c = '#f5e3c4') => `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="30" ry="38" fill="${c}" stroke="#d3b78a" stroke-width="3"/><ellipse cx="${cx - 10}" cy="${cy - 12}" rx="7" ry="12" fill="#fff" fill-opacity=".6"/></g>`;
  return `
  <path d="M84 268 L116 190 H284 L316 268 Z" fill="#a8977c"/>
  ${egg(142, 196, -6)}${egg(200, 190, 0, '#f8ecd4')}${egg(258, 196, 6)}
  <path d="M84 268 L116 214 H284 L316 268 Z" fill="#b9a88f" stroke="#8d7c62" stroke-width="3" stroke-linejoin="round"/>
  ${egg(120, 252, -4, '#f3dcb8')}${egg(180, 256, 0)}${egg(240, 256, 0, '#f8ecd4')}${egg(300, 254, 4, '#f3dcb8')}
  <path d="M70 262 H330 Q336 262 334 272 L322 322 Q320 332 308 332 H92 Q80 332 78 322 L66 272 Q64 262 70 262 Z" fill="#c6b69c" stroke="#8d7c62" stroke-width="3" stroke-linejoin="round"/>
  <path d="M92 282 H308" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
  <text x="200" y="308" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="20" letter-spacing="3" fill="#6f5f47">FARM EGGS</text>`;
}

function bread() {
  return `
  <path d="M92 258 C 74 168, 136 126, 200 126 C 264 126, 326 168, 308 258 L 304 308 Q 303 324 286 324 L 114 324 Q 97 324 96 308 Z" fill="#c9803a" stroke="#99571d" stroke-width="4" stroke-linejoin="round"/>
  <path d="M108 262 C 96 184, 146 142, 200 142 C 254 142, 304 184, 292 262 Z" fill="#dc9a4f"/>
  <path d="M104 262 H296 L292 306 Q291 316 280 316 L120 316 Q109 316 108 306 Z" fill="#e8b46a"/>
  <path d="M150 168 l22 44 M196 156 l22 50 M242 168 l22 44" stroke="#f3d29b" stroke-width="12" stroke-linecap="round"/>
  <path d="M120 206 C 126 182, 148 166, 168 160" stroke="#fff" stroke-opacity=".35" stroke-width="9" fill="none" stroke-linecap="round"/>
  <rect x="136" y="252" width="128" height="46" rx="10" fill="#fff" fill-opacity=".94"/>
  <text x="200" y="276" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-weight="800" font-size="17" letter-spacing=".6" fill="#8a4b14">MILK BREAD</text>`;
}

function sticks() {
  const q = (rot, dx, c) => `<g transform="translate(${dx} 0) rotate(${rot} 200 210)">
    <rect x="186" y="82" width="28" height="248" rx="14" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="3"/>
    <path d="M192 96 Q200 150 192 210 T192 318" stroke="${shade(c, -0.3)}" stroke-opacity=".55" stroke-width="3" fill="none"/>
    <path d="M204 96 Q196 160 204 220 T204 318" stroke="${shade(c, 0.25)}" stroke-opacity=".45" stroke-width="3" fill="none"/>
    <ellipse cx="200" cy="90" rx="11" ry="6" fill="#4a2410"/><ellipse cx="200" cy="90" rx="5" ry="2.6" fill="#8a4a22"/></g>`;
  return q(-22, -34, '#a9622b') + q(22, 34, '#b8713a') + q(-9, -14, '#bd7a42') + q(10, 16, '#a35a26') + q(0, 0, '#c48047') +
    `<rect x="128" y="196" width="144" height="18" rx="6" fill="#c0392b" stroke="#8e2b20" stroke-width="2"/><path d="M270 206 q26 -4 30 14 M270 206 q22 12 18 32" stroke="#c0392b" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

// ---------- scene composition ----------
const catBg = Object.fromEntries(catalog.categories.map((c) => [c.slug, c.bg]));

function art(a) {
  switch (a.type) {
    case 'bag': return bag(a);
    case 'pouch': return bag(a, true);
    case 'bottle': return bottle(a);
    case 'carton': return carton(a);
    case 'box': return box(a);
    case 'jar': return jar(a);
    case 'can': return can(a);
    case 'fruit': return fruit[a.kind]();
    case 'eggs': return eggs();
    case 'bread': return bread();
    case 'sticks': return sticks();
    default: throw new Error('unknown art ' + a.type);
  }
}

function productSvg(p) {
  const bg = catBg[p.category];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${esc(p.name)}">
  <defs><radialGradient id="bgg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="400" fill="${bg}"/><rect width="400" height="400" fill="url(#bgg)"/>
  <ellipse cx="200" cy="336" rx="104" ry="13" fill="#2b3a4a" fill-opacity=".13"/>
  ${art(p.art)}
</svg>
`;
}

for (const p of catalog.products) fs.writeFileSync(path.join(outDir, `${slugify(p.name)}.svg`), productSvg(p));

// ---------- hero artwork (basket scene) ----------
const byName = (n) => catalog.products.find((p) => p.name === n);
const place = (name, x, y, s, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${art(byName(name).art)}</g>`;
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 560" width="640" height="560" role="img" aria-label="A basket of fresh groceries">
  <circle cx="330" cy="290" r="250" fill="#ffe9b8"/><circle cx="540" cy="110" r="64" fill="#cfe8bf"/><circle cx="90" cy="430" r="58" fill="#f7cdb8" fill-opacity=".8"/>
  ${place('Fresh Milk', 24, 50, 0.66, -7)}
  ${place('Pineapple', 196, -14, 0.72, 3)}
  ${place('Samba Rice', 356, 34, 0.66, 7)}
  ${place('Bananas (Ambul)', 70, 186, 0.62, -4)}
  ${place('Tomatoes', 226, 206, 0.58, 0)}
  ${place('Carrots', 372, 214, 0.52, 6)}
  <ellipse cx="320" cy="500" rx="240" ry="22" fill="#2b3a4a" fill-opacity=".14"/>
  <path d="M96 360 H544 L506 506 Q500 526 478 526 H162 Q140 526 134 506 Z" fill="#c78b4a" stroke="#8e5a25" stroke-width="5" stroke-linejoin="round"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${112 + i * 74} 366 L${130 + i * 70} 520" stroke="#a8702f" stroke-width="5" fill="none" stroke-opacity=".7"/>`).join('')}
  ${[0, 1, 2].map((i) => `<path d="M104 ${392 + i * 44} H${536 - i * 8}" stroke="#a8702f" stroke-width="5" stroke-opacity=".7"/>`).join('')}
  <rect x="86" y="348" width="468" height="26" rx="13" fill="#d9a060" stroke="#8e5a25" stroke-width="5"/>
  <path d="M96 361 H544" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>
</svg>
`;
fs.writeFileSync(path.join(root, 'frontend/public/hero.svg'), hero);

// ---------- logo / favicon ----------
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="#1f6b3a"/>
  <path d="M14 26 H50 L45 47 Q44 50 41 50 H23 Q20 50 19 47 Z" fill="#fff"/>
  <path d="M22 26 L28 15 M42 26 L36 15" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M32 44 C 24 40 24 33 32 30 C 40 33 40 40 32 44 Z" fill="#f2a31b"/>
</svg>
`;
fs.writeFileSync(path.join(root, 'frontend/public/logo.svg'), logo);
fs.copyFileSync(path.join(root, 'frontend/public/logo.svg'), path.join(root, 'frontend/public/favicon.svg'));

console.log(`Generated ${catalog.products.length} product images + hero + logo -> frontend/public`);
