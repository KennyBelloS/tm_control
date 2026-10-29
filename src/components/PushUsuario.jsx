import { EVENTOS } from '../lib/eventosApp';

/** Avisos fuera de la app de UNA persona (lo decide el Administrador): un interruptor por tipo de aviso. */
export default function PushUsuario({ nombre, eventos = [], celulares = 0, onCambiar, deshabilitado = false }) {
  const act = new Set(eventos), n = act.size;
  const cambiar = id => { const s = new Set(act); s.has(id) ? s.delete(id) : s.add(id); onCambiar([...s]); };
  return (
    <details className={`pu ${n ? 'on' : ''}`}>
      <summary aria-label={`Avisos fuera de la app de ${nombre}`}><i className={`fa-solid ${n ? 'fa-bell' : 'fa-bell-slash'}`}></i> {n ? `${n} de ${EVENTOS.length}` : 'Ninguno'}{n > 0 && <small>{celulares > 0 ? ` · ${celulares} ${celulares === 1 ? 'celular' : 'celulares'}` : ' · sin celular aún'}</small>}</summary>
      <div className="pu-panel">
        <p>Avisos que le llegan a <b>{nombre}</b> <u>fuera de la app</u>, aunque esté cerrada. En la campana los ven todos.</p>
        {EVENTOS.map(e => <label key={e.id} className="pu-op"><input type="checkbox" checked={act.has(e.id)} disabled={deshabilitado} onChange={() => cambiar(e.id)} /><span><i className={`fa-solid ${e.icono}`}></i> {e.nombre}<small>{e.descripcion}</small></span></label>)}
        <div className="pu-todos"><button type="button" disabled={deshabilitado} onClick={() => onCambiar(EVENTOS.map(e => e.id))}>Todos</button><button type="button" disabled={deshabilitado || !n} onClick={() => onCambiar([])}>Ninguno</button></div>
      </div>
    </details>
  );
}
