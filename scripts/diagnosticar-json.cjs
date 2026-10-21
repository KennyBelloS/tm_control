/**
 * Diagnóstico: cuando algo lee un texto como JSON y falla, muestra QUÉ archivo se estaba leyendo y desde dónde.
 * Se usa con:  npm run diagnosticar-build
 * (no cambia nada del proyecto; solo agrega información al error)
 */
const fs = require('fs');
let ultimos = [];
const anotar = r => { if (typeof r === 'string' || r instanceof URL || Buffer.isBuffer(r)) { ultimos.push(String(r)); if (ultimos.length > 6) ultimos.shift(); } };
for (const n of ['readFile', 'readFileSync']) {
  const orig = fs[n];
  fs[n] = function (...a) { anotar(a[0]); return orig.apply(this, a); };
}
const origP = fs.promises.readFile; fs.promises.readFile = function (...a) { anotar(a[0]); return origP.apply(this, a); };
const parse = JSON.parse;
JSON.parse = function (texto, ...resto) {
  try { return parse.call(this, texto, ...resto); }
  catch (e) {
    console.error('\n==== DIAGNÓSTICO: falló la lectura de un JSON ====');
    console.error('Mensaje        :', e.message);
    console.error('Empieza con    :', JSON.stringify(String(texto).slice(0, 60)));
    console.error('Últimos archivos leídos (el último suele ser el culpable):');
    ultimos.forEach(x => console.error('   ·', x));
    console.error('Quién lo leyó  :');
    console.error(new Error().stack.split('\n').slice(2, 9).map(l => '   ' + l.trim()).join('\n'));
    console.error('===============================================\n');
    throw e;
  }
};
