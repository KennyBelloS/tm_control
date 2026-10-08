import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getConfig, setConfig, getHistorico, getActual, borrarTablaHistorico, borrarTablaActual, getMetaDia, setMetaDia, getDescansosDia, setDescansosDia, quitarDescansosDia } from '../lib/db';
import { supabaseConfigurado } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL, cerrarSesion } from '../lib/roles';
import { fechaLocalISO } from '../lib/clasificacionCalculos';
function hoyISO() {
  return fechaLocalISO();
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
  const [descansoHoy, setDescansoHoy] = useState({
    Historico: { activo: false, tieneExcepcion: false, horaCorte: '12:00', minutos: 30 },
    Actual: { activo: false, tieneExcepcion: false, horaCorte: '12:00', minutos: 30 }
  });
  const [guardandoDescansoHoy, setGuardandoDescansoHoy] = useState({ Historico: false, Actual: false });
  const [descansoHoyGuardado, setDescansoHoyGuardado] = useState({ Historico: false, Actual: false });
  const [fechaDescuento, setFechaDescuento] = useState({ Historico: '', Actual: '' });
  const [cargandoDescuentoFecha, setCargandoDescuentoFecha] = useState({ Historico: false, Actual: false });
  const [metaHoyGuardada, setMetaHoyGuardada] = useState(false);
  const hoy = hoyISO();
  async function cargar() {
    setCargando(true);
    try {
      const [c, h, a, m] = await Promise.all([
        getConfig(), getHistorico({}), getActual({}), getMetaDia(hoy)
      ]);
      setCfg(c);
      setConteos({
        historico: h.length,
        actual: a.length
      });
      setMetaHoy(String(m.meta));
      setMetaTablaLista(m.tablaLista);
      setFechaDescuento({ Historico: hoy, Actual: hoy });
      await Promise.all([
        cargarDescuentoDeFecha('Historico', hoy, c),
        cargarDescuentoDeFecha('Actual', hoy, c)
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  async function cargarDescuentoDeFecha(tipo, fecha, cfgActual) {
    setCargandoDescuentoFecha(g => ({ ...g, [tipo]: true }));
    try {
      const tipoBd = tipo === 'Historico' ? 'historico' : 'actual';
      const c = cfgActual || cfg;
      const dFecha = await getDescansosDia(fecha, tipoBd);
      setDescansoHoy(prev => ({
        ...prev,
        [tipo]: dFecha
          ? { activo: dFecha.activos, tieneExcepcion: true, horaCorte: dFecha.descansos[0]?.horaCorte || '12:00', minutos: dFecha.descansos[0]?.minutos ?? 30 }
          : {
              activo: tipo === 'Historico' ? c.descansosActivosHistorico : c.descansosActivosActual,
              tieneExcepcion: false,
              horaCorte: (tipo === 'Historico' ? c.descansosHistorico : c.descansosActual)[0]?.horaCorte || '12:00',
              minutos: (tipo === 'Historico' ? c.descansosHistorico : c.descansosActual)[0]?.minutos ?? 30
            }
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoDescuentoFecha(g => ({ ...g, [tipo]: false }));
    }
  }
  function cambiarFechaDescuento(tipo, fecha) {
    setFechaDescuento(f => ({ ...f, [tipo]: fecha }));
    cargarDescuentoDeFecha(tipo, fecha);
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
  function actualizarDescansoHoy(tipo, campo, valor) {
    setDescansoHoy(d => ({
      ...d,
      [tipo]: { ...d[tipo], [campo]: valor }
    }));
  }
  async function guardarDescansoHoy(tipo) {
    setGuardandoDescansoHoy(g => ({ ...g, [tipo]: true }));
    setError(null);
    try {
      const d = descansoHoy[tipo];
      const fecha = fechaDescuento[tipo];
      await setDescansosDia(fecha, tipo === 'Historico' ? 'historico' : 'actual', d.activo, [{ horaCorte: d.horaCorte, minutos: d.minutos }]);
      setDescansoHoy(prev => ({ ...prev, [tipo]: { ...prev[tipo], tieneExcepcion: true } }));
      setDescansoHoyGuardado(g => ({ ...g, [tipo]: true }));
      setTimeout(() => setDescansoHoyGuardado(g => ({ ...g, [tipo]: false })), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoDescansoHoy(g => ({ ...g, [tipo]: false }));
    }
  }
  async function quitarExcepcionHoy(tipo) {
    try {
      const fecha = fechaDescuento[tipo];
      await quitarDescansosDia(fecha, tipo === 'Historico' ? 'historico' : 'actual');
      setDescansoHoy(prev => ({
        ...prev,
        [tipo]: {
          activo: tipo === 'Historico' ? cfg.descansosActivosHistorico : cfg.descansosActivosActual,
          tieneExcepcion: false,
          horaCorte: (tipo === 'Historico' ? cfg.descansosHistorico : cfg.descansosActual)[0]?.horaCorte || '12:00',
          minutos: (tipo === 'Historico' ? cfg.descansosHistorico : cfg.descansosActual)[0]?.minutos ?? 30
        }
      }));
    } catch (e) {
      setError(e.message);
    }
  }
  function actualizar(campo, valor) {
    setCfg(c => ({
      ...c,
      [campo]: valor
    }));
    setGuardado(false);
  }
  const [guardandoDescansos, setGuardandoDescansos] = useState({ Historico: false, Actual: false });
  const [descansosGuardados, setDescansosGuardados] = useState({ Historico: false, Actual: false });
  async function persistirDescansos(nuevoCfg, tipo) {
    setGuardandoDescansos(g => ({ ...g, [tipo]: true }));
    setError(null);
    try {
      await setConfig(nuevoCfg);
      setDescansosGuardados(d => ({ ...d, [tipo]: true }));
      setTimeout(() => setDescansosGuardados(d => ({ ...d, [tipo]: false })), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoDescansos(g => ({ ...g, [tipo]: false }));
    }
  }
  function actualizarActivarDescansos(tipo, valor) {
    setCfg(c => {
      const nuevo = {
        ...c,
        [`descansosActivos${tipo}`]: valor
      };
      persistirDescansos(nuevo, tipo);
      return nuevo;
    });
  }
  function actualizarDescanso(tipo, indice, campo, valor) {
    setCfg(c => {
      const clave = `descansos${tipo}`;
      const descansos = c[clave].map((d, i) => i === indice ? {
        ...d,
        [campo]: valor
      } : d);
      return {
        ...c,
        [clave]: descansos
      };
    });
  }
  function guardarDescansosAhora(tipo) {
    persistirDescansos(cfg, tipo);
  }
  function agregarDescanso(tipo) {
    setCfg(c => {
      const clave = `descansos${tipo}`;
      const nuevo = {
        ...c,
        [clave]: [...c[clave], {
          horaCorte: '12:00',
          minutos: 30
        }]
      };
      persistirDescansos(nuevo, tipo);
      return nuevo;
    });
  }
  function quitarDescanso(tipo, indice) {
    setCfg(c => {
      const clave = `descansos${tipo}`;
      const nuevo = {
        ...c,
        [clave]: c[clave].filter((_, i) => i !== indice)
      };
      persistirDescansos(nuevo, tipo);
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
            <div><label>La semana (Ranking) termina el</label>
              <select value={cfg.diaFinSemana} onChange={e => actualizar('diaFinSemana', Number(e.target.value))}>
                <option value={0}>Domingo</option>
                <option value={1}>Lunes</option>
                <option value={2}>Martes</option>
                <option value={3}>Miércoles</option>
                <option value={4}>Jueves</option>
                <option value={5}>Viernes</option>
                <option value={6}>Sábado</option>
              </select>
              <small style={{ display: 'block', marginTop: 4, color: 'var(--gray)', fontSize: 11 }}>
                Ej: si eliges "Sábado", cada semana del Ranking corre de domingo a sábado.
              </small>
            </div>
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
              <h2><i className="fa-solid fa-calendar-days" style={{
                color: 'var(--primary)',
                marginRight: 8
              }}></i>Descuentos de tiempo — Histórico</h2>
              <p>Aplica a los rendimientos que quedan guardados día a día en el Histórico. Si un bloque de horas cruza la hora de corte, se le resta el tiempo automáticamente.</p>
            </div>
            {(guardandoDescansos.Historico || descansosGuardados.Historico) && <span className="alert ok" style={{
            fontSize: 11
          }}>
                <i className={`fa-solid ${guardandoDescansos.Historico ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {guardandoDescansos.Historico ? 'Guardando...' : 'Guardado'}
              </span>}
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={cfg.descansosActivosHistorico} onChange={e => actualizarActivarDescansos('Historico', e.target.checked)} />
            <span className="switch-visual"></span>
            <span>Activar descuentos automáticos en el Histórico</span>
          </label>

          {cfg.descansosActivosHistorico && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
              {cfg.descansosHistorico.map((d, i) => <div key={i} className="descanso-row">
                  <div>
                    <label>Hora de corte</label>
                    <input type="time" value={d.horaCorte} onChange={e => actualizarDescanso('Historico', i, 'horaCorte', e.target.value)} onBlur={() => guardarDescansosAhora('Historico')} />
                  </div>
                  <div>
                    <label>Minutos a descontar</label>
                    <input type="number" min="0" value={d.minutos} onChange={e => actualizarDescanso('Historico', i, 'minutos', Number(e.target.value))} onBlur={() => guardarDescansosAhora('Historico')} />
                  </div>
                  <button className="btn-danger-outline" style={{
              marginTop: 18
            }} onClick={() => quitarDescanso('Historico', i)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>)}
              {cfg.descansosHistorico.length < 3 && <button className="btn-secondary" style={{
            alignSelf: 'flex-start'
          }} onClick={() => agregarDescanso('Historico')}>
                  <i className="fa-solid fa-plus"></i> Agregar descanso ({cfg.descansosHistorico.length}/3)
                </button>}
              <div>
                <button className="btn-primary" disabled={guardandoDescansos.Historico} onClick={() => guardarDescansosAhora('Historico')}>
                  <i className="fa-solid fa-floppy-disk"></i> {guardandoDescansos.Historico ? 'Guardando...' : 'Guardar descuentos del Histórico'}
                </button>
              </div>
              <p style={{
            fontSize: 11,
            color: 'var(--gray)'
          }}>
                Ejemplo: hora de corte 12:00 y 30 minutos → un bloque de 06:00 a 13:00 queda en 6.5 horas trabajadas. Un bloque que <strong>empieza justo a las 12:00</strong> también recibe el descuento. Se guarda solo al salir del campo, y los rendimientos del Histórico ya cargados <strong>se recalculan automáticamente</strong> — no hace falta volver a subir el Excel.
              </p>

              <div className="descuento-hoy-panel">
                <div className="descuento-hoy-header">
                  <span><i className="fa-solid fa-calendar-day"></i> Descuento de un día puntual</span>
                  {descansoHoy.Historico.tieneExcepcion && <span className="status warning" style={{ fontSize: 10 }}>Excepción activa ese día</span>}
                </div>
                <p style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 10 }}>
                  Elige cualquier fecha (hoy o un día anterior) para corregir su almuerzo <strong>sin tocar la configuración general</strong> ni afectar los demás días. Si ese día ya tiene rendimientos en el Histórico, se recalculan solos al guardar.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label>Fecha a corregir</label>
                  <input type="date" value={fechaDescuento.Historico} max={hoy} onChange={e => cambiarFechaDescuento('Historico', e.target.value)} style={{ maxWidth: 200 }} />
                  {cargandoDescuentoFecha.Historico && <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 10 }}>Cargando...</span>}
                </div>
                <label className="switch-row" style={{ marginBottom: 10 }}>
                  <input type="checkbox" checked={descansoHoy.Historico.activo} onChange={e => actualizarDescansoHoy('Historico', 'activo', e.target.checked)} />
                  <span className="switch-visual"></span>
                  <span>Descontar tiempo hoy {!descansoHoy.Historico.activo && <strong>(desactivado — hoy no se resta nada)</strong>}</span>
                </label>
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', opacity: descansoHoy.Historico.activo ? 1 : 0.45 }}>
                  <div>
                    <label>Hora de corte (hoy)</label>
                    <input type="time" disabled={!descansoHoy.Historico.activo} value={descansoHoy.Historico.horaCorte} onChange={e => actualizarDescansoHoy('Historico', 'horaCorte', e.target.value)} />
                  </div>
                  <div>
                    <label>Minutos a descontar (hoy)</label>
                    <input type="number" min="0" disabled={!descansoHoy.Historico.activo} value={descansoHoy.Historico.minutos} onChange={e => actualizarDescansoHoy('Historico', 'minutos', Number(e.target.value))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn-primary" disabled={guardandoDescansoHoy.Historico} onClick={() => guardarDescansoHoy('Historico')}>
                    <i className="fa-solid fa-floppy-disk"></i> {guardandoDescansoHoy.Historico ? 'Guardando...' : `Guardar descuento de ${fechaDescuento.Historico}`}
                  </button>
                  {descansoHoy.Historico.tieneExcepcion && (
                    <button className="btn-secondary" onClick={() => quitarExcepcionHoy('Historico')}>
                      <i className="fa-solid fa-rotate-left"></i> Quitar excepción de ese día
                    </button>
                  )}
                  {descansoHoyGuardado.Historico && <span className="alert ok" style={{ fontSize: 11 }}><i className="fa-solid fa-check"></i> Guardado para esa fecha</span>}
                </div>
              </div>
            </div>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-stopwatch" style={{
                color: 'var(--accent)',
                marginRight: 8
              }}></i>Descuentos de tiempo — Turno Actual</h2>
              <p>Aplica a los bloques del Turno Actual (hora a hora, en vivo). Puede tener una configuración distinta a la del Histórico si lo necesitas.</p>
            </div>
            {(guardandoDescansos.Actual || descansosGuardados.Actual) && <span className="alert ok" style={{
            fontSize: 11
          }}>
                <i className={`fa-solid ${guardandoDescansos.Actual ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {guardandoDescansos.Actual ? 'Guardando...' : 'Guardado'}
              </span>}
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={cfg.descansosActivosActual} onChange={e => actualizarActivarDescansos('Actual', e.target.checked)} />
            <span className="switch-visual"></span>
            <span>Activar descuentos automáticos en el Turno Actual</span>
          </label>

          {cfg.descansosActivosActual && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
              {cfg.descansosActual.map((d, i) => <div key={i} className="descanso-row">
                  <div>
                    <label>Hora de corte</label>
                    <input type="time" value={d.horaCorte} onChange={e => actualizarDescanso('Actual', i, 'horaCorte', e.target.value)} onBlur={() => guardarDescansosAhora('Actual')} />
                  </div>
                  <div>
                    <label>Minutos a descontar</label>
                    <input type="number" min="0" value={d.minutos} onChange={e => actualizarDescanso('Actual', i, 'minutos', Number(e.target.value))} onBlur={() => guardarDescansosAhora('Actual')} />
                  </div>
                  <button className="btn-danger-outline" style={{
              marginTop: 18
            }} onClick={() => quitarDescanso('Actual', i)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>)}
              {cfg.descansosActual.length < 3 && <button className="btn-secondary" style={{
            alignSelf: 'flex-start'
          }} onClick={() => agregarDescanso('Actual')}>
                  <i className="fa-solid fa-plus"></i> Agregar descanso ({cfg.descansosActual.length}/3)
                </button>}
              <div>
                <button className="btn-primary" disabled={guardandoDescansos.Actual} onClick={() => guardarDescansosAhora('Actual')}>
                  <i className="fa-solid fa-floppy-disk"></i> {guardandoDescansos.Actual ? 'Guardando...' : 'Guardar descuentos del Turno Actual'}
                </button>
              </div>
              <p style={{
            fontSize: 11,
            color: 'var(--gray)'
          }}>
                Se aplica en vivo a los bloques de hoy — cambia solo si tu Turno Actual necesita una regla distinta a la del Histórico.
              </p>

              <div className="descuento-hoy-panel">
                <div className="descuento-hoy-header">
                  <span><i className="fa-solid fa-calendar-day"></i> Descuento de un día puntual</span>
                  {descansoHoy.Actual.tieneExcepcion && <span className="status warning" style={{ fontSize: 10 }}>Excepción activa ese día</span>}
                </div>
                <p style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 10 }}>
                  El Turno Actual normalmente solo tiene datos de <strong>hoy</strong> (se reemplaza cada día), pero puedes elegir otra fecha si aún tienes datos guardados ahí.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label>Fecha a corregir</label>
                  <input type="date" value={fechaDescuento.Actual} max={hoy} onChange={e => cambiarFechaDescuento('Actual', e.target.value)} style={{ maxWidth: 200 }} />
                  {cargandoDescuentoFecha.Actual && <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 10 }}>Cargando...</span>}
                </div>
                <label className="switch-row" style={{ marginBottom: 10 }}>
                  <input type="checkbox" checked={descansoHoy.Actual.activo} onChange={e => actualizarDescansoHoy('Actual', 'activo', e.target.checked)} />
                  <span className="switch-visual"></span>
                  <span>Descontar tiempo hoy {!descansoHoy.Actual.activo && <strong>(desactivado — hoy no se resta nada)</strong>}</span>
                </label>
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', opacity: descansoHoy.Actual.activo ? 1 : 0.45 }}>
                  <div>
                    <label>Hora de corte (hoy)</label>
                    <input type="time" disabled={!descansoHoy.Actual.activo} value={descansoHoy.Actual.horaCorte} onChange={e => actualizarDescansoHoy('Actual', 'horaCorte', e.target.value)} />
                  </div>
                  <div>
                    <label>Minutos a descontar (hoy)</label>
                    <input type="number" min="0" disabled={!descansoHoy.Actual.activo} value={descansoHoy.Actual.minutos} onChange={e => actualizarDescansoHoy('Actual', 'minutos', Number(e.target.value))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn-primary" disabled={guardandoDescansoHoy.Actual} onClick={() => guardarDescansoHoy('Actual')}>
                    <i className="fa-solid fa-floppy-disk"></i> {guardandoDescansoHoy.Actual ? 'Guardando...' : `Guardar descuento de ${fechaDescuento.Actual}`}
                  </button>
                  {descansoHoy.Actual.tieneExcepcion && (
                    <button className="btn-secondary" onClick={() => quitarExcepcionHoy('Actual')}>
                      <i className="fa-solid fa-rotate-left"></i> Quitar excepción de ese día
                    </button>
                  )}
                  {descansoHoyGuardado.Actual && <span className="alert ok" style={{ fontSize: 11 }}><i className="fa-solid fa-check"></i> Guardado para esa fecha</span>}
                </div>
              </div>
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
