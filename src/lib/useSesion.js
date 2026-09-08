import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getPerfilActual } from './roles';
export function useSesion() {
  const [estado, setEstado] = useState({
    cargando: true,
    sesion: null
  });
  useEffect(() => {
    let activo = true;
    async function cargar() {
      const perfil = await getPerfilActual();
      if (activo) setEstado({
        cargando: false,
        sesion: perfil
      });
    }
    cargar();
    const {
      data: sub
    } = supabase.auth.onAuthStateChange(() => {
      cargar();
    });
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return estado;
}
