/**
 * MENSAJES DE ERROR PARA PERSONAS — parte PURA: convierte cualquier error técnico (de la base de datos, de la red, de una función…)
 * en una frase clara en español, SIN tecnicismos. Lo técnico nunca se le muestra a la persona: se guarda aparte (con una referencia corta
 * como «ref. A3F9») para que el Administrador pueda buscarlo en el tablero de Seguridad.
 */
// Palabras que delatan un mensaje técnico (o que no se le deben mostrar a una persona).
export const TECNICO = /\b(TypeError|ReferenceError|SyntaxError|RangeError|PGRST\d+|pg_[a-z_]+|relation|column|schema|constraint|supabase|postgres|postgrest|stack|undefined|cannot|is not a function|JSON|fetch|xhr|http\/|sql|rpc|policy|jwt|bearer|uuid|enum|trigger|violates|syntax|permission denied|row-level|insufficient|duplicate key|not null|does not exist|already exists|invalid input|could not|failed|unexpected|internal server|bad gateway|service unavailable|too many requests|upstream|econn|enotfound|certificate|timeout|timed out|abort|vercel|localhost)\b|service_role|cron_secret|\.env|\b\d{5}\b/i;

/** Una referencia corta y estable del mensaje técnico (4 letras/números): la misma en pantalla y en el registro. */
export function refError(texto) {
  let h = 5381; const s = String(texto ?? '').toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).toUpperCase().padStart(4, '0').slice(-4);
}
const bruto = e => {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  return [e.message, e.details, e.hint, e.error, e.error_description, e.msg].filter(x => typeof x === 'string' && x).join(' ');
};
const esAmigable = t => t.length > 0 && t.length <= 220 && !TECNICO.test(t) && !/^\s*[{[<]/.test(t) && /[a-záéíóúñ]{3}/i.test(t);

const REGLAS = [
  ['red', /failed to fetch|networkerror|load failed|network request failed|err_internet|err_network|tm_sin_red|sin conexi[oó]n|offline|net::/i, 'No hay conexión con el servidor. Revisa tu internet: lo que ya viste sigue disponible.'],
  ['sin-guardar', /tm_sin_cache/i, 'Sin conexión: esto todavía no se guardó en este equipo. Se verá cuando vuelva el internet.'],
  ['lento', /timeout|timed out|aborterror|tm_timeout|abort/i, 'El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.'],
  ['config', /service_role|cron_secret|falta configurar|no est[aá] configurad|\.env/i, 'Este servicio todavía no está configurado en el servidor. Avísale al administrador del sistema (en Seguridad está cómo terminarlo).'],
  ['sesion', /jwt|token.*(expir|invalid|inv[aá]lid)|not authenticated|no autenticad|pgrst301|invalid claim|refresh.token|session (missing|expired)|sesi[oó]n (inv[aá]lida|vencida)/i, 'Tu sesión se está renovando. Inténtalo de nuevo; si se repite, vuelve a iniciar sesión.'],
  ['permiso', /row-level|permission denied|42501|insufficient|forbidden|violates row/i, 'No tienes permiso para hacer esto con tu cuenta.'],
  ['no-activada', /could not find the function|schema cache|does not exist|42p01|42883|42703|pgrst20\d|undefined (table|function|column)|not exist/i, 'Esta función todavía no está activada en la base de datos. Avísale al administrador del sistema.'],
  ['duplicado', /duplicate key|23505|already exists/i, 'Ese registro ya existe.'],
  ['relacionado', /foreign key|23503/i, 'No se puede hacer porque está relacionado con otros datos.'],
  ['formato', /null value|23502|23514|22p02|22001|22003|invalid input|value too long|check constraint|out of range|violates check/i, 'Hay un dato con formato inválido. Revísalo e inténtalo otra vez.'],
  ['tasa', /429|too many|demasiad/i, 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.'],
  ['servidor', /\b5\d\d\b|internal server|bad gateway|unavailable|upstream|gateway|overload|econn|enotfound|certificate/i, 'El servidor tuvo un problema. Inténtalo en un momento.']
];
/**
 * entrada: texto, Error o { message, details, hint, code, status } → { texto, clase, ref, tecnico, tecnica }.
 * Si el mensaje ya es una frase clara en español (p. ej. «El nombre debe tener entre 2 y 60 letras.») se deja tal cual.
 */
export function mensajeAmigable(entrada, { status = null } = {}) {
  const codigo = String(entrada?.code ?? ''), st = status ?? entrada?.status ?? null, t = bruto(entrada).trim();
  const crudo = `${codigo} ${t}${st ? ` ${st}` : ''}`;
  const ref = refError(t || codigo);
  if (t && !codigo.startsWith('TM_') && esAmigable(t)) return { texto: t, clase: 'claro', ref, tecnico: t, tecnica: false };
  for (const [clase, rx, texto] of REGLAS) if (rx.test(crudo)) return { texto: ['red', 'sin-guardar', 'sesion', 'permiso', 'duplicado', 'relacionado', 'tasa'].includes(clase) ? texto : `${texto} (ref. ${ref})`, clase, ref, tecnico: t || codigo, tecnica: true };
  if (st && st >= 500) return { texto: `El servidor tuvo un problema. Inténtalo en un momento. (ref. ${ref})`, clase: 'servidor', ref, tecnico: t || codigo, tecnica: true };
  return { texto: `Algo no salió bien. Inténtalo de nuevo; si sigue pasando, avísale al administrador. (ref. ${ref})`, clase: 'otro', ref, tecnico: t || codigo, tecnica: true };
}
/** Quita lo que no debe guardarse en el registro de errores: correos, teléfonos, tokens y números largos; y lo recorta. */
export function limpiarParaRegistro(texto, max = 300) {
  return String(texto ?? '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]').replace(/\b(eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}|sb_[\w-]{16,}|sbp_[\w-]{16,})\b/g, '[clave]').replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]').replace(/\d{6,}/g, '[n]').replace(/\s+/g, ' ').trim().slice(0, max);
}
