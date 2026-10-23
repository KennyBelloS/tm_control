/**
 * MANUAL — parte PURA: lee el MANUAL.md (markdown sencillo) y lo convierte en bloques que la pantalla "Cómo se usa" dibuja.
 * El MANUAL.md es la ÚNICA fuente: lo que se ve en la app y lo que está en el archivo no pueden diferir.
 * Zonas del archivo (comentarios HTML): USO · TECNICO · NOVEDADES. La app muestra USO y NOVEDADES.
 */
export const quitarAcentos = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const normalizar = t => quitarAcentos(t).toLowerCase();
export const idDe = t => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** El texto entre <!-- NOMBRE:INICIO --> y <!-- NOMBRE:FIN -->, o '' si no está. */
export function extraerBloque(md, nombre) {
  const a = `<!-- ${nombre}:INICIO -->`, b = `<!-- ${nombre}:FIN -->`;
  const i = md.indexOf(a), j = md.indexOf(b);
  return i < 0 || j < i ? '' : md.slice(i + a.length, j).trim();
}

/** Texto en línea → trozos: { t: 'txt' | 'b' | 'code' | 'link', v, href? }. Solo se aceptan enlaces a rutas de la app ("/reportes") o https. */
export function inline(texto) {
  const out = [], re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s][^*]*?)\*/g;
  let ult = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ult) out.push({ t: 'txt', v: texto.slice(ult, m.index) });
    if (m[1] !== undefined) out.push({ t: 'b', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'code', v: m[2] });
    else if (m[5] !== undefined) out.push({ t: 'i', v: m[5] });
    else if (/^(\/[A-Za-z0-9_\-/#?=&]*|https:\/\/[^\s]+)$/.test(m[4])) out.push({ t: 'link', v: m[3], href: m[4] });
    else out.push({ t: 'txt', v: m[3] });
    ult = m.index + m[0].length;
  }
  if (ult < texto.length) out.push({ t: 'txt', v: texto.slice(ult) });
  return out;
}

const celdas = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const esSeparador = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

/** Markdown → bloques: h (nivel, texto, id) · p · ul · ol · tabla (cabecera, filas) · codigo · cita · hr. */
export function parsear(md) {
  const L = String(md).replace(/\r/g, '').split('\n'), out = [], usados = new Map();
  const idUnico = t => { const base = idDe(t) || 'seccion', n = usados.get(base) || 0; usados.set(base, n + 1); return n ? `${base}-${n + 1}` : base; };
  let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,4})\s+(.+)$/.exec(l))) { out.push({ tipo: 'h', nivel: m[1].length, texto: m[2].trim(), id: idUnico(m[2]) }); i++; continue; }
    if (/^\s*```/.test(l)) { const c = []; i++; while (i < L.length && !/^\s*```/.test(L[i])) c.push(L[i++]); i++; out.push({ tipo: 'codigo', texto: c.join('\n') }); continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)) { out.push({ tipo: 'hr' }); i++; continue; }
    if (l.trim().startsWith('|') && i + 1 < L.length && esSeparador(L[i + 1])) {
      const cab = celdas(l), filas = []; i += 2;
      while (i < L.length && L[i].trim().startsWith('|')) filas.push(celdas(L[i++]));
      out.push({ tipo: 'tabla', cabecera: cab, filas }); continue;
    }
    if (/^>\s?/.test(l)) { const c = []; while (i < L.length && /^>\s?/.test(L[i])) c.push(L[i++].replace(/^>\s?/, '')); out.push({ tipo: 'cita', texto: c.join(' ') }); continue; }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
      const ord = /^\s*\d+\.\s+/.test(l), items = [], re = ord ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
      while (i < L.length && L[i].trim()) {
        const mm = re.exec(L[i]);
        if (mm) items.push(mm[1]); else if (/^\s{2,}\S/.test(L[i]) && items.length) items[items.length - 1] += ' ' + L[i].trim(); else break;
        i++;
      }
      out.push({ tipo: ord ? 'ol' : 'ul', items }); continue;
    }
    const p = []; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*```|>|\s*[-*]\s+|\s*\d+\.\s+|\s*\|)/.test(L[i])) p.push(L[i++].trim());
    if (p.length) out.push({ tipo: 'p', texto: p.join(' ') }); else i++;
  }
  return out;
}

/** Bloques → secciones por cada título de nivel 2 (lo que viene antes del primero queda como introducción, sin título). */
export function secciones(bloques) {
  const out = []; let act = { id: 'inicio', titulo: '', bloques: [] };
  for (const b of bloques) {
    if (b.tipo === 'h' && b.nivel === 2) { if (act.titulo || act.bloques.length) out.push(act); act = { id: b.id, titulo: b.texto, bloques: [] }; }
    else if (!(b.tipo === 'h' && b.nivel === 1)) act.bloques.push(b);
  }
  if (act.titulo || act.bloques.length) out.push(act);
  return out;
}

export function textoDe(b) {
  if (b.tipo === 'h' || b.tipo === 'p' || b.tipo === 'cita' || b.tipo === 'codigo') return b.texto || '';
  if (b.tipo === 'ul' || b.tipo === 'ol') return b.items.join(' ');
  if (b.tipo === 'tabla') return [...b.cabecera, ...b.filas.flat()].join(' ');
  return '';
}
const sinMarcas = t => t.replace(/\*+|`|\[([^\]]+)\]\([^)]*\)/g, m => (m.startsWith('[') ? m.replace(/\[([^\]]+)\]\([^)]*\)/, '$1') : ''));

/** Las secciones donde aparece lo que se busca (en el título o en el texto), sin importar mayúsculas ni acentos. */
export function filtrar(secs, consulta) {
  const q = normalizar(consulta).trim();
  if (!q) return secs;
  return secs.filter(s => normalizar(sinMarcas(`${s.titulo} ${s.bloques.map(textoDe).join(' ')}`)).includes(q));
}

/** Versiones del historial: "### Versión 1.2.0 — 22/10/2026 · Título" → [{ version, fecha, titulo }] (la más nueva primero, como están escritas). */
export function versiones(md) {
  const bloque = extraerBloque(md, 'NOVEDADES'), out = [];
  for (const l of bloque.split('\n')) {
    const m = /^###\s+Versi[oó]n\s+(\d+\.\d+\.\d+)(?:\s+—\s+(?:(\d{2}\/\d{2}\/\d{4})(?:\s+·\s+(.+))?|(.+)))?\s*$/.exec(l.trim());
    if (m) out.push({ version: m[1], fecha: m[2] || null, titulo: (m[3] || m[4] || '').trim() });
  }
  return out;
}

/** Los bloques de una parte del manual: desde el título (nivel 2 o 3) que contiene `parte` hasta el siguiente título del mismo nivel o mayor. */
export function subseccion(bloques, parte) {
  const q = normalizar(parte), i = bloques.findIndex(b => b.tipo === 'h' && b.nivel >= 2 && normalizar(b.texto).includes(q));
  if (i < 0) return [];
  const nivel = bloques[i].nivel, out = [];
  for (let k = i + 1; k < bloques.length; k++) { if (bloques[k].tipo === 'h' && bloques[k].nivel <= nivel) break; out.push(bloques[k]); }
  return out;
}
