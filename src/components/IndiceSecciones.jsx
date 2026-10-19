import { useEffect, useRef, useState } from 'react';

/**
 * Índice de secciones de una pantalla larga: una columna de íconos fija a un COSTADO (no ocupa alto de pantalla) que sigue al
 * usuario mientras se desplaza —resalta la sección que está leyendo, con una pastilla que se desliza— y lleva suavemente a cada
 * sección al tocarla. El nombre aparece al pasar el cursor.
 * secciones = [{ id, etiqueta, icono }]  — cada id debe existir en la página.
 */
export default function IndiceSecciones({ secciones }) {
  const [activa, setActiva] = useState(secciones[0]?.id);
  const nav = useRef(null);
  const clave = secciones.map(s => s.id).join('|');

  // Seguimiento: la sección activa es la última cuyo borde superior ya pasó la línea de lectura
  useEffect(() => {
    let pendiente = false;
    const calcular = () => {
      pendiente = false;
      const alturaTopbar = document.querySelector('.topbar')?.offsetHeight || 0;
      const linea = alturaTopbar + 50;
      let actual = secciones[0]?.id;
      for (const s of secciones) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= linea) actual = s.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) actual = secciones[secciones.length - 1]?.id;   // al final de la página
      setActiva(actual);
    };
    const alMover = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(calcular); } };
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    calcular();
    return () => { window.removeEventListener('scroll', alMover); window.removeEventListener('resize', alMover); };
  }, [clave]);

  // Mientras el índice está en pantalla, la página deja un margen a la derecha para que no tape el contenido
  useEffect(() => {
    document.documentElement.dataset.indice = '1';
    return () => { delete document.documentElement.dataset.indice; };
  }, []);

  // Altura de la barra superior (para que al ir a una sección el título no quede debajo de ella)
  useEffect(() => {
    const ajustar = () => {
      const t = document.querySelector('.topbar');
      const fija = t && getComputedStyle(t).position === 'sticky';
      document.documentElement.style.setProperty('--alto-topbar', fija ? `${t.offsetHeight}px` : '0px');
    };
    ajustar();
    const t = document.querySelector('.topbar');
    const ro = t ? new ResizeObserver(ajustar) : null;
    ro?.observe(t);
    window.addEventListener('resize', ajustar);
    return () => { ro?.disconnect(); window.removeEventListener('resize', ajustar); };
  }, []);

  // El "deslizador" se coloca bajo el chip activo (variables CSS; no se toca el contenido que dibuja React)
  useEffect(() => {
    const boton = nav.current?.querySelector('[aria-current="true"]');
    if (!boton) return;
    nav.current.style.setProperty('--desliz-y', `${boton.offsetTop}px`);
    nav.current.style.setProperty('--desliz-h', `${boton.offsetHeight}px`);
  }, [activa, clave]);

  const ir = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <nav ref={nav} className="indice-lateral" aria-label="Secciones de esta pantalla">
      {secciones.map(s => (
        <button key={s.id} type="button" className={s.id === activa ? 'activa' : ''} aria-current={s.id === activa ? 'true' : undefined} aria-label={s.etiqueta} onClick={() => ir(s.id)}>
          <i className={`fa-solid ${s.icono}`}></i><span>{s.etiqueta}</span>
        </button>
      ))}
    </nav>
  );
}
