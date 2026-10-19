import { useRef, useState } from 'react';
import { validarArchivoExcel } from '../../lib/seguridad';
import { parsearDevoluciones, prepararCarga } from '../../lib/devolucionesExcel';
import { importarDevoluciones } from '../../lib/devoluciones';
import { fechaLocalISO } from '../../lib/clasificacionCalculos';
import { fmt, fFecha } from './util';

/** Lee el Excel en un hilo aparte (tarda unos segundos); si el navegador no puede, lo hace aquí mismo. */
function leerEnSegundoPlano(buffer, hoy) {
  return new Promise((resolve, reject) => {
    const enEstaPagina = () => { try { resolve(parsearDevoluciones(buffer, hoy)); } catch (e) { reject(e); } };
    let w;
    try { w = new Worker(new URL('../../lib/devolucionesWorker.js', import.meta.url), { type: 'module' }); } catch { setTimeout(enEstaPagina, 30); return; }
    w.onmessage = e => { w.terminate(); if (e.data.ok) resolve(e.data.resultado); else reject(new Error(e.data.error)); };
    w.onerror = () => { w.terminate(); setTimeout(enEstaPagina, 30); };
    w.postMessage({ buffer, hoy });
  });
}

/**
 * Subir el Excel de devoluciones: lee, muestra QUÉ se va a cargar (la primera vez todo; después solo lo nuevo),
 * avisa los problemas del archivo y recién entonces guarda.
 */
export default function CargaDevoluciones({ meta, hayDatos, puedeCargar, onGuardado }) {
  const entrada = useRef(null);
  const [fase, setFase] = useState('inactiva');            // inactiva | leyendo | vista | guardando
  const [parseado, setParseado] = useState(null);
  const [carga, setCarga] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  async function elegir(file) {
    setError(''); setOk('');
    try {
      await validarArchivoExcel(file, { maxMB: 40 });
      setFase('leyendo');
      const p = await leerEnSegundoPlano(await file.arrayBuffer(), fechaLocalISO());
      setParseado(p); setCarga(prepararCarga(p, meta)); setFase('vista');
    } catch (e) { setError(e.message || 'No se pudo leer el archivo.'); setFase('inactiva'); }
    if (entrada.current) entrada.current.value = '';
  }
  async function guardar(reemplazar = false) {
    setFase('guardando'); setError('');
    try {
      const c = reemplazar ? prepararCarga(parseado, meta, { reemplazar: true }) : carga;
      await importarDevoluciones(c);
      setOk(reemplazar ? `Se recargó todo desde cero: ${fmt(c.dias.length)} registros.` : `Listo: ${fmt(c.dias.length)} registros guardados${c.resumen.hasta ? `, datos hasta el ${fFecha(c.resumen.hasta)}` : ''}.`);
      setParseado(null); setCarga(null); setFase('inactiva');
      await onGuardado?.();
    } catch (e) { setError(e.message || 'No se pudo guardar.'); setFase('vista'); }
  }
  const cancelar = () => { setParseado(null); setCarga(null); setFase('inactiva'); setError(''); };
  const r = carga?.resumen;

  return (
    <div className="dev-carga">
      {puedeCargar && <input ref={entrada} type="file" accept=".xlsx,.xls" hidden onChange={e => e.target.files?.[0] && elegir(e.target.files[0])} />}
      {ok && <div className="alert ok dev-aviso"><i className="fa-solid fa-circle-check"></i> {ok}</div>}
      {error && <div className="alert err dev-aviso"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

      {fase === 'inactiva' && puedeCargar && !hayDatos && (
        <div className={`dev-zona ${arrastrando ? 'arrastrando' : ''}`} onClick={() => entrada.current?.click()}
          onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
          onDrop={e => { e.preventDefault(); setArrastrando(false); e.dataTransfer.files?.[0] && elegir(e.dataTransfer.files[0]); }}>
          <i className="fa-solid fa-cloud-arrow-up"></i>
          <strong>Sube el Excel de devoluciones</strong>
          <span>La primera vez se toma todo el historial. Después, solo lo nuevo.</span>
        </div>
      )}
      {fase === 'inactiva' && puedeCargar && hayDatos && (
        <button className="btn-secondary dev-subir" onClick={() => entrada.current?.click()}><i className="fa-solid fa-cloud-arrow-up"></i> Subir actualización</button>
      )}

      {fase === 'leyendo' && <div className="dev-leyendo" role="status"><span className="dev-spinner"></span><div><strong>Leyendo el Excel…</strong><small>Es un archivo grande: puede tardar unos segundos. Puedes seguir mirando los datos.</small></div></div>}

      {(fase === 'vista' || fase === 'guardando') && r && (
        <div className="dev-vista">
          <header>
            <h3><i className="fa-solid fa-clipboard-check"></i> {r.primeraVez ? 'Primera carga: se tomará todo el Excel' : 'Esto es lo que se va a cargar'}</h3>
            <button className="dev-x" onClick={cancelar} disabled={fase === 'guardando'} aria-label="Cancelar"><i className="fa-solid fa-xmark"></i></button>
          </header>
          <div className="dev-cifras">
            <div><strong>{fmt(r.personaDiasNuevos)}</strong><span>registros {r.primeraVez ? '' : 'nuevos'}<br />de persona y día</span></div>
            <div><strong>{fmt(r.devolucionesNuevas)}</strong><span>devoluciones</span></div>
            <div><strong>{fmt(r.diasAsistenciaNuevos)}</strong><span>días de asistencia</span></div>
            <div><strong>{r.desde && r.hasta ? `${fFecha(r.desde).slice(0, 5)} → ${fFecha(r.hasta).slice(0, 5)}` : '—'}</strong><span>fechas que entran</span></div>
          </div>
          {!r.primeraVez && !r.reemplazar && (
            <p className="dev-nota"><i className="fa-solid fa-forward"></i> Ya estaban guardados y se omiten: <b>{fmt(r.personaDiasOmitidos)}</b> registros y <b>{fmt(r.diasAsistenciaOmitidos)}</b> días de asistencia. Solo se vuelve a leer desde el <b>{fFecha(carga.desdeReg)}</b> (el último día guardado, por si estaba incompleto).</p>
          )}
          {parseado.invalidas.length > 0 && (
            <div className="alert warn dev-aviso"><i className="fa-solid fa-triangle-exclamation"></i>
              <div><b>{parseado.invalidas.length} fila(s) no se importan</b> porque tienen un error. Corrígelas en el Excel:
                <ul>{parseado.invalidas.slice(0, 5).map((x, i) => <li key={i}>Hoja {x.hoja}, fila {x.fila}: {x.motivo} ({x.fecha}){x.nombre ? ` — ${x.nombre}` : ''}</li>)}</ul>
                {parseado.invalidas.length > 5 && <small>y {parseado.invalidas.length - 5} más.</small>}
              </div>
            </div>
          )}
          {parseado.resumen.asistenciaSinCoincidencia > 0 && (
            <p className="dev-nota"><i className="fa-solid fa-circle-info"></i> {fmt(parseado.resumen.asistenciaSinCoincidencia)} asistencias tienen un nombre que tu Excel no pudo asociar con la hoja Asignaciones (por ejemplo, nombres con símbolos como {'{ }'}). <b>Aquí sí se cuentan</b>, porque la persona sí trabajó; en el Excel original no. Por eso los días trabajados pueden salir 1 o 2 más.</p>
          )}
          <div className="dev-acciones">
            <button className="btn-primary" onClick={() => guardar(false)} disabled={fase === 'guardando' || (r.personaDiasNuevos === 0 && r.diasAsistenciaNuevos === 0)}>
              <i className="fa-solid fa-floppy-disk"></i> {fase === 'guardando' ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="btn-secondary" onClick={cancelar} disabled={fase === 'guardando'}>Cancelar</button>
            {!r.primeraVez && (
              <button className="dev-recargar" disabled={fase === 'guardando'} onClick={() => { if (confirm('Esto BORRA lo guardado y lo vuelve a cargar todo desde este Excel. Úsalo solo si corregiste datos de días anteriores. ¿Continuar?')) guardar(true); }}>
                Recargar todo desde cero
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
