import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSesion } from '../../lib/useSesion';
import { iniciarTarea } from '../../lib/actualizacionApp';
import { avisar } from '../../lib/avisos';
import { estadoSemestral } from '../../lib/respaldoBD';
import { generarFrase, motivosQueFaltan, verificarRespaldo, TABLAS } from '../../lib/respaldoGlobal';
import { contarTablas } from '../../lib/respaldoGlobalDatos';
import { crearBackupBD, descargarBlob, fechaMasAntigua, contarAnteriores, depurarAnteriores, ultimoEventoDe } from '../../lib/respaldoBDDatos';

const fmt = n => Number(n).toLocaleString('es-CO');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fCorta = iso => iso.split('-').reverse().join('/');
const hoja = t => TABLAS.find(x => x.tabla === t)?.hoja || t;

/** Cada 6 meses: respaldar (Excel + base de datos) y eliminar la información de más de 6 meses atrás. */
export default function DepuracionSemestral() {
  const { sesion } = useSesion();
  const [estado, setEstado] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [frase, setFrase] = useState('');
  const [escrita, setEscrita] = useState('');
  const [generando, setGenerando] = useState(false);
  const [respaldo, setRespaldo] = useState(null);
  const [errorResp, setErrorResp] = useState('');
  const [anteriores, setAnteriores] = useState(null);
  const [depurando, setDepurando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorDep, setErrorDep] = useState('');

  const cargar = useCallback(async () => {
    const [antigua, ult] = await Promise.all([fechaMasAntigua(), ultimoEventoDe(['depuracion_semestral'])]);
    setEstado({ ...estadoSemestral({ hoy: hoyISO(), fechaMasAntigua: antigua, ultimaDepuracion: ult?.fecha || null }), ultima: ult?.fecha || null, antigua });
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const faltan = useMemo(() => motivosQueFaltan({ rol: sesion?.rol, respaldo, escrita, esperada: frase }), [sesion, respaldo, escrita, frase]);
  if (!estado || (!estado.disponible && !resultado)) return null;

  const abrir = () => { setFrase(generarFrase()); setEscrita(''); setRespaldo(null); setErrorResp(''); setAnteriores(null); setResultado(null); setErrorDep(''); setAbierto(true); };
  const cerrar = () => { if (generando || depurando) return; setAbierto(false); if (resultado) cargar(); };

  async function respaldar() {
    setGenerando(true); setErrorResp(''); const liberar = iniciarTarea();
    try {
      const { leerTodo } = await import('../../lib/respaldoGlobalDatos');
      const lectura = await leerTodo();
      const conteos = await contarTablas(), v = verificarRespaldo(conteos, lectura.filas);
      if (!v.coincide) { setErrorResp('El respaldo no trae todas las filas de la base (llegó información nueva mientras se leía). Intenta de nuevo.'); return; }
      const bd = await crearBackupBD({ origen: 'semestral', lectura });
      const { generarRespaldoGlobalExcel } = await import('../../lib/exportRespaldoGlobal');
      const xl = await generarRespaldoGlobalExcel({ datos: lectura.datos, filas: lectura.filas, uso: 0, limiteMB: 0, usuario: sesion?.nombre });
      descargarBlob(bd.blob, bd.nombre);
      setAnteriores(await contarAnteriores(estado.corte));
      setRespaldo({ verificado: true, excel: xl.nombre, bd: bd.nombre, filas: bd.total });
    } catch (e) { setErrorResp(e.message || 'No se pudo generar el respaldo.'); } finally { liberar(); setGenerando(false); }
  }
  async function depurar() {
    if (faltan.length) return;
    setDepurando(true); setErrorDep(''); const liberar = iniciarTarea();
    try { setResultado(await depurarAnteriores(estado.corte)); avisar('Depuración semestral terminada.'); }
    catch (e) { setErrorDep(/schema cache|does not exist|Could not find/i.test(e?.message || '') ? 'Falta ejecutar la sección 30 del SQL en Supabase.' : (e.message || 'No se pudo depurar.')); } finally { liberar(); setDepurando(false); }
  }
  const aEliminar = anteriores ? Object.entries(anteriores).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]) : [];
  const total = aEliminar.reduce((s, [, n]) => s + n, 0);

  return (
    <>
      {estado.disponible && (
        <section className={`vb-alerta rbd-semestral ${estado.toca ? '' : 'suave'}`}>
          <div className="vb-alerta-icono"><i className="fa-solid fa-broom"></i></div>
          <div className="vb-alerta-texto">
            <h3>{estado.toca ? 'Toca la depuración semestral' : 'Depuración semestral disponible'}</h3>
            <p>La base guarda información desde {fCorta(estado.antigua)} (unos {estado.mesesDeDatos} meses). Puedes <b>eliminar lo anterior al {fCorta(estado.corte)}</b> (más de 6 meses atrás), después de bajar <b>un Excel y una copia de la base de datos</b> con todo. {estado.ultima ? `Última depuración: ${new Date(estado.ultima).toLocaleDateString('es-CO')}.` : 'Todavía no se ha depurado nunca.'}</p>
          </div>
          <button className="vb-boton-peligro" onClick={abrir}><i className="fa-solid fa-broom"></i> Depurar información anterior al {fCorta(estado.corte)}</button>
        </section>
      )}
      {abierto && (
        <div className="vb-overlay" role="dialog" aria-modal="true" aria-label="Depuración semestral">
          <div className="vb-modal">
            <header><h2><i className="fa-solid fa-broom"></i> Depuración semestral</h2><button className="vb-cerrar" onClick={cerrar} disabled={generando || depurando} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button></header>
            {resultado ? (
              <div className="vb-listo"><i className="fa-solid fa-circle-check"></i><h3>Listo: se eliminó lo anterior al {fCorta(estado.corte)}</h3><p>Se eliminaron <b>{fmt(resultado.filas)}</b> filas. Tus dos respaldos ({respaldo?.excel} y {respaldo?.bd}) tienen toda la información: guárdalos en un lugar seguro. La copia .tmbackup se puede importar de nuevo desde esta misma pantalla.</p><button className="btn-primary" onClick={cerrar}>Cerrar</button></div>
            ) : (
              <>
                <section className="vb-paso">
                  <h3>1 · Dos respaldos con TODA la información</h3>
                  <p>Se descargan juntos: el <b>Excel</b> (para consultar, visual) y la <b>copia de la base de datos .tmbackup</b> (para volver a importarla). Después se comprueba que traen todas las filas.</p>
                  {!respaldo?.verificado && <button className="btn-primary" onClick={respaldar} disabled={generando}><i className={`fa-solid ${generando ? 'fa-spinner fa-spin' : 'fa-file-export'}`}></i> {generando ? 'Generando los respaldos…' : 'Generar y descargar los dos respaldos'}</button>}
                  {errorResp && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {errorResp}</div>}
                  {respaldo?.verificado && <div className="vb-ok"><i className="fa-solid fa-circle-check"></i><div><b>Respaldos verificados</b><p>{respaldo.excel} y {respaldo.bd} · {fmt(respaldo.filas)} filas. Traen todas las filas de la base.</p></div></div>}
                </section>
                <section className={`vb-paso ${respaldo?.verificado ? '' : 'bloqueado'}`}>
                  <h3>2 · Eliminar lo anterior al {fCorta(estado.corte)}</h3>
                  {anteriores && <div className="vb-resumen"><div className="vb-quitar"><h4><i className="fa-solid fa-trash"></i> Se eliminan {fmt(total)} filas</h4><ul>{aEliminar.map(([t, n]) => <li key={t}><span>{hoja(t)}</span><b>{fmt(n)}</b></li>)}{aEliminar.length === 0 && <li><span>No hay nada anterior a esa fecha</span></li>}</ul></div><div className="vb-queda"><h4><i className="fa-solid fa-shield-halved"></i> Se conserva</h4><ul><li><span>Todo desde el {fCorta(estado.corte)}</span></li><li><span>Personas, líneas, formadoras</span></li><li><span>Usuarios y configuración</span></li></ul></div></div>}
                  <p className="vb-aviso"><i className="fa-solid fa-circle-exclamation"></i> Esto <b>no se puede deshacer</b> (salvo importando la copia). Escribe esta frase (no se puede pegar):</p>
                  <code className="vb-frase" onCopy={e => e.preventDefault()}>{frase}</code>
                  <input className="vb-input" type="text" value={escrita} onChange={e => setEscrita(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} autoComplete="off" spellCheck={false} placeholder="Escribe la frase de arriba" disabled={!respaldo?.verificado} aria-label="Frase de confirmación" />
                  {errorDep && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {errorDep}</div>}
                  <button className="vb-boton-peligro grande" onClick={depurar} disabled={faltan.length > 0 || depurando}><i className={`fa-solid ${depurando ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i> {depurando ? 'Eliminando…' : `Eliminar lo anterior al ${fCorta(estado.corte)}`}</button>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
