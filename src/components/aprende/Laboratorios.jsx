import { useEffect, useMemo, useState } from 'react';
import { calcularPorcentajeMeta, clasificarEstado, META_HORA_DEFAULT } from '../../lib/calculos';
import { tipoDia, nombreFestivo } from '../../lib/festivosColombia';
import { proyectarEspacio, textoPlazo } from '../../lib/espacioProyeccion';
import { construirNotificaciones, visibles, paraAvisoFlotante } from '../../lib/notificaciones';
import { htmlImagenPorCausa } from '../../lib/devolucionesImagen';
import { logoBase64 } from '../../lib/logoBase64';
import VistaPreviaImagen from '../VistaPreviaImagen';

/** Los simuladores del manual interactivo: usan las MISMAS reglas que la app (estados, festivos, espacio, notificaciones, imágenes). */

const COLOR = { Excelente: '#0F7A3A', Cumple: '#22A455', 'A punto de cumplir': '#D97706', 'Por mejorar': '#A91D3A' };

function Estados({ onHecho }) {
  const [meta, setMeta] = useState(META_HORA_DEFAULT), [rend, setRend] = useState(430);
  const pct = calcularPorcentajeMeta(rend, meta), est = clasificarEstado(pct), pos = Math.max(0, Math.min(100, (pct / 160) * 100));
  return (
    <div className="lab lab-estados">
      <p className="lab-ayuda">Mueve el deslizador: ¿cuántos tallos por hora hace la persona?</p>
      <div className="lab-valor"><b>{rend}</b> tallos/h <span>· meta</span> <input type="number" min="100" max="900" value={meta} onChange={e => setMeta(Math.max(100, Number(e.target.value) || META_HORA_DEFAULT))} aria-label="Meta por hora" /></div>
      <input className="lab-rango" type="range" min="150" max="700" value={rend} onChange={e => { setRend(Number(e.target.value)); onHecho(); }} aria-label="Tallos por hora" />
      <div className="lab-escala" aria-hidden="true">
        <i style={{ width: '56.25%', background: COLOR['Por mejorar'] }}></i><i style={{ width: '6.25%', background: COLOR['A punto de cumplir'] }}></i><i style={{ width: '18.75%', background: COLOR.Cumple }}></i><i style={{ width: '18.75%', background: COLOR.Excelente }}></i>
        <span className="lab-marca" style={{ left: `${pos}%` }}></span>
      </div>
      <div className="lab-umbrales"><span>0</span><span style={{ left: '56.25%' }}>90 %</span><span style={{ left: '62.5%' }}>100 %</span><span style={{ left: '81.25%' }}>130 %</span></div>
      <div className="lab-estado" style={{ '--c': COLOR[est.label] }}><strong>{est.label}</strong><span>{pct.toFixed(1)} % de la meta</span><em>{est.mensaje}</em></div>
    </div>
  );
}

function Subir({ onHecho }) {
  const [donde, setDonde] = useState('actual'), [horas, setHoras] = useState(false), [subido, setSubido] = useState(false);
  return (
    <div className="lab lab-subir">
      <p className="lab-ayuda">Sube un reporte de ejemplo siguiendo los pasos de Rendimientos.</p>
      <div className="lab-fila"><small>1 · Guardar en</small>
        <div className="lab-toggle">{[['actual', 'Turno Actual'], ['historico', 'Histórico']].map(([k, t]) => <button key={k} className={donde === k ? 'on' : ''} onClick={() => { setDonde(k); setSubido(false); }}>{t}</button>)}</div></div>
      <label className="lab-fila lab-check"><small>2 · Horas (opcional)</small><span><input type="checkbox" checked={horas} onChange={e => { setHoras(e.target.checked); setSubido(false); }} /> Escribir hora de inicio y fin</span></label>
      <div className="lab-fila"><small>3 · Reporte</small><button className="lab-subir-btn" onClick={() => { setSubido(true); onHecho(); }}><i className="fa-solid fa-file-excel"></i> Elegir el Excel (simulado)</button></div>
      {subido && (
        <div className="lab-resultado">
          <div className="lab-filas">{[0, 1, 2, 3].map(i => <span key={i} style={{ '--d': `${i * 0.12}s` }}><i></i><i></i><i></i></span>)}</div>
          <p><i className="fa-solid fa-circle-check"></i> {donde === 'actual' ? 'Listo: se ve hora a hora en el Dashboard y en Turno Actual.' : 'Listo: el día queda cerrado y entra a Reportes y al Ranking.'}</p>
          {horas && <p className="lab-aviso"><i className="fa-solid fa-triangle-exclamation"></i> Ojo: las horas que escribiste reemplazan las del Excel.</p>}
          <p className="lab-nota">El archivo no se guarda: solo se guardan sus datos.</p>
        </div>
      )}
    </div>
  );
}

const MUESTRA = [
  { nombre: 'Maltrato', total: 38, personasConCausa: 12, personas: [{ codigo: 14, nombre: 'OSCAR C.', cantidad: 6 }, { codigo: 9, nombre: 'ALEJANDRA M.', cantidad: 5 }, { codigo: 22, nombre: 'SANDRA V.', cantidad: 4 }] },
  { nombre: 'Fitosanidad', total: 21, personasConCausa: 8, personas: [{ codigo: 12, nombre: 'DEISY M.', cantidad: 4 }, { codigo: 14, nombre: 'OSCAR C.', cantidad: 3 }, { codigo: 20, nombre: 'BLANCA M.', cantidad: 2 }] }
];
function Imagen({ onHecho }) {
  const [modo, setModo] = useState('codigo'), [logo, setLogo] = useState(null);
  useEffect(() => { logoBase64().then(setLogo); }, []);
  const html = useMemo(() => htmlImagenPorCausa({ periodoNombre: 'Mes', rango: '01/10 al 21/10', causas: MUESTRA, generado: '21/10/2026', logo, modo }), [modo, logo]);
  const TXT = { codigo: 'Solo código: ideal para mostrar en grupo.', nombre: 'Solo nombre: sirve para verificar quién es quién.', ambos: 'Código y nombre: lo más completo.' };
  return (
    <div className="lab lab-imagen">
      <p className="lab-ayuda">Elige «Imagen con» y mira cómo cambia la foto del Top 3 por causa (es la imagen real).</p>
      <div className="lab-toggle">{[['codigo', 'Solo código'], ['nombre', 'Solo nombre'], ['ambos', 'Código y nombre']].map(([k, t]) => <button key={k} className={modo === k ? 'on' : ''} onClick={() => { setModo(k); onHecho(); }}>{t}</button>)}</div>
      <p className="lab-nota">{TXT[modo]}</p>
      <VistaPreviaImagen html={html} ancho={1120} escalaMin={0.3} altoMax={300} />
    </div>
  );
}

function Presentismo({ onHecho }) {
  const hoy = new Date(), anio = hoy.getFullYear(), mes = hoy.getMonth();
  const dias = useMemo(() => Array.from({ length: new Date(anio, mes + 1, 0).getDate() }, (_, i) => { const iso = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; return { n: i + 1, iso, tipo: tipoDia(iso), fest: nombreFestivo(iso) }; }), [anio, mes]);
  const [vino, setVino] = useState(() => new Set(dias.filter(d => d.tipo === 'ordinario').map(d => d.iso)));
  const alternar = iso => { setVino(v => { const n = new Set(v); n.has(iso) ? n.delete(iso) : n.add(iso); return n; }); onHecho(); };
  const citados = dias.filter(d => d.tipo === 'ordinario' || vino.has(d.iso)), asistidos = citados.filter(d => vino.has(d.iso));
  const pct = citados.length ? Math.round((asistidos.length / citados.length) * 100) : 0;
  const primero = (new Date(anio, mes, 1).getDay() + 6) % 7;
  return (
    <div className="lab lab-pres">
      <p className="lab-ayuda">Toca los días para marcar si la persona vino. Prueba con un domingo y con un festivo.</p>
      <div className="lab-cal">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <b key={i}>{x}</b>)}
        {Array.from({ length: primero }, (_, i) => <span key={`v${i}`}></span>)}
        {dias.map(d => <button key={d.iso} className={`${d.tipo} ${vino.has(d.iso) ? 'vino' : ''}`} title={d.fest || (d.tipo === 'domingo' ? 'Domingo' : '')} onClick={() => alternar(d.iso)}>{d.n}</button>)}
      </div>
      <div className="lab-leyenda"><span className="vino">Vino</span><span className="ord">Faltó</span><span className="domingo">Domingo</span><span className="festivo">Festivo</span></div>
      <div className="lab-estado" style={{ '--c': pct >= 90 ? '#22A455' : pct >= 75 ? '#D97706' : '#A91D3A' }}><strong>{pct} % de presentismo</strong><span>{asistidos.length} de {citados.length} días que cuentan</span><em>Un día normal sin venir cuenta como falta; un domingo o festivo solo cuenta si vino.</em></div>
    </div>
  );
}

function Espacio({ onHecho }) {
  const [uso, setUso] = useState(210), [meses, setMeses] = useState(8), [dep, setDep] = useState(false);
  const efectivo = dep ? Math.round(uso * 0.62) : uso;
  const p = proyectarEspacio({ hoy: '2026-10-21', usoMB: efectivo, limiteMB: 500, mesesDeDatos: meses });
  const COLORES = { ok: '#22A455', atencion: '#D97706', urgente: '#D4473A', critico: '#A91D3A' };
  const MSG = { ok: 'Tranquilo: hay espacio de sobra.', atencion: 'Atención: conviene planear una copia y una depuración.', urgente: 'Urgente: haz una copia y depura pronto.', critico: 'Crítico: la base está casi llena.' };
  return (
    <div className="lab lab-espacio">
      <p className="lab-ayuda">Juega con los números como lo hace Auditoría: ¿cuándo se llena la base?</p>
      <label><small>Espacio usado: <b>{efectivo} MB</b> de 500</small><input className="lab-rango" type="range" min="20" max="480" value={uso} onChange={e => { setUso(Number(e.target.value)); onHecho(); }} /></label>
      <label><small>Meses de datos acumulados: <b>{meses}</b></small><input className="lab-rango" type="range" min="1" max="24" value={meses} onChange={e => { setMeses(Number(e.target.value)); onHecho(); }} /></label>
      <div className="lab-barra"><i style={{ width: `${Math.min(100, p.pct)}%`, background: COLORES[p.nivel] }}></i></div>
      <div className="lab-estado" style={{ '--c': COLORES[p.nivel] }}><strong>Se llenaría {textoPlazo(p)}</strong><span>{p.fechaLlenado ? `Hacia el ${p.fechaLlenado.split('-').reverse().join('/')} · ` : ''}{p.mbPorMes.toFixed(1)} MB por mes · {p.pct} % usado</span><em>{MSG[p.nivel]}</em></div>
      <button className={`lab-depurar ${dep ? 'on' : ''}`} onClick={() => { setDep(d => !d); onHecho(); }}><i className="fa-solid fa-broom"></i> {dep ? 'Deshacer la depuración' : 'Depurar lo de más de 6 meses (simulado)'}</button>
    </div>
  );
}

const DEV_FECHAS = ['2026-10-20', '2026-10-19', '2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14'];
const NOMBRES = ['ANA RUIZ', 'LUIS PEÑA', 'SOFÍA VEGA', 'JOSÉ MORA', 'ELENA ROA'];
function Campana({ onHecho }) {
  const [db, setDb] = useState(60), [dev, setDev] = useState(0), [bajos, setBajos] = useState(0);
  const AHORA = '2026-10-21T15:00:00Z';
  const items = useMemo(() => construirNotificaciones({ hoy: '2026-10-21', hora: 10, rol: 'administrador', puedeEditar: true, bajoRendimiento: Array.from({ length: bajos }, (_, i) => ({ colaborador_id: i + 1, colaborador: NOMBRES[i], diasSeguidos: 3 + i, promedioRend: 380, ultimaFecha: '2026-10-20' })), almacenamiento: { pct: db, usoMB: Math.round(db * 5), limiteMB: 500 }, devoluciones: { ultimaFecha: DEV_FECHAS[dev] }, historico: null, respaldo: null, clasificadores: null, fiesta: null, novedades: null }), [db, dev, bajos]);
  const lista = visibles(items, { leidas: [], ocultas: {}, filtro: 'todas' }, AHORA), flotante = paraAvisoFlotante(items, {}, AHORA, []);
  const GRUPOS = [['critica', 'Requieren atención'], ['importante', 'Importantes'], ['info', 'Informativas']];
  return (
    <div className="lab lab-campana">
      <div className="lab-controles">
        <p className="lab-ayuda">Cambia la situación y mira qué avisa la campana (y qué interrumpe).</p>
        <label><small>Base de datos usada: <b>{db} %</b></small><input className="lab-rango" type="range" min="0" max="100" value={db} onChange={e => { setDb(Number(e.target.value)); onHecho(); }} /></label>
        <label><small>Devoluciones sin cargar: <b>{dev} {dev === 1 ? 'día' : 'días'} de trabajo</b></small><input className="lab-rango" type="range" min="0" max="5" value={dev} onChange={e => { setDev(Number(e.target.value)); onHecho(); }} /></label>
        <label><small>Personas con rendimiento bajo: <b>{bajos}</b></small><input className="lab-rango" type="range" min="0" max="5" value={bajos} onChange={e => { setBajos(Number(e.target.value)); onHecho(); }} /></label>
        <div className={`lab-flotante ${flotante.length ? 'si' : ''}`}><i className={`fa-solid ${flotante.length ? 'fa-triangle-exclamation' : 'fa-moon'}`}></i> {flotante.length ? 'Sale un aviso flotante: es crítico.' : 'Ningún aviso flotante: nada es crítico.'}</div>
      </div>
      <div className="lab-panel">
        {lista.length === 0 ? <div className="nt-vacio"><i className="fa-regular fa-circle-check"></i><b>Todo al día</b><span>No hay nada que requiera tu atención.</span></div>
          : GRUPOS.map(([sev, nombre]) => { const it = lista.filter(x => x.severidad === sev); return it.length > 0 && (
            <section key={sev} className="nt-grupo"><h4 className={`nt-grupo-t nt-gt-${sev}`}>{nombre}<span>{it.length}</span></h4>
              {it.map(x => <article key={x.id} className={`nt-item nt-${x.severidad}`}><span className="nt-icono-sev"><i className={`fa-solid ${x.icono}`}></i></span><div className="nt-cuerpo"><div className="nt-titulo"><strong>{x.titulo}</strong></div><p>{x.descripcion}</p></div></article>)}
            </section>); })}
      </div>
    </div>
  );
}

function Toca({ leccion, onHecho }) {
  const [vistas, setVistas] = useState(() => new Set());
  const abrir = i => setVistas(v => { const n = new Set(v); n.add(i); if (n.size === leccion.cartas.length) onHecho(); return n; });
  return (
    <div className="lab lab-toca">
      <p className="lab-ayuda">Toca cada carta para descubrir qué es. <b>{vistas.size} de {leccion.cartas.length}</b></p>
      <div className="lab-cartas">{leccion.cartas.map((c, i) => (
        <button key={c.titulo} className={`lab-carta ${vistas.has(i) ? 'vista' : ''}`} onClick={() => abrir(i)} aria-pressed={vistas.has(i)}>
          <span className="lab-carta-ic"><i className={`fa-solid ${c.icono}`}></i></span><strong>{c.titulo}</strong>
          <em>{vistas.has(i) ? c.texto : 'Toca para descubrir'}</em>
        </button>))}</div>
    </div>
  );
}

export const LAB = { toca: Toca, estados: Estados, subir: Subir, imagen: Imagen, presentismo: Presentismo, espacio: Espacio, campana: Campana };
