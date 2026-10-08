/**
 * Una persona se identifica por su Emp.Cod (= "Colaborador Id" del reporte de boncheo).
 * La MESA es solo un dato más: es el "código" que se ve en pantalla.
 * Versiones anteriores guardaron por error a algunas personas con la mesa como id;
 * esas filas se reconocen porque su Emp.Cod (codigo_empleado) no coincide con su id.
 */
export const esFilaMesaLegada = p =>
  !!p?.codigo_empleado && /^\d+$/.test(String(p.codigo_empleado)) && Number(p.codigo_empleado) !== Number(p.id);

export function coincidePersona(p, texto) {
  const b = String(texto || '').trim().toLowerCase();
  if (!b) return true;
  return String(p.nombre || '').toLowerCase().includes(b)
    || String(p.id).includes(b)
    || (p.mesa != null && String(p.mesa) === b)
    || (p.mesa != null && String(p.mesa).includes(b) && b.length >= 2);
}
