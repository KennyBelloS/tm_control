import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getConfig, setConfig, getHistorico, getActual, borrarTablaHistorico, borrarTablaActual, getMetaDia, setMetaDia } from '../lib/db';
import { supabaseConfigurado } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL, cerrarSesion } from '../lib/roles';
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
export default function Configuracion() {
  const {
    sesion
  } = useSesion();
  const [cfg, setCfg] = useState(null);
  const [conteos, setConteos] = useState({
    historico: 0,
    actual: 0
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState(null);
  const [metaHoy, setMetaHoy] = useState('');
  const [metaTablaLista, setMetaTablaLista] = useState(true);
  const [guardandoMetaHoy, setGuardandoMetaHoy] = useState(false);
  const [metaHoyGuardada, setMetaHoyGuardada] = useState(false);
  const hoy = hoyISO();
  async function cargar() {
    setCargando(true);
    try {
      const [c, h, a, m] = await Promise.all([getConfig(), getHistorico({}), getActual({}), getMetaDia(hoy)]);
      setCfg(c);
      setConteos({
        historico: h.length,
        actual: a.length
      });
      setMetaHoy(String(m.meta));
      setMetaTablaLista(m.tablaLista);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    cargar();
  }, []);
  async function guardarMetaHoy() {
    setGuardandoMetaHoy(true);
    try {
      await setMetaDia(hoy, Number(metaHoy) || 0);
      setMetaHoyGuardada(true);
      setTimeout(() => setMetaHoyGuardada(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoMetaHoy(false);
    }
  }
  function actualizar(campo, valor) {
    setCfg(c => ({
      ...c,
      [campo]: valor
    }));
    setGuardado(false);
  }
  const [guardandoDescansos, setGuardandoDescansos] = useState(false);
  const [descansosGuardados, setDescansosGuardados] = useState(false);
  async function persistirDescansos(nuevoCfg) {
    setGuardandoDescansos(true);
    setError(null);
    try {
      await setConfig(nuevoCfg);
      setDescansosGuardados(true);
      setTimeout(() => setDescansosGuardados(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoDescansos(false);
    }
  }
  function actualizarActivarDescansos(valor) {
    setCfg(c => {
      const nuevo = {
        ...c,
        descansosActivos: valor
      };
      persistirDescansos(nuevo);
      return nuevo;
    });
  }
  function actualizarDescanso(indice, campo, valor) {
    setCfg(c => {
      const descansos = c.descansos.map((d, i) => i === indice ? {
        ...d,
        [campo]: valor
      } : d);
      return {
        ...c,
        descansos
      };
    });
  }
  function guardarDescansosAhora() {
    persistirDescansos(cfg);
  }
  function agregarDescanso() {
    setCfg(c => {
      const nuevo = {
        ...c,
        descansos: [...c.descansos, {
          horaCorte: '12:00',
          minutos: 30
        }]
      };
      persistirDescansos(nuevo);
      return nuevo;
    });
  }
  function quitarDescanso(indice) {
    setCfg(c => {
      const nuevo = {
        ...c,
        descansos: c.descansos.filter((_, i) => i !== indice)
      };
      persistirDescansos(nuevo);
      return nuevo;
    });
  }
  async function guardar() {
    setGuardando(true);
    try {
      await setConfig(cfg);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  async function limpiar(tabla) {
    const nombre = tabla === 'historico' ? 'HISTÓRICO PERMANENTE' : 'SNAPSHOT ACTUAL';
    if (!confirm(`Esto borrará TODA la tabla de ${nombre} en Supabase. ¿Continuar?`)) return;
    try {
      if (tabla === 'historico') await borrarTablaHistorico();else await borrarTablaActual();
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }
  if (cargando || !cfg) {
    return <>
        <PageHeader title="Configuración" subtitle="Parámetros globales usados en los cálculos de rendimiento." />
        <div className="page">
          {!supabaseConfigurado && <div className="alert warn"><i className="fa-solid fa-triangle-exclamation"></i> Supabase no está configurado. Revisa MANUAL.md.</div>}
          {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
          {!error && <p style={{
          color: 'var(--gray)'
        }}>Cargando...</p>}
        </div>
      </>;
  }
  return <>
      <PageHeader title="Configuración" subtitle="Parámetros globales usados en los cálculos de rendimiento." />
      <div className="page">
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Mi sesión</h2>
              <p>Con quién y qué rol estás usando el sistema ahora mismo. Para crear o cambiar cuentas, ve al módulo Usuarios.</p>
            </div>
          </div>
          <div className="summary-grid" style={{
          maxWidth: 500
        }}>
            <div className="summary-card"><span>Nombre</span><h3>{sesion?.nombre}</h3></div>
            <div className="summary-card"><span>Rol</span><h3>{ROL_LABEL[sesion?.rol] || sesion?.rol}</h3></div>
          </div>
          <div>
            <button className="btn-secondary" onClick={() => {
            if (confirm('¿Cerrar sesión?')) cerrarSesion();
          }}>
              <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-bullseye" style={{
                color: 'var(--accent)',
                marginRight: 8
              }}></i>Meta de tallos de HOY ({hoy})</h2>
              <p>Se define aquí cada día — el Dashboard solo la muestra, no se edita ahí. No afecta ningún otro día.</p>
            </div>
          </div>
          {!metaTablaLista && <div className="alert warn">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Falta crear la tabla "metas_diarias" en Supabase (corre <code>supabase/migracion_metas_diarias.sql</code>) — mientras tanto se usa el valor por defecto de abajo.
            </div>}
          <div className="form-row" style={{
          maxWidth: 320
        }}>
            <div>
              <label>Tallos meta para hoy</label>
              <input type="number" min="0" value={metaHoy} onChange={e => setMetaHoy(e.target.value)} />
            </div>
          </div>
          <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
            <button className="btn-primary" disabled={guardandoMetaHoy} onClick={guardarMetaHoy}>
              <i className="fa-solid fa-floppy-disk"></i> {guardandoMetaHoy ? 'Guardando...' : 'Guardar meta de hoy'}
            </button>
            {metaHoyGuardada && <span className="alert ok"><i className="fa-solid fa-check"></i> Meta de hoy guardada</span>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Parámetros de cálculo</h2>
              <p>Se guardan en la base de datos y aplican para todos los que usan el sistema.</p>
            </div>
          </div>
          <div className="form-row" style={{
          maxWidth: 680
        }}>
            <div><label>Meta de tallos por hora / persona</label>
              <input type="number" value={cfg.metaHora} onChange={e => actualizar('metaHora', Number(e.target.value))} /></div>
            <div><label>Meta de tallos por defecto (sugerida)</label>
              <input type="number" value={cfg.metaGlobalDia} onChange={e => actualizar('metaGlobalDia', Number(e.target.value))} />
              <small style={{
              display: 'block',
              marginTop: 4,
              color: 'var(--gray)',
              fontSize: 11
            }}>
                Solo se usa como sugerencia inicial. La meta real de cada día se define arriba ("Meta de tallos de HOY") y aplica solo a ese día.
              </small>
            </div>
            <div><label>Jornada — hora inicio por defecto</label>
              <input type="time" value={cfg.horaInicioDefault} onChange={e => actualizar('horaInicioDefault', e.target.value)} /></div>
            <div><label>Jornada — hora fin por defecto</label>
              <input type="time" value={cfg.horaFinDefault} onChange={e => actualizar('horaFinDefault', e.target.value)} /></div>
          </div>
          <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
            <button className="btn-primary" disabled={guardando} onClick={guardar}>
              <i className="fa-solid fa-floppy-disk"></i> {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {guardado && <span className="alert ok"><i className="fa-solid fa-check"></i> Configuración guardada</span>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-utensils" style={{
                color: 'var(--accent)',
                marginRight: 8
              }}></i>Descuentos de tiempo (almuerzo)</h2>
              <p>Si un bloque de horas cruza la hora de corte que definas, se le resta el tiempo automáticamente.</p>
            </div>
            {(guardandoDescansos || descansosGuardados) && <span className="alert ok" style={{
            fontSize: 11
          }}>
                <i className={`fa-solid ${guardandoDescansos ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {guardandoDescansos ? 'Guardando...' : 'Guardado'}
              </span>}
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={cfg.descansosActivos} onChange={e => actualizarActivarDescansos(e.target.checked)} />
            <span className="switch-visual"></span>
            <span>Activar descuentos automáticos de tiempo (media hora de almuerzo activada por defecto)</span>
          </label>

          {cfg.descansosActivos && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
              {cfg.descansos.map((d, i) => <div key={i} className="descanso-row">
                  <div>
                    <label>Hora de corte</label>
                    <input type="time" value={d.horaCorte} onChange={e => actualizarDescanso(i, 'horaCorte', e.target.value)} onBlur={guardarDescansosAhora} />
                  </div>
                  <div>
                    <label>Minutos a descontar</label>
                    <input type="number" min="0" value={d.minutos} onChange={e => actualizarDescanso(i, 'minutos', Number(e.target.value))} onBlur={guardarDescansosAhora} />
                  </div>
                  <button className="btn-danger-outline" style={{
              marginTop: 18
            }} onClick={() => quitarDescanso(i)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>)}
              {cfg.descansos.length < 3 && <button className="btn-secondary" style={{
            alignSelf: 'flex-start'
          }} onClick={agregarDescanso}>
                  <i className="fa-solid fa-plus"></i> Agregar descanso ({cfg.descansos.length}/3)
                </button>}
              <p style={{
            fontSize: 11,
            color: 'var(--gray)'
          }}>
                Ejemplo: hora de corte 12:00 y 30 minutos → un bloque de 06:00 a 13:00 queda en 6.5 horas trabajadas (7 horas menos 30 min de almuerzo). Los cambios aquí se guardan solos, no hace falta el botón de arriba.
              </p>
            </div>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Datos almacenados en Supabase</h2>
              <p>Recuerda: nunca se guarda el Excel, solo estos registros ya calculados.</p>
            </div>
          </div>
          <div className="summary-grid">
            <div className="summary-card"><span>Histórico permanente</span><h3>{conteos.historico.toLocaleString()} registros</h3></div>
            <div className="summary-card"><span>Snapshot actual</span><h3>{conteos.actual.toLocaleString()} registros</h3></div>
          </div>
          <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap'
        }}>
            <button className="btn-danger-outline" onClick={() => limpiar('historico')}>
              <i className="fa-solid fa-trash"></i> Eliminar tabla Histórico
            </button>
            <button className="btn-danger-outline" onClick={() => limpiar('actual')}>
              <i className="fa-solid fa-trash"></i> Eliminar tabla Snapshot Actual
            </button>
          </div>
        </section>
      </div>
    </>;
}
