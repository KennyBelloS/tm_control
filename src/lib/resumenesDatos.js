/** RESÚMENES — infraestructura del navegador: lee los datos con la sesión del administrador UNA vez y arma el resumen ejecutivo del alcance elegido. */
import { supabase } from './supabaseClient';
import { cargarDatos } from './resumenCarga';
import { periodoPrevio } from './resumenGeneral';
import { calcularAlcance, personasDelPeriodo } from './resumenAlcance';
import { modeloEjecutivo } from './resumenEjecutivo';
import { reunirHechos } from './notificacionesDatos';
import { construirNotificaciones } from './notificaciones';
import { logoBase64 } from './logoBase64';

const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Una sola lectura de datos del período (y del anterior, para comparar): de ahí salen todos los alcances, sin volver a consultar. */
export async function cargarBaseEjecutivo({ periodo }) {
  const prev = periodoPrevio(periodo);
  const datos = await cargarDatos(supabase, { desde: prev.desde, hasta: periodo.hasta });
  let alertas = [];
  try {                                                                      // el estado actual del sistema y lo pendiente (lo mismo que avisa la campana, sin lo informativo)
    const ahora = new Date(), hechos = await reunirHechos({ rol: 'administrador', puedeEditar: true, hoy: hoyLocal(), hora: ahora.getHours() });
    alertas = construirNotificaciones(hechos).filter(n => n.severidad !== 'info').map(n => ({ titulo: n.titulo, descripcion: n.descripcion, severidad: n.severidad }));
  } catch { /* si no se pueden leer, el resumen sale igual sin esa sección */ }
  const generado = new Date().toLocaleString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  return { datos, periodo, alertas, generado, logo: await logoBase64(), personas: personasDelPeriodo(datos, periodo) };
}
/** El documento del alcance elegido (finca, proceso o persona) a partir de lo ya leído. La firma se aplica al dibujar. */
export function componerEjecutivo(base, alcance) {
  const { r, previo, c, equipos } = calcularAlcance(base.datos, base.periodo, alcance);
  return modeloEjecutivo({ r, c, previo, equipos, alcance, alertas: alcance.tipo === 'finca' ? base.alertas : [], generado: base.generado });
}
