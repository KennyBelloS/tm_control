/**
 * ESTILO BASE de toda foto (ranking, devoluciones…): el MISMO para la descarga y para la vista previa de la app.
 * Sin esto, cada una heredaba el interlineado y las fuentes de donde estuviera y la foto se veía distinta a su vista previa.
 */
export const FUENTE_FOTO = '-apple-system,Segoe UI,Roboto,Arial,sans-serif';
export const ESTILO_FOTO = `font-family:${FUENTE_FOTO};line-height:normal;color:#1A2A20;text-align:left;font-size:16px;font-weight:400;letter-spacing:normal;background:#fff;`;
export const estiloFotoObjeto = { fontFamily: FUENTE_FOTO, lineHeight: 'normal', color: '#1A2A20', textAlign: 'left', fontSize: 16, fontWeight: 400, letterSpacing: 'normal', background: '#fff' };
