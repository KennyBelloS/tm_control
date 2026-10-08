import Chart from 'react-apexcharts';
import { etiquetaHora } from '../lib/clasificacionCalculos';

export default function ClasificacionChart({ datos, height = 300 }) {
  const categorias = datos.horas.map(etiquetaHora);
  const series = [{ name: 'Hoy (acumulado)', data: datos.total.celdas.map(c => c.acumHoy) }];
  if (datos.fechaAyer) series.push({ name: 'Ayer (acumulado)', data: datos.total.celdas.map(c => c.acumAyer) });
  return (
    <Chart
      type="line" height={height} series={series}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false }, animations: { speed: 700 } },
        colors: ['#166534', '#C9932B'],
        stroke: { curve: 'smooth', width: [4, 3], dashArray: [0, 6], lineCap: 'round' },
        markers: { size: [5, 0], strokeColors: '#fff', strokeWidth: 2, hover: { size: 8 } },
        xaxis: { categories: categorias, labels: { style: { fontSize: '11px' }, rotate: -35 } },
        yaxis: { labels: { formatter: v => Math.round(v).toLocaleString('es-CO'), style: { fontSize: '11px' } } },
        grid: { borderColor: 'rgba(0,0,0,.06)', strokeDashArray: 4 },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', markers: { radius: 12 } },
        tooltip: { shared: true, y: { formatter: v => v == null ? '—' : `${Math.round(v).toLocaleString('es-CO')} tallos` } },
        noData: { text: 'Sin datos' }
      }}
    />
  );
}
