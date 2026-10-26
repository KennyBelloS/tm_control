/**
 * APRENDE — parte PURA: las lecciones del manual interactivo. Cada módulo es una lección con tres etapas:
 *   MIRA (el dibujo y los puntos del recorrido) → PRUÉBALO (un simulador que usa las reglas REALES de la app) → DEMUÉSTRALO (un reto de una pregunta).
 * Al superar el reto la lección queda "dominada" (se guarda en el equipo) y sube el nivel de quien aprende.
 * Cada módulo del menú debe tener su lección: `npm run verificar-manual` lo exige.
 */
import { PASOS } from './recorrido.js';

export const LABS = ['toca', 'estados', 'subir', 'imagen', 'presentismo', 'espacio', 'campana'];
export const LIMITES_APRENDE = { explica: 150, carta: 90, titulo: 34, opcion: 90, pregunta: 120 };

const C = (icono, titulo, texto) => ({ icono, titulo, texto });
export const LECCIONES = [
  { id: 'dashboard', lab: 'toca', seccion: 'Dashboard', minutos: 2,
    cartas: [C('fa-gauge-high', 'Producción del turno', 'Tallos de hoy contra la meta; la flor avanza por la barra.'), C('fa-calendar-check', 'Último Histórico', 'El último día cerrado, para comparar con el de hoy.'), C('fa-people-group', 'Clasificación y formadoras', 'Cómo va cada línea y cada equipo, en vivo.'), C('fa-expand', 'Presentar', 'Lleva el Dashboard a pantalla completa para el equipo.')],
    reto: { t: '¿Qué muestra «Producción del Turno Actual»?', o: ['Las devoluciones del mes', 'Los tallos del turno en vivo contra la meta del día', 'El historial de usuarios'], c: 1, x: 'Se actualiza durante el turno y mide el avance contra la meta de tallos del día.' } },
  { id: 'rendimientos', lab: 'subir', seccion: 'Rendimientos', minutos: 3,
    reto: { t: 'Vas a subir el reporte de un día que ya terminó. ¿Dónde lo guardas?', o: ['En Turno Actual', 'En Histórico', 'En Gerencia'], c: 1, x: 'Histórico es para los días cerrados; Turno Actual es el día en curso, hora a hora.' } },
  { id: 'personas', lab: 'toca', seccion: 'Personas', minutos: 2,
    cartas: [C('fa-id-card', 'Emp.Cod', 'El código que une a la persona con el reporte de boncheo.'), C('fa-table', 'Mesa', 'Su código corto: el que más rápido se escribe y se busca.'), C('fa-file-pdf', 'Excel o PDF de Activos', 'Carga muchas personas; con el PDF solo se guarda la mesa.'), C('fa-magnifying-glass', 'Búsqueda', 'Por código corto o por nombre, en cualquier parte.')],
    reto: { t: '¿Qué dato une a una persona con el reporte de boncheo?', o: ['El Emp.Cod', 'El color de su línea', 'La fecha de ingreso'], c: 0, x: 'El Emp.Cod la une con el boncheo; la mesa es su código corto.' } },
  { id: 'reportes', lab: 'estados', seccion: 'Reportes', minutos: 3,
    reto: { t: 'Una persona hace 540 tallos/h con meta de 470 (115 %). ¿Qué estado tiene?', o: ['Excelente', 'Cumple', 'A punto de cumplir'], c: 1, x: 'Cumple va de 100 % a 129 %; Excelente empieza en 130 %.' } },
  { id: 'ranking', lab: 'toca', seccion: 'Ranking', minutos: 2,
    cartas: [C('fa-ranking-star', 'Por persona', 'Ordena por rendimiento promedio contra la meta por hora.'), C('fa-people-group', 'Por formadora', 'Cómo rinde cada equipo.'), C('fa-chart-pie', 'Distribución por estado', 'Cuántas personas hay en cada uno de los cuatro niveles.'), C('fa-calendar-week', 'Fin de semana', 'La semana termina el día que fijes en Configuración.')],
    reto: { t: '¿Cuándo termina la semana del Ranking?', o: ['Siempre el domingo', 'El día que fijes en Configuración', 'El último día del mes'], c: 1, x: 'En Configuración eliges el día en que termina la semana del Ranking.' } },
  { id: 'lineas', lab: 'toca', seccion: 'Líneas', minutos: 2,
    cartas: [C('fa-diagram-project', 'Formadoras y líneas', 'Qué formadora tiene cada línea.'), C('fa-user-group', 'Asignación diaria', 'Quién trabajó con quién y en qué línea ese día.'), C('fa-table-columns', 'Tablero de formadoras', 'Vista previa y descarga como imagen o PDF.'), C('fa-people-arrows', 'Clasificador ⇄ bonchador', 'En el TIC, el clasificador toma los datos de su bonchador ese día.')],
    reto: { t: 'Un clasificador asignado a un bonchador, en el TIC toma…', o: ['Solo su nombre', 'Su asistencia, rendimiento y devoluciones', 'Nada: es solo informativo'], c: 1, x: 'Ese día el clasificador toma la asistencia, el rendimiento y las devoluciones de su bonchador.' } },
  { id: 'clasificacion', lab: 'toca', seccion: 'Clasificación', minutos: 2,
    cartas: [C('fa-clock', 'Hora a hora', 'Tallos movidos en cada hora, por línea.'), C('fa-code-compare', 'Contra el día anterior', 'O contra otro día guardado que elijas.'), C('fa-chart-line', 'Por hora o acumulado', 'Dos formas de ver lo mismo.'), C('fa-download', 'Imagen o PDF', 'El detalle por hora se conserva 4 días.')],
    reto: { t: '¿Con qué se compara la clasificación de hoy?', o: ['Con el ranking', 'Con el día anterior (u otro día guardado)', 'Con la meta del mes'], c: 1, x: 'Se compara con el día anterior o con otro día guardado que elijas.' } },
  { id: 'devoluciones', lab: 'imagen', seccion: 'Devoluciones', minutos: 3,
    reto: { t: '¿Qué cambia al elegir «Solo nombre» en el Top 3 por causa?', o: ['La imagen muestra nombres en lugar de códigos', 'Solo se ven los totales', 'Nada: queda igual'], c: 0, x: 'Código sirve para mostrar en grupo; nombre, para verificar quién es quién.' } },
  { id: 'tic', lab: 'presentismo', seccion: 'TIC', minutos: 3,
    reto: { t: 'Una persona no vino un domingo en que nadie fue citado. ¿Cuenta como falta?', o: ['Sí, siempre', 'No: domingos y festivos solo cuentan si fue citada', 'Solo si es festivo'], c: 1, x: 'Domingos y festivos entran al presentismo solo para quien fue citado ese día.' } },
  { id: 'presentar', lab: 'toca', seccion: 'Modo Presentar', minutos: 1,
    cartas: [C('fa-expand', 'Pantalla completa', 'Diapositivas para la pantalla del equipo.'), C('fa-arrows-left-right', '← y →', 'Cambian de diapositiva.'), C('fa-pause', 'Barra espaciadora', 'Pausa y reanuda.'), C('fa-right-from-bracket', 'Salir', 'Cierra la presentación.')],
    reto: { t: '¿Cómo se pausa la presentación?', o: ['Con Esc', 'Con la barra espaciadora', 'No se puede pausar'], c: 1, x: 'La barra espaciadora pausa y reanuda; ← y → cambian de diapositiva.' } },
  { id: 'tableros', lab: 'toca', seccion: 'Tableros e Indirectos', minutos: 2,
    cartas: [C('fa-table-columns', 'Tableros', 'Herramientas externas dentro de la app.'), C('fa-users-gear', 'Indirectos', 'Personal de apoyo: supervisión, calidad, logística, mantenimiento.'), C('fa-chart-simple', 'Gerencia', 'Vista ejecutiva; incluye Costo por Tallo.'), C('fa-lock', 'La clave', 'Gerencia y Tableros se protegen con clave; si no abre, Reintentar.')],
    reto: { t: '¿Qué es «Indirectos»?', o: ['Un tipo de reporte', 'El personal de apoyo: supervisión, calidad, logística…', 'Las devoluciones indirectas'], c: 1, x: 'Indirectos agrupa al personal de apoyo a la producción.' } },
  { id: 'config', lab: 'toca', seccion: 'Configuración', minutos: 2,
    cartas: [C('fa-bullseye', 'Meta de hoy', 'Los tallos que se esperan en el día.'), C('fa-gauge', 'Meta por hora', 'Lo que se espera de cada persona cada hora.'), C('fa-scissors', 'Descuentos de tiempo', 'Por hora de corte y minutos, o para corregir una fecha.'), C('fa-user-gear', 'Usuarios', 'Crea cuentas y asigna roles.')],
    reto: { t: '¿Dónde se crean las cuentas y se asigna el rol?', o: ['En Personas', 'En Usuarios', 'En Auditoría'], c: 1, x: 'En Usuarios (Administrador y Digitador) se crean las cuentas y se asigna el rol.' } },
  { id: 'resumenes', lab: 'toca', seccion: 'Resúmenes', minutos: 2,
    cartas: [C('fa-building', 'Finca y equipos', 'Un solo resumen de toda la finca y de cada equipo.'), C('fa-calendar-days', 'Período', 'Semana anterior, mes anterior, 7 días o fechas a elección.'), C('fa-envelope-open-text', 'Como un correo', 'Panorama, indicadores, equipos, calidad y recomendaciones.'), C('fa-file-pdf', 'Firma y descarga', 'Tu firma al final; se baja en imagen o PDF.')],
    reto: { t: '¿Quién puede ver Resúmenes?', o: ['Todos los roles', 'Solo el Administrador', 'Solo los Formadores'], c: 1, x: 'Resúmenes muestra cifras de todo el personal, por eso es solo del Administrador.' } },
  { id: 'auditoria', lab: 'espacio', seccion: 'Auditoría', minutos: 3,
    reto: { t: '¿Cada cuánto se guarda la copia automática?', o: ['Cada hora', 'Una vez al mes', 'Solo si la pides'], c: 1, x: 'Una vez al mes se guarda sola; se conservan las últimas 12.' } },
  { id: 'campana', lab: 'campana', seccion: 'Notificaciones', minutos: 3,
    reto: { t: '¿Qué interrumpe con un aviso flotante?', o: ['Todo lo nuevo', 'Solo lo crítico, una vez al día', 'Nada, nunca'], c: 1, x: 'Solo lo crítico interrumpe; lo demás espera en la campana, ordenado por importancia.' } }
];

/** Las lecciones para esta persona: las de módulos que puede ver, con el título, dibujo, puntos y botón del paso del recorrido. */
export function armarLecciones({ puedeVer, puedeEditar = true }, lecciones = LECCIONES, pasos = PASOS) {
  return lecciones.map(l => {
    const p = pasos.find(x => x.id === l.id);
    return p ? { ...l, emoji: p.emoji, titulo: p.titulo, subtitulo: p.subtitulo, visual: p.visual, modulos: p.modulos, ruta: p.ruta, boton: p.boton, puntos: !puedeEditar && p.lectura ? p.lectura : p.puntos } : null;
  }).filter(l => l && (!l.modulos.length || l.modulos.some(m => puedeVer(m))));
}

export function progresoDe(dominadas, lecciones) {
  const ids = new Set(lecciones.map(l => l.id)), hechas = [...new Set(dominadas)].filter(i => ids.has(i)).length;
  return { hechas, total: lecciones.length, pct: lecciones.length ? Math.round((hechas / lecciones.length) * 100) : 0 };
}
export function nivel(hechas, total) {
  const r = total ? hechas / total : 0;
  if (total && hechas >= total) return { emoji: '🏆', nombre: 'Experto TMControl' };
  if (r >= 0.67) return { emoji: '🌹', nombre: 'Casi experto' };
  if (r >= 0.34) return { emoji: '🌼', nombre: 'Operador' };
  if (r > 0) return { emoji: '🌿', nombre: 'Aprendiz' };
  return { emoji: '🌱', nombre: 'Principiante' };
}
/** La primera lección que todavía no se domina (para el botón "Continuar"). */
export const siguiente = (lecciones, dominadas) => lecciones.find(l => !dominadas.includes(l.id)) || null;

/** Faltas de las lecciones (para el verificador y las pruebas): módulos sin lección, retos mal armados, textos largos. */
export function revisarLecciones(clavesMenu, lecciones = LECCIONES, pasos = PASOS) {
  const e = [], cubiertos = new Set();
  const ids = new Set();
  for (const l of lecciones) {
    if (ids.has(l.id)) e.push(`La lección "${l.id}" está repetida.`); ids.add(l.id);
    const p = pasos.find(x => x.id === l.id);
    if (!p) { e.push(`La lección "${l.id}" no tiene su paso en el recorrido (mismo id).`); continue; }
    p.modulos.forEach(m => cubiertos.add(m));
    if (!LABS.includes(l.lab)) e.push(`La lección "${l.id}" usa un simulador que no existe ("${l.lab}").`);
    if (l.lab === 'toca') { if ((l.cartas || []).length !== 4) e.push(`La lección "${l.id}" necesita 4 cartas para descubrir.`); for (const c of l.cartas || []) { if (c.texto.length > LIMITES_APRENDE.carta) e.push(`En la lección "${l.id}", la carta "${c.titulo}" es larga (${c.texto.length} > ${LIMITES_APRENDE.carta}).`); if (c.titulo.length > LIMITES_APRENDE.titulo) e.push(`En la lección "${l.id}", el título de la carta "${c.titulo}" es largo.`); } }
    const r = l.reto;
    if (!r || r.o?.length !== 3 || !(r.c >= 0 && r.c <= 2) || !r.x) e.push(`La lección "${l.id}" necesita un reto con 3 opciones, la correcta y su explicación.`);
    else {
      if (r.t.length > LIMITES_APRENDE.pregunta) e.push(`La pregunta de "${l.id}" es larga (${r.t.length} > ${LIMITES_APRENDE.pregunta}).`);
      if (r.x.length > LIMITES_APRENDE.explica) e.push(`La explicación de "${l.id}" es larga (${r.x.length} > ${LIMITES_APRENDE.explica}).`);
      for (const o of r.o) if (o.length > LIMITES_APRENDE.opcion) e.push(`Una opción de "${l.id}" es larga.`);
    }
  }
  for (const k of clavesMenu) if (k !== 'ayuda' && !cubiertos.has(k)) e.push(`El módulo "${k}" del menú no tiene su lección en el manual interactivo (src/lib/aprende.js).`);
  return e;
}
