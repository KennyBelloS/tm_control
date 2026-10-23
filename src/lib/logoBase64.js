import logoUrl from '../assets/logo-icon.png';
/** El logo como data-URL (para que quede dentro de la imagen y de la vista previa). null si no se pudo leer. */
let memo;
export function logoBase64() {
  memo ||= fetch(logoUrl).then(r => r.blob()).then(b => new Promise((ok, mal) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = mal; l.readAsDataURL(b); })).catch(() => null);
  return memo;
}
