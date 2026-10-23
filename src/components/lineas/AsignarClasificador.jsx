import { useCallback, useEffect, useMemo, useState } from 'react';
import { buscarPersonas } from '../../lib/buscarColaborador';
import { listarParesDia, asignarClasificador, quitarPar } from '../../lib/clasificadores';
import { avisar } from '../../lib/avisos';

/** Un buscador por NOMBRE (no por código) que devuelve la persona elegida. */
function BuscadorNombre({ etiqueta, paso, opciones, elegido, onElegir, placeholder, vacio }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const resultados = useMemo(() => (texto.trim() ? buscarPersonas(opciones, texto, 8) : opciones.slice(0, 8)), [opciones, texto]);
  const e = opciones.find(o => o.id === elegido);
  return (
    <div className="asig-clasif-campo">
      <span className="asignacion-paso-num">{paso}</span>
      <div className="asignacion-paso-campo">
        <label>{etiqueta}</label>
        {e ? (
          <div className="asig-clasif-elegido"><b>{e.nombre}</b>{e.sub && <small>{e.sub}</small>}<button className="btn-secondary" onClick={() => { onElegir(null); setTexto(''); }} aria-label="Cambiar"><i className="fa-solid fa-xmark"></i></button></div>
        ) : (
          <div className="search asig-clasif-busca">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" value={texto} maxLength={60} placeholder={placeholder} onFocus={() => setAbierto(true)} onChange={ev => { setTexto(ev.target.value); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 150)} />
            {abierto && (
              <ul className="asig-clasif-lista" role="listbox">
                {resultados.map(o => <li key={o.id}><button role="option" onMouseDown={ev => ev.preventDefault()} onClick={() => { onElegir(o.id); setTexto(''); setAbierto(false); }}><b>{o.nombre}</b>{o.sub && <small>{o.sub}</small>}</button></li>)}
                {resultados.length === 0 && <li className="asig-clasif-vacio">{texto.trim() ? 'No encontré a nadie con ese nombre.' : vacio}</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Asigna un clasificador a un bonchador": cada día, un clasificador (persona del módulo Personas) con un bonchador.
 * Ese día el clasificador toma la asistencia, el rendimiento y las devoluciones del bonchador en el Tablero Integrado del Colaborador.
 */
export default function AsignarClasificador({ fecha, esHoy, asignaciones, personas, puedeModificar }) {
  const [pares, setPares] = useState([]);
  const [disponible, setDisponible] = useState(true);
  const [clasificador, setClasificador] = useState(null);
  const [bonchador, setBonchador] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try { const r = await listarParesDia(fecha); setPares(r.pares); setDisponible(r.disponible); } catch (e) { avisar(e.message || 'No se pudieron leer las asignaciones.', 'error'); }
  }, [fecha]);
  useEffect(() => { setClasificador(null); setBonchador(null); cargar(); }, [cargar]);

  const nombres = useMemo(() => new Map(personas.map(p => [p.id, p.nombre])), [personas]);
  const bonchadoresDelDia = useMemo(() => {
    const vistos = new Map();
    for (const a of asignaciones) if (!vistos.has(a.colaborador_id)) vistos.set(a.colaborador_id, { id: a.colaborador_id, nombre: a.colaborador, sub: `${a.formadora} · ${a.linea}` });
    return [...vistos.values()].sort((x, y) => x.nombre.localeCompare(y.nombre));
  }, [asignaciones]);
  const idsBonchadores = useMemo(() => new Set(bonchadoresDelDia.map(b => b.id)), [bonchadoresDelDia]);
  const yaClasificadores = useMemo(() => new Set(pares.map(p => p.clasificador_id)), [pares]);
  const candidatos = useMemo(() => personas.filter(p => p.activo !== false && !idsBonchadores.has(p.id) && !yaClasificadores.has(p.id)).map(p => ({ id: p.id, nombre: p.nombre })), [personas, idsBonchadores, yaClasificadores]);
  const infoBonchador = useMemo(() => new Map(bonchadoresDelDia.map(b => [b.id, b])), [bonchadoresDelDia]);

  async function asignar() {
    if (!clasificador || !bonchador) return;
    setGuardando(true);
    try { await asignarClasificador({ fecha, clasificadorId: clasificador, bonchadorId: bonchador }); avisar('Clasificador asignado.'); setClasificador(null); setBonchador(null); await cargar(); }
    catch (e) { avisar(e.message || 'No se pudo asignar.', 'error'); } finally { setGuardando(false); }
  }
  async function quitar(id) {
    try { await quitarPar(id); await cargar(); avisar('Asignación quitada.'); } catch (e) { avisar(e.message || 'No se pudo quitar.', 'error'); }
  }

  return (
    <section className="step-panel asig-clasif">
      <h3><i className="fa-solid fa-people-arrows"></i> Asigna un clasificador a un bonchador · {fecha.split('-').reverse().join('/')}{esHoy ? ' (hoy)' : ''}</h3>
      <p className="asig-clasif-ayuda">
        Cada día se asigna un <b>clasificador</b> (una persona del módulo Personas) a un <b>bonchador</b>. Ese día el clasificador toma, en el <b>Tablero Integrado del Colaborador</b>, la <b>asistencia</b> (cuenta como si hubiera venido),
        el <b>rendimiento</b> y las <b>devoluciones</b> de su bonchador. Si mañana lo cambias de bonchador, cada día guarda lo del bonchador de ese día.
      </p>
      {!disponible && <div className="alert-inline"><i className="fa-solid fa-triangle-exclamation"></i> Falta preparar la base de datos: ejecuta la <b>sección 29</b> del archivo <code>migracion_autenticacion.sql</code> en Supabase.</div>}

      {pares.length > 0 ? (
        <ul className="asig-clasif-pares">
          {pares.map(p => { const b = infoBonchador.get(p.bonchador_id); return (
            <li key={p.id}>
              <span className="asig-clasif-par"><b>{nombres.get(p.clasificador_id) || `ID ${p.clasificador_id}`}</b><i className="fa-solid fa-arrow-right-long"></i><b>{nombres.get(p.bonchador_id) || `ID ${p.bonchador_id}`}</b></span>
              {b && <small>{b.sub}</small>}
              {puedeModificar && <button className="btn-secondary asig-clasif-quitar" onClick={() => quitar(p.id)} title="Quitar esta asignación"><i className="fa-solid fa-trash"></i></button>}
            </li>
          ); })}
        </ul>
      ) : disponible && <p className="asig-clasif-ninguno">Este día todavía no tiene clasificadores asignados.</p>}

      {puedeModificar ? (
        <div className="asig-clasif-form">
          <BuscadorNombre paso="1" etiqueta="Bonchador (de los asignados a una formadora este día)" opciones={bonchadoresDelDia} elegido={bonchador} onElegir={setBonchador} placeholder="Busca al bonchador por nombre…" vacio="Primero asigna bonchadores a una formadora más arriba." />
          <BuscadorNombre paso="2" etiqueta="Clasificador (persona del módulo Personas, búscalo por nombre)" opciones={candidatos} elegido={clasificador} onElegir={setClasificador} placeholder="Busca al clasificador por nombre…" vacio="No hay más personas disponibles." />
          <button className="btn-primary" onClick={asignar} disabled={!clasificador || !bonchador || guardando || !disponible}><i className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-link'}`}></i> Asignar clasificador</button>
        </div>
      ) : <p className="asig-clasif-ninguno"><i className="fa-solid fa-eye"></i> Solo visualización: quien tiene este rol no puede asignar ni quitar.</p>}
    </section>
  );
}
