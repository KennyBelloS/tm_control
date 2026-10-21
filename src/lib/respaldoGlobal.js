/**
 * RESPALDO GLOBAL Y VACIADO DE LA BASE DE DATOS — REGLAS DEL NEGOCIO (puras: sin base de datos, sin pantalla, sin Excel).
 * Así se prueban solas y la infraestructura (leer tablas, armar el Excel, llamar a la base) depende de estas reglas y no al revés.
 *
 *   vaciar:true  = datos OPERATIVOS (lo que se acumula día a día y llena la base): se respaldan y se eliminan.
 *   vaciar:false = datos MAESTROS (usuarios, configuración, personas, líneas…): se respaldan pero NO se eliminan.
 */
export const GRUPOS = { produccion: 'Producción', calidad: 'Calidad', organizacion: 'Organización', sistema: 'Sistema' };

export const TABLAS = [
  { tabla: 'rendimiento_historico', hoja: 'Histórico', titulo: 'Rendimiento histórico (una fila por persona y día)', grupo: 'produccion', vaciar: true, orden: ['fecha', 'colaborador_id'] },
  { tabla: 'historico_bloques', hoja: 'Bloques horarios', titulo: 'Bloques de hora del histórico', grupo: 'produccion', vaciar: true, orden: ['fecha', 'colaborador_id'] },
  { tabla: 'rendimiento_actual', hoja: 'Turno actual', titulo: 'Turno actual (bloques por hora)', grupo: 'produccion', vaciar: true, orden: ['fecha', 'hora_inicio'] },
  { tabla: 'metas_diarias', hoja: 'Metas diarias', titulo: 'Metas diarias', grupo: 'produccion', vaciar: true, orden: ['fecha'] },
  { tabla: 'descansos_diarios', hoja: 'Descansos', titulo: 'Descansos diarios', grupo: 'produccion', vaciar: true, orden: ['fecha'] },
  { tabla: 'clasificacion_cargas', hoja: 'Clasif. cargas', titulo: 'Clasificación: cargas del día', grupo: 'produccion', vaciar: true, orden: ['fecha'] },
  { tabla: 'clasificacion_hora', hoja: 'Clasif. por hora', titulo: 'Clasificación: tallos por línea y hora', grupo: 'produccion', vaciar: true, orden: ['fecha', 'linea', 'hora'] },
  { tabla: 'clasificacion_historico', hoja: 'Clasif. histórico', titulo: 'Clasificación: total diario por línea', grupo: 'produccion', vaciar: true, orden: ['fecha', 'linea'] },
  { tabla: 'devoluciones_dia', hoja: 'Devoluciones', titulo: 'Devoluciones (una fila por persona y día)', grupo: 'calidad', vaciar: true, orden: ['fecha', 'colaborador_id'] },
  { tabla: 'devoluciones_asistencia', hoja: 'Asistencia', titulo: 'Asistencia diaria (de devoluciones)', grupo: 'calidad', vaciar: true, orden: ['mes', 'colaborador_id'] },
  { tabla: 'asignaciones_diarias', hoja: 'Asignaciones', titulo: 'Asignación diaria de personas a formadora y línea', grupo: 'organizacion', vaciar: true, orden: ['fecha', 'colaborador_id'] },
  { tabla: 'tablero_formadoras', hoja: 'Tablero formadoras', titulo: 'Tablero integrado de formadoras', grupo: 'organizacion', vaciar: true, orden: ['fecha', 'formadora_id'] },
  { tabla: 'lineas_dia', hoja: 'Líneas por día', titulo: 'Líneas que trabajaron cada día', grupo: 'organizacion', vaciar: true, orden: ['fecha'] },
  { tabla: 'formadora_linea', hoja: 'Formadora-línea', titulo: 'Formadora a cargo de cada línea', grupo: 'organizacion', vaciar: true, orden: [] },
  { tabla: 'metas_linea_mes', hoja: 'Metas de línea', titulo: 'Metas de clasificación por línea y mes', grupo: 'organizacion', vaciar: true, orden: [] },
  { tabla: 'personas', hoja: 'Personas', titulo: 'Personas (catálogo)', grupo: 'organizacion', vaciar: false, orden: ['id'] },
  { tabla: 'lineas', hoja: 'Líneas', titulo: 'Líneas de producción', grupo: 'organizacion', vaciar: false, orden: ['id'] },
  { tabla: 'formadoras', hoja: 'Formadoras', titulo: 'Formadoras', grupo: 'organizacion', vaciar: false, orden: ['id'] },
  { tabla: 'devoluciones_personas', hoja: 'Personas (devol.)', titulo: 'Personas del módulo de devoluciones y su código', grupo: 'calidad', vaciar: false, orden: ['colaborador_id'] },
  { tabla: 'devoluciones_meta', hoja: 'Devol. meta', titulo: 'Devoluciones: último día cargado y causas', grupo: 'calidad', vaciar: false, orden: [] },
  { tabla: 'devoluciones_ajustes', hoja: 'Devol. ajustes', titulo: 'Devoluciones: mínimos de días', grupo: 'calidad', vaciar: false, orden: [] },
  { tabla: 'configuracion', hoja: 'Configuración', titulo: 'Configuración del sistema', grupo: 'sistema', vaciar: false, orden: [] },
  { tabla: 'perfiles', hoja: 'Usuarios', titulo: 'Usuarios y roles (sin contraseñas)', grupo: 'sistema', vaciar: false, orden: ['nombre'] }
];
export const tablasAVaciar = () => TABLAS.filter(t => t.vaciar).map(t => t.tabla);
export const tablasQueSeConservan = () => TABLAS.filter(t => !t.vaciar).map(t => t.tabla);

/** Qué nivel de aviso corresponde al porcentaje de la base usado. */
export const nivelAlmacenamiento = pct => (pct >= 90 ? 'critico' : pct >= 80 ? 'advertencia' : 'normal');

/**
 * Frase de seguridad (como al borrar un repositorio en GitHub): hay que TRANSCRIBIRLA para poder eliminar.
 * Dos flores, un color y dos números: fácil de leer, difícil de acertar por accidente. rng se inyecta para poder probarla.
 */
const FLORES = ['girasol', 'tulipan', 'orquidea', 'clavel', 'rosa', 'margarita', 'lirio', 'jazmin', 'camelia', 'dalia', 'hortensia', 'gerbera'];
const COLORES = ['verde', 'dorado', 'rojo', 'blanco', 'azul', 'lila', 'naranja', 'rosado'];
export function generarFrase(rng = Math.random) {
  const pick = l => l[Math.min(l.length - 1, Math.floor(rng() * l.length))];
  const f1 = pick(FLORES); let f2 = pick(FLORES); if (f2 === f1) f2 = FLORES[(FLORES.indexOf(f1) + 1) % FLORES.length];
  return `eliminar-${f1}-${pick(COLORES)}-${f2}-${String(Math.floor(rng() * 90) + 10)}`;
}
export const fraseCoincide = (escrita, esperada) => !!esperada && String(escrita ?? '').trim() === esperada;

/** ¿El respaldo trae TODAS las filas que hay en la base? conteosBD y filasRespaldo: { tabla: n } */
export function verificarRespaldo(conteosBD, filasRespaldo) {
  const faltantes = [];
  for (const t of TABLAS) { const bd = conteosBD[t.tabla] ?? 0, r = filasRespaldo?.[t.tabla] ?? 0; if (r !== bd) faltantes.push({ tabla: t.tabla, bd, respaldo: r }); }
  return { coincide: faltantes.length === 0, faltantes };
}

/** Qué se va a eliminar y qué se conserva, con sus cantidades (para mostrarlo ANTES de confirmar). */
export function resumenVaciado(conteos) {
  const quitar = TABLAS.filter(t => t.vaciar).map(t => ({ ...t, filas: conteos[t.tabla] ?? 0 })), quedan = TABLAS.filter(t => !t.vaciar).map(t => ({ ...t, filas: conteos[t.tabla] ?? 0 }));
  return { quitar, quedan, filasAQuitar: quitar.reduce((s, t) => s + t.filas, 0), filasQueQuedan: quedan.reduce((s, t) => s + t.filas, 0) };
}

/** Las condiciones para poder eliminar. Devuelve los motivos que faltan (lista vacía = se puede). */
export function motivosQueFaltan({ rol, respaldo, escrita, esperada }) {
  const m = [];
  if (rol !== 'administrador') m.push('Solo un administrador puede vaciar la base de datos.');
  if (!respaldo?.verificado) m.push('Primero genera y descarga el respaldo (debe quedar verificado).');
  if (!fraseCoincide(escrita, esperada)) m.push('Escribe la frase de seguridad exactamente como aparece.');
  return m;
}

export const nombreArchivoBackup = (f = new Date()) => { const p = n => String(n).padStart(2, '0'); return `torremolinos_BACKUP_GLOBAL_${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}_${p(f.getHours())}${p(f.getMinutes())}.xlsx`; };

/** La máscara de asistencia de un mes (bit 0 = día 1) → lista de fechas aaaa-mm-dd. */
export function asistenciaADias(mes, mascara) { const out = []; for (let d = 1; d <= 31; d++) if (((mascara >>> 0) >> (d - 1)) & 1) out.push(`${String(mes).slice(0, 8)}${String(d).padStart(2, '0')}`); return out; }

export const formatoMB = mb => (mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${Number(mb).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`);
