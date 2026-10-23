import { useEffect } from 'react';
import { useSesion } from './useSesion';
import { debeRespaldoMensual } from './respaldoBD';
import { ultimoEventoDe, ejecutarBackupMensual } from './respaldoBDDatos';
import { iniciarTarea } from './actualizacionApp';
import { avisar } from './avisos';
import { refrescarNotificaciones } from './useNotificaciones';

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * COPIA AUTOMÁTICA MENSUAL. Cuando un ADMINISTRADOR abre la app y todavía no hay copia de este mes, la genera sola en segundo plano
 * y la guarda en el almacenamiento privado "respaldos" (no ocupa espacio de la base de datos). Se conservan las últimas 12.
 * (No es un proceso del servidor: se hace al abrir la app el primer administrador del mes.)
 */
export function useRespaldoAutomatico() {
  const { sesion } = useSesion();
  const esAdmin = sesion?.rol === 'administrador';
  useEffect(() => {
    if (!esAdmin) return undefined;
    const hoy = hoyISO();
    const t = setTimeout(async () => {
      try {
        const bloqueo = Number(localStorage.getItem('tm_bkp_auto_lock') || 0);
        if (Date.now() - bloqueo < 30 * 60 * 1000) return;                       // otra pestaña ya lo está haciendo
        const ultimo = await ultimoEventoDe(['backup_mensual']);
        if (!debeRespaldoMensual({ hoy, ultimoAutomatico: ultimo?.fecha ? String(ultimo.fecha).slice(0, 10) : null })) return;
        localStorage.setItem('tm_bkp_auto_lock', String(Date.now()));
        const liberar = iniciarTarea();
        try {
          const r = await ejecutarBackupMensual({ hoy });
          avisar(`Se generó solo el backup «${r.nombre}» y quedó guardado en la nube (${r.total.toLocaleString('es-CO')} filas).`); refrescarNotificaciones();
        } finally { liberar(); localStorage.removeItem('tm_bkp_auto_lock'); }
      } catch (e) {
        const clave = `tm_bkp_auto_error_${hoy}`;
        try { if (!localStorage.getItem(clave)) { localStorage.setItem(clave, '1'); avisar(`No se pudo hacer la copia automática del mes: ${e.message || 'error desconocido'}. Revisa Auditoría.`, 'error'); } } catch { /* sin almacenamiento */ }
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [esAdmin]);
}
