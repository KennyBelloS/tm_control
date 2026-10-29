import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getPerfilActual } from './roles';

// La sesión se pide UNA vez y se comparte: cada pieza de la pantalla que la necesita la recibe al instante (sin esperar ni repetir la petición).
let compartida, enCurso = null, tomadaEn = 0;
const TTL = 30_000;
function leer(forzar = false) {
  if (enCurso) return enCurso;
  if (!forzar && compartida !== undefined && Date.now() - tomadaEn < TTL) return Promise.resolve(compartida);
  enCurso = getPerfilActual().then(p => { compartida = p; tomadaEn = Date.now(); return p; }).finally(() => { enCurso = null; });
  return enCurso;
}
export function useSesion() {
  const [estado, setEstado] = useState(() => (compartida !== undefined ? { cargando: false, sesion: compartida } : { cargando: true, sesion: null }));
  useEffect(() => {
    let activo = true;
    const cargar = forzar => leer(forzar).then(perfil => { if (activo) setEstado(e => (e.cargando === false && e.sesion === perfil ? e : { cargando: false, sesion: perfil })); });
    cargar(false);
    const { data: sub } = supabase.auth.onAuthStateChange(() => { cargar(true); });
    const alCambiar = () => cargar(true);                                                 // cambió el nombre o la flor en Mi perfil
    window.addEventListener('tm-sesion-cambio', alCambiar);          // entrar, salir o renovar la sesión: se vuelve a pedir (una sola vez)
    return () => { activo = false; sub.subscription.unsubscribe(); window.removeEventListener('tm-sesion-cambio', alCambiar); };
  }, []);
  return estado;
}
