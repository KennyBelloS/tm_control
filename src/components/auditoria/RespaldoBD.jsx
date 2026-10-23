import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSesion } from '../../lib/useSesion';
import { iniciarTarea } from '../../lib/actualizacionApp';
import { avisar } from '../../lib/avisos';
import { generarFrase, motivosQueFaltan, TABLAS } from '../../lib/respaldoGlobal';
import { formatoTamano } from '../../lib/respaldoBD';
import { crearBackupBD, descargarBlob, leerArchivoBackup, restaurarBackup, registrarEvento, ultimoEventoDe, listarBackupsAutomaticos, descargarBackupAutomatico, borrarBackupsAutomaticos } from '../../lib/respaldoBDDatos';

const fmt = n => Number(n).toLocaleString('es-CO');
const fFecha = f => (f ? new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const hoja = t => TABLAS.find(x => x.tabla === t)?.hoja || t;

/** Importar: valida la copia, deja elegir cómo restaurarla y la restaura por trozos. */
function ImportarCopia({ imp, onCerrar, onHecho }) {
  const { sesion } = useSesion();
  const [modo, setModo] = useState('combinar');
  const [frase] = useState(() => generarFrase());
  const [escrita, setEscrita] = useState('');
  const [copiaActual, setCopiaActual] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState({});
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const v = imp.validacion, o = imp.objeto;
  const faltan = modo === 'reemplazar' ? motivosQueFaltan({ rol: sesion?.rol, respaldo: { verificado: copiaActual }, escrita, esperada: frase }) : (sesion?.rol === 'administrador' ? [] : ['Solo un administrador puede restaurar.']);

  async function copiarActual() {
    setTrabajando(true); setError('');
    try { const r = await crearBackupBD({ origen: 'manual' }); descargarBlob(r.blob, r.nombre); setCopiaActual(true); avisar('Copia de la base actual descargada.'); } catch (e) { setError(e.message || 'No se pudo generar la copia actual.'); } finally { setTrabajando(false); }
  }
  async function restaurar() {
    if (faltan.length || !v.ok) return;
    setTrabajando(true); setError(''); setProgreso({});
    const liberar = iniciarTarea();
    try { setResultado(await restaurarBackup(o, { modo, alAvanzar: (t, n) => setProgreso(p => ({ ...p, [t]: n })) })); }
    catch (e) { setError(e.message || 'No se pudo restaurar.'); } finally { liberar(); setTrabajando(false); }
  }
  const cerrar = () => { if (trabajando) return; onCerrar(); if (resultado) onHecho(); };

  return (
    <div className="vb-overlay" role="dialog" aria-modal="true" aria-label="Importar copia de seguridad">
      <div className="vb-modal">
        <header><h2><i className="fa-solid fa-file-import"></i> Importar copia de seguridad</h2><button className="vb-cerrar" onClick={cerrar} disabled={trabajando} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button></header>
        {resultado ? (
          <div className="vb-listo"><i className="fa-solid fa-circle-check"></i><h3>Copia restaurada</h3>
            <p>Se agregaron <b>{fmt(Object.values(resultado).reduce((s, x) => s + x.restauradas, 0))}</b> filas que faltaban{modo === 'combinar' ? ' (no se pisó ni se borró nada de lo que ya existía)' : ' después de vaciar los datos operativos'}.</p>
            <button className="btn-primary" onClick={cerrar}>Cerrar</button></div>
        ) : (
          <>
            <section className="vb-paso">
              <h3>{imp.nombre}</h3>
              {v.ok ? <div className="vb-ok"><i className="fa-solid fa-shield-halved"></i><div><b>Copia íntegra</b><p>Creada el {fFecha(o.creado)} ({o.origen}) · {fmt(v.total)} filas · cada tabla coincide con su huella de verificación.</p></div></div>
                : <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> <div>{v.errores.map((e, i) => <div key={i}>{e}</div>)}<div>No se restaurará nada de este archivo.</div></div></div>}
              {v.avisos.length > 0 && v.ok && <details className="rbd-avisos"><summary>{v.avisos.length} aviso{v.avisos.length === 1 ? '' : 's'}</summary>{v.avisos.map((a, i) => <p key={i}>{a}</p>)}</details>}
              {v.ok && <ul className="rbd-tablas">{v.tablas.filter(t => t.filas > 0).map(t => <li key={t.tabla} className={t.restaurable ? '' : 'no'}><span>{hoja(t.tabla)}</span><b>{fmt(t.filas)}</b>{!t.restaurable && <small>no se restaura</small>}</li>)}</ul>}
            </section>
            {v.ok && (
              <section className="vb-paso">
                <h3>¿Cómo restaurar?</h3>
                <label className={`rbd-modo ${modo === 'combinar' ? 'sel' : ''}`}><input type="radio" checked={modo === 'combinar'} onChange={() => setModo('combinar')} /><div><b>Combinar (recomendado)</b><p>Agrega lo que falta. No pisa ni borra nada de lo que ya hay.</p></div></label>
                <label className={`rbd-modo ${modo === 'reemplazar' ? 'sel peligro' : ''}`}><input type="radio" checked={modo === 'reemplazar'} onChange={() => setModo('reemplazar')} /><div><b>Reemplazar los datos operativos</b><p>Primero <b>elimina</b> los datos operativos actuales (histórico, clasificación, devoluciones, asignaciones…) y los deja como estaban en la copia. Personas, líneas, formadoras, usuarios y configuración se combinan, nunca se borran.</p></div></label>
                {modo === 'reemplazar' && (
                  <div className="rbd-reemplazo">
                    <button className="btn-secondary" onClick={copiarActual} disabled={trabajando || copiaActual}><i className={`fa-solid ${copiaActual ? 'fa-circle-check' : 'fa-download'}`}></i> {copiaActual ? 'Copia de la base actual descargada' : 'Primero descarga una copia de la base actual'}</button>
                    <p className="vb-aviso"><i className="fa-solid fa-circle-exclamation"></i> No se puede deshacer. Escribe esta frase (no se puede pegar):</p>
                    <code className="vb-frase" onCopy={e => e.preventDefault()}>{frase}</code>
                    <input className="vb-input" type="text" value={escrita} onChange={e => setEscrita(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} autoComplete="off" spellCheck={false} placeholder="Escribe la frase de arriba" aria-label="Frase de confirmación" />
                  </div>
                )}
                {trabajando && Object.keys(progreso).length > 0 && <ul className="vb-progreso">{Object.entries(progreso).map(([t, n]) => <li key={t} className="listo"><i className="fa-solid fa-spinner fa-spin"></i><span>{t === 'vaciando' ? 'Vaciando datos operativos…' : hoja(t)}</span><b>{fmt(n)}</b></li>)}</ul>}
                {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
                <button className={modo === 'reemplazar' ? 'vb-boton-peligro grande' : 'btn-primary'} onClick={restaurar} disabled={faltan.length > 0 || trabajando}><i className={`fa-solid ${trabajando ? 'fa-spinner fa-spin' : 'fa-rotate-left'}`}></i> {trabajando ? 'Restaurando…' : modo === 'reemplazar' ? 'Reemplazar y restaurar' : 'Restaurar (combinar)'}</button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Auditoría → copia de seguridad de la base de datos: exportar, importar y copias automáticas mensuales. */
export default function RespaldoBD() {
  const [auto, setAuto] = useState({ ok: true, copias: [], cargando: true });
  const [ultimo, setUltimo] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [imp, setImp] = useState(null);
  const [trabajandoAuto, setTrabajandoAuto] = useState('');
  const entrada = useRef(null);
  const cargar = useCallback(async () => {
    const [a, u] = await Promise.all([listarBackupsAutomaticos(), ultimoEventoDe(['backup_manual', 'backup_mensual'])]);
    setAuto({ ...a, cargando: false }); setUltimo(u);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const ultimaAuto = useMemo(() => auto.copias[0] || null, [auto]);

  async function exportar() {
    setExportando(true);
    const liberar = iniciarTarea();
    try {
      const r = await crearBackupBD({ origen: 'manual' });
      descargarBlob(r.blob, r.nombre);
      await registrarEvento('backup_manual', { filas: r.total, bytes: r.bytes }).catch(() => {});
      avisar(`Copia descargada: ${fmt(r.total)} filas · ${formatoTamano(r.bytes)}.`); cargar();
    } catch (e) { avisar(e.message || 'No se pudo generar la copia.', 'error'); } finally { liberar(); setExportando(false); }
  }
  async function elegirArchivo(ev) {
    const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return;
    const r = await leerArchivoBackup(f); setImp({ nombre: f.name, ...r });
  }
  async function restaurarAuto(nombre) {
    setTrabajandoAuto(nombre);
    try { const blob = await descargarBackupAutomatico(nombre); const r = await leerArchivoBackup(blob); setImp({ nombre, ...r }); } catch (e) { avisar(e.message || 'No se pudo leer la copia.', 'error'); } finally { setTrabajandoAuto(''); }
  }
  async function bajarAuto(nombre) {
    setTrabajandoAuto(nombre);
    try { descargarBlob(await descargarBackupAutomatico(nombre), `torremolinos_BD_auto_${nombre}`); } catch (e) { avisar(e.message || 'No se pudo descargar.', 'error'); } finally { setTrabajandoAuto(''); }
  }
  async function borrarAuto(nombre) {
    if (!window.confirm(`¿Eliminar la copia automática ${nombre}?`)) return;
    try { await borrarBackupsAutomaticos([nombre]); await cargar(); avisar('Copia eliminada.'); } catch (e) { avisar(e.message || 'No se pudo eliminar.', 'error'); }
  }

  return (
    <section className="panel rbd" aria-label="Copia de seguridad de la base de datos">
      <div className="panel-header"><div>
        <h2><i className="fa-solid fa-database" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Copia de seguridad de la base de datos</h2>
        <p>Una copia completa de la base en un archivo <b>.tmbackup</b> que se puede <b>importar de nuevo aquí</b> (a diferencia del Excel, que es solo para leer). Cada tabla lleva una huella de verificación: si el archivo se daña o se modifica, no se restaura.</p>
      </div></div>
      <div className="rbd-acciones">
        <button className="btn-primary" onClick={exportar} disabled={exportando}><i className={`fa-solid ${exportando ? 'fa-spinner fa-spin' : 'fa-download'}`}></i> {exportando ? 'Generando la copia…' : 'Exportar copia ahora'}</button>
        <button className="btn-secondary" onClick={() => entrada.current?.click()}><i className="fa-solid fa-file-import"></i> Importar copia…</button>
        <input ref={entrada} type="file" accept=".tmbackup,application/gzip,application/json" hidden onChange={elegirArchivo} aria-label="Elegir archivo de copia" />
        {ultimo && <small className="rbd-ultimo"><i className="fa-solid fa-clock-rotate-left"></i> Última copia ({ultimo.accion === 'backup_mensual' ? 'automática' : 'manual'}): {fFecha(ultimo.fecha)}{ultimo.usuario_nombre ? ` · ${ultimo.usuario_nombre}` : ''}</small>}
      </div>

      <div className="rbd-auto">
        <h3><i className="fa-solid fa-calendar-check"></i> Copia automática mensual</h3>
        <p>Cada mes, <b>la primera vez que un administrador abre la app</b>, se genera sola una copia y se guarda en un almacenamiento privado (no ocupa espacio de la base de datos). Se conservan las últimas 12.</p>
        {auto.cargando ? <p className="rbd-nada">Revisando…</p>
          : !auto.ok ? <div className="alert-inline"><i className="fa-solid fa-triangle-exclamation"></i> No se pudo leer el almacenamiento de copias: {auto.mensaje}. Ejecuta la <b>sección 30</b> del archivo <code>migracion_autenticacion.sql</code> en Supabase.</div>
          : auto.copias.length === 0 ? <p className="rbd-nada">Todavía no hay copias automáticas. Se creará la primera apenas un administrador abra la app este mes.</p>
          : (
            <ul className="rbd-lista">
              {auto.copias.map(c => (
                <li key={c.nombre}><span><b>{c.nombre.replace('.tmbackup', '')}</b>{ultimaAuto?.nombre === c.nombre && <em>más reciente</em>}</span><small>{c.bytes ? formatoTamano(c.bytes) : ''}</small>
                  <span className="rbd-botones">
                    <button className="btn-secondary" onClick={() => bajarAuto(c.nombre)} disabled={trabajandoAuto === c.nombre} title="Descargar"><i className="fa-solid fa-download"></i></button>
                    <button className="btn-secondary" onClick={() => restaurarAuto(c.nombre)} disabled={trabajandoAuto === c.nombre} title="Restaurar esta copia"><i className={`fa-solid ${trabajandoAuto === c.nombre ? 'fa-spinner fa-spin' : 'fa-rotate-left'}`}></i></button>
                    <button className="btn-secondary" onClick={() => borrarAuto(c.nombre)} title="Eliminar"><i className="fa-solid fa-trash"></i></button>
                  </span></li>
              ))}
            </ul>
          )}
      </div>
      {imp && <ImportarCopia imp={imp} onCerrar={() => setImp(null)} onHecho={cargar} />}
    </section>
  );
}
