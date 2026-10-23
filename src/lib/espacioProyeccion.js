/**
 * ESTIMACIÓN DEL ESPACIO — reglas puras: a qué ritmo crece la base de datos, cuándo se llenaría y qué consejos dar.
 *   tablas: [{ tabla, bytes, filas }] (cuánto ocupa cada tabla)    ritmo: { tabla: filasNuevasPorDía }  (medido en los últimos días)
 * Cada tabla aporta (ritmo × bytes por fila) por día. Si no hay detalle por tabla, se usa un cálculo aproximado (uso ÷ meses de datos).
 */
import { TABLAS } from './respaldoGlobal.js';

const MB = 1048576;
const hojaDe = t => TABLAS.find(x => x.tabla === t)?.hoja || t;
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + Math.ceil(n)); return d.toISOString().slice(0, 10); };
export const ESCENARIOS = { rapido: 1.3, lento: 0.7 };                       // el ritmo real puede variar: se muestra un rango

export function proyectarEspacio({ hoy, usoMB, limiteMB, tablas = null, ritmo = {}, mesesDeDatos = 0 }) {
  const detalle = !!tablas?.length;
  const lista = detalle ? tablas.map(t => ({ tabla: t.tabla, hoja: hojaDe(t.tabla), mb: t.bytes / MB, filas: t.filas, mbPorDia: (t.filas > 0 ? (t.bytes / t.filas) : 0) * (ritmo[t.tabla] || 0) / MB })) : [];
  const totalMB = lista.reduce((s, t) => s + t.mb, 0) || usoMB;
  let mbPorDia = detalle ? lista.reduce((s, t) => s + t.mbPorDia, 0) : (mesesDeDatos > 0 ? usoMB / (mesesDeDatos * 30.4) : 0);
  const restanteMB = Math.max(0, limiteMB - usoMB), pct = limiteMB > 0 ? Math.round((usoMB / limiteMB) * 1000) / 10 : 0;
  const dias = mbPorDia > 1e-6 ? restanteMB / mbPorDia : Infinity;
  const fecha = d => (Number.isFinite(d) && d < 3650 ? sumarDias(hoy, d) : null);
  const nivel = pct >= 90 ? 'critico' : dias <= 90 ? 'urgente' : dias <= 365 ? 'atencion' : 'ok';
  return {
    aproximada: !detalle, pct, usoMB, limiteMB, restanteMB, mbPorDia, mbPorMes: mbPorDia * 30.4, diasRestantes: dias, nivel,
    fechaLlenado: fecha(dias), fechaPronto: fecha(dias / ESCENARIOS.rapido), fechaTarde: fecha(dias / ESCENARIOS.lento),
    mesesRestantes: Number.isFinite(dias) ? Math.round((dias / 30.4) * 10) / 10 : null,
    tablas: lista.map(t => ({ ...t, pct: totalMB > 0 ? t.mb / totalMB : 0, mbPorMes: t.mbPorDia * 30.4 })).sort((a, b) => b.mb - a.mb)
  };
}

/** Cuánto liberaría borrar lo anterior a un corte: filasAnteriores = { tabla: n }. */
export function ahorroDepuracion(tablas, filasAnteriores) {
  return (tablas || []).reduce((s, t) => s + (t.filas > 0 ? (t.bytes / t.filas) * (filasAnteriores[t.tabla] || 0) : 0), 0) / MB;
}

const CONSEJO_TABLA = {
  rendimiento_historico: 'Crece con cada reporte de boncheo. Depurar lo de más de 6 meses es lo que más espacio devuelve.',
  historico_bloques: 'Guarda el detalle por hora de cada persona y por eso pesa mucho. Es la primera candidata a depurar.',
  rendimiento_actual: 'Debería ser pequeña (solo el turno en curso). Si crece, revisa que se esté reemplazando cada día.',
  clasificacion_hora: 'Guarda cada hora de cada línea. Depurar lo antiguo la reduce rápido.',
  devoluciones_dia: 'Crece con cada carga de devoluciones. La carga ya escribe solo lo nuevo; depurar lo antiguo libera el resto.',
  asignaciones_diarias: 'Una fila por persona y día. Depurar lo antiguo la reduce.'
};

/** Consejos ordenados por prioridad (1 = hacer ya). hechos: { p (proyección), ahorroMB, hayCopiaAutomatica } */
export function consejos({ p, ahorroMB = 0, hayCopiaAutomatica = false }) {
  const out = [];
  if (p.nivel === 'critico') out.push({ prioridad: 1, icono: 'fa-triangle-exclamation', titulo: 'Libera espacio ahora', texto: `La base ya está al ${String(p.pct).replace('.', ',')} %. Haz el respaldo global y vacía los datos operativos, o depura lo de más de 6 meses.`, ruta: null });
  if (ahorroMB > 0.05) {
    const extra = p.mbPorMes > 0 ? Math.round((ahorroMB / p.mbPorMes) * 10) / 10 : null;
    out.push({ prioridad: p.nivel === 'ok' ? 3 : 1, icono: 'fa-broom', titulo: 'Depura lo de más de 6 meses', texto: `Liberarías unos ${ahorroMB < 10 ? ahorroMB.toFixed(1).replace('.', ',') : Math.round(ahorroMB)} MB${p.mbPorMes > 0 ? ` (≈ ${Math.round((ahorroMB / Math.max(p.usoMB, 1)) * 100)} % de lo usado)` : ''}${extra ? ` y alargarías la vida de la base unos ${String(extra).replace('.', ',')} meses` : ''}. Antes se respalda en Excel y en base de datos.`, ruta: null });
  }
  const mayor = p.tablas[0];
  if (mayor && mayor.pct >= 0.35) out.push({ prioridad: 2, icono: 'fa-chart-pie', titulo: `"${mayor.hoja}" ocupa el ${Math.round(mayor.pct * 100)} % de la base`, texto: CONSEJO_TABLA[mayor.tabla] || 'Es la tabla que más pesa: revisa si necesitas conservar todo su historial dentro de la base.', ruta: null });
  out.push({ prioridad: hayCopiaAutomatica ? 3 : 1, icono: 'fa-cloud-arrow-up', titulo: hayCopiaAutomatica ? 'Tus copias automáticas están a salvo fuera de la base' : 'Activa las copias automáticas', texto: hayCopiaAutomatica ? 'Se guardan en un almacenamiento aparte (no ocupa espacio de la base). Así puedes depurar sin miedo: lo que borres se puede volver a importar.' : 'Guarda copias fuera de la base: ejecuta la sección 30 del SQL y se generará una cada mes sola.', ruta: '/auditoria' });
  if (p.nivel === 'urgente' || p.nivel === 'atencion' || p.nivel === 'critico') out.push({ prioridad: 2, icono: 'fa-arrow-up-right-dots', titulo: 'Si necesitas más espacio, sube de plan', texto: 'Un plan mayor de Supabase aumenta el límite de la base. Después actualiza el límite en Configuración para que esta estimación use el valor correcto.', ruta: '/configuracion' });
  else out.push({ prioridad: 3, icono: 'fa-sliders', titulo: 'Mantén bien el límite en Configuración', texto: 'La estimación usa el límite que pusiste en Configuración: debe coincidir con el de tu plan de Supabase.', ruta: '/configuracion' });
  return out.sort((a, b) => a.prioridad - b.prioridad);
}
export const textoPlazo = p => (p.mesesRestantes === null ? 'sin crecimiento medible' : p.diasRestantes < 45 ? `en ${Math.max(1, Math.round(p.diasRestantes))} días` : `en unos ${String(p.mesesRestantes).replace('.', ',')} meses`);
