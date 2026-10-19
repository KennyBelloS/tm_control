// Genera src/styles/tema-oscuro.generated.css: para cada regla con colores CLAROS escritos a mano (fondos, bordes) o
// textos OSCUROS, crea su equivalente para html[data-tema="oscuro"] invirtiendo la luminosidad y conservando el tono.
// Uso:  node scripts/generar-tema-oscuro.mjs      (vuelve a correrlo si agregas colores fijos nuevos al CSS)
import fs from 'fs';
const ENTRADAS = ['src/index.css', 'src/components/presentacion.css'];
const SALIDA = 'src/styles/tema-oscuro.generated.css';
const PREF = 'html[data-tema="oscuro"] ';

const hexARgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbAHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
const hslAHex = (h, s, l) => { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; };

function mapear(hex, tipo) {
  const [h, s, l] = rgbAHsl(hexARgb(hex));
  if (tipo === 'fondo') return l > 0.78 ? hslAHex(h, s * 0.55, 0.085 + (1 - l) * 0.62) : null;      // superficies claras → oscuras
  if (tipo === 'borde') return l > 0.70 ? hslAHex(h, s * 0.45, 0.17 + (1 - l) * 0.5) : null;
  if (tipo === 'texto') return l < 0.42 ? hslAHex(h, Math.min(1, s * 0.85), 0.96 - l * 0.55) : null; // textos oscuros → claros
  return null;
}
const tipoDe = p => /^background/.test(p) ? 'fondo' : /^(border|outline)/.test(p) ? 'borde' : /^(color|fill|stroke)$/.test(p) ? 'texto' : null;

function partirPorPuntoYComa(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ';' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }

function bloques(css) {                                   // convierte el CSS en árbol de reglas y @media
  const res = []; let i = 0;
  while (i < css.length) {
    const a = css.indexOf('{', i); if (a === -1) break;
    const prelude = css.slice(i, a).trim(); let d = 1, j = a + 1;
    while (j < css.length && d > 0) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
    const cuerpo = css.slice(a + 1, j - 1);
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) res.push({ at: prelude, hijos: bloques(cuerpo) });
    else if (!prelude.startsWith('@')) res.push({ sel: prelude, cuerpo });
    i = j;
  }
  return res;
}

let reglas = 0;
function generar(lista) {
  let out = '';
  for (const b of lista) {
    if (b.at) { const dentro = generar(b.hijos); if (dentro) out += `${b.at}{\n${dentro}}\n`; continue; }
    if (/presentacion-tema-oscuro|^html|^body|^:root|^\*|^@/.test(b.sel)) continue;
    const decls = [];
    for (const d of partirPorPuntoYComa(b.cuerpo)) {
      const k = d.indexOf(':'); if (k === -1) continue;
      const prop = d.slice(0, k).trim().toLowerCase(), valor = d.slice(k + 1).trim(), tipo = tipoDe(prop);
      if (!tipo) continue;
      let cambio = false;
      let nuevo = valor.replace(/#[0-9a-fA-F]{3,8}\b/g, h => { if (![4, 7].includes(h.length)) return h; const m = mapear(h, tipo); if (m) { cambio = true; return m; } return h; });
      if (tipo === 'texto' && /var\(--primary-dark\)/.test(valor)) { nuevo = nuevo.replace(/var\(--primary-dark\)/g, '#A7E3BE'); cambio = true; }
      if (cambio) decls.push(`${prop}:${nuevo}`);
    }
    if (!decls.length) continue;
    const sel = b.sel.split(',').map(s => PREF + s.trim()).join(',\n');
    out += `${sel}{ ${decls.join('; ')}; }\n`; reglas++;
  }
  return out;
}

let todo = '/* GENERADO por scripts/generar-tema-oscuro.mjs — no editar a mano (los ajustes van en tema-oscuro.css) */\n';
for (const f of ENTRADAS) {
  const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  todo += `\n/* ---- ${f} ---- */\n` + generar(bloques(css));
}
fs.writeFileSync(SALIDA, todo);
console.log(`Tema oscuro generado: ${reglas} reglas → ${SALIDA} (${(todo.length / 1024).toFixed(0)} KB)`);
