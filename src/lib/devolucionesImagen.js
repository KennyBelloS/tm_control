/**
 * IMÁGENES DE DEVOLUCIONES (Top 5 y Top 3 de personas por causa) — parte PURA: arma el HTML de la imagen.
 * Regla de la foto (pensada para mostrarse en grupo): quienes tienen MÁS devoluciones salen SOLO con su CÓDIGO (nunca el nombre);
 * quienes tienen MENOS devoluciones salen con su NOMBRE. La captura y la descarga están en exportImagenDevoluciones.js.
 */

const VERDE = '#166534', VERDE_OSC = '#0F3D22', ROJO = '#C0392B', ROJO_CLARO = '#FDECEA', VERDE_CLARO = '#E8F6EE', DORADO = '#C9932B';
const MEDALLA = ['#C9932B', '#8E9BA3', '#B5703B'];
const fmt = n => Number(n).toLocaleString('es-CO');
// Escapa lo peligroso (& < > " ') pero NO la barra de las fechas (con ella la imagen mostraba "01 /10").
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cod = c => (c === null || c === undefined || c === '' ? '—' : esc(c));

function cabecera({ titulo, subtitulo, generado, logo }) {
  return `<div style="background:linear-gradient(120deg,${VERDE_OSC},${VERDE});padding:24px 30px;display:flex;align-items:center;gap:16px;">
    ${logo ? `<img src="${logo}" style="width:52px;height:52px;border-radius:50%;background:#fff;" />` : ''}
    <div><div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.02em;">TORREMOLINOS · TMCONTROL</div>
    <div style="color:#fff;font-size:16px;font-weight:700;margin-top:2px;">${esc(titulo)}</div>
    <div style="color:rgba(255,255,255,.78);font-size:12px;margin-top:3px;">${esc(subtitulo)} · Generado el ${esc(generado)}</div></div></div>`;
}
const pie = '<div style="padding:4px 30px 22px;text-align:center;font-size:10.5px;color:#9AA09A;">Generado automáticamente · Torremolinos TMControl</div>';
const puesto = (i, color) => `<div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:${color};color:#fff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;">${i + 1}</div>`;
const barra = (pct, color, fondo = '#EEE8E6') => `<div style="flex:1;height:14px;border-radius:10px;background:${fondo};overflow:hidden;"><div style="width:${Math.max(4, Math.round(pct))}%;height:100%;border-radius:10px;background:${color};"></div></div>`;

/** Top 5: izquierda MÁS devoluciones (solo código), derecha MENOS devoluciones (nombres). */
/** Gráficos de la foto del Top 5: barras verticales por día/mes y barras horizontales de las causas que más pesan. Hechos con cajas (se dibujan bien al capturar). */
function graficos(g) {
  if (!g) return '';
  const barras = g.serie?.barras || [], causas = g.causas || [];
  const maxB = Math.max(1, ...barras.map(b => b.valor)), maxC = Math.max(1, ...causas.map(c => c.cantidad));
  const izq = barras.length > 1 ? `<div style="flex:1.25;background:#fff;border-radius:16px;padding:14px 18px 10px;box-shadow:0 5px 14px -9px rgba(0,0,0,.35);">
      <div style="font-size:15px;font-weight:900;color:#1A2A20;margin-bottom:8px;">Devoluciones por ${g.serie.unidad === 'mes' ? 'mes' : 'día'}</div>
      <div style="display:flex;align-items:flex-end;gap:${barras.length > 20 ? 3 : 7}px;height:150px;">${barras.map(b => `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
        <span style="font-size:${barras.length > 20 ? 8 : 11}px;font-weight:800;color:#5E6F65;">${fmt(b.valor)}</span>
        <div style="width:100%;height:${Math.max(3, Math.round((b.valor / maxB) * 112))}px;background:linear-gradient(180deg,#E0695C,#C0392B);border-radius:5px 5px 0 0;"></div></div>`).join('')}</div>
      <div style="display:flex;gap:${barras.length > 20 ? 3 : 7}px;margin-top:4px;">${barras.map((b, i) => `<div style="flex:1;min-width:0;text-align:center;font-size:${barras.length > 20 ? 7 : 10}px;color:#7A8A80;white-space:nowrap;overflow:hidden;">${barras.length > 20 ? (i % 2 ? '' : esc(String(b.etq).slice(0, 2))) : esc(b.etq)}</div>`).join('')}</div></div>` : '';
  const der = causas.length ? `<div style="flex:1;background:#fff;border-radius:16px;padding:14px 18px 12px;box-shadow:0 5px 14px -9px rgba(0,0,0,.35);">
      <div style="font-size:15px;font-weight:900;color:#1A2A20;margin-bottom:8px;">Causas que más pesan</div>
      ${causas.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;"><div style="width:128px;font-size:12px;font-weight:700;color:#1A2A20;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.nombre)}</div>${barra((c.cantidad / maxC) * 100, '#D4473A')}<div style="min-width:64px;text-align:right;font-size:12px;font-weight:900;color:${ROJO};">${fmt(c.cantidad)} <span style="color:#8A9A90;font-weight:700;">${Math.round(c.pct * 100)}%</span></div></div>`).join('')}</div>` : '';
  return izq || der ? `<div style="padding:6px 30px 8px;display:flex;gap:20px;">${izq}${der}</div>` : '';
}

export function htmlImagenTop5({ periodoNombre, rango, mas, menos, personasConDevoluciones, minDias, generado, logo, grafico }) {
  const maxMas = Math.max(1, ...mas.map(e => e.devol));
  const filasMas = mas.length ? mas.map((e, i) => `<div style="display:flex;align-items:center;gap:14px;padding:10px 4px;border-bottom:1px solid #F1E3E1;">
      ${puesto(i, ROJO)}
      <div style="min-width:130px;display:flex;align-items:baseline;gap:8px;"><span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8A9A90;">Código</span><span style="font-size:36px;font-weight:900;color:#1A2A20;letter-spacing:-.02em;">${cod(e.codigo)}</span></div>
      ${barra((e.devol / maxMas) * 100, '#D4473A')}
      <div style="min-width:54px;text-align:right;font-size:32px;font-weight:900;color:${ROJO};">${fmt(e.devol)}</div></div>`).join('')
    : '<div style="padding:50px 10px;text-align:center;font-size:18px;font-weight:700;color:#6B7C71;">Sin devoluciones en este período 🎉</div>';
  const filasMenos = menos.length ? menos.map((e, i) => `<div style="display:flex;align-items:center;gap:14px;padding:10px 4px;border-bottom:1px solid #DDEFE3;">
      ${puesto(i, VERDE)}
      <div style="flex:1;min-width:0;"><div style="font-size:21px;font-weight:800;color:#1A2A20;">${esc(e.nombre)}</div><div style="font-size:12.5px;font-weight:600;color:#7A8A80;">Código ${cod(e.codigo)} · ${fmt(e.diasTrab)} día${e.diasTrab === 1 ? '' : 's'} trabajado${e.diasTrab === 1 ? '' : 's'}</div></div>
      <div style="min-width:54px;text-align:right;font-size:32px;font-weight:900;color:${VERDE};">${fmt(e.devol)}</div></div>`).join('')
    : `<div style="padding:50px 10px;text-align:center;font-size:16px;font-weight:700;color:#6B7C71;">Nadie cumple el mínimo de ${fmt(minDias)} día${minDias === 1 ? '' : 's'} trabajado${minDias === 1 ? '' : 's'} en este período</div>`;
  return `${cabecera({ titulo: `Top 5 de devoluciones — ${periodoNombre}`, subtitulo: rango, generado, logo })}
    <div style="padding:22px 30px 8px;display:flex;gap:20px;">
      <div style="flex:1;background:linear-gradient(180deg,${ROJO_CLARO},#fff 40%);border-top:6px solid ${ROJO};border-radius:18px;padding:16px 20px;box-shadow:0 6px 18px -10px rgba(0,0,0,.3);">
        <div style="font-size:22px;font-weight:900;color:${ROJO};">▲ Más devoluciones</div><div style="font-size:11.5px;font-weight:700;color:#6B7C71;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Solo se muestra el código</div>${filasMas}</div>
      <div style="flex:1;background:linear-gradient(180deg,${VERDE_CLARO},#fff 40%);border-top:6px solid ${VERDE};border-radius:18px;padding:16px 20px;box-shadow:0 6px 18px -10px rgba(0,0,0,.3);">
        <div style="font-size:22px;font-weight:900;color:${VERDE};">▼ Menos devoluciones</div><div style="font-size:11.5px;font-weight:700;color:#6B7C71;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Mínimo ${fmt(minDias)} día${minDias === 1 ? '' : 's'} trabajado${minDias === 1 ? '' : 's'}</div>${filasMenos}</div>
    </div>
    ${graficos(grafico)}
    <div style="padding:10px 30px 14px;text-align:center;font-size:14px;color:#5E6F65;">Personas con devoluciones en el período: <b style="color:#1A2A20;font-size:17px;">${fmt(personasConDevoluciones)}</b></div>${pie}`;
}

/** Cómo se muestra una persona en la foto: solo código (lo predeterminado, para mostrar en grupo), solo nombre o ambos (para verificar). */
export const MODOS_IMAGEN = { codigo: 'Solo código', nombre: 'Solo nombre', ambos: 'Código y nombre' };
function quien(p, modo) {
  const codigo = `<div style="min-width:78px;font-size:21px;font-weight:900;color:#1A2A20;"><span style="font-size:10px;font-weight:800;letter-spacing:.05em;color:#8A9A90;text-transform:uppercase;margin-right:4px;">Cód.</span>${cod(p.codigo)}</div>`;
  if (modo === 'nombre') return `<div style="flex:1;min-width:0;font-size:15px;font-weight:800;color:#1A2A20;line-height:1.15;">${esc(p.nombre || '—')}</div>`;
  if (modo === 'ambos') return `<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:800;color:#1A2A20;line-height:1.15;">${esc(p.nombre || '—')}</div><div style="font-size:11px;font-weight:700;color:#8A9A90;">Cód. ${cod(p.codigo)}</div></div>`;
  return codigo;
}

/** Top 3 de personas por causa: una tarjeta por causa. modo: 'codigo' (predeterminado), 'nombre' o 'ambos'. */
export function htmlImagenPorCausa({ periodoNombre, rango, causas, generado, logo, modo = 'codigo' }) {
  const tarjetas = causas.map(c => {
    const max = Math.max(1, ...c.personas.map(p => p.cantidad));
    return `<div style="background:#fff;border-top:5px solid ${ROJO};border-radius:14px;padding:12px 16px;box-shadow:0 5px 14px -9px rgba(0,0,0,.35);">
      <div style="font-size:17px;font-weight:900;color:#1A2A20;">${esc(c.nombre)}</div>
      <div style="font-size:11.5px;color:#7A8A80;margin-bottom:6px;">${fmt(c.total)} en total · ${fmt(c.personasConCausa)} persona${c.personasConCausa === 1 ? '' : 's'}</div>
      ${c.personas.map((p, i) => `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;">
        <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:${MEDALLA[i] || MEDALLA[2]};color:#fff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;">${i + 1}</div>
        ${quien(p, modo)}
        ${barra((p.cantidad / max) * 100, MEDALLA[i] || MEDALLA[2], '#EFEFEA').replace('flex:1;', modo === 'codigo' ? 'flex:1;' : 'flex:0 0 56px;')}
        <div style="min-width:30px;text-align:right;font-size:20px;font-weight:900;color:${ROJO};">${fmt(p.cantidad)}</div></div>`).join('')}
      ${c.empatadosFuera > 0 ? `<div style="font-size:10.5px;color:#7A8A80;margin-top:2px;">+${c.empatadosFuera} persona${c.empatadosFuera === 1 ? '' : 's'} más con ${fmt(c.personas[c.personas.length - 1].cantidad)}</div>` : ''}</div>`;
  }).join('');
  return `${cabecera({ titulo: `Top 3 de personas por causa — ${periodoNombre}`, subtitulo: `${rango} · ${modo === 'nombre' ? 'se muestran los nombres' : modo === 'ambos' ? 'se muestran código y nombre' : 'solo se muestra el código'}`, generado, logo })}
    <div style="padding:20px 30px 10px;background:#F5F4EF;">${causas.length ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">${tarjetas}</div>` : '<div style="padding:60px;text-align:center;font-size:18px;font-weight:700;color:#6B7C71;">Sin devoluciones en este período 🎉</div>'}</div>${pie}`;
}

export const nombreArchivoImagen = (cual, periodo, desde, hasta, sufijo = '') => `torremolinos_devoluciones_${cual}${sufijo ? '_' + sufijo : ''}_${periodo}_${desde === hasta ? desde : `${desde}_a_${hasta}`}.png`.replace(/[^A-Za-z0-9._-]/g, '_');
