import { useEffect, useRef, useState } from 'react';

/** Un número que "cuenta" hasta su valor (y vuelve a contar cuando cambia). Respeta "reducir movimiento". */
export default function NumeroAnimado({ valor, duracion = 900, formato = n => n.toLocaleString('es-CO') }) {
  const destino = Number(valor);
  const [mostrado, setMostrado] = useState(Number.isFinite(destino) ? 0 : valor);
  const previo = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(destino)) return;
    const reducir = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducir) { setMostrado(destino); previo.current = destino; return; }
    const desde = previo.current;
    if (desde === destino) { setMostrado(destino); return; }
    let raf;
    const t0 = performance.now();
    const paso = t => {
      const p = Math.min((t - t0) / duracion, 1);
      const suave = 1 - Math.pow(1 - p, 3);
      setMostrado(Math.round(desde + (destino - desde) * suave));
      if (p < 1) raf = requestAnimationFrame(paso); else previo.current = destino;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino, duracion]);
  return <span className="numero-animado">{Number.isFinite(destino) ? formato(mostrado) : valor}</span>;
}
