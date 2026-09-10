const KEY = 'tm_cola_pendiente';

export function obtenerCola() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function guardarCola(cola) {
  localStorage.setItem(KEY, JSON.stringify(cola));
  window.dispatchEvent(new Event('tm-cola-cambio'));
}

export function encolarOperacion(tipo, datos, etiqueta) {
  const cola = obtenerCola();
  cola.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    datos,
    etiqueta: etiqueta || tipo,
    fecha: new Date().toISOString(),
  });
  guardarCola(cola);
}

export function contarPendientes() {
  return obtenerCola().length;
}

export function limpiarCola() {
  guardarCola([]);
}

let sincronizando = false;

export async function sincronizarCola(ejecutores) {
  if (sincronizando) return { exitosas: 0, fallidas: 0, enCurso: true };
  const cola = obtenerCola();
  if (cola.length === 0) return { exitosas: 0, fallidas: 0 };

  sincronizando = true;
  window.dispatchEvent(new CustomEvent('tm-cola-sincronizando', { detail: true }));

  let exitosas = 0;
  let fallidas = 0;
  const restantes = [];

  for (const op of cola) {
    const ejecutar = ejecutores[op.tipo];
    if (!ejecutar) { restantes.push(op); fallidas++; continue; }
    try {
      await ejecutar(op.datos);
      exitosas++;
    } catch {
      fallidas++;
      restantes.push(op);
    }
  }

  guardarCola(restantes);
  sincronizando = false;
  window.dispatchEvent(new CustomEvent('tm-cola-sincronizando', { detail: false }));
  if (exitosas > 0) {
    window.dispatchEvent(new CustomEvent('tm-datos-sincronizados', { detail: { exitosas } }));
  }
  return { exitosas, fallidas };
}
