/**
 * Búsqueda de colaboradores por CÓDIGO (el número corto, ej. 15 — no el ID) o por NOMBRE. Pura: se prueba sin pantalla.
 * Se pueden combinar: "15 brayan munevar". Cada palabra escrita debe coincidir con el código o con el nombre.
 * Orden: primero el código exacto (15), luego los que empiezan igual (150, 151…), luego los nombres.
 */
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function buscarPersonas(lista, texto, limite = 8) {
  const tokens = norm(texto).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const res = [];
  for (const p of lista) {
    const nombre = norm(p.nombre), palabras = nombre.split(/\s+/);
    const codigos = [...new Set([p.codigo, p.mesa].filter(c => c != null && c !== '').map(String))];
    let puntos = 0, ok = true;
    for (const t of tokens) {
      let pt = 0;
      if (/^\d+$/.test(t)) pt = codigos.includes(t) ? 100 : codigos.some(c => c.startsWith(t)) ? 40 : 0;       // número → código
      if (!pt) pt = palabras.some(w => w.startsWith(t)) ? 30 : nombre.includes(t) ? 15 : 0;                   // texto (o número dentro de un nombre) → nombre
      if (!pt) { ok = false; break; }
      puntos += pt;
    }
    if (ok) res.push({ p, puntos });
  }
  const num = p => { const c = Number(p.codigo ?? p.mesa); return Number.isFinite(c) ? c : 1e9; };
  res.sort((a, b) => b.puntos - a.puntos || num(a.p) - num(b.p) || String(a.p.nombre).localeCompare(String(b.p.nombre)));
  return res.slice(0, limite).map(x => x.p);
}
