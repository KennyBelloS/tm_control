import { useEffect, useState } from 'react';
import { useEfectos } from '../../lib/efectos';
import { fiestaDelDia } from '../../lib/fiestas';
import { fechaLocalISO } from '../../lib/clasificacionCalculos';
import { celebrar } from '../../lib/confeti';

/** Cuando llega una festividad y el ambiente festivo está apagado, la app lo ofrece UNA vez por festividad y año (sin activarlo por su cuenta). */
export default function InvitacionFiesta() {
  const { ajustes, cambiar } = useEfectos();
  const [oferta, setOferta] = useState(null);
  useEffect(() => {
    if (ajustes.activo) { setOferta(null); return undefined; }
    const hoy = fechaLocalISO(), f = fiestaDelDia(hoy);
    if (!f) return undefined;
    const clave = `tm_fiesta_inv_${f.id}_${hoy.slice(0, 4)}`;
    try { if (localStorage.getItem(clave)) return undefined; } catch { /* sin almacenamiento */ }
    const t = setTimeout(() => setOferta({ f, clave }), 1800);
    return () => clearTimeout(t);
  }, [ajustes.activo]);
  if (!oferta) return null;
  const cerrar = () => { try { localStorage.setItem(oferta.clave, '1'); } catch { /* sin almacenamiento */ } setOferta(null); };
  return (
    <aside className="efx-invitacion" role="dialog" aria-label="Invitación festiva">
      <span className="efx-inv-emoji" aria-hidden="true">{oferta.f.emoji}</span>
      <div><strong>Es temporada de {oferta.f.nombre}</strong><p>¿Quieres darle un aire festivo a la aplicación? Puedes apagarlo cuando quieras.</p></div>
      <div className="efx-inv-botones">
        <button className="btn-primary" onClick={() => { cambiar({ activo: true, modo: 'auto' }); cerrar(); setTimeout(celebrar, 300); }}>Activar</button>
        <button className="btn-secondary" onClick={cerrar}>Ahora no</button>
      </div>
    </aside>
  );
}
