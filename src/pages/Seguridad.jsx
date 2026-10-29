import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Nuevo from '../components/Nuevo';
import { supabase } from '../lib/supabaseClient';
import { getConfig, getAlmacenamientoUsadoMB } from '../lib/db';
import { MODULOS, ROL_LABEL, puedeVer, puedeEditar, olvidarDatosLocales } from '../lib/roles';
import { evaluarSeguridad, clasificarEvento } from '../lib/seguridadSistema';
import { combinarActividad, comportamiento } from '../lib/actividadUsuarios';
import { avisar } from '../lib/avisos';

const ROLES = ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador'];
const MODULO_TXT = { dashboard: 'Dashboard', personas: 'Personas', rendimientos: 'Rendimientos', reportes: 'Reportes', ranking: 'Ranking', lineas: 'Líneas', clasificacion: 'Clasificación', devoluciones: 'Devoluciones', colaborador: 'TIC', tableros: 'Tableros', indirectos: 'Indirectos', gerencia: 'Gerencia', configuracion: 'Configuración', usuarios: 'Usuarios', auditoria: 'Auditoría', seguridad: 'Seguridad', resumenes: 'Resúmenes', ayuda: 'Cómo se usa' };
const ESTADO = { ok: { t: 'Bien', i: 'fa-circle-check' }, aviso: { t: 'Revisar', i: 'fa-triangle-exclamation' }, critico: { t: 'Urgente', i: 'fa-circle-xmark' }, nodato: { t: 'Sin datos', i: 'fa-circle-question' } };
const SEMAFORO = { reciente: 'Esta semana', normal: 'Este mes', lejano: 'Hace tiempo', inactivo: 'Sin usar', nunca: 'Nunca entró', desactivada: 'Desactivada', sindatos: 'Sin datos' };
const PERIODOS = [[7, '7 días'], [30, '30 días'], [90, '90 días']];
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const cuando = iso => (iso ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

async function consultarServidor() {
  try { const { data } = await supabase.auth.getSession(); const t = data?.session?.access_token; if (!t) return null; const r = await fetch('/api/estado-servidor', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); return typeof j.servicioUsuarios === 'boolean' ? j : null; } catch { return null; }
}
async function revisarCabeceras() {
  try { const local = ['localhost', '127.0.0.1'].includes(location.hostname), r = await fetch(`${location.origin}/`, { method: 'HEAD', cache: 'no-store' }), h = r.headers, csp = h.get('content-security-policy') || '';
    return { local, https: location.protocol === 'https:', csp: !!csp, hsts: !!h.get('strict-transport-security'), marcos: !!h.get('x-frame-options') || /frame-ancestors/.test(csp) }; } catch { return null; }
}
function Escudo({ puntaje, tono }) {
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className={`seg-escudo seg-${tono}`} role="img" aria-label={`Índice de seguridad: ${puntaje} de 100`}>
      <svg viewBox="0 0 130 130"><circle className="seg-pista" cx="65" cy="65" r={R} /><circle className="seg-arco" cx="65" cy="65" r={R} style={{ '--c': C, '--v': C * (1 - puntaje / 100) }} /></svg>
      <div className="seg-centro"><i className="fa-solid fa-shield-halved"></i><b>{puntaje}</b><small>de 100</small></div>
    </div>
  );
}
function Ranking({ titulo, icono, lista, tono, vacio }) {
  const max = Math.max(1, ...lista.map(u => u.entradas));
  return (
    <section className={`seg-rank seg-rank-${tono}`}><h3><i className={`fa-solid ${icono}`}></i> {titulo}</h3>
      {lista.length === 0 ? <p className="seg-vacio">{vacio}</p> : <ol>{lista.map((u, i) => <li key={u.id} style={{ '--i': i }}><span className="seg-pos">{i + 1}</span><div><div className="seg-rank-fila"><b>{u.nombre}</b><small>{u.entradas} {u.entradas === 1 ? 'entrada' : 'entradas'}{u.diasActivos ? ` · ${u.diasActivos} ${u.diasActivos === 1 ? 'día' : 'días'}` : ''}</small></div><i className="seg-barra" style={{ '--w': `${Math.max(3, (u.entradas / max) * 100)}%` }}></i></div></li>)}</ol>}
    </section>
  );
}

/** Seguridad del sistema (solo Administrador): el índice, lo que conviene hacer, el uso de la app por persona, los errores y quién puede qué. */
export default function Seguridad() {
  const [datos, setDatos] = useState(null), [cargando, setCargando] = useState(true), [vez, setVez] = useState(0), [dias, setDias] = useState(30), [abierta, setAbierta] = useState(null);
  const [equipo, setEquipo] = useState({ https: true, vence: null, guardados: null });
  const cargar = useCallback(async () => {
    setCargando(true);
    const [rpc, act, ev, uso, cfg, ses, servidor, cabeceras] = await Promise.all([
      supabase.rpc('seguridad_estado'), supabase.rpc('seguridad_actividad', { p_dias: dias }),
      supabase.from('respaldo_eventos').select('fecha,accion,usuario_nombre,detalle').order('fecha', { ascending: false }).limit(60),
      getAlmacenamientoUsadoMB().catch(() => null), getConfig().catch(() => null), supabase.auth.getSession().catch(() => null), consultarServidor(), revisarCabeceras()
    ]);
    let usuarios = rpc.data?.usuarios ?? null, tablas = rpc.data?.tablas ?? null, ahora = rpc.data?.ahora || new Date().toISOString();
    if (rpc.error) {                                                    // sin el último acceso de las cuentas: se muestran las cuentas, pero SIN acusar a nadie de «nunca entró»
      let p = await supabase.from('perfiles').select('id,nombre,rol,activo,edicion'); if (p.error) p = await supabase.from('perfiles').select('id,nombre,rol,activo');
      usuarios = (p.data || []).map(u => ({ ...u, ultimo_acceso: undefined }));
    }
    const limite = cfg?.almacenamientoLimiteMB || 500;
    setDatos({ usuarios: usuarios || [], tablas, ahora, actividad: act.error ? null : act.data, eventos: ev.data || [], usoPct: uso === null ? null : (uso / limite) * 100, servidor, cabeceras });
    let guardados = null; try { if (typeof caches !== 'undefined') guardados = (await (await caches.open('datos-api')).keys()).length; } catch { /* sin caché */ }
    setEquipo({ https: location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname), local: ['localhost', '127.0.0.1'].includes(location.hostname), vence: ses?.data?.session?.expires_at ? new Date(ses.data.session.expires_at * 1000) : null, guardados });
    setCargando(false);
  }, [dias]);
  useEffect(() => { cargar(); }, [cargar, vez]);
  const act = useMemo(() => (datos ? combinarActividad({ usuarios: datos.usuarios, actividad: datos.actividad, ahora: datos.ahora }) : null), [datos]);
  const ev = useMemo(() => (datos && act ? evaluarSeguridad({ usuarios: act.lista, tablas: datos.tablas, eventos: datos.eventos, usoPct: datos.usoPct, ahora: datos.ahora, actividad: datos.actividad, cabeceras: datos.cabeceras, servidor: datos.servidor }) : null), [datos, act]);
  const nombres = useMemo(() => Object.fromEntries((datos?.usuarios || []).map(u => [u.id, u.nombre])), [datos]);
  const modulos = useMemo(() => Object.keys(MODULOS).filter(k => MODULO_TXT[k]).sort((a, b) => Object.keys(MODULO_TXT).indexOf(a) - Object.keys(MODULO_TXT).indexOf(b)), []);
  const borrarGuardados = () => { if (!confirm('¿Borrar los datos guardados en este equipo para verlos sin internet? Se vuelven a guardar solos al navegar.')) return; olvidarDatosLocales(); setVez(v => v + 1); avisar('Datos guardados de este equipo borrados.'); };

  if (!ev) return (<><PageHeader title="Seguridad" subtitle="El estado de protección del sistema." /><div className="page"><div className="seg-cargando"><i className="fa-solid fa-shield-halved fa-beat"></i> Revisando la seguridad…</div></div></>);
  const recientes = datos.actividad?.recientes || [];
  return (
    <>
      <PageHeader title="Seguridad" subtitle="El estado de protección del sistema, solo para el Administrador." />
      <div className="page seg">
        <section className={`seg-hero seg-${ev.nivel.tono} panel`}>
          <Escudo puntaje={ev.puntaje} tono={ev.nivel.tono} />
          <div className="seg-hero-txt">
            <small>Índice de seguridad <Nuevo id="seguridad" /></small>
            <h2>{ev.nivel.texto}</h2>
            <p>{ev.pendientes.length === 0 ? 'Todo está en orden: no hay nada pendiente.' : `${ev.pendientes.length} ${ev.pendientes.length === 1 ? 'cosa conviene revisarla' : 'cosas conviene revisarlas'}${ev.pendientes.some(p => p.estado === 'critico') ? ', y hay algo urgente' : ''}.`}</p>
            <div className="seg-chips"><span><i className="fa-solid fa-users"></i> {ev.resumen.activas} cuentas activas</span><span><i className="fa-solid fa-user-shield"></i> {ev.resumen.administradores} administradores</span><span><i className="fa-solid fa-pen-to-square"></i> {ev.resumen.editores} editan</span><span><i className="fa-solid fa-eye"></i> {ev.resumen.soloLectura} solo ven</span>{ev.resumen.especiales > 0 && <span><i className="fa-solid fa-user-lock"></i> {ev.resumen.especiales} con permiso especial</span>}</div>
          </div>
          <button className="btn-secondary seg-act" onClick={() => setVez(v => v + 1)} disabled={cargando}><i className={`fa-solid fa-rotate ${cargando ? 'fa-spin' : ''}`}></i> Revisar de nuevo</button>
        </section>
        {!act.medido && <div className="alert warn seg-info-uso"><i className="fa-solid fa-circle-info"></i> El historial de uso (quién entra y qué errores ven) se activa cuando se completa la configuración de la base de datos. Mientras tanto, esas revisiones salen «sin datos».</div>}
        {ev.pendientes.length > 0 && (
          <section className="seg-sec"><h2><i className="fa-solid fa-list-check"></i> Qué conviene hacer</h2>
            <ol className="seg-pend">{ev.pendientes.map((p, i) => <li key={p.id} className={`seg-p-${p.estado}`} style={{ '--i': i }}><span className="seg-n">{i + 1}</span><div><b>{p.titulo}</b><p>{p.detalle}</p>{p.accion && <em><i className="fa-solid fa-arrow-right"></i> {p.accion}</em>}{p.pasos && <ol className="seg-pasos">{p.pasos.map((t, k) => <li key={k}>{t}</li>)}</ol>}</div></li>)}</ol>
          </section>)}
        <section className="seg-sec"><h2><i className="fa-solid fa-clipboard-check"></i> Las {ev.checks.length} revisiones</h2>
          <div className="seg-checks">{ev.checks.map((c, i) => <article key={c.id} className={`seg-check seg-e-${c.estado}`} style={{ '--i': i }}><span className="seg-ic"><i className={`fa-solid ${c.icono}`}></i></span><div><div className="seg-fila"><b>{c.titulo}</b><em><i className={`fa-solid ${ESTADO[c.estado].i}`}></i> {ESTADO[c.estado].t}</em></div><p>{c.detalle}</p><small>{c.peso} puntos</small></div></article>)}</div>
        </section>
        <section className="seg-sec"><div className="seg-sec-cab"><h2><i className="fa-solid fa-ranking-star"></i> Quién usa la app <Nuevo id="uso-app" /></h2>
          <div className="seg-per" role="tablist" aria-label="Período">{PERIODOS.map(([d, t]) => <button key={d} role="tab" aria-selected={dias === d} className={dias === d ? 'on' : ''} onClick={() => setDias(d)}>{t}</button>)}</div></div>
          {act.medido ? (<>
            <div className="seg-dos seg-rankings"><Ranking titulo="Los que más entran" icono="fa-arrow-trend-up" tono="mas" lista={act.masEntran.slice(0, 5)} vacio="Todavía nadie ha entrado en este período." /><Ranking titulo="Los que menos entran" icono="fa-arrow-trend-down" tono="menos" lista={act.menosEntran.slice(0, 5)} vacio="No hay cuentas activas." /></div>
            <p className="seg-nota">{act.totalEntradas} {act.totalEntradas === 1 ? 'entrada' : 'entradas'} en {act.dias} días. Una «entrada» es abrir la app (se cuenta una cada 20 minutos por persona). El conteo empieza desde que se activó el registro.</p>
          </>) : <p className="seg-vacio">Cuando el historial de uso esté activo verás aquí quién entra más y quién menos.</p>}
        </section>
        <section className="seg-sec"><h2><i className="fa-solid fa-satellite-dish"></i> Cuentas y comportamiento</h2>
          <div className="seg-cuentas">{ev.cuentas.map((u, i) => {
            const a = act.lista.find(x => x.id === u.id) || u, errores = recientes.filter(r => r.usuario_id === u.id), abierto = abierta === u.id;
            return (
              <div key={u.id} className={`seg-cuenta seg-s-${u.semaforo} ${abierto ? 'abierto' : ''}`} style={{ '--i': i }}>
                <button className="seg-cuenta-btn" onClick={() => setAbierta(abierto ? null : u.id)} aria-expanded={abierto}>
                  <span className="seg-av">{iniciales(u.nombre)}</span>
                  <div className="seg-cuenta-txt"><b>{u.nombre}</b><span className={`rol-pill rol-${u.rol}`}>{ROL_LABEL[u.rol] || u.rol}</span></div>
                  <span className={`seg-tag ${u.editor ? 'edita' : 've'}`}><i className={`fa-solid ${u.editor ? 'fa-pen' : 'fa-eye'}`}></i> {u.editor ? 'Edita' : 'Solo ve'}{u.especial ? ' *' : ''}</span>
                  <div className="seg-ultimo"><i style={{ '--w': `${u.dias === null ? 0 : Math.max(4, 100 - Math.min(100, (u.dias / 90) * 100))}%` }}></i><small>{SEMAFORO[u.semaforo]}{u.dias !== null ? ` · hace ${u.dias} ${u.dias === 1 ? 'día' : 'días'}` : ''}{a.errores ? ` · ${a.errores} ${a.errores === 1 ? 'error' : 'errores'}` : ''}</small></div>
                </button>
                {abierto && <div className="seg-det"><ul>{comportamiento(a, act.dias || dias).map((t, k) => <li key={k}>{t}</li>)}{u.especial && <li>Tiene un permiso especial: {u.especial === 'editar' ? 'puede editar aunque su rol solo visualiza' : 'solo visualiza aunque su rol edita'} (se cambia en Usuarios).</li>}</ul>
                  {errores.length > 0 && <div className="seg-det-err"><b>Errores recientes</b>{errores.slice(0, 5).map((r, k) => <p key={k}><code>{r.ref || '—'}</code> {r.mensaje} <small>{r.ruta} · {cuando(r.fecha)}</small></p>)}</div>}</div>}
              </div>); })}</div>
          <p className="seg-nota">* permiso especial fijado por el Administrador. Toca una cuenta para ver cómo la usa.</p>
        </section>
        {datos.actividad && <section className="seg-sec"><h2><i className="fa-solid fa-bug"></i> Errores recientes</h2>
          {recientes.length === 0 ? <p className="seg-vacio"><i className="fa-solid fa-circle-check"></i> Ninguna persona ha visto errores. Todo bien.</p> : <ul className="seg-errs">{recientes.slice(0, 12).map((r, i) => <li key={i} style={{ '--i': i }}><code>{r.ref || '—'}</code><div><b>{nombres[r.usuario_id] || 'Cuenta eliminada'}</b><p>{r.mensaje}</p><small><i className={`fa-solid ${r.dispositivo === 'movil' ? 'fa-mobile-screen' : 'fa-desktop'}`}></i> {r.ruta || '—'} · {cuando(r.fecha)}</small></div></li>)}</ul>}
        </section>}
        <section className="seg-sec"><h2><i className="fa-solid fa-key"></i> Mapa de permisos</h2>
          <div className="seg-matriz-caja"><table className="seg-matriz"><thead><tr><th>Módulo</th>{ROLES.map(r => <th key={r}>{ROL_LABEL[r]}</th>)}</tr></thead>
            <tbody>{modulos.map(m => <tr key={m}><th>{MODULO_TXT[m]}</th>{ROLES.map(r => { const ve = puedeVer(r, m), ed = ve && puedeEditar(r); return <td key={r} className={ed ? 'ed' : ve ? 've' : 'no'} title={`${ROL_LABEL[r]} · ${ed ? 've y edita' : ve ? 'solo ve' : 'sin acceso'}`}><i className={`fa-solid ${ed ? 'fa-pen' : ve ? 'fa-eye' : 'fa-lock'}`}></i></td>; })}</tr>)}</tbody></table></div>
          <p className="seg-leyenda"><span><i className="fa-solid fa-pen"></i> ve y edita</span><span><i className="fa-solid fa-eye"></i> solo ve</span><span><i className="fa-solid fa-lock"></i> sin acceso</span><span>Por persona: en Usuarios → Permiso</span></p>
        </section>
        <div className="seg-dos">
          <section className="seg-sec"><h2><i className="fa-solid fa-timeline"></i> Actividad reciente</h2>
            {datos.eventos.length === 0 ? <p className="seg-vacio">Todavía no hay copias ni borrados registrados.</p> : <ul className="seg-linea">{datos.eventos.slice(0, 10).map((e, i) => { const c = clasificarEvento(e); return <li key={`${e.fecha}${i}`} className={`seg-ev seg-ev-${c.tono}`} style={{ '--i': i }}><span><i className={`fa-solid ${c.icono}`}></i></span><div><b>{c.texto}</b><small>{e.usuario_nombre || 'Sistema automático'} · {cuando(e.fecha)}</small></div></li>; })}</ul>}
          </section>
          <section className="seg-sec"><h2><i className="fa-solid fa-laptop-code"></i> Este equipo</h2>
            <ul className="seg-equipo">
              <li className={equipo.https ? 'ok' : 'mal'}><i className={`fa-solid ${equipo.https ? 'fa-lock' : 'fa-lock-open'}`}></i><div><b>{equipo.https ? (equipo.local ? 'Entorno de desarrollo' : 'Conexión cifrada (HTTPS)') : 'Conexión SIN cifrar'}</b><small>{equipo.https ? 'Lo que viaja entre tu equipo y el servidor va protegido.' : 'Entra por una dirección https://.'}</small></div></li>
              <li className="ok"><i className="fa-solid fa-hourglass-half"></i><div><b>Tu sesión</b><small>{equipo.vence ? `Vence el ${cuando(equipo.vence.toISOString())} y se renueva sola.` : 'Se renueva sola mientras uses la app.'}</small></div></li>
              <li className="ok"><i className="fa-solid fa-database"></i><div><b>Datos guardados para ver sin internet</b><small>{equipo.guardados === null ? 'No disponible en este navegador.' : `${equipo.guardados} consultas guardadas. Se borran al iniciar o cerrar sesión.`}</small></div>{equipo.guardados > 0 && <button className="btn-secondary" onClick={borrarGuardados}>Borrar</button>}</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
