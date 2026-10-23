/** APRENDE — infraestructura: qué lecciones domina esta persona (se guarda en este equipo). */
const CLAVE = 'tm_aprende_v1';
export const leerDominadas = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
export const guardarDominadas = lista => { try { localStorage.setItem(CLAVE, JSON.stringify([...new Set(lista)])); } catch { /* sin almacenamiento */ } };
