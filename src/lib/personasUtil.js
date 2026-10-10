/**
 * Una persona se identifica por su Emp.Cod (= "Colaborador Id" del reporte de boncheo).
 * La MESA es solo un dato más: es el "código" que se ve en pantalla.
 * Versiones anteriores guardaron por error a algunas personas con la mesa como id;
 * esas filas se reconocen porque su Emp.Cod (codigo_empleado) no coincide con su id.
 */
export const esFilaMesaLegada = p =>
  !!p?.codigo_empleado && /^\d+$/.test(String(p.codigo_empleado)) && Number(p.codigo_empleado) !== Number(p.id);

/**
 * ¿El texto buscado coincide con alguno de los códigos (mesas)? Un código puede venir solo ("4")
 * o varios juntos ("4, 6"). Con un dígito debe ser exacto (el "4" no trae el 14 ni el 40);
 * desde dos dígitos basta con que el código empiece así (el "12" trae el 12 y el 120).
 */
export function coincideCodigo(codigos, texto) {
  const q = String(texto || '').trim();
  if (!/^\d+$/.test(q)) return false;
  const lista = String(codigos ?? '').split(/[^0-9]+/).filter(Boolean);
  return lista.some(c => (q.length === 1 ? c === q : c.startsWith(q)));
}

/** Busca por NOMBRE o por CÓDIGO (mesa). El id interno (Emp.Cod) NO se usa para buscar. */
export function coincidePersona(p, texto) {
  const b = String(texto || '').trim().toLowerCase();
  if (!b) return true;
  return String(p.nombre || '').toLowerCase().includes(b) || coincideCodigo(p.mesa, b);
}

/** Igual que coincidePersona, para filas de rendimientos (nombre + códigos/mesa de la fila). */
export function coincideFila(nombre, codigos, texto) {
  const b = String(texto || '').trim().toLowerCase();
  if (!b) return true;
  return String(nombre || '').toLowerCase().includes(b) || coincideCodigo(codigos, b);
}
