/**
 * SEGURIDAD DEL SISTEMA — parte PURA: con lo que se sabe de las cuentas, las tablas, las copias, el espacio, los errores y el servidor, arma el
 * ÍNDICE DE SEGURIDAD (0 a 100), la lista de revisiones con qué hacer en cada una y el estado de cada cuenta. No consulta nada: la pantalla le pasa los datos.
 * Regla de oro: si un dato NO se pudo leer, la revisión dice «sin datos» (cuenta la mitad); NUNCA se inventa («nunca entró» solo si se sabe que no entró).
 */
export const DIAS_SIN_ENTRAR = 60, DIAS_EDITOR_SIN_ENTRAR = 30, DIAS_COPIA = 35, USO_ALTO = 80, EDITORES = ['administrador', 'ingeniero', 'digitador'];
export const ERRORES_AVISO = 5, ERRORES_CRITICO = 30;
const dias = (iso, ahora) => (iso ? Math.max(0, Math.floor((Date.parse(ahora) - Date.parse(iso)) / 864e5)) : null);
const lista = (l, max = 3) => (l.length <= max ? l.join(', ') : `${l.slice(0, max).join(', ')} y ${l.length - max} más`);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

/** ¿Puede editar esta persona? El Administrador siempre; si el Administrador le fijó «ver» o «editar» vale eso; si no, el de su rol. */
export function puedeEditarPersona(u, editores = EDITORES) {
  if (u.rol === 'administrador') return true;
  if (u.edicion === 'ver') return false;
  if (u.edicion === 'editar') return true;
  return editores.includes(u.rol);
}
/** Cada cuenta con sus días sin entrar y su «semáforo»: reciente (≤ 7 días), normal (≤ 30), lejano (≤ 60), inactivo (más), nunca (se sabe que no entró),
 *  sindatos (no se pudo leer el último acceso) o desactivada. `ultimo_acceso`: texto de fecha = entró; null = nunca; undefined = no se sabe. */
export function evaluarCuentas(usuarios = [], ahora, editores = EDITORES) {
  return usuarios.map(u => {
    const d = u.ultimo_acceso === undefined ? undefined : dias(u.ultimo_acceso, ahora), editor = puedeEditarPersona(u, editores);
    const semaforo = u.activo === false ? 'desactivada' : d === undefined ? 'sindatos' : d === null ? 'nunca' : d <= 7 ? 'reciente' : d <= 30 ? 'normal' : d <= DIAS_SIN_ENTRAR ? 'lejano' : 'inactivo';
    return { ...u, dias: d === undefined ? null : d, editor, semaforo, especial: (u.edicion === 'editar' && !editores.includes(u.rol) && u.rol !== 'administrador') ? 'editar' : (u.edicion === 'ver' && editores.includes(u.rol) && u.rol !== 'administrador') ? 'ver' : null };
  });
}
const factor = { ok: 1, aviso: 0.5, nodato: 0.5, critico: 0 };
const PASOS_SERVIDOR = [
  'Entra a Supabase → tu proyecto → Project Settings → API.',
  'Copia la llave «service_role» (es secreta: nunca la pegues en el código, en un archivo del proyecto ni en GitHub).',
  'Entra a Vercel → tu proyecto → Settings → Environment Variables.',
  'Crea la variable SUPABASE_SERVICE_ROLE_KEY con esa llave (marca Production y Preview) y la variable CRON_SECRET con un texto largo al azar.',
  'Ve a Deployments → los tres puntos del último despliegue → Redeploy, y luego pulsa «Revisar de nuevo» aquí.',
  'En tu computador: pon las mismas dos variables en el archivo .env (copia .env.example) y reinicia «npm run dev». Ese archivo NO se sube a GitHub.'
];

export function evaluarSeguridad({ usuarios = [], tablas = null, eventos = [], usoPct = null, ahora, actividad = null, cabeceras = null, servidor = null }) {
  const cuentas = evaluarCuentas(usuarios, ahora), activas = cuentas.filter(c => c.activo !== false);
  const admins = activas.filter(c => c.rol === 'administrador'), editores = activas.filter(c => c.editor), conDatos = activas.filter(c => c.semaforo !== 'sindatos');
  const checks = [];
  const add = (id, peso, icono, titulo, estado, detalle, accion = '', pasos = null) => checks.push({ id, peso, icono, titulo, estado, detalle, accion, pasos });
  const sinAcceso = (id, peso, icono, titulo) => add(id, peso, icono, titulo, 'nodato', 'Todavía no se puede saber el último acceso de las cuentas.', 'Se activa cuando se complete la configuración de la base de datos.');

  if (tablas === null) add('rls', 18, 'fa-database', 'Seguridad por filas en la base', 'nodato', 'Todavía no se puede revisar la protección de la base de datos.', 'Se activa cuando se complete la configuración de la base de datos.');
  else { const sin = tablas.filter(t => !t.rls).map(t => t.tabla), sinPol = tablas.filter(t => t.rls && Number(t.politicas) === 0).map(t => t.tabla);
    if (sin.length) add('rls', 18, 'fa-database', 'Seguridad por filas en la base', 'critico', `${plural(sin.length, 'tabla sin protección', 'tablas sin protección')}: ${lista(sin)}.`, 'Activa la seguridad por filas (RLS) en esas tablas: sin ella, cualquiera con la llave pública podría leerlas.');
    else if (sinPol.length) add('rls', 18, 'fa-database', 'Seguridad por filas en la base', 'aviso', `Las ${tablas.length} tablas tienen RLS, pero ${lista(sinPol)} no tiene políticas (nadie podría leerla).`, 'Revisa las políticas de esas tablas.');
    else add('rls', 18, 'fa-database', 'Seguridad por filas en la base', 'ok', `Las ${tablas.length} tablas tienen la protección activa y con políticas.`); }

  if (admins.length === 0) add('admins', 12, 'fa-user-shield', 'Administradores', 'critico', 'No hay ningún administrador activo.', 'Activa o crea una cuenta de Administrador cuanto antes.');
  else if (admins.length === 1) add('admins', 12, 'fa-user-shield', 'Administradores', 'aviso', `Solo hay un administrador activo (${admins[0].nombre}).`, 'Ten al menos dos: si se pierde esa cuenta, nadie podrá administrar el sistema.');
  else add('admins', 12, 'fa-user-shield', 'Administradores', 'ok', `${admins.length} administradores activos.`);

  const pctEd = activas.length ? (editores.length / activas.length) * 100 : 0;
  if (pctEd > 50) add('edicion', 7, 'fa-pen-to-square', 'Quién puede editar', 'aviso', `${editores.length} de ${activas.length} cuentas activas (${Math.round(pctEd)} %) pueden cargar y editar datos.`, 'Deja editar solo a quienes cargan datos; en Usuarios puedes fijar a cada persona como «Solo ver».');
  else add('edicion', 7, 'fa-pen-to-square', 'Quién puede editar', 'ok', `${editores.length} de ${activas.length} cuentas activas (${Math.round(pctEd)} %) pueden editar; las demás solo visualizan.`);

  const especiales = activas.filter(c => c.especial === 'editar');
  if (especiales.length) add('permisos', 5, 'fa-user-lock', 'Permisos especiales', 'aviso', `${lista(especiales.map(c => c.nombre))} ${especiales.length === 1 ? 'tiene' : 'tienen'} permiso para editar aunque su rol solo visualiza.`, 'Confirma que sea a propósito. Lo cambias en Usuarios → Permiso.');
  else add('permisos', 5, 'fa-user-lock', 'Permisos especiales', 'ok', 'Nadie edita por encima de lo que permite su rol.');

  if (conDatos.length === 0 && activas.length) { sinAcceso('inactivas', 7, 'fa-user-clock', 'Cuentas sin usar'); sinAcceso('editores-lejos', 7, 'fa-user-pen', 'Editores sin entrar'); sinAcceso('nunca', 4, 'fa-envelope-open', 'Cuentas que nunca entraron'); }
  else {
    const lejanas = conDatos.filter(c => c.semaforo === 'inactivo');
    if (lejanas.length) add('inactivas', 7, 'fa-user-clock', 'Cuentas sin usar', 'aviso', `${plural(lejanas.length, 'cuenta activa lleva', 'cuentas activas llevan')} más de ${DIAS_SIN_ENTRAR} días sin entrar: ${lista(lejanas.map(c => c.nombre))}.`, 'Desactívalas si ya no se necesitan: cada cuenta abierta es una puerta más.');
    else add('inactivas', 7, 'fa-user-clock', 'Cuentas sin usar', 'ok', `Ninguna cuenta activa lleva más de ${DIAS_SIN_ENTRAR} días sin entrar.`);
    const edLejos = editores.filter(c => c.dias !== null && c.dias > DIAS_EDITOR_SIN_ENTRAR);
    if (edLejos.length) add('editores-lejos', 7, 'fa-user-pen', 'Editores sin entrar', 'aviso', `${lista(edLejos.map(c => `${c.nombre} (${c.dias} días)`))} puede${edLejos.length === 1 ? '' : 'n'} editar y no entra${edLejos.length === 1 ? '' : 'n'} hace más de ${DIAS_EDITOR_SIN_ENTRAR} días.`, 'Confirma que siguen necesitando ese permiso.');
    else add('editores-lejos', 7, 'fa-user-pen', 'Editores sin entrar', 'ok', `Quienes pueden editar han entrado en los últimos ${DIAS_EDITOR_SIN_ENTRAR} días.`);
    const nunca = conDatos.filter(c => c.semaforo === 'nunca');
    if (nunca.length) add('nunca', 4, 'fa-envelope-open', 'Cuentas que nunca entraron', 'aviso', `${lista(nunca.map(c => c.nombre))} ${nunca.length === 1 ? 'no ha entrado' : 'no han entrado'} nunca.`, 'Avísales sus datos de acceso o desactiva la cuenta si ya no se usará.');
    else add('nunca', 4, 'fa-envelope-open', 'Cuentas que nunca entraron', 'ok', 'Todas las cuentas activas ya han entrado alguna vez.');
  }

  const copias = eventos.filter(e => /respaldo|backup|copia|exportar/i.test(String(e.accion || ''))).map(e => dias(e.fecha, ahora)).filter(d => d !== null);
  const ultima = copias.length ? Math.min(...copias) : null;
  if (ultima === null) add('copia', 12, 'fa-cloud-arrow-up', 'Copia de seguridad', 'critico', 'No hay ninguna copia de seguridad registrada.', 'Haz una copia ahora en Auditoría → Copia de seguridad y revisa que la copia mensual automática esté configurada.');
  else if (ultima > DIAS_COPIA) add('copia', 12, 'fa-cloud-arrow-up', 'Copia de seguridad', 'aviso', `La última copia es de hace ${ultima} días.`, 'La copia automática es mensual: revisa que siga funcionando o haz una manual.');
  else add('copia', 12, 'fa-cloud-arrow-up', 'Copia de seguridad', 'ok', ultima === 0 ? 'Hay una copia de hoy.' : `La última copia es de hace ${plural(ultima, 'día', 'días')}.`);

  if (usoPct === null || usoPct === undefined) add('espacio', 7, 'fa-hard-drive', 'Espacio de la base de datos', 'nodato', 'No se pudo leer el espacio usado.', '');
  else if (usoPct >= 95) add('espacio', 7, 'fa-hard-drive', 'Espacio de la base de datos', 'critico', `La base está al ${Math.round(usoPct)} %: está por llenarse y dejaría de guardar.`, 'Haz una copia y depura lo viejo en Auditoría.');
  else if (usoPct >= USO_ALTO) add('espacio', 7, 'fa-hard-drive', 'Espacio de la base de datos', 'aviso', `La base está al ${Math.round(usoPct)} %.`, 'Planea la depuración semestral en Auditoría.');
  else add('espacio', 7, 'fa-hard-drive', 'Espacio de la base de datos', 'ok', `La base está al ${Math.round(usoPct)} %: hay espacio de sobra.`);

  if (actividad === null) add('errores', 8, 'fa-bug', 'Errores que ven las personas', 'nodato', 'Todavía no se registran los errores de las personas.', 'Se activa cuando se complete la configuración de la base de datos.');
  else { const total = (actividad.errores || []).reduce((s, e) => s + Number(e.total || 0), 0), quienes = (actividad.errores || []).length;
    if (total > ERRORES_CRITICO) add('errores', 8, 'fa-bug', 'Errores que ven las personas', 'critico', `${total} errores en ${actividad.dias || 30} días, de ${plural(quienes, 'persona', 'personas')}.`, 'Mira abajo quién los tiene y en qué pantalla: suelen ser internet débil o una función sin activar.');
    else if (total > ERRORES_AVISO) add('errores', 8, 'fa-bug', 'Errores que ven las personas', 'aviso', `${total} errores en ${actividad.dias || 30} días, de ${plural(quienes, 'persona', 'personas')}.`, 'Revisa la lista de errores recientes.');
    else add('errores', 8, 'fa-bug', 'Errores que ven las personas', 'ok', total === 0 ? `Ninguna persona ha visto errores en ${actividad.dias || 30} días.` : `${plural(total, 'error', 'errores')} en ${actividad.dias || 30} días: está dentro de lo normal.`); }

  if (cabeceras === null) add('cabeceras', 5, 'fa-lock', 'Protección de la conexión', 'nodato', 'No se pudo comprobar la protección de la conexión.', '');
  else { const falta = [!cabeceras.https && 'conexión cifrada (HTTPS)', !cabeceras.csp && 'política de contenido (CSP)', !cabeceras.hsts && 'HSTS', !cabeceras.marcos && 'bloqueo de marcos'].filter(Boolean);
    if (cabeceras.local) add('cabeceras', 5, 'fa-lock', 'Protección de la conexión', 'nodato', 'Estás en tu computador: la protección se revisa en la página publicada.', '');
    else if (falta.length) add('cabeceras', 5, 'fa-lock', 'Protección de la conexión', 'aviso', `Falta: ${falta.join(', ')}.`, 'Revisa las cabeceras de seguridad en vercel.json y vuelve a desplegar.');
    else add('cabeceras', 5, 'fa-lock', 'Protección de la conexión', 'ok', 'HTTPS, política de contenido, HSTS y bloqueo de marcos están activos.'); }

  if (servidor === null) add('servidor', 8, 'fa-server', 'Servicio de cuentas', 'nodato', 'No se pudo comprobar el servicio de cuentas.', '');
  else if (!servidor.servicioUsuarios) add('servidor', 8, 'fa-server', 'Servicio de cuentas', 'critico', 'El servicio de cuentas no está configurado: no se pueden crear ni administrar usuarios.', 'Falta la llave de servicio en el servidor. Estos son los pasos:', PASOS_SERVIDOR);
  else if (!servidor.tareasProgramadas) add('servidor', 8, 'fa-server', 'Servicio de cuentas', 'aviso', 'El servicio de cuentas funciona, pero las tareas automáticas (copia mensual y reinicio de las 6 a. m.) no están configuradas.', 'Falta el secreto de las tareas programadas. Estos son los pasos:', PASOS_SERVIDOR);
  else add('servidor', 8, 'fa-server', 'Servicio de cuentas', 'ok', 'El servicio de cuentas y las tareas automáticas están configurados.');

  const puntaje = Math.round(checks.reduce((s, c) => s + c.peso * factor[c.estado], 0));
  const nivel = puntaje >= 90 ? { id: 'muy-solida', texto: 'Muy sólida', tono: 'ok' } : puntaje >= 75 ? { id: 'solida', texto: 'Sólida', tono: 'ok' } : puntaje >= 55 ? { id: 'mejorable', texto: 'Mejorable', tono: 'aviso' } : { id: 'riesgo', texto: 'En riesgo', tono: 'critico' };
  const pendientes = checks.filter(c => c.estado === 'critico' || c.estado === 'aviso').sort((a, b) => (a.estado === 'critico' ? 0 : 1) - (b.estado === 'critico' ? 0 : 1) || b.peso - a.peso);
  return { puntaje, nivel, checks, pendientes, cuentas, resumen: { cuentas: cuentas.length, activas: activas.length, administradores: admins.length, editores: editores.length, soloLectura: activas.length - editores.length, nunca: cuentas.filter(c => c.semaforo === 'nunca' && c.activo !== false).length, inactivas: cuentas.filter(c => c.semaforo === 'inactivo' && c.activo !== false).length, desactivadas: cuentas.length - activas.length, especiales: cuentas.filter(c => c.especial).length }, ultimaCopiaDias: ultima };
}

/** Los eventos del registro de auditoría, listos para mostrar: ícono y tono según lo que hicieron. */
export function clasificarEvento(e) {
  const a = String(e.accion || '').toLowerCase();
  if (/vaciar|depur|borrar|eliminar/.test(a)) return { icono: 'fa-trash-can', tono: 'riesgo', texto: 'Borrado de datos' };
  if (/import|restaur/.test(a)) return { icono: 'fa-file-import', tono: 'aviso', texto: 'Importación' };
  if (/respaldo|backup|copia|export/.test(a)) return { icono: 'fa-cloud-arrow-up', tono: 'ok', texto: 'Copia de seguridad' };
  return { icono: 'fa-circle-info', tono: 'info', texto: 'Evento' };
}
