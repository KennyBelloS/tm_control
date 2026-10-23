import { useEffect, useState } from 'react';
import logoUrl from '../../assets/logo-icon.png';

/** Los dibujos animados del recorrido. Sin animación (o con "reducir movimiento") cada uno queda en su estado FINAL, ya completo. */
const reducir = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const d = (i, base = 0.15, paso = 0.18) => ({ '--d': `${(base + i * paso).toFixed(2)}s` });
const rango = n => Array.from({ length: n }, (_, i) => i);

function Conteo({ a, ms = 1800, dec = 0 }) {
  const [v, setV] = useState(reducir() ? a : 0);
  useEffect(() => {
    if (reducir()) { setV(a); return undefined; }
    let r, t0; const paso = t => { t0 ??= t; const k = Math.min(1, (t - t0) / ms); setV(a * (1 - Math.pow(1 - k, 3))); if (k < 1) r = requestAnimationFrame(paso); };
    r = requestAnimationFrame(paso); return () => cancelAnimationFrame(r);
  }, [a, ms]);
  return <>{v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })}</>;
}


/** Ventana de la app: barra superior con el logo y el nombre de la pantalla, y el contenido de esa pantalla. */
function Marco({ titulo, clase, children }) {
  return (
    <div className="rv">
      <div className="rv-app">
        <div className="rv-app-cab"><img src={logoUrl} alt="" /><b>{titulo}</b><span className="rv-app-pt"><i></i><i></i><i></i></span></div>
        <div className={`rv-app-cuerpo ${clase || ''}`}>{children}</div>
      </div>
    </div>
  );
}

const Bienvenida = () => (
  <Marco titulo="Torremolinos Control" clase="rv-bienv">
    <img className="rv-logo" src={logoUrl} alt="" />
    <div className="rv-menu">{[['fa-house', 'Dashboard'], ['fa-leaf', 'Rendimientos'], ['fa-chart-column', 'Reportes'], ['fa-ranking-star', 'Ranking'], ['fa-rotate-left', 'Devoluciones'], ['fa-id-badge', 'TIC']].map(([ic, t], i) => <span key={t} className="rv-item" style={d(i, .5, .16)}><i className={`fa-solid ${ic}`}></i>{t}</span>)}</div>
    <div className="rv-teclas" style={d(0, 1.8)}><kbd>Ctrl</kbd><kbd>K</kbd></div>
  </Marco>
);
const Dashboard = () => (
  <Marco titulo="Dashboard Ejecutivo" clase="rv-dash">
    <div className="rv-kpi"><small>Tallos de hoy</small><b><Conteo a={48081} /></b></div>
    <div className="rv-barra"><i style={{ '--w': '52%' }}></i><span className="rv-flor">🌹</span></div>
    <small className="rv-pct">52 % de la meta · faltan 44.904 tallos</small>
    <div className="rv-mini3">{[['Mesas activas', '24'], ['Rendimiento', '501 t/h'], ['Personas', '22']].map(([n, v], i) => <div key={n} style={d(i, 1, .15)}><small>{n}</small><b>{v}</b></div>)}</div>
    <svg className="rv-linea" viewBox="0 0 200 56" aria-hidden="true"><polyline pathLength="1" points="0,48 25,40 50,44 75,28 100,32 125,16 150,20 175,9 200,5" /></svg>
  </Marco>
);
const Rendimientos = () => (
  <Marco titulo="Rendimientos" clase="rv-rend">
    <div className="rv-guardar"><small>Guardar en</small><span className="on">Turno Actual</span><span>Histórico</span></div>
    <div className="rv-zona"><span className="rv-archivo">.xlsx</span><span className="rv-check"><i className="fa-solid fa-check"></i></span><small>Reporte Consolidado Boncheo</small></div>
    <div className="rv-filas">{rango(5).map(i => <span key={i} style={d(i, 1.5, .14)}><i></i><i></i><i></i></span>)}</div>
  </Marco>
);
const Personas = () => (
  <Marco titulo="Personas" clase="rv-pers">
    <div className="rv-form"><span><small>Emp.Cod</small>1042</span><span><small>Mesa</small>14</span><span className="ancha"><small>Nombre completo</small>OSCAR IVÁN CASTRO</span><em>Guardar</em></div>{[['14', 'OSCAR C.'], ['12', 'DEISY M.'], ['22', 'SANDRA V.'], ['9', 'ALEJANDRA M.']].map(([c, n], i) => <div key={c} className="rv-persona" style={d(i)}><b>{c}</b><span>{n}</span><em>Mesa {c}</em></div>)}</Marco>
);
const Reportes = () => (
  <Marco titulo="Reportes" clase="rv-rep">
    <div className="rv-estados">{[['Excelente', 3, 'e1', '25%'], ['Cumple', 12, 'e2', '80%'], ['A punto de cumplir', 4, 'e3', '32%'], ['Por mejorar', 2, 'e4', '18%']].map(([n, c, k, w], i) => <div key={n} className={`rv-estado ${k}`} style={d(i)}><b>{c}</b><span>{n}</span><i style={{ '--w': w }}></i></div>)}</div>
    <div className="rv-botones">{['PNG', 'JPG', 'PDF', 'XLS'].map((t, i) => <span key={t} style={d(i, 1.3, .12)}>{t}</span>)}</div>
  </Marco>
);
const Ranking = () => (
  <Marco titulo="Ranking de Operarios" clase="rv-rank">{[['2', 62, '#8E9BA3'], ['1', 86, '#C9932B'], ['3', 46, '#B5703B']].map(([n, h, c], i) => <div key={n} className="rv-col" style={{ ...d(i, .2, .25), '--h': `${h}%`, '--c': c }}><span className="rv-medalla">{n}</span><i></i></div>)}</Marco>
);
const Lineas = () => (
  <Marco titulo="Líneas" clase="rv-lin">
    <div className="rv-lado">{['Nelly', 'Paula'].map((t, i) => <span key={t} style={d(i)}><i className="fa-solid fa-user"></i>{t}</span>)}</div>
    <svg viewBox="0 0 100 60" aria-hidden="true" preserveAspectRatio="none"><path pathLength="1" d="M0,15 C50,15 50,15 100,15" /><path pathLength="1" d="M0,15 C50,15 50,45 100,45" style={d(1, .8)} /><path pathLength="1" d="M0,45 C50,45 50,45 100,45" style={d(2, .8)} /></svg>
    <div className="rv-lado">{['Línea 1', 'Línea 2'].map((t, i) => <span key={t} style={d(i, .5)}><i className="fa-solid fa-grip-lines"></i>{t}</span>)}</div>
    <div className="rv-clasif" style={d(0, 1.8)}><i className="fa-solid fa-people-arrows"></i> clasificador ⇄ bonchador</div>
  </Marco>
);
const Clasificacion = () => (
  <Marco titulo="Clasificación" clase="rv-clas">{[40, 62, 55, 78, 70, 90, 66, 84].map((h, i) => <div key={i} className="rv-hora"><i className="rv-ayer" style={{ '--h': `${Math.max(20, h - 14 + (i % 3) * 6)}%` }}></i><i className="rv-hoy" style={{ ...d(i, .2, .12), '--h': `${h}%` }}></i></div>)}<small>hoy vs ayer</small></Marco>
);
const Devoluciones = () => (
  <Marco titulo="Devoluciones" clase="rv-dev">
    <div className="rv-tabs">{['Resumen', 'Top 5', 'Causas', 'Tendencia'].map((t, i) => <span key={t} className={i === 2 ? 'on' : ''}>{t}</span>)}</div>
    <div className="rv-causas">{[['Maltrato', '90%'], ['Fitosanidad', '64%'], ['Descabece', '40%']].map(([n, w], i) => <div key={n} style={d(i)}><span>{n}</span><i style={{ '--w': w }}></i></div>)}</div>
    <div className="rv-top">{['14', '9', '22'].map((c, i) => <span key={c} style={d(i, 1.1, .2)}><em>{i + 1}</em>Código <b>{c}</b></span>)}</div>
  </Marco>
);
const Tic = () => (
  <Marco titulo="Tablero Integrado del Colaborador" clase="rv-tic">
    <div className="rv-buscar"><i className="fa-solid fa-magnifying-glass"></i><span>14</span><em>OSCAR C.</em></div>
    <div className="rv-cal">{rango(35).map(i => <span key={i} className={i % 7 === 6 ? 'dom' : i === 11 ? 'fest' : ''} style={d(i, .1, .035)}></span>)}</div>
    <div className="rv-anillo" style={{ '--p': 92 }}><b><Conteo a={92} />%</b><small>presente</small></div>
  </Marco>
);
const Presentar = () => (
  <Marco titulo="Presentar" clase="rv-pres">
    <div className="rv-pantalla"><div className="rv-slides">{[['🥇', 'Top 3 de hoy'], ['📈', 'Hora a hora'], ['📦', 'Clasificación']].map(([e, t]) => <div key={t}><span>{e}</span><b>{t}</b></div>)}</div></div>
    <div className="rv-puntos"><i></i><i></i><i></i></div>
  </Marco>
);
const Tableros = () => (
  <Marco titulo="Tableros" clase="rv-tabl">
    <div className="rv-ventana"><div className="rv-barra-v"><i></i><i></i><i></i><span><i className="fa-solid fa-lock"></i> tablero</span></div>
      <div className="rv-tiles">{rango(4).map(i => <span key={i} style={d(i, .2, .2)}></span>)}</div></div>
    <div className="rv-clave"><small>Clave</small><b>••••</b></div>
  </Marco>
);
const Config = () => (
  <Marco titulo="Configuración" clase="rv-conf">
    <div className="rv-fila"><small>Meta por hora</small><div className="rv-pista"><i></i></div><b>470</b></div>
    <div className="rv-fila"><small>Jornada</small><div className="rv-interruptor"><i></i></div></div>
    <div className="rv-roles">{['Administrador', 'Digitador', 'Formador'].map((t, i) => <span key={t} style={d(i, 1.2, .25)}>{t}</span>)}</div>
  </Marco>
);
const Resumenes = () => (
  <Marco titulo="Resúmenes" clase="rv-res">
    <div className="rv-tarjeta">
      <div className="rv-cab"><img src={logoUrl} alt="" /><div><b>Resumen semanal</b><small>26/10 al 01/11</small></div></div>
      <div className="rv-kpis">{[['Tallos', 478536, '▼ 3%'], ['Cumpl.', 86, '▼ 3%'], ['Devol.', 204, '▼ 11%']].map(([n, v, f], i) => <div key={n} style={d(i, .4, .2)}><small>{n}</small><b><Conteo a={v} /></b><em>{f}</em></div>)}</div>
      <div className="rv-lineas"><i></i><i></i></div>
    </div>
  </Marco>
);
const Auditoria = () => (
  <Marco titulo="Auditoría" clase="rv-aud">
    <div className="rv-medidor"><small>Base de datos</small><div><i style={{ '--w': '42%' }}></i></div><b>42 % usado</b></div>
    <div className="rv-copia"><span className="rv-archivo2"><i className="fa-solid fa-file-zipper"></i></span><i className="fa-solid fa-cloud rv-nube"></i><span className="rv-ok"><i className="fa-solid fa-check"></i></span></div>
    <small className="rv-nombre">Backup TMControl 12-10-26_6-2-27</small>
  </Marco>
);
const Campana = () => (
  <Marco titulo="Notificaciones" clase="rv-camp">
    <div className="rv-bell"><i className="fa-solid fa-bell"></i><span>3</span></div>
    <div className="rv-avisos">{[['c', 'Base de datos al 94 %'], ['i', 'Rendimiento bajo sostenido'], ['n', 'Hoy es festivo']].map(([k, t], i) => <div key={k} className={`rv-aviso ${k}`} style={d(i, .5, .35)}><i></i><span>{t}</span></div>)}</div>
  </Marco>
);
const Listo = () => (
  <Marco titulo="Cómo se usa" clase="rv-listo">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" pathLength="1" /><path d="M14 27 l8 8 l16 -17" pathLength="1" /></svg>
    <div className="rv-tres">{[['fa-route', 'Recorrido'], ['fa-book-open', 'Manual'], ['fa-gift', 'Novedades']].map(([ic, t], i) => <span key={t} style={d(i, .9, .22)}><i className={`fa-solid ${ic}`}></i>{t}</span>)}</div>
  </Marco>
);

export const VISUAL = { bienvenida: Bienvenida, dashboard: Dashboard, rendimientos: Rendimientos, personas: Personas, reportes: Reportes, ranking: Ranking, lineas: Lineas, clasificacion: Clasificacion, devoluciones: Devoluciones, tic: Tic, presentar: Presentar, tableros: Tableros, config: Config, resumenes: Resumenes, auditoria: Auditoria, campana: Campana, listo: Listo };
