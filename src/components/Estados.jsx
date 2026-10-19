import { Link } from 'react-router-dom';

/**
 * Estado VACÍO: cuando no hay nada que mostrar, explica por qué y qué hacer (con un botón si hay una acción clara).
 * accion = { texto, to }  (navega)   ó   { texto, onClick }  (hace algo)
 */
export function EstadoVacio({ icono = 'fa-inbox', titulo = 'Sin datos', texto, accion, compacto = false, children }) {
  const boton = accion && (accion.to
    ? <Link className="btn-primary" to={accion.to}>{accion.texto}</Link>
    : <button className="btn-primary" onClick={accion.onClick}>{accion.texto}</button>);
  return (
    <div className={`estado-vacio ${compacto ? 'estado-vacio-compacto' : ''}`} role="status">
      <span className="estado-vacio-icono"><i className={`fa-solid ${icono}`}></i></span>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children && <div className="estado-vacio-extra">{children}</div>}
      {boton}
    </div>
  );
}

/** Estado CARGANDO de una tabla: filas "fantasma" con el mismo número de columnas, en vez de un texto suelto. */
export function FilasEsqueleto({ filas = 5, columnas = 6 }) {
  const anchos = [62, 88, 46, 72, 54, 80, 40, 68];
  return (
    <>
      {Array.from({ length: filas }, (_, f) => (
        <tr key={f} className="fila-esqueleto" aria-hidden="true">
          {Array.from({ length: columnas }, (_, c) => (
            <td key={c}><span className="esqueleto esq-linea" style={{ width: `${anchos[(f * 3 + c) % anchos.length]}%` }}></span></td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Estado CARGANDO de un bloque (gráfica, panel, tarjeta). */
export function BloqueCargando({ alto = 140, etiqueta = 'Cargando…' }) {
  return <div className="esqueleto bloque-cargando" style={{ height: alto }} role="status" aria-label={etiqueta}></div>;
}

/** Esqueleto de una pantalla de tarjetas (Dashboard): mismas proporciones que lo real, para que no "salte" al cargar. */
export function TarjetasEsqueleto({ tarjetas = 4 }) {
  return (
    <div className="tarjetas-esqueleto" role="status" aria-label="Cargando datos">
      <div className="cards">{Array.from({ length: tarjetas }, (_, i) => <div key={i} className="esqueleto card-esqueleto" style={{ animationDelay: `${i * 90}ms` }}></div>)}</div>
      <div className="esqueleto hero-esqueleto"></div>
    </div>
  );
}
