import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';

/**
 * Nota con una contraseña guardada en la base de datos (no escrita en el código de la app).
 * Solo la piden —y solo la reciben— los roles indicados: la base de datos también lo hace cumplir.
 */
export default function NotaClave({ clave, roles, titulo, quienes }) {
  const { sesion } = useSesion();
  const puede = roles.includes(sesion?.rol);
  const [valor, setValor] = useState(undefined);
  const [ver, setVer] = useState(false);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!puede) return;
    supabase.from('notas_modulo').select('valor').eq('clave', clave).maybeSingle()
      .then(({ data, error }) => setValor(error ? null : (data?.valor ?? null)));
  }, [puede, clave]);
  if (!puede || valor === undefined) return null;
  if (valor === null) {
    return sesion.rol === 'administrador' ? (
      <div className="nota-clave nota-clave-falta"><i className="fa-solid fa-key"></i> Falta guardar la {titulo.toLowerCase()}: corre en Supabase el SQL de "notas de módulo".</div>
    ) : null;
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sin permiso del portapapeles */ }
  }
  return (
    <div className="nota-clave">
      <span className="nota-clave-icono"><i className="fa-solid fa-key"></i></span>
      <div className="nota-clave-texto">
        <strong>{titulo}</strong>
        <small>Solo la ven {quienes}</small>
      </div>
      <code className="nota-clave-valor">{ver ? valor : '•'.repeat(Math.min(valor.length, 12))}</code>
      <button className="nota-clave-btn" onClick={() => setVer(v => !v)} title={ver ? 'Ocultar' : 'Mostrar'}><i className={`fa-solid ${ver ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
      <button className="nota-clave-btn" onClick={copiar} title="Copiar"><i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'}`}></i></button>
    </div>
  );
}
