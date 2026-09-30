function colorSolido(pct) {
  if (pct >= 100) return '#22C55E';
  if (pct >= 60) return '#84CC16';
  if (pct >= 30) return '#F59E0B';
  return '#EF4444';
}

/**
 * Anillo circular de progreso (SVG) — reutilizable en Dashboard y en el
 * Modo Presentación, para que ambos se vean consistentes con la misma
 * pieza visual en vez de dos estilos de barra distintos.
 */
export default function AnilloProgreso({ pct, tamano = 150, grosor = 12, children }) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const avance = Math.min(Math.max(pct, 0), 100) / 100;
  const centro = tamano / 2;
  return (
    <div className="anillo-progreso-wrap" style={{ width: tamano, height: tamano }}>
      <svg viewBox={`0 0 ${tamano} ${tamano}`} className="anillo-progreso-svg">
        <circle cx={centro} cy={centro} r={radio} fill="none" stroke="var(--anillo-fondo, rgba(0,0,0,.08))" strokeWidth={grosor} />
        <circle
          cx={centro} cy={centro} r={radio} fill="none" stroke={colorSolido(pct)} strokeWidth={grosor} strokeLinecap="round"
          strokeDasharray={circunferencia} strokeDashoffset={circunferencia * (1 - avance)}
          transform={`rotate(-90 ${centro} ${centro})`}
        />
      </svg>
      <div className="anillo-progreso-centro">{children}</div>
    </div>
  );
}
