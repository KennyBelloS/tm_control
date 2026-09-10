import { useEffect, useState } from 'react';
import { contarPendientes, sincronizarCola } from './offlineQueue';
import { insertarHistorico, reemplazarActual } from './db';

const EJECUTORES = {
  historico: (datos) => insertarHistorico(datos),
  actual: (datos) => reemplazarActual(datos),
};

export function useEstadoConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(contarPendientes());
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [reconectado, setReconectado] = useState(false);

  useEffect(() => {
    let timeoutReconexion;

    function actualizarPendientes() { setPendientes(contarPendientes()); }
    function alSincronizar(e) { setSincronizando(e.detail); }

    async function sincronizarAhora() {
      const habiaPendientes = contarPendientes() > 0;
      const res = await sincronizarCola(EJECUTORES);
      if (res.exitosas > 0 || res.fallidas > 0) {
        setUltimoResultado(res);
      } else if (!habiaPendientes) {
        setReconectado(true);
        clearTimeout(timeoutReconexion);
        timeoutReconexion = setTimeout(() => setReconectado(false), 3000);
      }
      actualizarPendientes();
    }

    function alConectar() {
      setEnLinea(true);
      sincronizarAhora();
    }
    function alDesconectar() { setEnLinea(false); setReconectado(false); }

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    window.addEventListener('tm-cola-cambio', actualizarPendientes);
    window.addEventListener('tm-cola-sincronizando', alSincronizar);

    if (navigator.onLine && contarPendientes() > 0) sincronizarAhora();

    return () => {
      clearTimeout(timeoutReconexion);
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
      window.removeEventListener('tm-cola-cambio', actualizarPendientes);
      window.removeEventListener('tm-cola-sincronizando', alSincronizar);
    };
  }, []);

  return { enLinea, pendientes, sincronizando, ultimoResultado, reconectado };
}
