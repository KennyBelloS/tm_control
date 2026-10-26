/**
 * RECORRIDO — parte PURA: los pasos de la guía animada "Cómo se usa" (un paso por pantalla, pocas palabras, un dibujo que se mueve).
 * Cada paso dice qué módulos explica (`modulos` = las claves del menú). Si el menú tiene un módulo que ningún paso explica,
 * `npm run verificar-manual` falla: así una función nueva no queda sin su paso.
 * Descriptivo pero escaneable (también lo vigila el verificador): título ≤ 36 letras, subtítulo ≤ 70, hasta 4 puntos de ≤ 100 letras.
 */
export const VISUALES = ['bienvenida', 'dashboard', 'rendimientos', 'personas', 'reportes', 'ranking', 'lineas', 'clasificacion', 'devoluciones', 'tic', 'presentar', 'tableros', 'config', 'resumenes', 'auditoria', 'campana', 'listo'];
export const LIMITES = { titulo: 36, subtitulo: 70, puntos: 4, punto: 100 };

export const PASOS = [
  { id: 'bienvenida', emoji: '👋', titulo: 'Bienvenido a TMControl', subtitulo: 'Tu producción de flor, en un solo lugar.', visual: 'bienvenida', modulos: [],
    puntos: ['El menú de la izquierda reúne todos los módulos; en el celular es el ícono de arriba.', 'Pulsa Ctrl + K y escribe: saltas a cualquier pantalla sin buscar en el menú.', 'Pulsa ? para ver todos los atajos de teclado.', 'La campana te avisa solo lo importante; tu avatar cambia el tema y la densidad.'], ruta: '/', boton: 'Ir al Dashboard' },
  { id: 'dashboard', emoji: '📊', titulo: 'Dashboard', subtitulo: 'El turno, en vivo, contra la meta del día.', visual: 'dashboard', modulos: ['dashboard'],
    puntos: ['Muestra los tallos del turno contra la meta de hoy, con la flor que avanza por la barra.', 'Abajo: el último Histórico cerrado, la clasificación por línea y la tendencia de producción.', 'Quien carga datos ve Subir Reporte Boncheo; las novedades de la versión van siempre arriba.', 'Presentar lo lleva a pantalla completa para mostrarlo al equipo.'], ruta: '/', boton: 'Ir al Dashboard' },
  { id: 'rendimientos', emoji: '📥', titulo: 'Rendimientos', subtitulo: 'Sube el reporte de boncheo y listo.', visual: 'rendimientos', modulos: ['rendimientos'],
    puntos: ['Elige el Reporte Consolidado Boncheo (.xls, .xlsx o .xlsb) desde tu computador.', 'En Guardar en decide: Turno Actual (hora a hora) o Histórico (un día ya cerrado).', 'Indica la fecha de operación; las horas de inicio y fin son opcionales y sobrescriben el Excel.', 'El archivo nunca se guarda: solo se guardan sus datos.'],
    lectura: ['Aquí ves lo que ya se cargó, en dos tablas.', 'Turno Actual: el día en curso, hora a hora.', 'Histórico: los días ya cerrados, con filtro por fecha.', 'Solo quienes cargan datos ven el botón de subir.'], ruta: '/rendimientos', boton: 'Ir a Rendimientos' },
  { id: 'personas', emoji: '👥', titulo: 'Personas', subtitulo: 'El catálogo que une todo.', visual: 'personas', modulos: ['personas'],
    puntos: ['Cada persona tiene un Emp.Cod (la une con el boncheo) y una mesa, que es su código corto.', 'Cárgalas con el Excel o el PDF de Activos (el PDF solo guarda la mesa), o una a una.', 'Si alguien no está en este catálogo, no sale bien en rendimientos ni en reportes.', 'Búscalas por código o por nombre en cualquier parte de la app.'],
    lectura: ['Cada persona tiene un Emp.Cod y una mesa, que es su código corto.', 'Busca por código o por nombre.', 'Si alguien falta, avisa a quien carga los datos.'], ruta: '/personas', boton: 'Ir a Personas' },
  { id: 'reportes', emoji: '🖼️', titulo: 'Reportes', subtitulo: 'Fotos listas para compartir.', visual: 'reportes', modulos: ['reportes'],
    puntos: ['Elige la fuente: Turno Actual o Histórico, con sus fechas.', 'La vista previa es la foto exacta que se descarga; ábrela en pantalla completa.', 'Descarga en PNG, JPG, PDF o Excel.', 'Los cuatro estados: Excelente (130 % o más), Cumple, A punto de cumplir (90 %) y Por mejorar.'], ruta: '/reportes', boton: 'Ir a Reportes' },
  { id: 'ranking', emoji: '🏆', titulo: 'Ranking', subtitulo: 'Quién rinde más, y cómo va el equipo.', visual: 'ranking', modulos: ['ranking'],
    puntos: ['Ordena a las personas por rendimiento promedio contra la meta por hora.', 'Hay ranking por persona y por formadora.', 'La distribución por estado muestra cuántos están en cada uno de los cuatro niveles.', 'La semana del ranking termina el día que fijes en Configuración.'], ruta: '/ranking', boton: 'Ir al Ranking' },
  { id: 'lineas', emoji: '🧩', titulo: 'Líneas', subtitulo: 'Equipos, formadoras y clasificadores.', visual: 'lineas', modulos: ['lineas'],
    puntos: ['Define qué formadora tiene cada línea y asigna a las personas cada día.', 'El tablero de formadoras se ve en Vista previa y se descarga como imagen o PDF.', 'Asigna un clasificador a un bonchador: en el TIC toma su asistencia, rendimiento y devoluciones.', 'Un clasificador tiene un solo bonchador por día.'],
    lectura: ['Ve quién trabajó con cada formadora y en qué línea.', 'El tablero de formadoras se ve en Vista previa.', 'Los clasificadores toman los datos de su bonchador en el TIC.'], ruta: '/lineas', boton: 'Ir a Líneas' },
  { id: 'clasificacion', emoji: '📦', titulo: 'Clasificación', subtitulo: 'Los tallos movidos, hora a hora.', visual: 'clasificacion', modulos: ['clasificacion'],
    puntos: ['Muestra los tallos movidos hora a hora en cada línea.', 'Compara con el día anterior, o con otro día guardado que elijas.', 'Cambia entre Por hora y Acumulado.', 'Descárgalo en imagen o PDF; el detalle por hora se conserva 4 días.'], ruta: '/clasificacion', boton: 'Ir a Clasificación' },
  { id: 'devoluciones', emoji: '↩️', titulo: 'Devoluciones', subtitulo: 'La calidad, a la vista.', visual: 'devoluciones', modulos: ['devoluciones'],
    puntos: ['Seis pestañas: Resumen, Top 5, Causas, Tendencia, Colaborador y Formadoras.', 'Top 5: quién tiene más y menos devoluciones, con gráficos por día o por mes.', 'Las fotos del Top 5 y del Top 3 se hacen con código, nombre o ambos.', 'Al cargar el Excel solo se escribe lo nuevo o lo que cambió.'], ruta: '/devoluciones', boton: 'Ir a Devoluciones' },
  { id: 'tic', emoji: '🧑‍🌾', titulo: 'TIC de cada persona', subtitulo: 'Todo de una persona, en una sola ficha.', visual: 'tic', modulos: ['colaborador'],
    puntos: ['Busca a una persona por código corto o por nombre.', 'Verás su productividad, su calidad (devoluciones) y su presentismo, juntos.', 'El calendario del mes marca los domingos y los festivos de Colombia.', 'Domingos y festivos solo cuentan si la persona fue citada ese día.'], ruta: '/colaborador', boton: 'Ir al TIC' },
  { id: 'presentar', emoji: '📺', titulo: 'Modo Presentar', subtitulo: 'Para la pantalla del equipo.', visual: 'presentar', modulos: [],
    puntos: ['Convierte el Dashboard en diapositivas a pantalla completa: Top 3, hora a hora y clasificación.', '← y → cambian de diapositiva; la barra espaciadora pausa.', '+ y - cambian el tamaño; F enciende o apaga la decoración festiva.', 'El botón Salir cierra la presentación.'], ruta: '/', boton: 'Abrir en el Dashboard' },
  { id: 'tableros', emoji: '🗂️', titulo: 'Tableros, Indirectos y Gerencia', subtitulo: 'Más herramientas, dentro de la misma app.', visual: 'tableros', modulos: ['tableros', 'indirectos', 'gerencia'],
    puntos: ['Tableros: herramientas externas integradas dentro de la app.', 'Indirectos: el personal de apoyo (supervisión, calidad, logística, mantenimiento).', 'Gerencia: vista ejecutiva con herramientas como Costo por Tallo, protegida con clave.', 'Si una herramienta no abre, usa Reintentar.'], ruta: '/tableros', boton: 'Ir a Tableros' },
  { id: 'config', emoji: '⚙️', titulo: 'Configuración y Usuarios', subtitulo: 'Metas, jornada y cuentas.', visual: 'config', modulos: ['configuracion', 'usuarios'],
    puntos: ['Fija la meta de tallos de hoy y la meta por hora por persona.', 'Define la jornada por defecto y el día en que termina la semana del Ranking.', 'Descuentos de tiempo: por hora de corte y minutos, o para corregir una fecha.', 'En Usuarios creas cuentas y asignas roles.'], ruta: '/configuracion', boton: 'Ir a Configuración' },
  { id: 'resumenes', emoji: '🧾', titulo: 'Resúmenes', subtitulo: 'El resumen ejecutivo, listo para compartir.', visual: 'resumenes', modulos: ['resumenes'],
    puntos: ['Sale solo: un resumen ejecutivo, como un correo, de toda la finca y de cada equipo.', 'Panorama redactado, indicadores, producción por día, equipos, calidad y recomendaciones.', 'Cierra con tu firma («Cordialmente, …») y se descarga en imagen o PDF.', 'Elige semana anterior, mes anterior, 7 días o fechas; la firma se edita.'], ruta: '/resumenes', boton: 'Ir a Resúmenes' },
  { id: 'auditoria', emoji: '🛡️', titulo: 'Auditoría', subtitulo: 'Cuida tu base de datos.', visual: 'auditoria', modulos: ['auditoria'],
    puntos: ['Muestra cuánto espacio usa la base de datos y cuándo se llenaría.', 'Exporta e importa copias .tmbackup; cada copia lleva una huella para detectar alteraciones.', 'Cada mes se guarda sola una copia en la nube (se conservan las últimas 12).', 'La depuración semestral borra lo de más de 6 meses, con doble respaldo y frase de seguridad.'], ruta: '/auditoria', boton: 'Ir a Auditoría' },
  { id: 'campana', emoji: '🔔', titulo: 'La campana', subtitulo: 'Solo lo importante interrumpe.', visual: 'campana', modulos: [],
    puntos: ['Solo lo crítico interrumpe, una vez al día; lo demás espera en la campana.', 'Ordena los avisos en Requieren atención, Importantes e Informativas.', 'Toca un aviso para leerlo completo: un aviso leído no vuelve a aparecer.', 'Mañana lo pospone; No molestar silencia los avisos flotantes.'], ruta: null, boton: null },
  { id: 'listo', emoji: '✅', titulo: '¡Listo!', subtitulo: 'Aquí siempre lo tienes a mano.', visual: 'listo', modulos: ['ayuda'],
    puntos: ['Recorrido: esta guía animada.', 'Manual: lecciones interactivas para practicar cada módulo.', 'Referencia: todo el texto, con buscador.', 'Novedades: qué cambió en cada versión.'], ruta: null, boton: null }
];

/** Los pasos que le sirven a esta persona: solo los de módulos que puede ver, con el texto de solo lectura si no puede editar. */
export function armarPasos({ puedeVer, puedeEditar }, pasos = PASOS) {
  return pasos
    .filter(p => !p.modulos.length || p.modulos.some(m => puedeVer(m)))
    .map(p => ({ ...p, puntos: !puedeEditar && p.lectura ? p.lectura : p.puntos }));
}

/** Las faltas del recorrido (para el verificador y las pruebas): módulos sin paso, textos largos, dibujos que no existen. */
export function revisarRecorrido(clavesMenu, pasos = PASOS) {
  const e = [], cubiertos = new Set(pasos.flatMap(p => p.modulos));
  for (const k of clavesMenu) if (!cubiertos.has(k)) e.push(`El módulo "${k}" del menú no tiene su paso en el recorrido (src/lib/recorrido.js).`);
  const ids = new Set();
  for (const p of pasos) {
    if (ids.has(p.id)) e.push(`El paso "${p.id}" está repetido.`); ids.add(p.id);
    if (!VISUALES.includes(p.visual)) e.push(`El paso "${p.id}" usa el dibujo "${p.visual}", que no existe.`);
    if (p.titulo.length > LIMITES.titulo) e.push(`El título del paso "${p.id}" es largo (${p.titulo.length} > ${LIMITES.titulo}).`);
    if (p.subtitulo.length > LIMITES.subtitulo) e.push(`El subtítulo del paso "${p.id}" es largo (${p.subtitulo.length} > ${LIMITES.subtitulo}).`);
    for (const lista of [p.puntos, p.lectura].filter(Boolean)) {
      if (lista.length > LIMITES.puntos) e.push(`El paso "${p.id}" tiene demasiados puntos (${lista.length} > ${LIMITES.puntos}).`);
      for (const t of lista) if (t.length > LIMITES.punto) e.push(`En el paso "${p.id}", "${t.slice(0, 30)}…" es muy largo (${t.length} > ${LIMITES.punto}): menos texto, más dibujo.`);
    }
    if (p.ruta && !p.boton) e.push(`El paso "${p.id}" tiene ruta pero no texto de botón.`);
  }
  return e;
}
