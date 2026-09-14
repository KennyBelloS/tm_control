import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

/**
 * Se suscribe a cambios en vivo de las tablas indicadas (INSERT/UPDATE/DELETE
 * hechos por cualquiera, desde cualquier pantalla) y llama a `alCambiar`
 * cada vez que algo cambia — así toda la app se actualiza sola, sin
 * necesidad de recargar la página.
 */
export function useRealtimeRefresco(tablas, alCambiar) {
  const callbackRef = useRef(alCambiar);
  callbackRef.current = alCambiar;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!tablas || tablas.length === 0) return;
    const canal = supabase.channel(`tm-cambios-${tablas.join('-')}-${Math.random().toString(36).slice(2, 8)}`);
    tablas.forEach(tabla => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        // agrupa varios cambios seguidos (ej. al subir un Excel completo) en una sola recarga
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => callbackRef.current(), 500);
      });
    });
    canal.subscribe();
    return () => {
      clearTimeout(timeoutRef.current);
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablas.join(',')]);
}
