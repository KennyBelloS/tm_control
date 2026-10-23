/**
 * IMAGEN DEL RESUMEN — arma un SVG (dibujo vectorial) con la cabecera de quién lo envía, las cifras, los gráficos y las frases.
 * Pura: devuelve texto. En el navegador se convierte a PNG con un canvas. Sin emojis (no los dibujan todas las fuentes).
 */
const FUENTE = "'DejaVu Sans', 'Segoe UI', Arial, sans-serif";
const VERDE = '#166534', VERDE_OSC = '#0F3D22', DORADO = '#C9932B', ROJO = '#C0392B', GRIS = '#6B7C71', TINTA = '#1A2A20', FONDO = '#F5F4EF';
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('es-CO');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TONO = { bien: '#2E8C4E', atencion: ROJO, info: '#1F5F8B' };

/** Parte un texto en renglones de a lo sumo `max` letras. */
export function renglones(texto, max) {
  const out = []; let l = '';
  for (const w of String(texto).split(/\s+/)) { if ((l + ' ' + w).trim().length > max && l) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); }
  if (l) out.push(l); return out;
}
const delta = v => (v === null || v === undefined ? null : { txt: v > 0.5 ? `▲ ${Math.round(v)}%` : v < -0.5 ? `▼ ${Math.abs(Math.round(v))}%` : '= igual', arriba: v > 0.5, abajo: v < -0.5 });

function tarjeta(x, y, w, h, { etq, valor, sub, d, buenoSiSube = true }) {
  const dd = delta(d), color = dd ? (dd.arriba === buenoSiSube && !dd.abajo ? '#2E8C4E' : dd.abajo === !buenoSiSube && !dd.arriba ? '#2E8C4E' : (dd.arriba || dd.abajo) ? ROJO : GRIS) : GRIS;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff"/><rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${DORADO}"/>
    <text x="${x + 26}" y="${y + 32}" font-size="15" font-weight="700" fill="${GRIS}" letter-spacing="1">${esc(etq.toUpperCase())}</text>
    <text x="${x + 26}" y="${y + 80}" font-size="44" font-weight="800" fill="${TINTA}">${esc(valor)}</text>
    <text x="${x + 26}" y="${y + 108}" font-size="15" fill="${GRIS}">${esc(sub || '')}</text>
    ${dd ? `<text x="${x + w - 20}" y="${y + 32}" font-size="16" font-weight="800" text-anchor="end" fill="${color}">${esc(dd.txt)}</text>` : ''}</g>`;
}
function barrasDia(x, y, w, h, porDia, metaDia) {
  if (!porDia.length) return '';
  const max = Math.max(1, metaDia || 0, ...porDia.map(d => d.tallos)), ancho = (w - 40) / porDia.length, base = y + h - 38, alto = h - 100;
  const barras = porDia.map((d, i) => { const bh = Math.max(3, (d.tallos / max) * alto), bx = x + 20 + i * ancho + ancho * 0.16, bw = ancho * 0.68; const sobre = metaDia && d.tallos >= metaDia;
    return `<rect x="${bx}" y="${base - bh}" width="${bw}" height="${bh}" rx="6" fill="${sobre ? '#2E8C4E' : VERDE}"/><text x="${bx + bw / 2}" y="${base - bh - 8}" font-size="${porDia.length > 8 ? 12 : 15}" font-weight="700" text-anchor="middle" fill="${TINTA}">${fmt(d.tallos)}</text><text x="${bx + bw / 2}" y="${base + 20}" font-size="${porDia.length > 8 ? 11 : 14}" text-anchor="middle" fill="${GRIS}">${esc(porDia.length > 8 ? d.fecha.slice(8) : d.dia.slice(0, 3) + ' ' + d.fecha.slice(8))}</text>`; }).join('');
  const meta = metaDia ? `<line x1="${x + 14}" x2="${x + w - 14}" y1="${base - (metaDia / max) * alto}" y2="${base - (metaDia / max) * alto}" stroke="${DORADO}" stroke-width="2.5" stroke-dasharray="9 6"/><text x="${x + w - 24}" y="${y + 36}" font-size="14" font-weight="700" text-anchor="end" fill="${DORADO}">- - Meta diaria ${fmt(metaDia)}</text>` : '';
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff"/><text x="${x + 24}" y="${y + 36}" font-size="19" font-weight="800" fill="${TINTA}">Tallos por día</text>${meta}${barras}</g>`;
}
function barrasH(x, y, w, h, titulo, filas, color) {
  if (!filas.length) return '';
  const max = Math.max(1, ...filas.map(f => f.valor)), fila = Math.min(46, (h - 64) / filas.length), maxBarra = Math.max(60, w - 190 - 150);
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff"/><text x="${x + 24}" y="${y + 36}" font-size="19" font-weight="800" fill="${TINTA}">${esc(titulo)}</text>${filas.map((f, i) => { const yy = y + 62 + i * fila, bw = Math.max(4, (maxBarra * f.valor) / max);
    return `<text x="${x + 24}" y="${yy + 19}" font-size="15" font-weight="700" fill="${TINTA}">${esc(String(f.etq).slice(0, 20))}</text><rect x="${x + 190}" y="${yy + 4}" width="${bw}" height="${fila * 0.5}" rx="6" fill="${color}"/><text x="${x + 190 + bw + 8}" y="${yy + 19}" font-size="15" font-weight="800" fill="${TINTA}">${fmt(f.valor)}${f.extra ? ` <tspan fill="${GRIS}" font-weight="400" font-size="13">${esc(f.extra)}</tspan>` : ''}</text>`; }).join('')}</g>`;
}

/** r: resultado de calcularResumen · c: comparar() · frases: insights() */
export const COLOR_FONDO = FONDO;
export function svgResumen({ r, c, frases, para, remitente, finca = 'Finca Torremolinos', generado, logo = null }) {
  const W = 1080, M = 40, kp = [];
  kp.push({ etq: 'Tallos', valor: fmt(r.tallos), sub: `${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} de trabajo`, d: c.tallos });
  kp.push({ etq: 'Rendimiento', valor: `${fmt(r.rend)}`, sub: 'tallos por hora real', d: c.rend });
  kp.push(r.cumplimiento !== null ? { etq: 'Cumplimiento', valor: `${Math.round(r.cumplimiento)}%`, sub: `meta ${fmt(r.metaDia)} al día`, d: c.cumplimiento } : { etq: 'Turnos con meta', valor: r.cumplenMetaPct === null ? '—' : `${Math.round(r.cumplenMetaPct)}%`, sub: `meta ${fmt(r.metaHora || 0)} t/h` });
  kp.push({ etq: 'Devoluciones', valor: r.devoluciones.hayDatos ? fmt(r.devoluciones.total) : '—', sub: r.devoluciones.hayDatos ? (r.devoluciones.diaMas ? `más: ${r.devoluciones.diaMas[0].slice(8)}/${r.devoluciones.diaMas[0].slice(5, 7)}` : '') : 'sin cargar', d: c.devoluciones, buenoSiSube: false });
  kp.push({ etq: 'Calidad', valor: r.devoluciones.porMil === null ? '—' : fmt1(r.devoluciones.porMil), sub: 'devoluciones por 1.000 tallos', d: c.porMil, buenoSiSube: false });
  kp.push(r.clasificacion ? { etq: 'Clasificación', valor: fmt(r.clasificacion.porHora), sub: 'tallos por hora (todas las líneas)' } : { etq: 'Personas por día', valor: fmt1(r.personasPorDia), sub: 'promedio con registro' });
  const cw = (W - 2 * M - 40) / 3; let y = 210, partes = [];
  kp.forEach((k, i) => partes.push(tarjeta(M + (i % 3) * (cw + 20), y + Math.floor(i / 3) * 150, cw, 130, k)));
  y += 2 * 150 + 10;
  partes.push(barrasDia(M, y, W - 2 * M, 290, r.porDia, r.metaDia)); y += 310;
  const causas = r.devoluciones.causas.map(x => ({ etq: x.nombre, valor: x.cantidad, extra: `${Math.round(x.pct * 100)}%` })), lineas = r.clasificacion ? r.clasificacion.lineas.slice(0, 5).map(l => ({ etq: l.nombre, valor: l.tallos, extra: `${fmt(l.porHora)}/h` })) : [];
  if (causas.length || lineas.length) {
    const alto = 64 + Math.max(causas.length, lineas.length) * 40 + 20;
    if (causas.length && lineas.length) { partes.push(barrasH(M, y, (W - 2 * M - 20) / 2, alto, 'Causas de devolución', causas, '#D4473A'), barrasH(M + (W - 2 * M + 20) / 2, y, (W - 2 * M - 20) / 2, alto, 'Clasificación por línea', lineas, DORADO)); }
    else partes.push(barrasH(M, y, W - 2 * M, alto, causas.length ? 'Causas de devolución' : 'Clasificación por línea', causas.length ? causas : lineas, causas.length ? '#D4473A' : DORADO));
    y += alto + 20;
  }
  const lineas2 = frases.flatMap(f => renglones(f.texto, 98).map((t, i) => ({ t, tono: f.tono, primero: i === 0 }))), altoF = 64 + lineas2.length * 26 + 16;
  partes.push(`<g><rect x="${M}" y="${y}" width="${W - 2 * M}" height="${altoF}" rx="18" fill="#fff"/><text x="${M + 24}" y="${y + 38}" font-size="19" font-weight="800" fill="${TINTA}">Lo más importante</text>${lineas2.map((l, i) => `${l.primero ? `<circle cx="${M + 30}" cy="${y + 72 + i * 26 - 5}" r="5" fill="${TONO[l.tono] || GRIS}"/>` : ''}<text x="${M + 46}" y="${y + 72 + i * 26}" font-size="16" fill="${TINTA}">${esc(l.t)}</text>`).join('')}</g>`);
  y += altoF + 24;
  const H = y + 70;
  // El logo REAL de la empresa (data-URL del PNG) dentro de un círculo blanco; si no hay logo, queda la marca dibujada de respaldo.
  const logoOk = typeof logo === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo);
  const marca = logoOk
    ? `<circle cx="92" cy="86" r="54" fill="#fff"/><clipPath id="recorte"><circle cx="92" cy="86" r="50"/></clipPath><image href="${logo}" x="42" y="36" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#recorte)"/>`
    : `<circle cx="92" cy="86" r="46" fill="#fff"/><circle cx="92" cy="86" r="40" fill="none" stroke="#4A9A5E" stroke-width="5"/><path d="M72 96 C72 74 86 70 92 80 C98 70 112 74 112 96" fill="none" stroke="${VERDE}" stroke-width="7" stroke-linecap="round"/><circle cx="92" cy="66" r="7" fill="${ROJO}"/>`;
  const cab = `<rect width="${W}" height="190" fill="url(#g)"/>${marca}
    <text x="164" y="66" font-size="38" font-weight="800" fill="#fff">${esc(r.periodo.titulo)}${r.destino.tipo === 'formadora' ? ` · Equipo de ${esc(r.destino.nombre)}` : ''}</text>
    <text x="164" y="104" font-size="22" fill="#CDE8D5">${esc(r.periodo.etiqueta)}${para ? ` · Para ${esc(para)}` : ''}</text>
    <text x="164" y="140" font-size="16" fill="#fff">${remitente ? `De parte de ${esc(remitente)} · ` : ''}TMControl · ${esc(finca)}</text>
    <text x="164" y="164" font-size="14" fill="#A9D3B5">${esc(generado || '')}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FUENTE}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${VERDE_OSC}"/><stop offset="1" stop-color="${VERDE}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="${FONDO}"/>${cab}${partes.join('')}<text x="${W / 2}" y="${H - 28}" font-size="14" text-anchor="middle" fill="${GRIS}">Generado automáticamente · Torremolinos TMControl</text></svg>`;
  return { svg, ancho: W, alto: H };
}
