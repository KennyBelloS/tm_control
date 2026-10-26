/** RESÚMENES — infraestructura del navegador: lee los datos con la sesión del administrador y arma el resumen ejecutivo con las reglas puras. */
import { supabase } from './supabaseClient';
import { cargarDatos } from './resumenCarga';
import { periodoPrevio, calcularResumen, comparar } from './resumenGeneral';
import { modeloEjecutivo } from './resumenEjecutivo';
import { reunirHechos } from './notificacionesDatos';
import { construirNotificaciones } from './notificaciones';
import { logoBase64 } from './logoBase64';

const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Una sola lectura de datos: de ahí salen el resumen de la finca, el de cada equipo y los pendientes. */
export async function armarEjecutivo({ periodo }) {
  const prev = periodoPrevio(periodo);
  const datos = await cargarDatos(supabase, { desde: prev.desde, hasta: periodo.hasta });
  const r = calcularResumen(datos, periodo), c = comparar(r, calcularResumen(datos, prev));
  const equipos = [...datos.formadoras].map(([id, nombre]) => {
    const dest = { tipo: 'formadora', formadoraId: id, nombre }, re = calcularResumen(datos, periodo, dest);
    return { id, nombre, r: re, c: comparar(re, calcularResumen(datos, prev, dest)) };
  });
  let alertas = [];
  try {                                                                      // el estado actual del sistema y lo pendiente (lo mismo que avisa la campana, sin lo informativo)
    const ahora = new Date(), hechos = await reunirHechos({ rol: 'administrador', puedeEditar: true, hoy: hoyLocal(), hora: ahora.getHours() });
    alertas = construirNotificaciones(hechos).filter(n => n.severidad !== 'info').map(n => ({ titulo: n.titulo, descripcion: n.descripcion, severidad: n.severidad }));
  } catch { /* si no se pueden leer, el resumen sale igual sin esa sección */ }
  const generado = new Date().toLocaleString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const modelo = modeloEjecutivo({ r, c, equipos, alertas, generado });          // la firma se aplica al dibujar: escribirla no vuelve a leer datos
  return { modelo, logo: await logoBase64() };
}
