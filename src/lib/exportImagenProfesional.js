import html2canvas from 'html2canvas';
import { calcularPorcentajeMeta, clasificarEstado, agregarRankingPorPersona } from './calculos';
import logoUrl from '../assets/logo-icon.png';
const VERDE = '#166534';
const VERDE_OSCURO = '#0F3D22';
const VERDE_CLARO = '#DCFCE7';
const AMBAR_CLARO = '#FEF3C7';
const ROJO_CLARO = '#FBE3E7';
const DORADO = '#C9932B';
const DORADO_CLARO = '#FDF3DF';
function coloresEstado(css) {
  if (css === 'success') return {
    fondo: VERDE_CLARO,
    texto: '#166534'
  };
  if (css === 'warning') return {
    fondo: AMBAR_CLARO,
    texto: '#B45309'
  };
  return {
    fondo: ROJO_CLARO,
    texto: '#A91D3A'
  };
}
function colorBarra(css) {
  if (css === 'success') return '#166534';
  if (css === 'warning') return '#D97706';
  return '#A91D3A';
}
function filaHtml(p, i, metaHora) {
  const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
  const estado = clasificarEstado(pct);
  const colores = coloresEstado(estado.css);
  const fondoFila = i % 2 === 1 ? '#FAFAF7' : '#FFFFFF';
  const anchoBarra = Math.min(100, Math.max(3, pct));
  return `
    <tr style="background:${fondoFila};">
      <td style="padding:9px 12px; font-weight:700; color:#6B7280; border-bottom:1px solid #EEEDE7;">${i + 1}</td>
      <td style="padding:9px 12px; color:#6B7280; border-bottom:1px solid #EEEDE7;">${p.codigo ?? '—'}</td>
      <td style="padding:9px 12px; font-weight:600; border-bottom:1px solid #EEEDE7;">${p.colaborador}</td>
      <td style="padding:9px 12px; text-align:right; border-bottom:1px solid #EEEDE7;">${p.totalTallos.toLocaleString('es-CO')}</td>
      <td style="padding:9px 12px; text-align:right; font-weight:700; border-bottom:1px solid #EEEDE7;">${p.promedioRend}</td>
      <td style="padding:9px 12px; border-bottom:1px solid #EEEDE7; min-width:110px;">
        <div style="width:100%; height:8px; border-radius:20px; background:#EBEBE6; overflow:hidden;">
          <div style="width:${anchoBarra}%; height:100%; border-radius:20px; background:${colorBarra(estado.css)};"></div>
        </div>
      </td>
      <td style="padding:9px 12px; text-align:right; border-bottom:1px solid #EEEDE7;">${pct.toFixed(2)}%</td>
      <td style="padding:9px 12px; border-bottom:1px solid #EEEDE7;">
        <span style="background:${colores.fondo}; color:${colores.texto}; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap;">${estado.label}</span>
      </td>
    </tr>`;
}
async function logoBase64() {
  try {
    const blob = await fetch(logoUrl).then(r => r.blob());
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
export async function exportarImagenProfesional({
  tipo,
  filas,
  cfg,
  fecha,
  formato = 'png'
}) {
  const metaHora = cfg?.metaHora || 470;
  const ranking = agregarRankingPorPersona(filas);
  const promedioGeneral = ranking.length > 0 ? Math.round(ranking.reduce((s, p) => s + p.promedioRend, 0) / ranking.length) : 0;
  const tallosTotales = ranking.reduce((s, p) => s + (p.totalTallos || 0), 0);
  const titulo = tipo === 'historico' ? 'Ranking de Rendimientos — Histórico' : 'Ranking de Rendimientos — Turno Actual';
  const generado = new Date().toLocaleString('es-CO');
  const logo = await logoBase64();
  const contenedor = document.createElement('div');
  contenedor.style.cssText = 'position:fixed; left:-9999px; top:0; min-width:1120px; width:max-content; background:#fff; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;';
  contenedor.innerHTML = `
    <div style="background:linear-gradient(120deg,${VERDE_OSCURO},${VERDE}); padding:26px 30px; display:flex; align-items:center; gap:16px;">
      ${logo ? `<img src="${logo}" style="width:52px;height:52px;border-radius:50%;background:#fff;" />` : ''}
      <div>
        <div style="color:#fff; font-size:20px; font-weight:800; letter-spacing:.02em;">TORREMOLINOS · TMCONTROL</div>
        <div style="color:#fff; font-size:14px; margin-top:2px;">${titulo}</div>
        <div style="color:rgba(255,255,255,.75); font-size:11.5px; margin-top:4px;">
          Generado el ${generado} ${fecha ? `· Fecha: ${fecha}` : '· Todas las fechas'} · Meta: ${metaHora} tallos/h
        </div>
      </div>
    </div>

    <div style="padding:22px 30px 0; display:flex; gap:16px;">
      <div style="flex:1.4; background:${DORADO_CLARO}; border:2px solid ${DORADO}; border-radius:14px; padding:18px 24px; display:flex; align-items:center; gap:18px;">
        <div style="font-size:30px;">⭐</div>
        <div style="flex:1;">
          <div style="font-size:11px; font-weight:800; color:${VERDE_OSCURO}; text-transform:uppercase; letter-spacing:.05em;">Rendimiento Promedio General</div>
          <div style="margin-top:4px;">
            <span style="font-size:36px; font-weight:800; color:${DORADO};">${promedioGeneral}</span>
            <span style="font-size:13px; font-weight:700; color:${VERDE_OSCURO}; margin-left:8px;">tallos/hora</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px; font-weight:800; color:${VERDE_OSCURO};">${ranking.length}</div>
          <div style="font-size:10.5px; color:${VERDE_OSCURO}; opacity:.8;">persona(s)</div>
        </div>
      </div>
      <div style="flex:1; background:#E9F2ED; border:2px solid ${VERDE}; border-radius:14px; padding:18px 24px; display:flex; align-items:center; gap:14px;">
        <div style="font-size:28px;">🌱</div>
        <div>
          <div style="font-size:11px; font-weight:800; color:${VERDE_OSCURO}; text-transform:uppercase; letter-spacing:.05em;">Total de Tallos</div>
          <div style="margin-top:4px; font-size:30px; font-weight:800; color:${VERDE};">${tallosTotales.toLocaleString('es-CO')}</div>
        </div>
      </div>
    </div>

    <div style="padding:20px 30px 30px;">
      <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
        <thead>
          <tr style="background:${VERDE}; color:#fff;">
            <th style="padding:10px 12px; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">#</th>
            <th style="padding:10px 12px; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Código</th>
            <th style="padding:10px 12px; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Colaborador</th>
            <th style="padding:10px 12px; text-align:right; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Total Tallos</th>
            <th style="padding:10px 12px; text-align:right; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Rendimiento</th>
            <th style="padding:10px 12px; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Progreso</th>
            <th style="padding:10px 12px; text-align:right; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">% Meta</th>
            <th style="padding:10px 12px; text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.length > 0 ? ranking.map((p, i) => filaHtml(p, i, metaHora)).join('') : `
            <tr><td colspan="6" style="padding:30px; text-align:center; color:#6B7280;">Sin datos para este filtro.</td></tr>
          `}
        </tbody>
      </table>
      <div style="margin-top:18px; font-size:10.5px; color:#9AA09A; text-align:center;">
        Generado automáticamente · Torremolinos TMControl
      </div>
    </div>
  `;
  document.body.appendChild(contenedor);
  try {
    const canvas = await html2canvas(contenedor, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });
    const mime = formato === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `torremolinos_ranking_${fecha || 'reporte'}.${formato}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    document.body.removeChild(contenedor);
  }
}
