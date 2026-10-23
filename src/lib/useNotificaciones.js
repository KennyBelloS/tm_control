import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSesion } from './useSesion';
import { puedeEditar } from './roles';
import { avisar } from './avisos';
import { construirNotificaciones, visibles, insignia, paraAvisoFlotante, mananaTemprano } from './notificaciones';
import { reunirHechos } from './notificacionesDatos';

const CLAVE = 'tm_notif_estado_v2';
const leer = () => { try { return { leidas: [], ocultas: {}, noMolestarHasta: null, filtro: 'todas', mostradas: {}, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; } catch { return { leidas: [], ocultas: {}, noMolestarHasta: null, filtro: 'todas', mostradas: {} }; } };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const refrescarNotificaciones = () => window.dispatchEvent(new CustomEvent('tm-notif-refrescar'));

/** Estado de la campana: junta los hechos, aplica las reglas, recuerda lo visto/ocultado y avisa solo lo crítico (una vez al día). */
export function useNotificaciones() {
  const { sesion } = useSesion();
  const rol = sesion?.rol;
  const [items, setItems] = useState([]);
  const [estado, setEstado] = useState(leer);
  const [ahora, setAhora] = useState(() => new Date().toISOString());
  const estadoRef = useRef(estado); estadoRef.current = estado;
  const guardar = useCallback(cambio => setEstado(e => { const n = typeof cambio === 'function' ? cambio(e) : { ...e, ...cambio }; try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; }), []);

  const cargar = useCallback(async () => {
    if (!rol) return;
    const f = new Date(); const hechos = await reunirHechos({ rol, puedeEditar: puedeEditar(rol), hoy: hoyISO(), hora: f.getHours() });
    setItems(construirNotificaciones(hechos)); setAhora(f.toISOString());
  }, [rol]);
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5 * 60 * 1000), alVer = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVer); window.addEventListener('tm-notif-refrescar', cargar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVer); window.removeEventListener('tm-notif-refrescar', cargar); };
  }, [cargar]);

  // Solo lo CRÍTICO interrumpe, una vez al día y nunca con "No molestar".
  useEffect(() => {
    const hoy = hoyISO(), ya = Object.keys(estadoRef.current.mostradas || {}).filter(k => estadoRef.current.mostradas[k] === hoy);
    const nuevas = paraAvisoFlotante(items, estadoRef.current, new Date().toISOString(), ya);
    if (!nuevas.length) return;
    for (const n of nuevas) avisar(n.descripcion, 'error', { titulo: n.titulo, ruta: n.accion?.ruta, etiqueta: n.accion?.etiqueta });
    guardar(e => ({ ...e, mostradas: { ...Object.fromEntries(Object.entries(e.mostradas || {}).filter(([, d]) => d === hoy)), ...Object.fromEntries(nuevas.map(n => [n.id, hoy])) } }));
  }, [items, guardar]);

  const lista = useMemo(() => visibles(items, estado, ahora), [items, estado, ahora]);
  const globo = useMemo(() => insignia(items, estado, ahora), [items, estado, ahora]);
  return {
    lista, globo, filtro: estado.filtro, leidas: new Set(estado.leidas), noMolestarHasta: estado.noMolestarHasta && new Date(estado.noMolestarHasta) > new Date() ? estado.noMolestarHasta : null, ahora,
    marcarVistas: () => guardar(e => ({ ...e, leidas: [...new Set([...(e.leidas || []), ...lista.map(n => n.id)])].slice(-200) })),
    marcarLeida: id => guardar(e => ({ ...e, leidas: [...new Set([...(e.leidas || []), id])].slice(-200) })),
    recordarManana: id => guardar(e => ({ ...e, ocultas: { ...e.ocultas, [id]: mananaTemprano(new Date()) } })),
    eliminar: id => guardar(e => ({ ...e, ocultas: { ...e.ocultas, [id]: '9999-12-31T00:00:00Z' } })),
    cambiarFiltro: f => guardar({ filtro: f }),
    noMolestar: cual => guardar({ noMolestarHasta: cual === 'hora' ? new Date(Date.now() + 3600e3).toISOString() : cual === 'manana' ? mananaTemprano(new Date()) : null })
  };
}
