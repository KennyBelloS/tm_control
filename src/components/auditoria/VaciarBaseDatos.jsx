import { useEffect, useMemo, useState } from 'react';
import { useSesion } from '../../lib/useSesion';
import { iniciarTarea } from '../../lib/actualizacionApp';
import { TABLAS, nivelAlmacenamiento, generarFrase, verificarRespaldo, resumenVaciado, motivosQueFaltan, formatoMB } from '../../lib/respaldoGlobal';
import { contarTablas, leerTodo, vaciarDatosOperativos, ultimosEventosRespaldo } from '../../lib/respaldoGlobalDatos';

const fmt = n => Number(n).toLocaleString('es-CO');

/**
 * Cuando la base de datos llega al 90 %: advertencia + "Backup global y eliminar todo".
 * Paso 1: respaldo en Excel (con TODA la información) y verificación de que trae todas las filas.
 * Paso 2: ver qué se elimina, TRANSCRIBIR la frase de seguridad y confirmar.
 */
export default function VaciarBaseDatos({ porcentaje, usoMB, limiteMB, onVaciada }) {
  const { sesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [frase, setFrase] = useState('');
  const [progreso, setProgreso] = useState({});
  const [generando, setGenerando] = useState(false);
  const [respaldo, setRespaldo] = useState(null);       // { verificado, nombre, filas, conteos }
  const [errorResp, setErrorResp] = useState('');
  const [escrita, setEscrita] = useState('');
  const [vaciando, setVaciando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorVaciar, setErrorVaciar] = useState('');
  const [eventos, setEventos] = useState([]);
  useEffect(() => { ultimosEventosRespaldo(3).then(setEventos); }, [resultado]);
  const nivel = nivelAlmacenamiento(porcentaje);
  const resumen = useMemo(() => (respaldo ? resumenVaciado(respaldo.conteos) : null), [respaldo]);
  const faltan = motivosQueFaltan({ rol: sesion?.rol, respaldo, escrita, esperada: frase });

  if (nivel !== 'critico' && !resultado) return null;
  const abrir = () => { setFrase(generarFrase()); setProgreso({}); setRespaldo(null); setErrorResp(''); setEscrita(''); setResultado(null); setErrorVaciar(''); setAbierto(true); };
  const cerrar = () => { if (generando || vaciando) return; setAbierto(false); if (resultado) onVaciada?.(); };

  async function generar() {
    setGenerando(true); setErrorResp(''); setRespaldo(null); setProgreso({});
    const liberar = iniciarTarea();
    try {
      const lectura = await leerTodo((tabla, estado, n) => setProgreso(p => ({ ...p, [tabla]: { estado, n } })));
      const conteos = await contarTablas();                               // se cuenta DESPUÉS de leer: si llegó algo nuevo en el camino, no coincidirá
      const v = verificarRespaldo(conteos, lectura.filas);
      if (!v.coincide) { setErrorResp(`El respaldo no trae todas las filas (${v.faltantes.map(f => `${f.tabla}: base ${fmt(f.bd)}, respaldo ${fmt(f.respaldo)}`).join('; ')}). Intenta de nuevo.`); return; }
      const { generarRespaldoGlobalExcel } = await import('../../lib/exportRespaldoGlobal');
      const r = await generarRespaldoGlobalExcel({ datos: lectura.datos, filas: lectura.filas, uso: usoMB, limiteMB, usuario: sesion?.nombre });
      setRespaldo({ verificado: true, nombre: r.nombre, bytes: r.bytes, filas: Object.values(lectura.filas).reduce((s, n) => s + n, 0), conteos });
    } catch (e) { setErrorResp(e.message || 'No se pudo generar el respaldo.'); }
    finally { liberar(); setGenerando(false); }
  }
  async function eliminar() {
    if (faltan.length) return;
    setVaciando(true); setErrorVaciar('');
    const liberar = iniciarTarea();
    try { setResultado(await vaciarDatosOperativos()); }
    catch (e) { setErrorVaciar(/vaciar_datos_operativos/.test(e?.message || '') && /schema cache|does not exist|Could not find/i.test(e?.message || '') ? 'Falta ejecutar la sección 28 del SQL en Supabase (migracion_autenticacion.sql).' : (e.message || 'No se pudo eliminar.')); }
    finally { liberar(); setVaciando(false); }
  }

  return (
    <>
      {nivel === 'critico' && (
        <section className="vb-alerta" role="alert">
          <div className="vb-alerta-icono"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div className="vb-alerta-texto">
            <h3>La base de datos está al {String(porcentaje).replace('.', ',')} % de su capacidad</h3>
            <p>Se está por llenar ({formatoMB(usoMB)} de {formatoMB(limiteMB)}). Puedes hacer un <b>respaldo global en Excel</b> con toda la información y después <b>liberar el espacio</b> eliminando los datos acumulados. Se conservan los usuarios, la configuración, las personas, las líneas y las formadoras.</p>
          </div>
          <button className="vb-boton-peligro" onClick={abrir}><i className="fa-solid fa-box-archive"></i> Hacer backup global y eliminar todo lo de la base de datos</button>
        </section>
      )}
      {eventos.length > 0 && <p className="vb-historial"><i className="fa-solid fa-clock-rotate-left"></i> Último vaciado: {new Date(eventos[0].fecha).toLocaleString('es-CO')} por {eventos[0].usuario_nombre || '—'} ({fmt(eventos[0].detalle?.filas ?? 0)} filas)</p>}

      {abierto && (
        <div className="vb-overlay" role="dialog" aria-modal="true" aria-label="Respaldo global y vaciado de la base de datos">
          <div className="vb-modal">
            <header><h2><i className="fa-solid fa-database"></i> Respaldo global y vaciado</h2><button className="vb-cerrar" onClick={cerrar} disabled={generando || vaciando} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button></header>

            {resultado ? (
              <div className="vb-listo">
                <i className="fa-solid fa-circle-check"></i>
                <h3>Listo: se liberó el espacio</h3>
                <p>Se eliminaron <b>{fmt(resultado.filas)}</b> filas de {fmt(Object.keys(resultado.tablas || {}).length)} tablas. Tu respaldo quedó en <b>{respaldo?.nombre}</b>: guárdalo en un lugar seguro.</p>
                <button className="btn-primary" onClick={cerrar}>Cerrar</button>
              </div>
            ) : (
              <>
                <ol className="vb-pasos">
                  <li className={respaldo?.verificado ? 'hecho' : 'activo'}><span>1</span> Respaldo</li>
                  <li className={respaldo?.verificado ? 'activo' : ''}><span>2</span> Confirmar</li>
                </ol>

                <section className="vb-paso">
                  <h3>1 · Respaldo global en Excel</h3>
                  <p>Descarga <b>toda</b> la información de la base (producción, calidad, organización y sistema) en un Excel visual: portada con índice, resumen con gráficos y una hoja por tabla. Después se comprueba que trae <b>todas las filas</b> de cada tabla.</p>
                  {!respaldo?.verificado && <button className="btn-primary" onClick={generar} disabled={generando}><i className={`fa-solid ${generando ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i> {generando ? 'Generando el respaldo…' : 'Generar y descargar respaldo'}</button>}
                  {(generando || Object.keys(progreso).length > 0) && !respaldo && (
                    <ul className="vb-progreso">{TABLAS.map(t => { const p = progreso[t.tabla]; return <li key={t.tabla} className={p?.estado || ''}><i className={`fa-solid ${p?.estado === 'listo' ? 'fa-circle-check' : p?.estado === 'leyendo' ? 'fa-spinner fa-spin' : 'fa-circle'}`}></i><span>{t.hoja}</span><b>{p ? fmt(p.n) : ''}</b></li>; })}</ul>
                  )}
                  {errorResp && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {errorResp}</div>}
                  {respaldo?.verificado && <div className="vb-ok"><i className="fa-solid fa-circle-check"></i><div><b>Respaldo verificado</b><p>{respaldo.nombre} · {fmt(respaldo.filas)} filas · {(respaldo.bytes / 1048576).toFixed(1).replace('.', ',')} MB. Trae todas las filas de la base.</p></div></div>}
                </section>

                <section className={`vb-paso ${respaldo?.verificado ? '' : 'bloqueado'}`}>
                  <h3>2 · Confirmar la eliminación</h3>
                  {resumen && (
                    <div className="vb-resumen">
                      <div className="vb-quitar"><h4><i className="fa-solid fa-trash"></i> Se eliminan {fmt(resumen.filasAQuitar)} filas</h4><ul>{resumen.quitar.filter(t => t.filas > 0).map(t => <li key={t.tabla}><span>{t.hoja}</span><b>{fmt(t.filas)}</b></li>)}{resumen.filasAQuitar === 0 && <li><span>No hay nada que eliminar</span></li>}</ul></div>
                      <div className="vb-queda"><h4><i className="fa-solid fa-shield-halved"></i> Se conservan</h4><ul>{resumen.quedan.map(t => <li key={t.tabla}><span>{t.hoja}</span><b>{fmt(t.filas)}</b></li>)}</ul></div>
                    </div>
                  )}
                  <p className="vb-aviso"><i className="fa-solid fa-circle-exclamation"></i> Esto <b>no se puede deshacer</b>. Para confirmar, escribe esta frase (no se puede pegar):</p>
                  <code className="vb-frase" onCopy={e => e.preventDefault()}>{frase}</code>
                  <input className="vb-input" type="text" value={escrita} onChange={e => setEscrita(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} placeholder="Escribe la frase de arriba" disabled={!respaldo?.verificado} aria-label="Frase de confirmación" />
                  {faltan.length > 0 && respaldo?.verificado && escrita && <small className="vb-falta">{faltan[0]}</small>}
                  {errorVaciar && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {errorVaciar}</div>}
                  <button className="vb-boton-peligro grande" onClick={eliminar} disabled={faltan.length > 0 || vaciando}><i className={`fa-solid ${vaciando ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i> {vaciando ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
