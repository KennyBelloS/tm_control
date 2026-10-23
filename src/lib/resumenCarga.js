/** LECTURA DE DATOS DEL RESUMEN — la usan el servidor (llave de servicio) y el navegador (sesión del administrador): recibe el cliente de Supabase. */
import { emparejarConDevoluciones } from './devolucionesCalculos.js';

/** Supabase entrega máximo 1.000 filas por consulta: se pide por páginas. */
async function leer(cliente, tabla, columnas, aplicar = q => q) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await aplicar(cliente.from(tabla).select(columnas)).range(d, d + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    out.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return out;
}

export async function cargarDatos(cliente, { desde, hasta }) {
  const rango = q => q.gte('fecha', desde).lte('fecha', hasta);
  const [historico, devRaw, devPersonas, clasificacionHora, asignaciones, personas, lineas, formadoras, meta, cfg] = await Promise.all([
    leer(cliente, 'rendimiento_historico', 'fecha, colaborador_id, total_tallos, tiempo_trabajado_min, tiempo_no_productivo_min', rango),
    leer(cliente, 'devoluciones_dia', 'fecha, colaborador_id, total, razones', rango),
    leer(cliente, 'devoluciones_personas', 'colaborador_id, nombre, codigo').catch(() => []),
    leer(cliente, 'clasificacion_hora', 'fecha, linea, hora, tallos', rango).catch(() => []),
    leer(cliente, 'asignaciones_diarias', 'fecha, colaborador_id, formadora_id, linea_id', rango).catch(() => []),
    leer(cliente, 'personas', 'id, nombre'), leer(cliente, 'lineas', 'id, nombre').catch(() => []), leer(cliente, 'formadoras', 'id, nombre').catch(() => []),
    cliente.from('devoluciones_meta').select('razones').eq('id', 1).maybeSingle(),
    cliente.from('configuracion').select('meta_hora, meta_global_dia').eq('id', 1).maybeSingle()
  ]);
  const mapaDev = emparejarConDevoluciones(personas.map(p => ({ id: p.id, nombre: p.nombre, mesa: null })), devPersonas.map(p => ({ id: p.colaborador_id, nombre: p.nombre, codigo: p.codigo })));
  return {
    historico, devoluciones: devRaw.map(r => ({ fecha: r.fecha, id: r.colaborador_id, total: r.total, razones: r.razones || {} })), clasificacionHora, clasificacionHist: [], asignaciones,
    personas: new Map(personas.map(p => [p.id, p.nombre])), lineas: new Map(lineas.map(l => [l.id, l.nombre])), formadoras: new Map(formadoras.map(f => [f.id, f.nombre])),
    razones: meta?.data?.razones || [], config: { metaHora: cfg?.data?.meta_hora || 0, metaDia: cfg?.data?.meta_global_dia || 0 },
    devIdPorColaborador: new Map([...mapaDev].filter(([, d]) => d).map(([id, d]) => [id, d.id]))
  };
}

