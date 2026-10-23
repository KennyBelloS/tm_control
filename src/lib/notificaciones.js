/**
 * NOTIFICACIONES — reglas puras: QUÉ avisar, A QUIÉN, con qué PRIORIDAD y CUÁNDO interrumpir. Sin base de datos ni pantalla.
 * Principios (para que no molesten):
 *   · Solo lo CRÍTICO interrumpe (un aviso flotante, una sola vez al día). Lo demás espera en la campana.
 *   · Cada aviso dice qué pasa y trae un botón para ir a resolverlo. Lo repetido se agrupa en uno solo.
 *   · Cada persona ve solo lo que le sirve según su rol. "No molestar" silencia hasta lo crítico.
 */
import { tipoDia, nombreFestivo } from './festivosColombia.js';

export const SEVERIDADES = ['critica', 'importante', 'info'];
const ORDEN = { critica: 0, importante: 1, info: 2 };
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const finDelDia = iso => `${iso}T23:59:59`;

/** Cuántos días ORDINARIOS (no domingo ni festivo) hay entre una fecha (sin incluirla) y hoy (sin incluirlo). */
export function diasOrdinariosPendientes(ultima, hoy) {
  let n = 0; for (let d = sumar(ultima, 1); d < hoy; d = sumar(d, 1)) if (tipoDia(d) === 'ordinario') n++; return n;
}

/**
 * Arma las notificaciones a partir de HECHOS ya consultados.
 * hechos: { hoy, hora, rol, puedeEditar, bajoRendimiento:[…], almacenamiento:{pct,usoMB,limiteMB}|null, devoluciones:{ultimaFecha}|null,
 *           respaldo:{ultimoMensual, semestral:{disponible,toca,corte}}|null, clasificadores:{existen,asignadosHoy}|null }
 */
export function construirNotificaciones(h) {
  const out = [], admin = h.rol === 'administrador', hoy = h.hoy;
  const add = n => out.push({ accion: null, caduca: null, fecha: `${hoy}T00:00:00`, ...n });

  // Producción: rendimiento bajo sostenido (se agrupa si son varias personas)
  const bajos = [...(h.bajoRendimiento || [])].sort((a, b) => b.diasSeguidos - a.diasSeguidos);
  if (bajos.length >= 3) add({ id: `bajo-rend-grupo-${hoy}`, severidad: 'importante', categoria: 'produccion', icono: 'fa-triangle-exclamation', titulo: `${bajos.length} personas con rendimiento bajo sostenido`, descripcion: `${bajos.slice(0, 3).map(b => b.colaborador).join(', ')} y ${bajos.length - 3} más llevan 3 o más días seguidos por debajo del 90 % de la meta.`, accion: { ruta: '/ranking', etiqueta: 'Ver ranking' }, fecha: `${bajos[0].ultimaFecha}T12:00:00` });
  else for (const b of bajos) add({ id: `bajo-rend-${b.colaborador_id}-${b.ultimaFecha}`, severidad: 'importante', categoria: 'produccion', icono: 'fa-triangle-exclamation', titulo: 'Rendimiento bajo sostenido', descripcion: `${b.colaborador} lleva ${b.diasSeguidos} días seguidos por debajo del 90 % de la meta (promedio ${b.promedioRend} tallos/h).`, accion: { ruta: `/colaborador?id=${b.colaborador_id}`, etiqueta: 'Ver su tablero' }, fecha: `${b.ultimaFecha}T12:00:00` });

  // Datos pendientes: devoluciones sin cargar (solo quienes pueden cargarlas)
  if (h.puedeEditar && h.devoluciones?.ultimaFecha) {
    const n = diasOrdinariosPendientes(h.devoluciones.ultimaFecha, hoy);
    if (n >= 2) add({ id: `devol-pendientes-${h.devoluciones.ultimaFecha}-${hoy}`, severidad: 'importante', categoria: 'datos', icono: 'fa-rotate-left', titulo: 'Faltan devoluciones por cargar', descripcion: `El último día cargado es el ${ddmm(h.devoluciones.ultimaFecha)}: faltan ${n} días de trabajo.`, accion: { ruta: '/devoluciones', etiqueta: 'Cargar devoluciones' }, caduca: finDelDia(hoy) });
    else if (n === 1) add({ id: `devol-pendientes-${h.devoluciones.ultimaFecha}-${hoy}`, severidad: 'info', categoria: 'datos', icono: 'fa-rotate-left', titulo: 'Devoluciones de ayer pendientes', descripcion: `Falta cargar el día ${ddmm(sumar(h.devoluciones.ultimaFecha, 1))}.`, accion: { ruta: '/devoluciones', etiqueta: 'Cargar' }, caduca: finDelDia(hoy) });
  }
  // Datos pendientes: el Histórico lleva días sin actualizarse (antes era una franja flotante propia; ahora es un aviso más de la campana)
  if (h.puedeEditar && h.historico?.ultimaFecha) {
    const n = diasOrdinariosPendientes(h.historico.ultimaFecha, hoy);
    if (n >= 1) add({ id: `historico-${h.historico.ultimaFecha}-${hoy}`, severidad: n >= 2 ? 'importante' : 'info', categoria: 'datos', icono: 'fa-calendar-xmark', titulo: n >= 2 ? `El Histórico lleva ${n} días de trabajo sin actualizarse` : 'Falta un día en el Histórico', descripcion: `El último día cargado es el ${ddmm(h.historico.ultimaFecha)}. Revisa si falta cargar un día o ajustar tiempos muertos.`, accion: { ruta: '/rendimientos', etiqueta: 'Ir a Rendimientos' }, caduca: finDelDia(hoy) });
  }
  // Organización: nadie asignado como clasificador hoy (solo si ya se usa y es día de trabajo)
  if (h.puedeEditar && h.clasificadores?.existen && h.clasificadores.asignadosHoy === 0 && tipoDia(hoy) === 'ordinario' && h.hora >= 7)
    add({ id: `clasif-sin-asignar-${hoy}`, severidad: 'info', categoria: 'organizacion', icono: 'fa-people-arrows', titulo: 'Hoy no hay clasificadores asignados', descripcion: 'Asígnalos a un bonchador para que tomen su asistencia, rendimiento y devoluciones.', accion: { ruta: '/lineas', etiqueta: 'Asignar' }, caduca: finDelDia(hoy) });
  // Calendario: invitación a una festividad (ya no es una ventana flotante: espera en la campana, se ofrece una vez por festividad y año)
  if (h.fiesta) add({ id: `fiesta-${h.fiesta.id}-${hoy.slice(0, 4)}`, severidad: 'info', categoria: 'calendario', icono: 'fa-wand-magic-sparkles', titulo: `Es temporada de ${h.fiesta.nombre}`, descripcion: '¿Quieres darle un aire festivo a la aplicación? Puedes apagarlo cuando quieras.', accion: { tipo: 'activar_fiesta', etiqueta: 'Activar', dato: h.fiesta.clave } });
  // Novedades: una vez por versión nueva del manual ("qué cambió")
  if (h.novedades) add({ id: `novedades-${h.novedades.version}`, severidad: 'info', categoria: 'calendario', icono: 'fa-gift', titulo: `Novedades de la versión ${h.novedades.version}`, descripcion: h.novedades.titulo || 'Mira qué cambió en la aplicación.', accion: { ruta: '/ayuda?tab=novedades', etiqueta: 'Ver novedades' } });
  // Calendario: festivo
  const fest = nombreFestivo(hoy);
  if (fest) add({ id: `festivo-${hoy}`, severidad: 'info', categoria: 'calendario', icono: 'fa-calendar-day', titulo: `Hoy es festivo: ${fest}`, descripcion: 'Día no laborable en Colombia: si hay reporte, solo cuenta para quienes aparecen en él.', caduca: finDelDia(hoy) });

  // Sistema (solo administradores)
  if (admin && h.almacenamiento) {
    const { pct, usoMB, limiteMB } = h.almacenamiento;
    if (pct >= 90) add({ id: `almacenamiento-critico-${hoy}`, severidad: 'critica', categoria: 'sistema', icono: 'fa-database', titulo: `Base de datos al ${String(pct).replace('.', ',')} %`, descripcion: `Se está por llenar (${usoMB} de ${limiteMB} MB). Haz un respaldo y libera espacio.`, accion: { ruta: '/auditoria', etiqueta: 'Ir a Auditoría' }, caduca: finDelDia(hoy) });
    else if (pct >= 80) add({ id: `almacenamiento-alto-${hoy}`, severidad: 'importante', categoria: 'sistema', icono: 'fa-database', titulo: `Base de datos al ${String(pct).replace('.', ',')} %`, descripcion: `Llevas ${usoMB} de ${limiteMB} MB. Conviene planear un respaldo.`, accion: { ruta: '/auditoria', etiqueta: 'Ver Auditoría' }, caduca: finDelDia(hoy) });
  }
  if (admin && h.respaldo) {
    const mesActual = hoy.slice(0, 7), ultimo = h.respaldo.ultimoMensual ? String(h.respaldo.ultimoMensual).slice(0, 7) : null;
    if ((!ultimo || ultimo < mesActual) && Number(hoy.slice(8)) >= 3) add({ id: `backup-pendiente-${mesActual}`, severidad: 'importante', categoria: 'sistema', icono: 'fa-box-archive', titulo: 'Todavía no hay copia automática de este mes', descripcion: 'Se genera sola cuando un administrador abre la app. Si no aparece, revisa que la base esté preparada y haz una copia manual.', accion: { ruta: '/auditoria', etiqueta: 'Ir a Auditoría' } });
    else if (ultimo === mesActual && h.respaldo.ultimoMensual && String(h.respaldo.ultimoMensual).slice(0, 10) >= sumar(hoy, -1)) add({ id: `backup-hecho-${String(h.respaldo.ultimoMensual).slice(0, 10)}`, severidad: 'info', categoria: 'sistema', icono: 'fa-circle-check', titulo: 'Se generó solo el backup del mes', descripcion: h.respaldo.ultimoNombre ? `«${h.respaldo.ultimoNombre}» quedó guardado en la nube y se puede importar si hace falta.` : 'La copia de seguridad de la base de datos de este mes ya quedó guardada en la nube.', accion: { ruta: '/auditoria', etiqueta: 'Ver copias' }, fecha: String(h.respaldo.ultimoMensual), caduca: finDelDia(hoy) });
    if (h.respaldo.semestral?.toca) add({ id: `depuracion-${h.respaldo.semestral.corte}`, severidad: 'importante', categoria: 'sistema', icono: 'fa-broom', titulo: 'Toca la depuración semestral', descripcion: `Hay información anterior al ${ddmm(h.respaldo.semestral.corte)}/${h.respaldo.semestral.corte.slice(0, 4)} que puedes depurar, con respaldo en Excel y en base de datos.`, accion: { ruta: '/auditoria', etiqueta: 'Ir a Auditoría' } });
  }
  return out;
}

/**
 * Lo que se ve en la campana. estado: { leidas:[ids], ocultas:{ id: hastaISO }, filtro:'todas'|'importantes'|'sin_leer' }.
 * Se quitan las caducadas y las ocultas ("recordar mañana" o eliminadas); orden: críticas, importantes, informativas, y lo más reciente primero.
 */
export function visibles(items, estado, ahora) {
  const t = new Date(ahora).getTime(), leidas = new Set(estado.leidas || []);
  let l = items.filter(n => !(n.caduca && new Date(n.caduca).getTime() < t) && !(estado.ocultas?.[n.id] && new Date(estado.ocultas[n.id]).getTime() > t));
  if (estado.filtro === 'importantes') l = l.filter(n => n.severidad !== 'info');
  if (estado.filtro === 'sin_leer') l = l.filter(n => !leidas.has(n.id) || n.severidad === 'critica');
  return l.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad] || (a.fecha < b.fecha ? 1 : -1));
}
/** El globito de la campana: cuántas sin ver y de qué nivel es la más grave. Lo crítico sigue contando hasta que se atienda o se oculte. */
export function insignia(items, estado, ahora) {
  const v = visibles(items, { ...estado, filtro: 'todas' }, ahora), leidas = new Set(estado.leidas || []);
  const pend = v.filter(n => !leidas.has(n.id) || n.severidad === 'critica');
  return { cuenta: pend.length, nivel: pend.length ? pend.reduce((m, n) => (ORDEN[n.severidad] < ORDEN[m] ? n.severidad : m), 'info') : null };
}
/** ¿Cuáles interrumpen con un aviso flotante? SOLO las críticas, una vez al día, y nunca con "No molestar" activo. */
export function paraAvisoFlotante(items, estado, ahora, yaMostradas = []) {
  if (estado.noMolestarHasta && new Date(estado.noMolestarHasta).getTime() > new Date(ahora).getTime()) return [];
  const ya = new Set(yaMostradas);
  return visibles(items, { ...estado, filtro: 'todas' }, ahora).filter(n => n.severidad === 'critica' && !ya.has(n.id));
}
export const mananaTemprano = ahora => { const d = new Date(ahora); d.setDate(d.getDate() + 1); d.setHours(5, 0, 0, 0); return d.toISOString(); };
export function tiempoRelativo(fecha, ahora) {
  const min = Math.floor((new Date(ahora) - new Date(fecha)) / 60000);
  if (min < 1) return 'ahora'; if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); return d === 1 ? 'ayer' : d < 7 ? `hace ${d} días` : new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
