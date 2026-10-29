// Busca llaves, contraseñas y direcciones con clave escritas en los archivos del proyecto (lo que NO debe subirse a GitHub).
// Uso: npm run verificar-secretos   → termina con error si encuentra algo o si .gitignore no protege los archivos .env.
import fs from 'node:fs'; import path from 'node:path';
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SALTAR = new Set(['node_modules', 'dist', 'dev-dist', '.git', '.vercel']);
const PATRONES = [
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/, 'una llave tipo JWT (anon o service_role)'],
  [/sb_secret_[A-Za-z0-9_-]{10,}|sbp_[a-f0-9]{30,}/, 'una llave secreta de Supabase'],
  [/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/, 'una dirección de base de datos con contraseña'],
  [/(SERVICE_ROLE_KEY|CRON_SECRET|SECRET_KEY|PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9._\-+/]{20,}/i, 'una variable secreta con valor']
];
const hallazgos = [], extras = [];
(function recorrer(dir) {
  for (const n of fs.readdirSync(dir)) {
    if (SALTAR.has(n)) continue;
    const p = path.join(dir, n), rel = path.relative(RAIZ, p).replace(/\\/g, '/'), st = fs.statSync(p);
    if (st.isDirectory()) { recorrer(p); continue; }
    if (/^\.env(\..+)?$/.test(n) && n !== '.env.example') { extras.push(rel); continue; }                 // archivos .env locales: no se leen, solo se avisa que deben estar ignorados
    if (st.size > 2_000_000 || /\.(png|jpe?g|webp|ico|woff2?|zip|pdf|xlsx?|tmbackup|lock)$/i.test(n) || n === 'package-lock.json') continue;
    let t; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
    t.split('\n').forEach((l, i) => { for (const [rx, que] of PATRONES) if (rx.test(l)) hallazgos.push(`${rel}:${i + 1} → ${que}`); });
  }
})(RAIZ);
let gi = ''; try { gi = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8'); } catch { /* sin .gitignore */ }
const lineas = gi.split(/\r?\n/).map(l => l.trim());
const protege = ['.env', '.env.*'].every(x => lineas.includes(x)) && lineas.includes('!.env.example');
if (!protege) hallazgos.push('.gitignore → debe ignorar «.env» y «.env.*» (y dejar pasar «!.env.example»)');
if (!fs.existsSync(path.join(RAIZ, '.env.example'))) hallazgos.push('.env.example → falta el archivo de ejemplo (solo con marcadores)');
if (hallazgos.length) { console.error('✗ Secretos o configuración peligrosa:\n  ' + hallazgos.join('\n  ')); process.exit(1); }
console.log(`✓ Sin llaves ni contraseñas en los archivos del proyecto; .gitignore protege .env${extras.length ? ` (hay ${extras.length} archivo(s) .env local(es): no se subirán)` : ''}.`);
