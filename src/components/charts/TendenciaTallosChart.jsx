import Chart from 'react-apexcharts';

export default function TendenciaTallosChart({ categorias = [], valores = [], height = 320 }) {
  if (categorias.length === 0) {
    return <div className="empty-state"><i className="fa-solid fa-chart-area"></i>Sin histórico suficiente para graficar la tendencia.</div>;
  }

  const promedio = valores.length > 0 ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : 0;
  const maxValor = Math.max(...valores, 0);
  const indiceMax = valores.indexOf(maxValor);

  return (
    <Chart
      type="area"
      height={height}
      series={[{ name: 'Tallos', data: valores }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false }, dropShadow: { enabled: true, top: 4, left: 0, blur: 6, opacity: 0.12, color: '#166534' } },
        colors: ['#166534'],
        fill: {
          type: 'gradient',
          gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.02, stops: [0, 95, 100] },
        },
        stroke: { curve: 'smooth', width: 3.5, lineCap: 'round' },
        markers: {
          size: valores.map((v, i) => i === indiceMax ? 7 : 0),
          colors: ['#C9932B'],
          strokeColors: '#fff',
          strokeWidth: 3,
          hover: { size: 8 },
        },
        dataLabels: { enabled: false },
        annotations: {
          yaxis: [{
            y: promedio,
            borderColor: '#C9932B',
            strokeDashArray: 6,
            label: {
              text: `Promedio: ${promedio.toLocaleString()}`,
              style: { background: '#C9932B', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: { left: 8, right: 8, top: 3, bottom: 3 } },
              offsetY: -2,
            },
          }],
        },
        xaxis: {
          categories: categorias,
          labels: { style: { fontSize: '11px', colors: '#6B7280' }, rotate: categorias.length > 15 ? -45 : 0 },
          axisBorder: { color: '#E7E5DD' },
          axisTicks: { color: '#E7E5DD' },
          tooltip: { enabled: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          labels: { formatter: (v) => Math.round(v).toLocaleString(), style: { fontSize: '11px', colors: '#6B7280' } },
        },
        grid: { borderColor: '#F0EFE9', strokeDashArray: 4, padding: { top: 10 } },
        tooltip: {
          theme: 'light',
          y: { formatter: (v) => `${v.toLocaleString()} tallos` },
          marker: { show: true },
        },
      }}
    />
  );
}
