/**
 * RESUMEN EJECUTIVO — parte PURA: arma el "correo ejecutivo" a partir de los cálculos del período (finca y cada equipo):
 * un panorama redactado con los números reales, indicadores con tendencia, equipos ordenados, conclusiones y la firma.
 * No consulta nada ni dibuja: devuelve datos que la pantalla y la descarga usan por igual.
 */
import { titular } from './resumenGeneral.js';

const fmt = n => Math.round(n).toLocaleString('es-CO');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const unir = l => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} y ${l.at(-1)}`);
export const corto = n => { const t = String(n || '').replace(/\{\}/g, ' ').trim().split(/\s+/).filter(Boolean); return t.length < 2 ? (t[0] || '—') : `${t[0]} ${(t.length >= 4 ? t[2] : t[1])[0]}.`; };

export const FIRMA_DEFECTO = { nombre: 'Kenny Bello', cargo: 'Ingeniero de sistemas', empresa: 'Falcon Farms', finca: 'Finca Torremolinos', ubicacion: 'Finca Torremolinos, Suesca – Colombia', telefono: '', correo: '' };
/** La firma que se escribe a mano: se limpia y se limita (nada de HTML, largos razonables, correo y teléfono con forma válida). */
export function normalizarFirma(f = {}) {
  const t = (v, d, max = 80) => { const s = String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); return s || d; };
  const correo = String(f.correo ?? '').trim().slice(0, 80), tel = String(f.telefono ?? '').replace(/[^\d+()\-\s.]/g, '').trim().slice(0, 30);
  return { nombre: t(f.nombre, FIRMA_DEFECTO.nombre), cargo: t(f.cargo, FIRMA_DEFECTO.cargo), empresa: FIRMA_DEFECTO.empresa, finca: FIRMA_DEFECTO.finca, ubicacion: t(f.ubicacion, FIRMA_DEFECTO.ubicacion, 100), telefono: tel, correo: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(correo) ? correo : '' };
}

export const periodoFrase = p => (p.tipo === 'mensual' ? `el mes de ${p.etiqueta}` : p.tipo === 'semanal' ? `la ${p.etiqueta}` : `el período ${p.etiqueta}`);
const cambio = v => (v === null || v === undefined ? '' : Math.abs(v) < 0.5 ? ', igual que el período anterior' : `, un ${Math.abs(Math.round(v))} % ${v > 0 ? 'más' : 'menos'} que el período anterior`);
/** Una variación en porcentaje → { txt, clase } ("bien" si fue en la dirección que conviene). */
export function tendencia(v, buenoSiSube = true) {
  if (v === null || v === undefined) return null;
  if (Math.abs(v) < 0.5) return { txt: '= igual', clase: 'igual' };
  return { txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(Math.round(v))} %`, clase: (v > 0) === buenoSiSube ? 'bien' : 'mal' };
}

/** Los equipos con producción, del mejor al menor rendimiento. equipos: [{ id, nombre, r, c }]. */
export function ordenarEquipos(equipos = []) {
  const con = equipos.filter(e => e.r?.diasTrabajados > 0 && e.r.tallos > 0).sort((a, b) => b.r.rend - a.r.rend || b.r.tallos - a.r.tallos);
  const mejor = con[0]?.r.rend || 0;
  return con.map((e, i) => ({ id: e.id, nombre: e.nombre, puesto: i + 1, tallos: e.r.tallos, rend: e.r.rend, personas: e.r.personasPorDia, cumplenMetaPct: e.r.cumplenMetaPct, d: tendencia(e.c?.rend), porDia: e.r.porDia, pctDelMejor: mejor > 0 ? (e.r.rend / mejor) * 100 : 0, devoluciones: e.r.devoluciones.hayDatos ? e.r.devoluciones.total : null }));
}

/** Los indicadores clave (con tendencia contra el período anterior). */
export function indicadores(r, c) {
  const k = [];
  k.push({ id: 'tallos', icono: 'fa-seedling', etq: 'Tallos', valor: fmt(r.tallos), sub: `${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} de trabajo`, d: tendencia(c.tallos) });
  k.push({ id: 'rend', icono: 'fa-gauge-high', etq: 'Rendimiento', valor: fmt(r.rend), sub: 'tallos por hora real', d: tendencia(c.rend) });
  k.push(r.cumplimiento !== null ? { id: 'cumpl', icono: 'fa-bullseye', etq: 'Cumplimiento', valor: `${Math.round(r.cumplimiento)} %`, sub: `meta ${fmt(r.metaDia)} al día`, aro: r.cumplimiento, d: c.cumplimiento === null ? null : { txt: `${c.cumplimiento > 0 ? '▲' : '▼'} ${Math.abs(Math.round(c.cumplimiento))} pts`, clase: Math.abs(c.cumplimiento) < 0.5 ? 'igual' : c.cumplimiento > 0 ? 'bien' : 'mal' } }
    : { id: 'cumpl', icono: 'fa-bullseye', etq: 'Turnos con meta', valor: r.cumplenMetaPct == null ? '—' : `${Math.round(r.cumplenMetaPct)} %`, sub: `meta ${fmt(r.metaHora || 0)} t/h`, aro: r.cumplenMetaPct ?? null, d: null });
  k.push({ id: 'devol', icono: 'fa-rotate-left', etq: 'Devoluciones', valor: r.devoluciones.hayDatos ? fmt(r.devoluciones.total) : '—', sub: r.devoluciones.hayDatos ? (r.devoluciones.diaMas ? `más: ${ddmm(r.devoluciones.diaMas[0])}` : '') : 'sin cargar', d: tendencia(c.devoluciones, false) });
  k.push({ id: 'calidad', icono: 'fa-circle-check', etq: 'Calidad', valor: r.devoluciones.porMil == null ? '—' : fmt1(r.devoluciones.porMil), sub: 'devoluciones por 1.000 tallos', d: tendencia(c.porMil, false) });
  k.push(r.clasificacion ? { id: 'clas', icono: 'fa-boxes-stacked', etq: 'Clasificación', valor: fmt(r.clasificacion.porHora), sub: 'tallos por hora', d: null } : { id: 'pers', icono: 'fa-users', etq: 'Personas por día', valor: fmt1(r.personasPorDia), sub: 'promedio con registro', d: null });
  return k;
}

/** El panorama redactado, párrafo por tema, con los números reales del período. */
export function narrativa({ r, c, equipos = [] }) {
  if (!r.diasTrabajados) return [{ id: 'sin', icono: 'fa-circle-info', titulo: 'Sin producción', texto: 'Todavía no hay producción registrada en este período. Cuando se carguen los reportes, este resumen se completa solo.' }];
  const out = [];
  out.push({ id: 'produccion', icono: 'fa-seedling', titulo: 'Producción', texto: `Durante ${periodoFrase(r.periodo)} la finca produjo ${fmt(r.tallos)} tallos en ${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} de trabajo, con un rendimiento promedio de ${fmt(r.rend)} tallos por hora real${cambio(c.rend)}.${c.tallos !== null && Math.abs(c.tallos) >= 0.5 ? ` La producción total ${c.tallos > 0 ? 'subió' : 'bajó'} ${Math.abs(Math.round(c.tallos))} %.` : ''}` });
  if (r.cumplimiento !== null) {
    const p = Math.round(r.cumplimiento), dif = Math.abs(r.metaDia * r.diasTrabajados - r.tallos);
    out.push({ id: 'meta', icono: 'fa-bullseye', titulo: 'Meta', texto: `Frente a la meta diaria de ${fmt(r.metaDia)} tallos, el cumplimiento fue de ${p} %${r.cumplimiento >= 100 ? ` (se superó por ${fmt(dif)} tallos)` : `; faltaron ${fmt(dif)} tallos`}.${r.cumplenMetaPct != null ? ` El ${Math.round(r.cumplenMetaPct)} % de los turnos de persona alcanzó la meta por hora (${fmt(r.metaHora || 0)} t/h).` : ''}` });
  } else if (r.cumplenMetaPct != null) out.push({ id: 'meta', icono: 'fa-bullseye', titulo: 'Meta', texto: `El ${Math.round(r.cumplenMetaPct)} % de los turnos de persona alcanzó la meta por hora (${fmt(r.metaHora || 0)} t/h).` });
  const eq = ordenarEquipos(equipos);
  if (eq.length >= 2) { const a = eq[0], z = eq.at(-1); out.push({ id: 'equipos', icono: 'fa-people-group', titulo: 'Equipos', texto: `El equipo con mejor rendimiento fue ${a.nombre} (${fmt(a.rend)} tallos/hora) y el de menor rendimiento, ${z.nombre} (${fmt(z.rend)}); la diferencia entre ambos es de ${Math.round(((a.rend - z.rend) / a.rend) * 100)} %.` }); }
  if (r.devoluciones.hayDatos) {
    const causa = r.devoluciones.causas[0];
    out.push({ id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: `Se registraron ${fmt(r.devoluciones.total)} devoluciones${r.devoluciones.porMil != null ? ` (${fmt1(r.devoluciones.porMil)} por cada 1.000 tallos)` : ''}${c.devoluciones !== null && Math.abs(c.devoluciones) >= 0.5 ? `, ${Math.abs(Math.round(c.devoluciones))} % ${c.devoluciones > 0 ? 'más' : 'menos'} que el período anterior` : ''}.${causa ? ` La causa principal fue ${causa.nombre} (${Math.round(causa.pct * 100)} %)` : ''}${r.devoluciones.diaMas ? `${causa ? ' y el' : ' El'} día con más devoluciones fue el ${ddmm(r.devoluciones.diaMas[0])}` : ''}${causa || r.devoluciones.diaMas ? '.' : ''}` });
  } else out.push({ id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: 'Las devoluciones de este período todavía no se han cargado.' });
  if (r.clasificacion) { const l = r.clasificacion.lineas[0]; out.push({ id: 'clasificacion', icono: 'fa-boxes-stacked', titulo: 'Clasificación', texto: `La clasificación movió ${fmt(r.clasificacion.tallos)} tallos, a ${fmt(r.clasificacion.porHora)} tallos por hora${l ? `; la línea más productiva fue ${l.nombre} (${fmt(l.tallos)} tallos)` : ''}.` }); }
  if (r.destacados?.length) out.push({ id: 'destacados', icono: 'fa-medal', titulo: 'Destacados', texto: `Destacaron por rendimiento ${unir(r.destacados.slice(0, 3).map(p => `${corto(p.nombre)} (${fmt(p.rend)} t/h)`))}, con 3 o más días trabajados.` });
  return out;
}

/** Lo que se recomienda hacer, según cómo salió el período. (Los pendientes del sistema van aparte, en su propia sección: no se repiten aquí.) [{ tono, icono, texto }] */
export function conclusiones({ r, c, equipos = [] }) {
  if (!r.diasTrabajados) return [{ tono: 'info', icono: 'fa-circle-info', texto: 'Cargar los reportes de producción del período para poder analizarlo.' }];
  const out = [], t = titular(r, c), eq = ordenarEquipos(equipos);
  out.push({ tono: t.tono, icono: t.icono, texto: `${t.texto}. ${t.detalle}` });
  if (r.cumplimiento !== null && r.cumplimiento < 90) out.push({ tono: 'atencion', icono: 'fa-bullseye', texto: `Reforzar la producción diaria: se necesitan ${fmt((r.metaDia * r.diasTrabajados - r.tallos) / Math.max(1, r.diasTrabajados))} tallos más por día para llegar a la meta.` });
  if (c.devoluciones !== null && c.devoluciones > 10 && r.devoluciones.causas[0]) out.push({ tono: 'atencion', icono: 'fa-rotate-left', texto: `Las devoluciones aumentaron ${Math.round(c.devoluciones)} %: revisar la causa principal (${r.devoluciones.causas[0].nombre}).` });
  if (eq.length >= 2 && eq.at(-1).pctDelMejor < 90) out.push({ tono: 'info', icono: 'fa-people-group', texto: `Acompañar al equipo de ${eq.at(-1).nombre}: rinde ${Math.round(100 - eq.at(-1).pctDelMejor)} % menos que el mejor equipo.` });
  if (!r.devoluciones.hayDatos) out.push({ tono: 'info', icono: 'fa-file-arrow-up', texto: 'Cargar las devoluciones del período para completar el análisis de calidad.' });
  if (out.length === 1 && t.tono === 'bien') out.push({ tono: 'bien', icono: 'fa-thumbs-up', texto: 'Mantener el ritmo actual y reconocer a los equipos destacados.' });
  return out.slice(0, 6);
}

/** El modelo completo del documento. alertas: [{ titulo, descripcion, severidad }] (estado actual del sistema). */
export function modeloEjecutivo({ r, c, equipos = [], alertas = [], firma, generado }) {
  return {
    periodo: r.periodo, titular: titular(r, c), generado: generado || '', firma: normalizarFirma(firma),
    indicadores: r.diasTrabajados ? indicadores(r, c) : [], narrativa: narrativa({ r, c, equipos }),
    porDia: r.porDia, metaDia: r.metaDia || 0, equipos: ordenarEquipos(equipos),
    causas: r.devoluciones.causas.map(x => ({ nombre: x.nombre, cantidad: x.cantidad, pct: x.pct })),
    lineas: (r.clasificacion?.lineas || []).slice(0, 6).map(l => ({ nombre: l.nombre, tallos: l.tallos, porHora: l.porHora })),
    destacados: (r.destacados || []).slice(0, 3).map(p => ({ nombre: corto(p.nombre), rend: p.rend, dias: p.dias })),
    conclusiones: conclusiones({ r, c, equipos }), alertas: alertas.slice(0, 5), metaHora: r.metaHora || 0
  };
}

/** El mismo documento en texto simple (para copiar y pegar en un correo o mensaje). */
export function textoEjecutivo(m) {
  const f = m.firma, L = [`RESUMEN EJECUTIVO — ${m.periodo.etiqueta}`, m.titular.texto, '', 'Cordial saludo.', ''];
  for (const n of m.narrativa) L.push(`${n.titulo}: ${n.texto}`, '');
  if (m.indicadores.length) { L.push('Indicadores clave'); for (const k of m.indicadores) L.push(`• ${k.etq}: ${k.valor} (${k.sub})${k.d ? ` ${k.d.txt}` : ''}`); L.push(''); }
  if (m.equipos.length) { L.push('Equipos (por rendimiento)'); for (const e of m.equipos) L.push(`${e.puesto}. ${e.nombre}: ${fmt(e.rend)} t/h · ${fmt(e.tallos)} tallos`); L.push(''); }
  if (m.conclusiones.length) { L.push('Conclusiones y recomendaciones'); for (const x of m.conclusiones) L.push(`• ${x.texto}`); L.push(''); }
  L.push('Cordialmente,', f.nombre, f.cargo, `${f.empresa} · ${f.finca}`, ...(f.telefono ? [f.telefono] : []), ...(f.correo ? [f.correo] : []), f.ubicacion, '', `Resumen generado automáticamente por TMControl, Sistema Integrado de Gestión de ${f.finca}${m.generado ? ` · ${m.generado}` : ''}.`);
  return L.join('\n');
}
