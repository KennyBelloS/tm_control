// Genera src/styles/fiestas.generated.css a partir de src/lib/fiestas.js (única fuente de verdad). Uso: node src/scripts/generar-fiestas-css.mjs
import fs from 'fs';
import { FIESTAS } from '../lib/fiestas.js';
let css = '/* GENERADO por src/scripts/generar-fiestas-css.mjs desde src/lib/fiestas.js — no editar a mano. */\n';
for (const f of FIESTAS) {
  const c = f.colores;
  const base = Object.entries(c).map(([k, v]) => `--${k}:${v};`).join(' ');
  css += `\n/* ${f.emoji} ${f.nombre} */\nhtml[data-fiesta="${f.id}"]{ ${base} --primary-soft:color-mix(in srgb, ${c.primary} 10%, #fff); --fiesta-brillo:${c['primary-light']}; }\n`;
  // tema oscuro: acentos más claros para que se lean sobre fondo oscuro
  css += `html[data-tema="oscuro"][data-fiesta="${f.id}"]{ --primary:color-mix(in srgb, ${c.primary} 78%, #fff); --primary-light:color-mix(in srgb, ${c['primary-light']} 88%, #fff); --primary-soft:color-mix(in srgb, ${c.primary} 18%, #0B120E); --fiesta-brillo:${c['primary-light']}; }\n`;
}
fs.writeFileSync(new URL('../styles/fiestas.generated.css', import.meta.url), css);
console.log('fiestas.generated.css:', FIESTAS.length, 'paletas');
