/**
 * ACTIVIDAD DE LAS CUENTAS — parte PURA: junta el último acceso de la cuenta con las entradas que registra la app y arma, por persona, cuántas veces entra,
 * en cuántos días, desde qué aparato, cuántos errores vio y cuándo fue la última vez; y el ranking de quién entra más y quién menos.
 *   usuarios: [{ id, nombre, rol, activo, edicion, ultimo_acceso }]   actividad: resultado de seguridad_actividad() o null si aún no está disponible
 */
const ms = iso => (iso ? Date.parse(iso) : NaN);
export function combinarActividad({ usuarios = [], actividad = null, ahora }) {
  const medido = !!actividad, porId = (lista, id) => (lista || []).find(x => x.usuario_id === id);
  const lista = usuarios.map(u => {
    const acc = porId(actividad?.accesos, u.id), ult = porId(actividad?.ultimos, u.id), err = porId(actividad?.errores, u.id);
    const a = ms(u.ultimo_acceso), b = ms(ult?.ultimo), mayor = Math.max(Number.isNaN(a) ? -Infinity : a, Number.isNaN(b) ? -Infinity : b);
    // Último acceso: lo más reciente entre el inicio de sesión de la cuenta y la última entrada registrada. Si ninguna fuente sabe nada (undefined) → no se sabe.
    // (Si la cuenta dice «null» = nunca inició sesión; «undefined» = no se sabe: y que la app no haya registrado entradas todavía NO significa «nunca».)
    const ultimo = mayor > -Infinity ? new Date(mayor).toISOString() : u.ultimo_acceso;
    const entradas = Number(acc?.entradas || 0), movil = Number(acc?.movil || 0), pc = Number(acc?.pc || 0);
    return { ...u, ultimo_acceso: ultimo, entradas, diasActivos: Number(acc?.dias_activos || 0), movil, pc, dispositivo: !entradas ? null : movil > pc ? 'movil' : pc > movil ? 'pc' : 'ambos', errores: Number(err?.total || 0), erroresDistintos: Number(err?.distintos || 0), ultimoError: err?.ultimo || null };
  });
  const activas = lista.filter(u => u.activo !== false);
  const masEntran = medido ? [...activas].filter(u => u.entradas > 0).sort((x, y) => y.entradas - x.entradas || y.diasActivos - x.diasActivos || String(x.nombre).localeCompare(String(y.nombre), 'es')) : [];
  const menosEntran = medido ? [...activas].sort((x, y) => x.entradas - y.entradas || (ms(x.ultimo_acceso) || 0) - (ms(y.ultimo_acceso) || 0) || String(x.nombre).localeCompare(String(y.nombre), 'es')) : [];
  const conErrores = lista.filter(u => u.errores > 0).sort((x, y) => y.errores - x.errores);
  return { lista, medido, masEntran, menosEntran, conErrores, totalEntradas: lista.reduce((s, u) => s + u.entradas, 0), totalErrores: lista.reduce((s, u) => s + u.errores, 0), dias: actividad?.dias ?? null };
}
/** Frases sobre cómo usa la app una persona (para leerse de un vistazo). */
export function comportamiento(u, dias = 30) {
  const t = [];
  if (!u.entradas) t.push(u.ultimo_acceso === undefined ? 'Todavía no se puede saber cuándo entra.' : `No hay entradas registradas en los últimos ${dias} días.`);
  else {
    t.push(`${u.entradas} ${u.entradas === 1 ? 'entrada' : 'entradas'} en ${u.diasActivos} ${u.diasActivos === 1 ? 'día distinto' : 'días distintos'} (últimos ${dias} días).`);
    if (u.dispositivo) t.push(u.dispositivo === 'movil' ? `Entra sobre todo desde el celular (${u.movil} de ${u.entradas}).` : u.dispositivo === 'pc' ? `Entra sobre todo desde el computador (${u.pc} de ${u.entradas}).` : 'Entra por igual desde el celular y el computador.');
  }
  if (u.errores) t.push(`Vio ${u.errores} ${u.errores === 1 ? 'error' : 'errores'}${u.erroresDistintos > 1 ? ` de ${u.erroresDistintos} tipos distintos` : ''}.`);
  return t;
}
