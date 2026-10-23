/**
 * FOTO DEL RANKING DE RENDIMIENTOS — parte PURA: arma el HTML de la imagen (Turno Actual / Histórico).
 * Es lo MISMO que se descarga (PNG/JPG) y lo que se ve en la vista previa de la app: una sola fuente, así no pueden diferir.
 */
import { calcularPorcentajeMeta, clasificarEstado } from './calculos.js';
import { escaparHtml } from './seguridad.js';

const VERDE = '#166534', VERDE_OSCURO = '#0F3D22', DORADO = '#C9932B', DORADO_CLARO = '#FDF3DF';
/** Colores de cada estado: Excelente y Cumple se distinguen a simple vista (no solo por el texto). */
export const ESTADOS_IMAGEN = {
  'Excelente': { fondo: '#166534', texto: '#FFFFFF', barra: '#0F7A3A', regla: '130 % o más de la meta' },
  'Cumple': { fondo: '#DCFCE7', texto: '#166534', barra: '#22A455', regla: '100 % a 129 %' },
  'A punto de cumplir': { fondo: '#FEF3C7', texto: '#B45309', barra: '#D97706', regla: '90 % a 99 %' },
  'Por mejorar': { fondo: '#FBE3E7', texto: '#A91D3A', barra: '#A91D3A', regla: 'menos de 90 %' }
};
const ORDEN = Object.keys(ESTADOS_IMAGEN);
const TH = 'padding:10px 12px;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;';

function fila(p, i, metaHora) {
  const pct = calcularPorcentajeMeta(p.promedioRend, metaHora), est = clasificarEstado(pct), c = ESTADOS_IMAGEN[est.label];
  const td = 'padding:9px 12px;border-bottom:1px solid #EEEDE7;';
  return `<tr style="background:${i % 2 === 1 ? '#FAFAF7' : '#FFFFFF'};">
    <td style="${td}font-weight:700;color:#6B7280;">${i + 1}</td>
    <td style="${td}color:#6B7280;">${escaparHtml(p.codigo ?? '—')}</td>
    <td style="${td}font-weight:600;">${escaparHtml(p.colaborador)}</td>
    <td style="${td}text-align:right;">${(p.totalTallos || 0).toLocaleString('es-CO')}</td>
    <td style="${td}text-align:right;font-weight:700;">${p.promedioRend}</td>
    <td style="${td}min-width:110px;"><div style="width:100%;height:8px;border-radius:20px;background:#EBEBE6;overflow:hidden;"><div style="width:${Math.min(100, Math.max(3, pct))}%;height:100%;border-radius:20px;background:${c.barra};"></div></div></td>
    <td style="${td}text-align:right;">${pct.toFixed(2)}%</td>
    <td style="${td}"><span style="background:${c.fondo};color:${c.texto};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">${est.label}</span></td>
  </tr>`;
}

/** ranking: salida de agregarRankingPorPersona (ya ordenado). tipo: 'historico' | 'actual'. */
export function htmlRankingImagen({ tipo, ranking, metaHora = 470, fecha, generado, logo }) {
  const promedio = ranking.length ? Math.round(ranking.reduce((s, p) => s + p.promedioRend, 0) / ranking.length) : 0;
  const tallos = ranking.reduce((s, p) => s + (p.totalTallos || 0), 0);
  const cuenta = Object.fromEntries(ORDEN.map(k => [k, 0]));
  for (const p of ranking) cuenta[clasificarEstado(calcularPorcentajeMeta(p.promedioRend, metaHora)).label]++;
  const titulo = tipo === 'historico' ? 'Ranking de Rendimientos — Histórico' : 'Ranking de Rendimientos — Turno Actual';
  const chips = ORDEN.map(k => { const c = ESTADOS_IMAGEN[k]; return `<div style="display:flex;align-items:center;gap:8px;background:${c.fondo};color:${c.texto};padding:7px 14px;border-radius:24px;"><span style="font-size:17px;font-weight:900;">${cuenta[k]}</span><span style="font-size:11.5px;font-weight:800;">${k}</span><span style="font-size:10px;opacity:.85;">· ${c.regla}</span></div>`; }).join('');
  return `
    <div style="background:linear-gradient(120deg,${VERDE_OSCURO},${VERDE});padding:26px 30px;display:flex;align-items:center;gap:16px;">
      ${logo ? `<img src="${logo}" style="width:52px;height:52px;border-radius:50%;background:#fff;" />` : ''}
      <div>
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.02em;">TORREMOLINOS · TMCONTROL</div>
        <div style="color:#fff;font-size:14px;margin-top:2px;">${titulo}</div>
        <div style="color:rgba(255,255,255,.75);font-size:11.5px;margin-top:4px;">Generado el ${escaparHtml(generado)} ${fecha ? `· Fecha: ${escaparHtml(fecha)}` : '· Todas las fechas'} · Meta: ${metaHora} tallos/h</div>
      </div>
    </div>
    <div style="padding:22px 30px 0;display:flex;gap:16px;">
      <div style="flex:1.4;background:${DORADO_CLARO};border:2px solid ${DORADO};border-radius:14px;padding:18px 24px;display:flex;align-items:center;gap:18px;">
        <div style="font-size:30px;">⭐</div>
        <div style="flex:1;"><div style="font-size:11px;font-weight:800;color:${VERDE_OSCURO};text-transform:uppercase;letter-spacing:.05em;">Rendimiento Promedio General</div>
          <div style="margin-top:4px;"><span style="font-size:36px;font-weight:800;color:${DORADO};">${promedio}</span><span style="font-size:13px;font-weight:700;color:${VERDE_OSCURO};margin-left:8px;">tallos/hora</span></div></div>
        <div style="text-align:right;"><div style="font-size:22px;font-weight:800;color:${VERDE_OSCURO};">${ranking.length}</div><div style="font-size:10.5px;color:${VERDE_OSCURO};opacity:.8;">persona(s)</div></div>
      </div>
      <div style="flex:1;background:#E9F2ED;border:2px solid ${VERDE};border-radius:14px;padding:18px 24px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:28px;">🌱</div>
        <div><div style="font-size:11px;font-weight:800;color:${VERDE_OSCURO};text-transform:uppercase;letter-spacing:.05em;">Total de Tallos</div><div style="margin-top:4px;font-size:30px;font-weight:800;color:${VERDE};">${tallos.toLocaleString('es-CO')}</div></div>
      </div>
    </div>
    <div style="padding:16px 30px 0;display:flex;gap:10px;flex-wrap:wrap;">${chips}</div>
    <div style="padding:16px 30px 30px;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr style="background:${VERDE};color:#fff;">
          <th style="${TH}text-align:left;">#</th><th style="${TH}text-align:left;">Código</th><th style="${TH}text-align:left;">Colaborador</th><th style="${TH}text-align:right;">Total Tallos</th><th style="${TH}text-align:right;">Rendimiento</th><th style="${TH}text-align:left;">Progreso</th><th style="${TH}text-align:right;">% Meta</th><th style="${TH}text-align:left;">Estado</th>
        </tr></thead>
        <tbody>${ranking.length ? ranking.map((p, i) => fila(p, i, metaHora)).join('') : '<tr><td colspan="8" style="padding:30px;text-align:center;color:#6B7280;">Sin datos para este filtro.</td></tr>'}</tbody>
      </table>
      <div style="margin-top:18px;font-size:10.5px;color:#9AA09A;text-align:center;">Generado automáticamente · Torremolinos TMControl</div>
    </div>`;
}
