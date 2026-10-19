/** "ADRIANA MURCIA CASTAÑEDA" → "ADRIANA M." (nombre y la inicial del primer apellido). */
export function nombreCorto(nombre) {
  const t = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (!t.length) return '—';
  if (t.length === 1) return t[0];
  const apellido = t.length >= 4 ? t[2] : t[1];
  return `${t[0]} ${apellido[0]}.`;
}

/**
 * Cómo se ve un colaborador según "Mostrar por": solo el código, solo el nombre, o los dos.
 * El código es un chip que se puede copiar con un clic.
 */
export function NombreCodigo({ nombre, codigo, modo = 'ambos', negrita = false, copiable = true }) {
  const chip = copiable
    ? <span className="dev-codigo codigo-copiable" title="Clic para copiar el código" data-copiar={codigo ?? ''}>{codigo ?? '—'}</span>
    : <span className="dev-codigo">{codigo ?? '—'}</span>;
  if (modo === 'codigo') return chip;
  if (modo === 'nombre') return <span className={negrita ? 'dev-nombre' : ''}>{nombre}</span>;
  return <span className="dev-nombre-codigo"><span className={negrita ? 'dev-nombre' : ''}>{nombre}</span> {chip}</span>;
}

/** Etiquetas del eje de los gráficos según el modo: { etq, etq2 } (etq2 = segunda línea opcional). */
export function etiquetaGrafico(nombre, codigo, modo) {
  const c = String(codigo ?? '—');
  if (modo === 'codigo') return { etq: c };
  if (modo === 'nombre') return { etq: nombreCorto(nombre) };
  return { etq: c, etq2: nombreCorto(nombre) };
}
